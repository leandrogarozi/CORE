# Tema escuro com botão

Enquanto o app só obedece ao sistema, `@media (prefers-color-scheme: dark)` basta.
No instante em que existe um **botão de tema**, essa media query vira um problema:
um botão que o sistema pode contradizer não é botão.

## A troca

O tema passa a ser decidido por um atributo no `<html>`:

```css
:root{ color-scheme:light; /* valores claros */ }
:root[data-theme="dark"]{ color-scheme:dark; /* valores escuros */ }
```

A preferência do sistema **continua valendo** — ela vira o valor inicial enquanto a
pessoa não escolheu nada. O que muda é que a escolha dela, quando existe, ganha.

## O script tem que ser síncrono, no `<head>`

Este é o detalhe que decide se a tela pisca branca antes de escurecer:

```jsx
<html lang="pt-BR" suppressHydrationWarning>
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html:
          "(function(){try{var s=localStorage.getItem('app-tema');" +
          "var e=s==='escuro'||(s!=='claro'&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
          "document.documentElement.dataset.theme=e?'dark':'light';}" +
          "catch(_){document.documentElement.dataset.theme='light';}})()",
      }}
    />
```

**Script cru, não `<Script strategy="beforeInteractive">`.** A documentação do Next
diz que `beforeInteractive` "não bloqueia a hidratação" — e aqui bloquear é
exatamente o ponto. O script tem que rodar durante a leitura do HTML, antes do
primeiro pixel.

`suppressHydrationWarning` no `<html>` porque o script escreve um atributo que não
existia no HTML do servidor.

## O botão lê o atributo, não guarda cópia

Duas cópias da mesma verdade é como uma delas acaba errada. O atributo é estado de
fora do React, então o jeito certo de ler é `useSyncExternalStore` com um
`MutationObserver` — e não `useState` + `useEffect`, que além de duplicar o estado
cai no lint de "setState dentro de efeito".

```tsx
function inscrever(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observador.disconnect();
}
const lerNoNavegador = () => (document.documentElement.dataset.theme === "dark" ? "escuro" : "claro");
/* No servidor o atributo ainda não existe — e fingir que sim faria o ícone errado
   piscar por um quadro na hidratação. */
const lerNoServidor = () => null;

export function BotaoTema() {
  const tema = useSyncExternalStore(inscrever, lerNoNavegador, lerNoServidor);
  const escuro = tema === "escuro";

  function trocar() {
    const novo = escuro ? "claro" : "escuro";
    document.documentElement.dataset.theme = novo === "escuro" ? "dark" : "light";
    try { window.localStorage.setItem("app-tema", novo); } catch { /* sem armazenamento: vale até recarregar */ }
  }

  return (
    <button onClick={trocar} aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
            style={tema === null ? { opacity: 0 } : undefined}>
      {escuro ? <Sol /> : <Lua />}
    </button>
  );
}
```

## A escolha mora no aparelho

`localStorage`, não banco. Tema é preferência **deste** aparelho: escuro no celular
à noite e claro no computador de dia é um caso real. Salvar na conta tira essa
liberdade.

## Conferir no app, não no print

Duas coisas que só aparecem rodando:
1. **O não-piscar** ao recarregar a página.
2. **Cores que vêm de dados** (etiqueta configurada pelo usuário, cor de categoria)
   — num arquivo de prova elas costumam estar fixas, e no escuro o app mostra outra
   tonalidade.
