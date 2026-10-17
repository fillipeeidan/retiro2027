/**
 * ============================================================================
 * RETIRO 2027 — CONECTADOS | IGREJA ADVENTISTA DA PROMESSA — BOA VISTA
 * GOOGLE APPS SCRIPT — BACKEND DE INTEGRAÇÃO COM GOOGLE SHEETS
 * ============================================================================
 * 
 * Este script deve ser colado no Editor do Google Apps Script vinculado à planilha
 * "Inscrições — Retiro 2027".
 * 
 * INSTRUÇÕES RÁPIDAS DE IMPLANTAÇÃO:
 * 1. Crie uma nova planilha no Google Sheets com o nome "Inscrições — Retiro 2027".
 * 2. Acesse Extensões > Apps Script.
 * 3. Substitua todo o conteúdo do arquivo Código.gs por este código.
 * 4. Execute a função "setupSpreadsheet" uma única vez para criar as abas e cabeçalhos.
 * 5. Clique em "Implantar" > "Nova implantação".
 * 6. Tipo: "App da Web".
 * 7. Executar como: "Eu" (seu e-mail da igreja).
 * 8. Quem tem acesso: "Qualquer pessoa" (permite que o formulário público envie dados).
 * 9. Copie o URL do Web App gerado e cole no arquivo /js/config.js (googleAppsScriptUrl).
 */

const CONFIG = {
  TIMEZONE: "America/Boa_Vista",
  SHEET_PEDIDOS: "PEDIDOS",
  SHEET_PARTICIPANTES: "PARTICIPANTES",
  CURRENCY_SYMBOL: "R$ ",
  PRICING: {
    INTEIRA_CENTS: 15000,
    MEIA_CENTS: 7500,
    INFANTIL_CENTS: 0
  }
};

