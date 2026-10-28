/** A marca nas telas de entrada: frase curta à esquerda, o robô e o nome FARO (Poppins) em roxo, tudo centralizado. */
export function AuthMarca() {
  return (
    <div className="auth-marca">
      <span className="auth-marca-frase">Seu caminho para manter o foco, ação, rotina e objetivos</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/faro-logo.png" alt="" width={44} height={44} className="auth-logo" />
      <span className="auth-marca-nome">FARO</span>
    </div>
  );
}
