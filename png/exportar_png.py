from playwright.sync_api import sync_playwright
import os
import time

PASTA_ATUAL = os.path.dirname(os.path.abspath(__file__))
PASTA_SAIDA = os.path.join(PASTA_ATUAL, "output")

os.makedirs(PASTA_SAIDA, exist_ok=True)

IGNORAR = {"index.html", "leia-me.html"}

overlays = sorted([
    arquivo
    for arquivo in os.listdir(PASTA_ATUAL)
    if arquivo.lower().endswith(".html") and arquivo.lower() not in IGNORAR
])

if not overlays:
    print("Nenhum arquivo HTML encontrado na pasta png.")
    input("Pressione Enter para sair...")
    raise SystemExit

print("Overlays encontradas:")
for overlay in overlays:
    print(" -", overlay)

with sync_playwright() as p:
    browser = p.chromium.launch()

    for overlay in overlays:
        caminho = "file:///" + os.path.join(PASTA_ATUAL, overlay).replace("\\", "/")

        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        print(f"\nGerando PNG de: {overlay}")

        try:
            page.goto(caminho, wait_until="networkidle", timeout=30000)
        except Exception:
            print(f"Aviso: timeout ao carregar {overlay}, tentando continuar mesmo assim.")

        time.sleep(3)

        nome_png = os.path.splitext(overlay)[0] + ".png"
        destino = os.path.join(PASTA_SAIDA, nome_png)

        page.screenshot(path=destino, omit_background=True)

        print(f"Salvo em: {destino}")
        page.close()

    browser.close()

print("\nTodas as overlays foram exportadas com sucesso.")
input("Pressione Enter para sair...")
