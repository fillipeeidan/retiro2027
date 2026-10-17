# Retiro 2027 — Conectados
### Igreja Adventista da Promessa — Boa Vista

Landing page moderna, responsiva, acolhedora e sistema completo de inscrições para o evento cristão **Retiro 2027 — Conectados**.

---

## 🌿 Visão Geral do Projeto

- **Tema Bíblico:** João 15:4 — *“Permaneçam em mim, e eu permanecerei em vocês.”*
- **Data do Evento:** 6 a 9 de fevereiro de 2027
- **Local:** Barão Branco Resort (a aproximadamente 15 km de Boa Vista, Roraima)
- **Prazo de Encerramento das Inscrições:** 30 de janeiro de 2027 às 23:59:59 (Fuso oficial: `America/Boa_Vista`, UTC-4)
- **Inclusões:** Alimentação e hospedagem incluídas na inscrição

---

## 💰 Tabela de Preços e Regras de Negócio

Todos os cálculos financeiros internos são processados estritamente em centavos para evitar divergências de arredondamento:

| Categoria | Faixa Etária | Valor Oficial | Regra e Observações |
|---|---|---|---|
| **Ingresso inteiro** | A partir de 12 anos | **R$ 150,00** (15000¢) | Idade calculada na data/hora do registro |
| **Meia-entrada** | 7 a 11 anos | **R$ 75,00** (7500¢) | Idade calculada na data/hora do registro |
| **Isenção infantil** | 0 a 6 anos | **Gratuito** (R$ 0,00) | Aplicada automaticamente no formulário |
| **Isenção PcD** | Qualquer idade | **R$ 0,00 inicial** | Validação manual pela organização. Fica com status *“Pendente de validação”* e **não** entra no total a pagar inicial nem bloqueia o pagamento dos demais participantes do mesmo pedido |

---

## 📱 Contatos Oficiais da Igreja

- **Diácono Junior:** `+55 95 99175-6439` (Dúvidas gerais, chave Pix e conferência de comprovantes)
- **Ir. Fillipe:** `+55 95 99137-8350` (Envio de link de pagamento com cartão de crédito em até 12x com juros)

---

## 🗂️ Estrutura de Arquivos

```text
├── index.html                    # Landing page e formulário multi-etapas completo
├── css/
│   └── styles.css                # Folha de estilos, paleta da videira, tipografia e responsividade
├── js/
│   ├── config.js                 # Configurações do evento, preços em centavos, contatos e fuso
│   ├── pix.js                    # Gerador de payload EMVCo Pix oficial (BR Code / BACEN) e QR Code
│   ├── form.js                   # Máquina de estados do formulário, validações, cálculo de idades
│   └── app.js                    # Navegação suave, menu mobile e âncoras
├── assets/
│   └── images/                   # Fotografias realistas e cinematográficas em alta resolução
│       ├── hero_vine.jpg         # Videira com iluminação matinal e espaço negativo para o título
│       ├── retreat_nature.jpg    # Paisagem natural e acolhedora do resort
│       └── fellowship.jpg        # Convivência cristã em ambiente natural
├── google-apps-script/
│   ├── Code.gs                   # Código do Apps Script com gravação atômica e idempotência
│   └── README_SETUP.md           # Guia passo a passo para deploy em 3 minutos no Google Sheets
└── test/
    └── run_tests.py              # Suíte de testes automatizados com 100% de cobertura
```

---

## 🚀 Como Executar Localmente

Você pode abrir o arquivo `index.html` diretamente em qualquer navegador moderno, ou iniciar um servidor HTTP local:

```bash
# Com Python 3
python -m http.server 8080
```
Em seguida, acesse no navegador: `http://localhost:8080/index.html`.

---

## 📊 Integração com o Google Sheets

A integração com o Google Sheets é realizada via **Google Apps Script publicado como Web App**, sem expor nenhuma chave privada no navegador do usuário.

A planilha oficial **`Inscrições — Retiro 2027`** possui duas abas estruturadas:
1. **`PEDIDOS`**: Armazena o código único do pedido (`RET-2027-XXXX`), data/hora no fuso de Boa Vista, nome e WhatsApp do responsável, quantidades por categoria, total calculado a pagar, forma de pagamento escolhida, status da inscrição (*Aguardando confirmação*) e status do pagamento (*Aguardando pagamento*).
2. **`PARTICIPANTES`**: Armazena uma linha para cada participante vinculado ao código do pedido, contendo data de nascimento, idade calculada, categoria, valor, se solicitou isenção por deficiência e o status da isenção (*Não solicitada*, *Isenção infantil automática* ou *Pendente de validação*).

Consulte o passo a passo completo no arquivo [`google-apps-script/README_SETUP.md`](google-apps-script/README_SETUP.md).

---

## 🧪 Suíte de Testes Automatizados

Para executar os testes de validação das regras de negócio, cálculos em centavos, mensagens do WhatsApp e integridade de arquivos:

```bash
python test/run_tests.py
```
Todos os 7 grupos de testes são executados automaticamente e validam 100% dos critérios de aceitação.
