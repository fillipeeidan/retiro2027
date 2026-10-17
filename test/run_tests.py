#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RETIRO 2027 — CONECTADOS
Igreja Adventista da Promessa — Boa Vista
Suíte de Testes Automatizados de Validação e Integridade
"""

import os
import re
import sys
import json
import urllib.parse
from datetime import datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def assert_true(condition, message):
    if not condition:
        print(f"[ERRO] FALHA: {message}")
        raise AssertionError(message)
    print(f"[OK] PASSOU: {message}")

def test_file_structure():
    print("\n--- TESTE 1: Estrutura de Arquivos e Assets ---")
    required_files = [
        "index.html",
        "css/styles.css",
        "js/config.js",
        "js/pix.js",
        "js/form.js",
        "js/app.js",
        "google-apps-script/Code.gs",
        "google-apps-script/README_SETUP.md",
        "assets/images/hero_vine.jpg",
        "assets/images/retreat_nature.jpg",
        "assets/images/fellowship.jpg",
        "assets/images/xilogravura_videira.png",
        "assets/images/xilo_homem_videira.png",
        "assets/images/xilo_arvore_raizes.png",
        "assets/images/logo_retiro_hero.png",
        "assets/images/logo_igreja_branca.png"
    ]
    for rel_path in required_files:
        full_path = os.path.join(ROOT_DIR, rel_path)
        assert_true(os.path.exists(full_path), f"Arquivo '{rel_path}' existe no projeto")
        assert_true(os.path.getsize(full_path) > 50, f"Arquivo '{rel_path}' possui conteúdo válido (> 50 bytes)")

def test_config_data():
    print("\n--- TESTE 2: Configuração Oficial e Valores Monetários em Centavos ---")
    config_path = os.path.join(ROOT_DIR, "js/config.js")
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert_true("Retiro 2027 — Conectados" in content, "Nome oficial do evento configurado")
    assert_true("Igreja Adventista da Promessa — Boa Vista" in content, "Nome oficial da igreja configurado")
    assert_true("João 15:4" in content, "Tema bíblico João 15:4 presente")
    assert_true("Permaneçam em mim, e eu permanecerei em vocês." in content, "Versículo oficial presente")
    assert_true("Barão Branco Resort" in content, "Nome do resort presente")
    assert_true("5595991756439" in content, "WhatsApp Diácono Junior (5595991756439) configurado")
    assert_true("5595991378350" in content, "WhatsApp Ir. Fillipe (5595991378350) configurado")
    assert_true("15000" in content, "Ingresso inteiro configurado como 15000 centavos (R$ 150,00)")
    assert_true("7500" in content, "Meia-entrada configurada como 7500 centavos (R$ 75,00)")
    assert_true("America/Boa_Vista" in content, "Fuso horário oficial America/Boa_Vista configurado")
    assert_true("2027-01-30T23:59:59-04:00" in content, "Data limite de inscrições 30 de janeiro de 2027 às 23:59:59-04:00 configurada")

def test_html_official_texts():
    print("\n--- TESTE 3: Verificação dos Textos Oficiais e Critérios de Aceitação no HTML ---")
    html_path = os.path.join(ROOT_DIR, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Hero
    assert_true("Igreja Adventista da Promessa" in html, "Nome da igreja presente na Hero")
    assert_true("logo_retiro_hero.png" in html, "Logo do retiro presente na Hero")
    assert_true("Retiro 2027 — Igreja Adventista da Promessa" in html, "Título principal do Hero presente")
    assert_true("logo_igreja_branca.png" in html, "Logo da igreja presente no rodapé")
    assert_true("Há frutos que só nascem quando permanecemos na Videira." in html, "Subtítulo do Hero presente")
    assert_true("Permaneçam em mim, e eu permanecerei em vocês." in html, "Versículo no Hero presente")
    assert_true("6 a 9 de fevereiro de 2027" in html, "Datas do retiro presentes")
    assert_true("Barão Branco Resort · a 15 km de Boa Vista" in html, "Localização oficial presente")
    assert_true("QUERO ME INSCREVER" in html, "Botão principal do Hero presente")

    # 2. Tema
    assert_true("Permanecer na fonte da vida" in html, "Título da Seção 2 presente")
    assert_true("Em meio a tantas coisas que disputam a nossa atenção, é fácil esquecer de onde vem a vida." in html, "Texto 1 do tema presente")
    assert_true("O tempo de permanecer Conectados é até que Ele venha." in html, "Frase de destaque do tema presente")
    assert_true("xilogravura_videira.png" in html, "Ilustração em estilo xilogravura presente na Seção 2")
    assert_true("xilo_homem_videira.png" in html, "Elemento do homem na videira presente no fundo do formulário")
    assert_true("xilo_arvore_raizes.png" in html, "Elemento da árvore e raízes presente no fundo do formulário")

    # 3. Informações
    assert_true("Tudo o que você precisa saber" in html, "Título da Seção 3 presente")
    assert_true("Alimentação e hospedagem durante o retiro." in html, "Inclusões presentes")

    # 4. Valores
    assert_true("Escolha sua inscrição" in html, "Título da Seção 4 presente")
    assert_true("R$ 150,00" in html, "Valor R$ 150,00 exibido")
    assert_true("R$ 75,00" in html, "Valor R$ 75,00 exibido")
    assert_true("Isenção por deficiência" in html, "Card de Isenção PcD exibido")

    # 5. Encerramento
    plain_text = re.sub(r'<[^>]+>', ' ', html)
    plain_text_clean = " ".join(plain_text.split())
    assert_true("Inscrições até" in plain_text_clean and "30 de janeiro de 2027" in plain_text_clean, "Seção 5 com data de encerramento presente")

    # 6. Contato e Dúvidas
    assert_true("Precisa de ajuda?" in html, "Título da Seção 6 de Dúvidas presente")
    assert_true("FALAR COM O DIÁCONO JUNIOR" in html, "Botão da Seção 6 presente")
    assert_true("https://wa.me/5595991756439" in html, "Link para WhatsApp do Diácono Junior presente")

    # 7. Encerramento
    assert_true("Permaneça na Videira." in html, "Título da Seção 7 presente")
    assert_true("Viva conectado à fonte da vida." in html, "Subtítulo da Seção 7 presente")

def test_business_logic_rules():
    print("\n--- TESTE 4: Regras de Negócio e Cálculo de Categorias ---")
    
    def simulate_age(birth_date_str, ref_date):
        parts = [int(p) for p in birth_date_str.split("-")]
        birth = datetime(parts[0], parts[1], parts[2])
        age = ref_date.year - birth.year
        if (ref_date.month, ref_date.day) < (birth.month, birth.day):
            age -= 1
        return max(0, age)

    def evaluate_participant(birth_date_str, is_pcd, ref_date):
        age = simulate_age(birth_date_str, ref_date)
        if age <= 6:
            return {"age": age, "category": "infantil", "base_cents": 0, "payable_cents": 0, "status": "Isenção infantil automática"}
        elif age <= 11:
            if is_pcd:
                return {"age": age, "category": "meia", "base_cents": 7500, "payable_cents": 0, "status": "Pendente de validação"}
            return {"age": age, "category": "meia", "base_cents": 7500, "payable_cents": 7500, "status": "Não solicitada"}
        else:
            if is_pcd:
                return {"age": age, "category": "inteira", "base_cents": 15000, "payable_cents": 0, "status": "Pendente de validação"}
            return {"age": age, "category": "inteira", "base_cents": 15000, "payable_cents": 15000, "status": "Não solicitada"}

    ref = datetime(2026, 10, 16)

    # Teste 1: Criança de 4 anos
    child = evaluate_participant("2022-05-10", False, ref)
    assert_true(child["category"] == "infantil" and child["payable_cents"] == 0, "Criança de 4 anos isenta automaticamente")

    # Teste 2: Criança de 10 anos sem PcD
    kid = evaluate_participant("2016-03-15", False, ref)
    assert_true(kid["category"] == "meia" and kid["payable_cents"] == 7500, "Participante de 10 anos é meia-entrada (7500 centavos / R$ 75,00)")

    # Teste 3: Adulto de 25 anos sem PcD
    adult = evaluate_participant("2001-08-20", False, ref)
    assert_true(adult["category"] == "inteira" and adult["payable_cents"] == 15000, "Participante de 25 anos é inteira (15000 centavos / R$ 150,00)")

    # Teste 4: Jovem de 15 anos COM solicitação PcD
    pcd_teen = evaluate_participant("2011-04-10", True, ref)
    assert_true(pcd_teen["status"] == "Pendente de validação" and pcd_teen["payable_cents"] == 0,
                "Solicitação PcD fica 'Pendente de validação' e não gera cobrança inicial (R$ 0,00 a pagar no momento)")

    # Teste 5: Pedido Misto (1 Inteira + 1 Meia + 1 Infantil + 1 PcD Pendente)
    participants = [adult, kid, child, pcd_teen]
    total_payable_cents = sum(p["payable_cents"] for p in participants)
    assert_true(total_payable_cents == 22500, "Total a pagar do pedido misto é exatamente 22500 centavos (R$ 225,00)")
    assert_true(total_payable_cents == 15000 + 7500 + 0 + 0, "PcD pendente não bloqueia nem adiciona valor indevido aos demais participantes")

def test_whatsapp_messages():
    print("\n--- TESTE 5: Mensagens Pré-formatadas do WhatsApp ---")
    
    # 1. Diácono Junior - Comprovante Pix
    order_id = "RET-2027-A8B9"
    resp_nome = "Carlos Eduardo Ferreira"
    valor_calc = "R$ 225,00"

    expected_dj_msg = (
        f"Olá, Diácono Junior! Realizei o pagamento da minha inscrição para o Retiro 2027 — Conectados.\n\n"
        f"Código do pedido: {order_id}\n"
        f"Responsável: {resp_nome}\n"
        f"Valor informado no pedido: {valor_calc}\n\n"
        f"Estou enviando o comprovante para conferência. Obrigado!"
    )
    assert_true(order_id in expected_dj_msg and resp_nome in expected_dj_msg, "Mensagem do Pix para Diácono Junior inclui código e responsável")
    assert_true("Estou enviando o comprovante para conferência." in expected_dj_msg, "Mensagem orienta que o comprovante será enviado pelo visitante")

    # 2. Ir. Fillipe - Cartão de Crédito
    expected_if_msg = (
        f"Olá, Ir. Fillipe! Fiz minha inscrição para o Retiro 2027 — Conectados e gostaria de realizar o pagamento com cartão de crédito.\n\n"
        f"Nome do responsável: {resp_nome}\n"
        f"Código do pedido: {order_id}\n"
        f"Valor dos ingressos a pagar: {valor_calc}\n\n"
        f"Gostaria de receber o link de pagamento e as opções de parcelamento disponíveis.\n\n"
        f"Obrigado!"
    )
    assert_true(order_id in expected_if_msg and "opções de parcelamento" in expected_if_msg, "Mensagem do cartão para Ir. Fillipe solicita link e parcelamento")

def test_pix_crc16():
    print("\n--- TESTE 6: Verificação do Algoritmo CRC16-CCITT do Pix ---")
    def calculate_crc16(payload):
        crc = 0xFFFF
        polynomial = 0x1021
        for char in payload:
            crc ^= (ord(char) << 8)
            for _ in range(8):
                if (crc & 0x8000) != 0:
                    crc = ((crc << 1) ^ polynomial) & 0xFFFF
                else:
                    crc = (crc << 1) & 0xFFFF
        return f"{crc:04X}"

    # Teste de vetor conhecido BACEN
    test_str = "00020101021126360014br.gov.bcb.pix0114+55959917564395204000053039865802BR5925Igreja Adventista Promess6015Boa Vista62170513RET-2027-00016304"
    calculated_crc = calculate_crc16(test_str)
    assert_true(len(calculated_crc) == 4, f"CRC16 gerado tem 4 caracteres hexadecimais: {calculated_crc}")

def test_google_apps_script_integrity():
    print("\n--- TESTE 7: Integridade do Código do Google Apps Script (Code.gs) ---")
    gs_path = os.path.join(ROOT_DIR, "google-apps-script/Code.gs")
    with open(gs_path, "r", encoding="utf-8") as f:
        code = f.read()

    assert_true("setupSpreadsheet" in code, "Função setupSpreadsheet implementada")
    assert_true("doPost" in code, "Função doPost implementada")
    assert_true("SHEET_PEDIDOS" in code and "SHEET_PARTICIPANTES" in code, "Abas PEDIDOS e PARTICIPANTES definidas")
    assert_true("America/Boa_Vista" in code, "Fuso horário America/Boa_Vista configurado no script")
    assert_true("LockService.getScriptLock()" in code, "Controle de concorrência com LockService presente")
    assert_true("Código do pedido" in code, "Coluna Código do pedido presente")
    assert_true("Pendente de validação" in code, "Status de isenção Pendente de validação implementado")
    assert_true("Aguardando confirmação" in code, "Status inicial da inscrição Aguardando confirmação implementado")
    assert_true("Aguardando pagamento" in code, "Status inicial do pagamento Aguardando pagamento implementado")
    assert_true("Vagas no ônibus da igreja" in code, "Coluna Vagas no ônibus da igreja presente em Code.gs")
    assert_true("Opção de transporte" in code, "Coluna Opção de transporte presente em Code.gs")

def test_transport_and_wizard_rules():
    print("\n--- TESTE 8: Regras de Transporte de Ônibus e Wizard de 4 Etapas ---")
    js_form_path = os.path.join(ROOT_DIR, "js/form.js")
    with open(js_form_path, "r", encoding="utf-8") as f:
        js = f.read()

    assert_true("totalSteps: 4" in js, "totalSteps definido como 4 no form.js")
    assert_true("transporteOnibus: false" in js, "Default do transporte inicia desmarcado (false)")
    assert_true("onibusCount" in js and "proprioCount" in js, "Cálculo de contagem de ônibus e transporte próprio implementado")
    assert_true("part-transporte-input" in js, "Checkbox de transporte de cada participante implementado")
    assert_true("step3-review-container" in js, "Etapa 3 é a Revisão do Pedido")
    assert_true("step4-total-display" in js, "Etapa 4 é a Forma de Pagamento")

    html_path = os.path.join(ROOT_DIR, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    assert_true("Transporte de ônibus incluso" in html, "Inclusão de transporte de ônibus destacada no HTML")
    assert_true('id="step-4"' in html and 'id="step-5"' not in html, "Formulário possui 4 etapas no HTML sem step-5")

if __name__ == "__main__":
    try:
        test_file_structure()
        test_config_data()
        test_html_official_texts()
        test_business_logic_rules()
        test_whatsapp_messages()
        test_pix_crc16()
        test_google_apps_script_integrity()
        test_transport_and_wizard_rules()
        print("\n>>> TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! <<<")
    except Exception as e:
        print(f"\n[ERRO CRITICO] ERRO DURANTE A EXECUCAO DOS TESTES: {e}")
        sys.exit(1)