/**
 * Função de configuração inicial das abas e cabeçalhos.
 * Execute manualmente no editor do Apps Script ao instalar.
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Cabeçalhos da Aba PEDIDOS
  const headersPedidos = [
    "Código do pedido",
    "Data e hora do pedido",
    "Nome do responsável",
    "WhatsApp do responsável",
    "Quantidade total de participantes",
    "Quantidade de ingressos inteiros",
    "Quantidade de meias-entradas",
    "Quantidade de crianças isentas",
    "Quantidade de solicitações de isenção por deficiência pendentes",
    "Vagas no ônibus da igreja",
    "Transporte próprio",
    "Valor calculado a pagar",
    "Forma de pagamento escolhida",
    "Status da inscrição",
    "Status do pagamento",
    "Data e hora da confirmação do pagamento",
    "Observações administrativas"
  ];

  // Cabeçalhos da Aba PARTICIPANTES
  const headersParticipantes = [
    "Código do pedido",
    "Nome completo",
    "Data de nascimento",
    "Idade calculada na data da inscrição",
    "Categoria do ingresso",
    "Opção de transporte",
    "Valor calculado",
    "Solicitação de isenção por deficiência: Sim/Não",
    "Status da isenção",
    "Status individual do pagamento",
    "Observações administrativas"
  ];

  let sheetPedidos = ss.getSheetByName(CONFIG.SHEET_PEDIDOS);
  if (!sheetPedidos) {
    sheetPedidos = ss.insertSheet(CONFIG.SHEET_PEDIDOS);
  }
  formatHeaderRow(sheetPedidos, headersPedidos, "#1a4031");

  let sheetParticipantes = ss.getSheetByName(CONFIG.SHEET_PARTICIPANTES);
  if (!sheetParticipantes) {
    sheetParticipantes = ss.insertSheet(CONFIG.SHEET_PARTICIPANTES);
  }
  formatHeaderRow(sheetParticipantes, headersParticipantes, "#1a4031");

  // Remover a "Página1" padrão se estiver vazia
  const defaultSheet = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 2) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log("Planilha configurada com sucesso com as abas PEDIDOS e PARTICIPANTES!");
}

function formatHeaderRow(sheet, headers, bgColor) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    // Atualiza linha 1
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(bgColor);
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  
  // Auto-ajuste de colunas
  for (let c = 1; c <= headers.length; c++) {
    sheet.setColumnWidth(c, 180);
  }
}

/**
 * Endpoint GET para teste de conectividade e verificação de saúde da API
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Retiro 2027 Conectados Registration API",
    organization: "Igreja Adventista da Promessa - Boa Vista",
    serverTimeBoaVista: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss")
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint POST principal para processamento das inscrições
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  // Aguarda até 30 segundos para evitar concorrência de escritas na planilha
  try {
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse(false, "Servidor ocupado. Por favor, tente novamente em alguns instantes.", null, 503);
  }

  try {
    let payload;
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse(false, "Nenhum dado recebido na requisição.", null, 400);
    }

    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse(false, "Formato JSON inválido.", null, 400);
    }

    // 1. Validação dos dados do Responsável
    const responsavel = payload.responsavel || {};
    if (!responsavel.nome || !responsavel.nome.trim()) {
      return createJsonResponse(false, "Nome do responsável é obrigatório.", null, 400);
    }
    if (!responsavel.whatsapp || !responsavel.whatsapp.trim()) {
      return createJsonResponse(false, "WhatsApp do responsável é obrigatório.", null, 400);
    }

    // 2. Validação dos Participantes
    const participantes = payload.participantes || [];
    if (!Array.isArray(participantes) || participantes.length === 0) {
      return createJsonResponse(false, "É necessário cadastrar pelo menos um participante.", null, 400);
    }

    // 3. Validação do Código do Pedido
    const orderId = payload.orderId && payload.orderId.trim() ? payload.orderId.trim() : generateOrderId();
    const paymentMethod = payload.formaPagamento === "cartao" ? "Cartão de Crédito" : "Pix";

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetPedidos = ss.getSheetByName(CONFIG.SHEET_PEDIDOS);
    let sheetParticipantes = ss.getSheetByName(CONFIG.SHEET_PARTICIPANTES);

    if (!sheetPedidos || !sheetParticipantes) {
      setupSpreadsheet();
      sheetPedidos = ss.getSheetByName(CONFIG.SHEET_PEDIDOS);
      sheetParticipantes = ss.getSheetByName(CONFIG.SHEET_PARTICIPANTES);
    }

    // 4. Verificação de Idempotência: impede duplicação caso a requisição seja reenviada
    const existingOrders = sheetPedidos.getRange(2, 1, Math.max(sheetPedidos.getLastRow() - 1, 1), 1).getValues();
    for (let i = 0; i < existingOrders.length; i++) {
      if (existingOrders[i][0] === orderId) {
        // Pedido já foi gravado com sucesso anteriormente
        return createJsonResponse(true, "Pedido já registrado com sucesso.", {
          orderId: orderId,
          alreadyRecorded: true
        });
      }
    }

    // 5. Data e Hora oficiais no fuso de Boa Vista (America/Boa_Vista)
    const now = new Date();
    const dataHoraFormatted = Utilities.formatDate(now, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");

    // 6. Recálculo e conferência server-side das idades, categorias e valores
    let countInteira = 0;
    let countMeia = 0;
    let countInfantil = 0;
    let countPcdPendente = 0;
    let countOnibus = 0;
    let countProprio = 0;
    let totalCents = 0;

    const rowsParticipantes = [];

    for (let index = 0; index < participantes.length; index++) {
      const p = participantes[index];
      const pNome = (p.nome || "").trim();
      const pDataNasc = (p.dataNascimento || "").trim();
      const pPcdSolicitada = !!p.solicitaIsencaoPcd;
      const vaiDeOnibus = p.transporteOnibus !== false;

      if (vaiDeOnibus) {
        countOnibus++;
      } else {
        countProprio++;
      }
      const opcaoTransporte = vaiDeOnibus ? "Ônibus da igreja" : "Transporte próprio";

      if (!pNome) {
        return createJsonResponse(false, "Nome completo de todos os participantes é obrigatório.", null, 400);
      }
      if (!pDataNasc) {
        return createJsonResponse(false, "Data de nascimento de todos os participantes é obrigatória.", null, 400);
      }

      const idadeCalculada = calculateAge(pDataNasc, now);
      let categoria = "Ingresso inteiro";
      let valorUnitarioCents = CONFIG.PRICING.INTEIRA_CENTS;
      let statusIsencao = "Não solicitada";
      let statusPagamentoIndividual = "Aguardando pagamento";

      if (idadeCalculada <= 6) {
        categoria = "Isenção infantil";
        valorUnitarioCents = CONFIG.PRICING.INFANTIL_CENTS;
        statusIsencao = "Isenção infantil automática";
        statusPagamentoIndividual = "Isento";
        countInfantil++;
      } else if (idadeCalculada <= 11) {
        categoria = "Meia-entrada";
        valorUnitarioCents = CONFIG.PRICING.MEIA_CENTS;
        countMeia++;
        if (pPcdSolicitada) {
          statusIsencao = "Pendente de validação";
          countPcdPendente++;
          // Isenção PcD pendente NÃO é cobrada no total inicial
        } else {
          totalCents += valorUnitarioCents;
        }
      } else {
        categoria = "Ingresso inteiro";
        valorUnitarioCents = CONFIG.PRICING.INTEIRA_CENTS;
        countInteira++;
        if (pPcdSolicitada) {
          statusIsencao = "Pendente de validação";
          countPcdPendente++;
          // Isenção PcD pendente NÃO é cobrada no total inicial
        } else {
          totalCents += valorUnitarioCents;
        }
      }

      const valorFormatado = formatCurrency(pPcdSolicitada ? 0 : valorUnitarioCents);

      rowsParticipantes.push([
        orderId,
        pNome,
        formatDateBR(pDataNasc),
        idadeCalculada,
        categoria,
        opcaoTransporte,
        valorFormatado,
        pPcdSolicitada ? "Sim" : "Não",
        statusIsencao,
        pPcdSolicitada ? "Pendente de validação" : statusPagamentoIndividual,
        pPcdSolicitada ? "Aguardando contato da equipe via WhatsApp para validação de isenção PcD." : ""
      ]);
    }

    const totalFormatado = formatCurrency(totalCents);

    // 7. Montagem da linha de PEDIDO
    const rowPedido = [
      orderId,
      dataHoraFormatted,
      responsavel.nome.trim(),
      responsavel.whatsapp.trim(),
      participantes.length,
      countInteira,
      countMeia,
      countInfantil,
      countPcdPendente,
      countOnibus,
      countProprio,
      totalFormatado,
      paymentMethod,
      "Aguardando confirmação",
      "Aguardando pagamento",
      "", // Data confirmação do pagamento
      countPcdPendente > 0 ? "Contém pedido de isenção por deficiência em análise manual." : ""
    ];

    // 8. Gravação atômica na planilha
    sheetPedidos.appendRow(rowPedido);

    if (rowsParticipantes.length > 0) {
      const startRow = sheetParticipantes.getLastRow() + 1;
      const range = sheetParticipantes.getRange(startRow, 1, rowsParticipantes.length, rowsParticipantes[0].length);
      range.setValues(rowsParticipantes);
    }

    // 9. Resposta de Sucesso
    return createJsonResponse(true, "Inscrição registrada com sucesso no Google Sheets!", {
      orderId: orderId,
      totalFormatted: totalFormatado,
      totalCents: totalCents,
      participantsCount: participantes.length,
      formaPagamento: paymentMethod,
      timestamp: dataHoraFormatted
    });

  } catch (error) {
    Logger.log("Erro ao processar inscrição: " + error.toString());
    return createJsonResponse(false, "Erro interno ao salvar inscrição: " + error.toString(), null, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Funções Auxiliares
 */

function createJsonResponse(success, message, data, statusCode) {
  const output = {
    success: success,
    message: message,
    data: data || null
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function calculateAge(birthDateStr, referenceDate) {
  // birthDateStr pode ser YYYY-MM-DD ou DD/MM/YYYY
  let day, month, year;
  if (birthDateStr.indexOf("-") > -1) {
    const parts = birthDateStr.split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    const parts = birthDateStr.split("/");
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  const birth = new Date(year, month, day);
  const ref = referenceDate || new Date();
  
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function formatCurrency(cents) {
  const reais = (cents / 100).toFixed(2).replace(".", ",");
  return `${CONFIG.CURRENCY_SYMBOL}${reais}`;
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  if (dateStr.indexOf("-") > -1) {
    const parts = dateStr.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function generateOrderId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `#${num}`;
}
