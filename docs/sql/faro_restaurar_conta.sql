-- Restaurador de conta a partir de public.faro_backups_internos (a cópia diária feita por faro_jobs.backup_diario_interno).
-- NÃO destrutivo: só traz de volta linhas que SUMIRAM da conta desde a cópia (mesma chave primária); nunca sobrescreve
-- o que existe hoje. Com p_simular = true faz tudo, conta e desfaz (rollback), então a simulação é fiel.
-- Só o servidor (service_role) executa.
create or replace function public.faro_restaurar_conta(p_user uuid, p_dia date, p_simular boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_dados jsonb;
  v_t text;
  v_rec record;
  v_por_tabela jsonb := '{}'::jsonb;
  v_falhas jsonb := '[]'::jsonb;
  v_ja int := 0;
  v_novas int := 0;
  v_n int;
  v_cols text;
  v_progresso boolean;
  v_saida jsonb;
  v_ignorar text[] := array['push_subscriptions', 'active_timer', 'faro_backups_internos'];
begin
  select dados into v_dados from public.faro_backups_internos where user_id = p_user and dia = p_dia;
  if v_dados is null then
    return jsonb_build_object('ok', false, 'erro', 'Não há cópia desse dia para essa conta.');
  end if;

  begin
    create temp table if not exists _faro_pend (id serial, t text, r jsonb) on commit drop;
    truncate _faro_pend;
    for v_t in select k from jsonb_object_keys(v_dados) k loop
      continue when v_t = any (v_ignorar);
      continue when not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = v_t and table_type = 'BASE TABLE');
      insert into _faro_pend (t, r) select v_t, e from jsonb_array_elements(v_dados -> v_t) e;
    end loop;

    loop
      v_progresso := false;
      for v_rec in select * from _faro_pend order by id loop
        begin
          -- só as colunas que a cópia tem (colunas criadas depois ficam com o padrão; colunas apagadas são ignoradas)
          select string_agg(quote_ident(c.column_name), ',') into v_cols
            from information_schema.columns c
           where c.table_schema = 'public' and c.table_name = v_rec.t and v_rec.r ? c.column_name and c.is_generated = 'NEVER';
          execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict do nothing', v_rec.t, v_cols, v_cols, v_rec.t) using v_rec.r;
          get diagnostics v_n = row_count;
          if v_n = 1 then
            v_novas := v_novas + 1;
            v_por_tabela := jsonb_set(v_por_tabela, array[v_rec.t], to_jsonb(coalesce((v_por_tabela ->> v_rec.t)::int, 0) + 1));
          else
            v_ja := v_ja + 1;
          end if;
          delete from _faro_pend where id = v_rec.id;
          v_progresso := true;
        exception
          when foreign_key_violation then
            null; -- falta a linha "mãe"; tenta de novo na próxima volta
          when others then
            if jsonb_array_length(v_falhas) < 20 then
              v_falhas := v_falhas || jsonb_build_object('tabela', v_rec.t, 'erro', sqlerrm);
            end if;
            delete from _faro_pend where id = v_rec.id;
            v_progresso := true;
        end;
      end loop;
      exit when not v_progresso or not exists (select 1 from _faro_pend);
    end loop;

    for v_rec in select t, count(*) c from _faro_pend group by t loop
      if jsonb_array_length(v_falhas) < 20 then
        v_falhas := v_falhas || jsonb_build_object('tabela', v_rec.t, 'erro', v_rec.c || ' linha(s) sem a linha "mãe" (não restauradas)');
      end if;
    end loop;

    v_saida := jsonb_build_object('ok', true, 'simulado', p_simular, 'dia', p_dia, 'restauradas', v_novas, 'ja_existiam', v_ja, 'por_tabela', v_por_tabela, 'falhas', v_falhas);
    if p_simular then
      raise exception 'faro_simulacao:%', v_saida::text;
    end if;
  exception
    when others then
      if sqlerrm like 'faro_simulacao:%' then
        return substr(sqlerrm, length('faro_simulacao:') + 1)::jsonb;
      end if;
      raise;
  end;
  return v_saida;
end
$fn$;

revoke all on function public.faro_restaurar_conta(uuid, date, boolean) from public, anon, authenticated;
grant execute on function public.faro_restaurar_conta(uuid, date, boolean) to service_role;
