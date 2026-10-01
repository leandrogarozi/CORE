# Componentes provados

Seis peças carregam quase toda tela de app. Todas já rodaram no FARO em claro,
escuro, vazio, extremo e 390px. Leia antes de inventar um componente novo.

Os nomes de classe usam prefixo `sd-` aqui. Num app de verdade, troque pelo
prefixo da tela (veja a seção "Trabalhando num app que já existe" no SKILL.md).

---

## 1. Faixa de números (KPIs)

Para números **irmãos** — que fazem sentido lidos juntos. Em cartões separados,
cada um pede atenção por conta própria.

```css
.sd-kpis{
  display:grid; grid-template-columns:repeat(7,1fr);
  background:var(--surface); border:1px solid var(--linha); border-radius:var(--r-3);
  overflow:hidden; box-shadow:var(--sh-1);
}
/* Divisória por box-shadow, NÃO por gap: o gap pinta o fundo do contêiner, e
   numa linha incompleta (7 números em 4 colunas) sobra um retângulo cinza no
   vazio. Com sombra, a célula que não existe não desenha nada. */
.sd-kpi{
  padding:13px 14px; text-align:left; font:inherit; color:inherit; background:none;
  box-shadow:1px 0 0 var(--linha), 0 1px 0 var(--linha);
}
/* O contorno de foco é desenhado pra dentro: o overflow:hidden da faixa
   cortaria um contorno por fora. */
button.sd-kpi:focus-visible{ outline-offset:-2px; }
.sd-kpi-n{
  display:block; font-size:var(--fs-6); font-weight:var(--fw-titulo);
  letter-spacing:var(--ls-apertado); line-height:1.15; font-variant-numeric:tabular-nums;
}
/* A unidade é régua, não dado. */
.sd-kpi-n small{ font-size:11.5px; font-weight:var(--fw-medio); color:var(--text-faint); letter-spacing:0; }
.sd-kpi-l{ display:block; margin-top:var(--sp-1); font-size:var(--fs-1); color:var(--text-muted); line-height:1.3; }
.sd-kpi.alerta .sd-kpi-n{ color:var(--perigo); }   /* só quando n > 0 */

@media (max-width:1100px){ .sd-kpis{ grid-template-columns:repeat(4,1fr); } }
@media (max-width:720px){  .sd-kpis{ grid-template-columns:repeat(2,1fr); } }
```

```html
<div class="sd-kpis">
  <div class="sd-kpi"><span class="sd-kpi-n">23</span><span class="sd-kpi-l">Sem data</span></div>
  <div class="sd-kpi"><span class="sd-kpi-n">24<small>h</small> 56<small>min</small></span><span class="sd-kpi-l">Tempo total</span></div>
</div>
```

---

## 2. Segmento (alternador)

**Um só por app.** Fundo cinza, ativo como pílula branca.

```css
.sd-seg{
  display:inline-flex; gap:2px; padding:2.5px; flex:none;
  background:var(--segmento-fundo); border:1px solid var(--linha); border-radius:var(--r-2);
}
.sd-seg-btn{
  padding:5px 11px; height:26px; border-radius:7px; background:none;
  font-size:11.5px; font-weight:var(--fw-medio); color:var(--text-muted);
  transition:background var(--mov), color var(--mov);
}
.sd-seg-btn:hover:not(.on){ color:var(--text); }
.sd-seg-btn.on{
  background:var(--surface); color:var(--accent); font-weight:var(--fw-forte);
  box-shadow:0 1px 2px rgba(0,0,0,.06);
}
```

Selo de contagem no canto, **fora do texto** — dentro da pílula ele cai em cima da
palavra:

```css
.sd-seg-btn{ position:relative; }
.sd-seg-count{
  position:absolute; top:-5px; right:-4px; min-width:13px; height:13px; padding:0 3px;
  border-radius:var(--r-full); background:var(--perigo); color:#fff;
  font-size:8.5px; font-weight:700; line-height:1;
  display:flex; align-items:center; justify-content:center;
  border:1.5px solid var(--surface);
}
```

---

## 3. Cartão com seções

Assunto irmão mora no mesmo cartão, separado por linha.

