from pathlib import Path

arquivos = {
    r"web\app\admin\administradores\client-page.tsx": [
        ("apostado: 'Apostados',", "operacao: 'Operação',"),
        ("confronto: 'Confronto',", "evento4x4: '4x4',"),
        ("operar apostados, diários, copas, ligas e confrontos.", "operar diários, copas, ligas, xtreinos e eventos 4x4."),
        ("operar apostados, di├írios, copas, ligas e confrontos.", "operar diários, copas, ligas, xtreinos e eventos 4x4."),
    ],
    r"web\app\admin\configuracoes\taxas\page.tsx": [
        (
            "Defina quanto a carteira do criador será cobrada ao criar cada tipo de campeonato. A cobrança também é validada no banco por trigger, não apenas no frontend.",
            "Defina o valor da taxa de criação para cada tipo de campeonato. A cobrança deve ser paga por PIX e também é validada no banco por trigger, não apenas no frontend."
        ),
        (
            "Defina quanto a carteira do criador ser├í cobrada ao criar cada tipo de campeonato. A cobran├ºa tamb├®m ├® validada no banco por trigger, n├úo apenas no frontend.",
            "Defina o valor da taxa de criação para cada tipo de campeonato. A cobrança deve ser paga por PIX e também é validada no banco por trigger, não apenas no frontend."
        ),
    ],
    r"web\app\campeonatos\[id]\components\AbaInformacoes.tsx": [
        ("aplicarLBFF", "aplicarPadraoCompetitivo"),
        ("const lbff =", "const padraoCompetitivo ="),
        ("setPontos(lbff)", "setPontos(padraoCompetitivo)"),
        ("await onSave('pontos_colocacao', lbff)", "await onSave('pontos_colocacao', padraoCompetitivo)"),
        ("Usar LBFF", "Usar padrão competitivo"),
    ],
    r"web\app\campeonatos\[id]\components\GerenciarPontuacao.tsx": [
        ("presetLBFF", "presetCompetitivo"),
        ("aplicarPresetLBFF", "aplicarPresetCompetitivo"),
        ("Usar Padrão LBFF", "Usar padrão competitivo"),
        ("Usar Padr├úo LBFF", "Usar padrão competitivo"),
    ],
    r"web\app\equipe\[id]\components\AbaLines.tsx": [
        ("Crie lines prontas para usar em campeonatos, diários, apostados e para importar o elenco inteiro.", "Crie lines prontas para usar em campeonatos, diários e para importar o elenco inteiro."),
        ("Crie lines prontas para usar em campeonatos, di├írios, apostados e para importar o elenco inteiro.", "Crie lines prontas para usar em campeonatos, diários e para importar o elenco inteiro."),
        ("Base pronta para campeonatos e apostados", "Base pronta para campeonatos"),
    ],
}

backup_dir = Path("_backup_limpeza_textos_fase6")
backup_dir.mkdir(exist_ok=True)

for caminho, trocas in arquivos.items():
    p = Path(caminho)

    if not p.exists():
        print(f"NAO ENCONTRADO: {caminho}")
        continue

    backup = backup_dir / p.name
    backup.write_text(p.read_text(encoding="utf-8", errors="ignore"), encoding="utf-8")

    texto = p.read_text(encoding="utf-8", errors="ignore")
    original = texto

    for antigo, novo in trocas:
        texto = texto.replace(antigo, novo)

    if texto != original:
        p.write_text(texto, encoding="utf-8")
        print(f"ALTERADO: {caminho}")
    else:
        print(f"NENHUMA TROCA: {caminho}")

print("FIM")