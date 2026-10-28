"use client";

/**
 * "Em breve": um gostinho do que vem por aí. Mostra três telas do aplicativo Financeiro (com os valores borrados)
 * para dizer que ele vai conversar com o FARO. É só vitrine: nada aqui lê ou grava dados.
 */
const TELAS = [
  { arquivo: "painel", titulo: "Painel", texto: "Quanto sobra no mês e o que dá para cortar, num olhar." },
  { arquivo: "dashboard", titulo: "Dashboard", texto: "Receita x despesa, o que está a pagar e o que está em atraso." },
  { arquivo: "projecao", titulo: "Projeção", texto: "Os próximos 12 meses, para você enxergar o que vem pela frente." },
];

export function EmBreveView({ onBack }: { onBack: () => void }) {
  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Em breve</span>
        <span style={{ width: 32 }} />
      </div>
      <div className="narrow-list embreve">
        <section className="list-card tutorial-bloco">
          <span className="embreve-selo">Em breve</span>
          <h2>Seu financeiro dentro do FARO</h2>
          <p className="hint-text">
            Estou construindo um aplicativo financeiro (casa e empresa) e a ideia é ele conversar com o FARO: contas a pagar viram lembretes, e o dinheiro entra no seu dia
            junto com tarefas, reuniões e aprendizados. Ainda não dá para usar aqui; abaixo, um gostinho de como ele é (os valores foram borrados).
          </p>
        </section>
        {TELAS.map((t) => (
          <figure key={t.arquivo} className="list-card tutorial-bloco embreve-tela">
            <figcaption>
              <strong>{t.titulo}</strong>
              <span>{t.texto}</span>
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/em-breve/${t.arquivo}.jpg`} alt={`Tela ${t.titulo} do aplicativo Financeiro, com os valores borrados`} loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}