```css
.sd-card{
  background:var(--surface); border:1px solid var(--linha); border-radius:var(--r-3);
  padding:var(--sp-4) 17px; box-shadow:var(--sh-1); min-width:0;
}
.sd-card-title{
  font-size:var(--fs-3); font-weight:var(--fw-titulo); letter-spacing:-.008em;
  margin-bottom:11px; display:flex; align-items:baseline; gap:7px;
}
/* sufixo explicativo do título: "Hábitos · tempo e dias ativos" */
.sd-card-tag{ font-size:10px; font-weight:var(--fw-normal); color:var(--text-faint); }
.sd-card-tag::before{ content:"·"; margin-right:6px; }
.sd-sub{ font-size:var(--fs-2); font-weight:var(--fw-forte); color:var(--text-muted); margin-bottom:var(--sp-2); }
/* Estica até a borda: linha que para antes do fim parece defeito.
   O valor negativo acompanha o padding lateral do cartão. */
.sd-sep{ height:1px; background:var(--linha); margin:15px -17px; }

/* Colunas FIXAS. Nunca column-count — ele reordena os blocos sozinho conforme a
   altura de cada um, e a arrumação muda a cada semana. */
.sd-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:var(--sp-3); align-items:start; }
@media (max-width:1100px){ .sd-grid{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:720px){  .sd-grid{ grid-template-columns:1fr; } }
```

---

## 4. Linha de lista

```css
.sd-row{
  display:flex; align-items:center; gap:var(--sp-2); width:100%;
  padding:5px 6px; margin-inline:-6px; border-radius:var(--r-1);
  font:inherit; font-size:12.5px; color:var(--text-muted); text-align:left;
  transition:background var(--mov), color var(--mov);
}
/* A linha INTEIRA reage ao mouse. Quando só os botõezinhos dentro dela reagem,
   não dá pra perceber que a linha é uma unidade. */
button.sd-row:hover{ background:var(--segmento-fundo); color:var(--text); }
.sd-dot{ width:7px; height:7px; border-radius:50%; flex:none; }
.sd-row-name{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sd-row-n{ flex:none; margin-left:auto; font-weight:var(--fw-forte); color:var(--text); font-variant-numeric:tabular-nums; }
```

Numa lista densa (tabela de tarefas), o mesmo vale com divisória:
`border-bottom:1px solid var(--linha)` e padding `9px 16px`.

---

## 5. Barra

```css
.sd-bar{ height:5px; border-radius:var(--r-full); background:var(--trilho); overflow:hidden; }
.sd-bar span{ display:block; height:100%; border-radius:var(--r-full); background:var(--accent); }
```

Linha de comparação — rótulo, barra, número — numa linha só, não empilhada:

```css
.sd-escala{ display:flex; align-items:center; gap:9px; font-size:var(--fs-2); color:var(--text-muted); }
.sd-escala-l{ width:46px; flex:none; }
.sd-escala .sd-bar{ flex:1; height:4px; min-width:0; }
.sd-escala-n{ width:28px; flex:none; text-align:right; font-weight:var(--fw-forte); color:var(--text); font-variant-numeric:tabular-nums; }
```

Série de marcas por dia (humor, presença) — elástica, porque o mesmo desenho
precisa caber com 1 dia e com 31:

```css
.sd-dias{ display:flex; gap:4px; }
.sd-dia{ flex:1 1 0; min-width:4px; max-width:28px; height:5px; border-radius:var(--r-full); background:var(--trilho); }
```

---

## 6. Rosca

```css
.sd-donut{
  width:96px; height:96px; border-radius:50%; flex:none;
  /* background: conic-gradient(...) vem inline, calculado dos dados */
  /* O furo é MÁSCARA, não um círculo branco por cima: assim funciona no tema
     escuro e sobre o degradê sem remendo. A 70% o anel some. */
  -webkit-mask:radial-gradient(circle, transparent 58%, #000 59%);
  mask:radial-gradient(circle, transparent 58%, #000 59%);
}
.sd-legenda{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.sd-legenda-row{ display:flex; align-items:center; gap:var(--sp-2); font-size:11px; color:var(--text-muted); padding:2px 0; }
.sd-legenda-name{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sd-legenda-n{ flex:none; margin-left:auto; font-weight:var(--fw-forte); font-variant-numeric:tabular-nums; }
```

As cores das fatias saem das cores que o usuário configurou, nunca de uma paleta
fixa no código — senão é cor feia que ninguém consegue trocar.
