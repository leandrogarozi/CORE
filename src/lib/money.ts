// Dinheiro em centavos: somar reais em ponto flutuante erra centavo (0.1 + 0.2),
// então tudo aqui entra e sai como inteiro de centavos.

export function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Só o número, sem "R$" — é o que vai dentro de um campo de digitação.
export function fmtAmount(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Aceita o que a pessoa realmente digita: "120", "120,50", "1.234,56", "1234.56",
// "R$ 89,90". Devolve null quando não sobrou número nenhum.
export function parseAmountToCents(input: string): number | null {
  const raw = input.replace(/[^\d,.]/g, "");
  if (!raw) return null;

  // O último separador é o decimal — mas só quando tem 1 ou 2 dígitos depois
  // dele: em "1.500" o ponto separa milhar, não centavo.
  const sepIdx = Math.max(raw.lastIndexOf(","), raw.lastIndexOf("."));
  let intPart = raw;
  let decPart = "";
  if (sepIdx >= 0) {
    const after = raw.slice(sepIdx + 1);
    if (after.length >= 1 && after.length <= 2) {
      intPart = raw.slice(0, sepIdx);
      decPart = after;
    }
  }

  const digits = intPart.replace(/\D/g, "");
  if (!digits && !decPart) return null;
  return Number(digits || "0") * 100 + Number((decPart + "00").slice(0, 2));
}
