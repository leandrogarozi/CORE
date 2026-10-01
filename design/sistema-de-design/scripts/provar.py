#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta a página de prova de uma tela e tira os prints.

A ideia inteira: o print tem que carregar o CSS REAL do projeto e o DOM REAL que
o componente emite. Print de mock bonito não prova nada — prova o mock. Se o CSS
que vai pro ar estiver errado, o print mostra o erro.

Uso:
    python3 provar.py \\
        --css src/app/globals.css \\
        --caso cheio=/tmp/tela.html \\
        --caso vazio=/tmp/tela-vazia.html \\
        --saida ./prova \\
        --larguras 1280,390

Gera, pra cada combinação de caso × tema × largura:
    prova/<caso>-<tema>-<largura>.html   (pra abrir e inspecionar)
    prova/<caso>-<tema>-<largura>.png    (o print)

O arquivo de `--caso` é um TRECHO de HTML (sem <html>/<head>), com as mesmas
classes que o componente real usa. Ele entra dentro de <body><div class="wrap">.
"""
import argparse, base64, os, re, subprocess, sys, tempfile, urllib.request

FONTES_URL = ("https://fonts.googleapis.com/css2"
              "?family=Inter:wght@400;500;600;700;800"
              "&family=IBM+Plex+Mono:wght@400;500&display=swap")

NAVEGADOR_AGENTE = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120 Safari/537.36")


def baixar(url, agente=False):
    pedido = urllib.request.Request(url)
    if agente:
        pedido.add_header("User-Agent", NAVEGADOR_AGENTE)
    with urllib.request.urlopen(pedido, timeout=30) as r:
        return r.read()


def css_das_fontes(cache):
    """
    Inter e IBM Plex Mono embutidas em base64.

    Chromium headless com frequência não busca a folha do Google (proxy, rede
    fechada, falta de DNS). Sem isto o print sai numa fonte de sistema e MENTE
    sobre a tipografia — que é metade do que se está julgando.
    """
    pronto = os.path.join(cache, "fontes-embutidas.css")
    if os.path.exists(pronto):
        return open(pronto, encoding="utf-8").read()
    try:
        css = baixar(FONTES_URL, agente=True).decode("utf-8")
    except Exception as erro:
        print("aviso: não deu pra baixar as fontes (%s). O print vai sair numa "
              "fonte de sistema — avise isso ao mostrar." % erro, file=sys.stderr)
        return ""
    for url in sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css))):
        try:
            dados = baixar(url)
        except Exception:
            continue
        if len(dados) < 200:
            continue
        css = css.replace(url, "data:font/woff2;base64," + base64.b64encode(dados).decode())
    os.makedirs(cache, exist_ok=True)
    open(pronto, "w", encoding="utf-8").write(css)
    return css


MOLDE = """<!doctype html>
<html lang="pt-BR" data-theme="{tema_attr}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>{fontes}</style>
<style>{css}</style>
</head><body><div class="{envoltorio}">{corpo}</div></body></html>"""


def achar_playwright():
    """O caminho do playwright muda por máquina; deixe o env mandar."""
    if os.environ.get("PLAYWRIGHT_JS"):
        return os.environ["PLAYWRIGHT_JS"]
    candidatos = [
        "/opt/node22/lib/node_modules/playwright/index.mjs",
        "/usr/lib/node_modules/playwright/index.mjs",
        os.path.expanduser("~/node_modules/playwright/index.mjs"),
    ]
    for c in candidatos:
        if os.path.exists(c):
            return c
    return None


SHOT = """import {{ chromium }} from '{playwright}';
const casos = {casos};
const nav = await chromium.launch();
for (const c of casos) {{
  const pag = await nav.newPage({{ viewport: {{ width: c.w, height: 900 }}, deviceScaleFactor: 2 }});
  await pag.goto('file://' + c.html);
  await pag.waitForTimeout(1200);
  await pag.screenshot({{ path: c.png, fullPage: true }});
  await pag.close();
  console.log(c.png);
}}
await nav.close();
"""


def main():
    p = argparse.ArgumentParser(description="Página de prova com o CSS e o DOM reais.")
    p.add_argument("--css", required=True, action="append",
                   help="CSS real do projeto. Pode repetir, na ordem de carga.")
    p.add_argument("--caso", required=True, action="append", metavar="NOME=ARQUIVO.html",
                   help="Trecho de HTML da tela. Pode repetir (cheio, vazio, extremo…).")
    p.add_argument("--saida", default="./prova")
    p.add_argument("--temas", default="claro,escuro")
    p.add_argument("--larguras", default="1280")
    p.add_argument("--envoltorio", default="wrap",
                   help="Classe do contêiner que o app usa em volta da página.")
    p.add_argument("--sem-print", action="store_true", help="Só gera os HTML.")
    a = p.parse_args()

    os.makedirs(a.saida, exist_ok=True)
    fontes = css_das_fontes(os.path.join(tempfile.gettempdir(), "provar-fontes"))
    css = "\n".join(open(c, encoding="utf-8").read() for c in a.css)

    temas = [t.strip() for t in a.temas.split(",") if t.strip()]
    larguras = [int(w) for w in a.larguras.split(",") if w.strip()]

    trabalhos = []
    for par in a.caso:
        if "=" not in par:
            p.error("--caso precisa ser NOME=ARQUIVO.html (recebi %r)" % par)
        nome, arquivo = par.split("=", 1)
        corpo = open(arquivo, encoding="utf-8").read()
        for tema in temas:
            for largura in larguras:
                base = "%s-%s-%d" % (nome, tema, largura)
                html = os.path.abspath(os.path.join(a.saida, base + ".html"))
                open(html, "w", encoding="utf-8").write(MOLDE.format(
                    tema_attr="dark" if tema.startswith("esc") else "light",
                    fontes=fontes, css=css, corpo=corpo, envoltorio=a.envoltorio))
                trabalhos.append({"html": html, "png": os.path.abspath(
                    os.path.join(a.saida, base + ".png")), "w": largura})

    print("%d página(s) em %s" % (len(trabalhos), a.saida))
    if a.sem_print:
        return

    playwright = achar_playwright()
    if not playwright:
        print("Playwright não encontrado. Defina PLAYWRIGHT_JS com o caminho do "
              "index.mjs, ou abra os HTML à mão.", file=sys.stderr)
        return

    import json
    roteiro = os.path.join(a.saida, "_print.mjs")
    open(roteiro, "w", encoding="utf-8").write(
        SHOT.format(playwright=playwright, casos=json.dumps(trabalhos)))
    subprocess.run(["node", roteiro], check=True)
    print("\nAgora LEIA os PNGs antes de mandar. Já aconteceu de a rosca sair "
          "como círculo vazio e o texto sair espremido — os dois achados por "
          "olhar a imagem, não o código.")


if __name__ == "__main__":
    main()
