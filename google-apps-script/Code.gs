/**
 * ============================================================================
 * RETIRO 2027 — CONECTADOS | IGREJA ADVENTISTA DA PROMESSA — BOA VISTA
 * GOOGLE APPS SCRIPT — BACKEND DE INTEGRAÇÃO COM GOOGLE SHEETS
 * ============================================================================
 * 
 * Este script deve ser colado no Editor do Google Apps Script vinculado à planilha
 * "Inscrições — Retiro 2027".
 * 
 * INSTRUÇÕES DE IMPLANTAÇÃO / ATUALIZAÇÃO:
 * 1. Abra a planilha do Google Sheets.
 * 2. Acesse Extensões > Apps Script.
 * 3. Substitua todo o conteúdo do arquivo Código.gs por este código e Salve (Ctrl+S).
 * 4. Execute a função "setupSpreadsheet" uma vez (cria os menus suspensos e organiza as colunas).
 * 5. Clique em "Implantar" > "Gerenciar implantações".
 * 6. Clique no ícone de lápis (Editar) > Versão: "Nova versão" > Clique em "Implantar".
 */

const CONFIG = {
  TIMEZONE: "America/Boa_Vista",
  SHEET_PEDIDOS: "PEDIDOS",
  SHEET_PARTICIPANTES: "PARTICIPANTES",
  CURRENCY_SYMBOL: "R$ ",
  DRIVE_FOLDER_NAME: "Comprovantes — Retiro 2027",
  PRICING: {
    INTEIRA_CENTS: 15000,
    MEIA_CENTS: 7500,
    INFANTIL_CENTS: 0,
    DIARIA_INTEIRA_CENTS: 6000,
    DIARIA_MEIA_CENTS: 3000
  }
};

/**
 * Função de configuração inicial e migração das abas e cabeçalhos.
 * Cria e configura os menus suspensos (validação de dados) e remove colunas redundantes.
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Cabeçalhos Oficiais da Aba PEDIDOS (17 Colunas)
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
    "Comprovante (Link)",
    "Data e hora da confirmação do pagamento",
    "Observações administrativas"
  ];

  // Cabeçalhos Oficiais da Aba PARTICIPANTES (11 Colunas)
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
  } else {
    // Migração inteligente: se a coluna antiga "Status do pagamento" existir, remove para unificar com "Status da inscrição"
    const lastCol = sheetPedidos.getLastColumn();
    if (lastCol > 0) {
      const currentHeaders = sheetPedidos.getRange(1, 1, 1, lastCol).getValues()[0];
      const colStatusPagamento = currentHeaders.indexOf("Status do pagamento") + 1;
      if (colStatusPagamento > 0) {
        sheetPedidos.deleteColumn(colStatusPagamento);
      }
    }

    // Se haviam registros com o texto legado "Aguardando confirmação", atualiza para "Aguardando pagamento"
    const lastRow = sheetPedidos.getLastRow();
    if (lastRow > 1) {
      const statusRange = sheetPedidos.getRange(2, 14, lastRow - 1, 1);
      const statusValues = statusRange.getValues();
      let changed = false;
      for (let r = 0; r < statusValues.length; r++) {
        if (statusValues[r][0] === "Aguardando confirmação") {
          statusValues[r][0] = "Aguardando pagamento";
          changed = true;
        }
      }
      if (changed) {
        statusRange.setValues(statusValues);
      }
    }
  }
  formatHeaderRow(sheetPedidos, headersPedidos, "#1a4031");

  let sheetParticipantes = ss.getSheetByName(CONFIG.SHEET_PARTICIPANTES);
  if (!sheetParticipantes) {
    sheetParticipantes = ss.insertSheet(CONFIG.SHEET_PARTICIPANTES);
  }
  formatHeaderRow(sheetParticipantes, headersParticipantes, "#1a4031");

  // Aplicar menus suspensos (Data Validation) nas colunas de seleção
  applyDropdownValidations(sheetPedidos, sheetParticipantes);

  // Remover a "Página1" padrão se estiver vazia
  const defaultSheet = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 2) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log("Planilha configurada e atualizada com sucesso com Menus Suspensos e Coluna de Comprovante!");
}

/**
 * Cria regras de Menu Suspenso (Dropdowns) para facilitar o trabalho da equipe financeira
 */
function applyDropdownValidations(sheetPedidos, sheetParticipantes) {
  const maxRowsPedidos = Math.max(sheetPedidos.getMaxRows() - 1, 500);

  // 1. Menu Suspenso: Forma de pagamento (Aba PEDIDOS - Coluna 13)
  const ruleForma = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pix", "Cartão de Crédito", "Isenção"], true)
    .setAllowInvalid(true)
    .build();
  sheetPedidos.getRange(2, 13, maxRowsPedidos, 1).setDataValidation(ruleForma);

  // 2. Menu Suspenso: Status da inscrição (Aba PEDIDOS - Coluna 14)
  const ruleStatusInscricao = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Aguardando pagamento", 
      "Comprovante enviado",
      "Pagamento confirmado", 
      "Pendente de validação PcD", 
      "Cancelado"
    ], true)
    .setAllowInvalid(true)
    .build();
  sheetPedidos.getRange(2, 14, maxRowsPedidos, 1).setDataValidation(ruleStatusInscricao);

  if (sheetParticipantes) {
    const maxRowsPart = Math.max(sheetParticipantes.getMaxRows() - 1, 500);

    // 3. Menu Suspenso: Opção de transporte (Aba PARTICIPANTES - Coluna 6)
    const ruleTransporte = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Ônibus da igreja", "Transporte próprio"], true)
      .setAllowInvalid(true)
      .build();
    sheetParticipantes.getRange(2, 6, maxRowsPart, 1).setDataValidation(ruleTransporte);

    // 4. Menu Suspenso: Solicitação de Isenção PcD (Aba PARTICIPANTES - Coluna 8)
    const ruleSimNao = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Sim", "Não"], true)
      .setAllowInvalid(true)
      .build();
    sheetParticipantes.getRange(2, 8, maxRowsPart, 1).setDataValidation(ruleSimNao);

    // 5. Menu Suspenso: Status da isenção (Aba PARTICIPANTES - Coluna 9)
    const ruleStatusIsencao = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        "Não solicitada", 
        "Pendente de validação", 
        "Isenção aprovada", 
        "Isenção recusada", 
        "Isenção infantil automática"
      ], true)
      .setAllowInvalid(true)
      .build();
    sheetParticipantes.getRange(2, 9, maxRowsPart, 1).setDataValidation(ruleStatusIsencao);

    // 6. Menu Suspenso: Status individual do pagamento (Aba PARTICIPANTES - Coluna 10)
    const ruleStatusIndiv = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        "Aguardando pagamento", 
        "Pagamento confirmado", 
        "Isento", 
        "Cancelado"
      ], true)
      .setAllowInvalid(true)
      .build();
    sheetParticipantes.getRange(2, 10, maxRowsPart, 1).setDataValidation(ruleStatusIndiv);
  }
}

/**
 * Gatilho simples onEdit do Google Sheets:
 * Quando o tesoureiro/equipe seleciona "Pagamento confirmado" no menu suspenso
 * da coluna "Status da inscrição" (Coluna 14), carimba automaticamente a Data e Hora
 * na coluna "Data e hora da confirmação do pagamento" (Coluna 16).
 */
function onEdit(e) {
  if (!e || !e.range) return;
  try {
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    const row = e.range.getRow();
    const col = e.range.getColumn();

    // Apenas a partir da linha 2 (ignora cabeçalho)
    if (row < 2) return;

    if (sheetName === CONFIG.SHEET_PEDIDOS) {
      if (col === 14) {
        const val = String(e.value || e.range.getValue()).trim();
        const cellDataHora = sheet.getRange(row, 16); // Coluna 16: Data e hora da confirmação

        if (val === "Pagamento confirmado") {
          if (!cellDataHora.getValue()) {
            const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
            cellDataHora.setValue(nowStr);
          }
        } else if (val === "Aguardando pagamento" || val === "Comprovante enviado" || val === "Cancelado") {
          cellDataHora.clearContent();
        }
      }
    }
  } catch (err) {
    // Ignorar falhas de contexto do gatilho
  }
}

function formatHeaderRow(sheet, headers, bgColor) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    if (lastCol > headers.length) {
      sheet.getRange(1, headers.length + 1, 1, lastCol - headers.length).clear();
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(bgColor);
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  
  // Auto-ajuste de largura de colunas
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
 * Endpoint POST principal para processamento das inscrições e upload de comprovantes
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
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

    // Rota 1: Upload de Comprovante de Pagamento
    if (payload.action === "uploadComprovante" || payload.fileBase64) {
      return handleUploadComprovante(payload);
    }

    // Rota 2: Envio Normal de Inscrição
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

    // 4. Verificação de Idempotência
    const existingOrders = sheetPedidos.getRange(2, 1, Math.max(sheetPedidos.getLastRow() - 1, 1), 1).getValues();
    for (let i = 0; i < existingOrders.length; i++) {
      if (existingOrders[i][0] === orderId) {
        return createJsonResponse(true, "Pedido já registrado com sucesso.", {
          orderId: orderId,
          alreadyRecorded: true
        });
      }
    }

    // 5. Data e Hora oficiais no fuso de Boa Vista
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

      // Suporte resiliente a diárias avulsas
      const isDiaria = p.modalidade === "diaria" || 
                       (typeof p.categoria === "string" && p.categoria.toLowerCase().includes("diária")) ||
                       (typeof p.categoria === "string" && p.categoria.toLowerCase().includes("diaria")) ||
                       (p.diasDiaria && p.diasDiaria > 0);
      const numDias = (p.diasDiaria === 2 || (typeof p.categoria === "string" && p.categoria.includes("2 Diária"))) ? 2 : 1;
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
        if (isDiaria) {
          categoria = `Meia-entrada (${numDias} diária${numDias > 1 ? "s" : ""})`;
          valorUnitarioCents = (typeof p.valorCents === "number" && p.valorCents > 0) 
            ? p.valorCents 
            : (CONFIG.PRICING.DIARIA_MEIA_CENTS * numDias);
        } else {
          categoria = "Meia-entrada (Retiro Completo)";
          valorUnitarioCents = CONFIG.PRICING.MEIA_CENTS;
        }
        countMeia++;
        if (pPcdSolicitada) {
          statusIsencao = "Pendente de validação";
          countPcdPendente++;
        } else {
          totalCents += valorUnitarioCents;
        }
      } else {
        if (isDiaria) {
          categoria = `Ingresso inteiro (${numDias} diária${numDias > 1 ? "s" : ""})`;
          valorUnitarioCents = (typeof p.valorCents === "number" && p.valorCents > 0) 
            ? p.valorCents 
            : (CONFIG.PRICING.DIARIA_INTEIRA_CENTS * numDias);
        } else {
          categoria = "Ingresso inteiro (Retiro Completo)";
          valorUnitarioCents = CONFIG.PRICING.INTEIRA_CENTS;
        }
        countInteira++;
        if (pPcdSolicitada) {
          statusIsencao = "Pendente de validação";
          countPcdPendente++;
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

    // Observações administrativas do pedido
    const observacoes = [];
    if (countPcdPendente > 0) {
      observacoes.push("Contém pedido de isenção por deficiência em análise manual.");
    }
    const temDiaria = participantes.some(p => p.modalidade === "diaria" || (typeof p.categoria === "string" && p.categoria.toLowerCase().includes("diár")));
    if (temDiaria) {
      observacoes.push("Contém participação por diária avulsa.");
    }

    // Status da Inscrição unificado
    let statusInscricao = "Aguardando pagamento";
    if (countPcdPendente > 0 && totalCents === 0) {
      statusInscricao = "Pendente de validação PcD";
    } else if (totalCents === 0 && countInfantil === participantes.length) {
      statusInscricao = "Pagamento confirmado";
    }

    // Montagem da linha de PEDIDO (17 Colunas)
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
      statusInscricao,
      "", // Coluna 15: Comprovante (Link do arquivo no Drive)
      statusInscricao === "Pagamento confirmado" ? dataHoraFormatted : "", // Coluna 16: Data/Hora confirmação
      observacoes.join(" | ") // Coluna 17: Observações administrativas
    ];

    sheetPedidos.appendRow(rowPedido);

    if (rowsParticipantes.length > 0) {
      const startRow = sheetParticipantes.getLastRow() + 1;
      const range = sheetParticipantes.getRange(startRow, 1, rowsParticipantes.length, rowsParticipantes[0].length);
      range.setValues(rowsParticipantes);
    }

    return createJsonResponse(true, "Inscrição registrada com sucesso no Google Sheets!", {
      orderId: orderId,
      totalFormatted: totalFormatado,
      totalCents: totalCents,
      participantsCount: participantes.length,
      formaPagamento: paymentMethod,
      timestamp: dataHoraFormatted
    });

  } catch (error) {
    Logger.log("Erro inesperado em doPost: " + error.toString());
    return createJsonResponse(false, "Erro interno ao processar a inscrição: " + error.message, null, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Processa o upload de comprovante de pagamento via Pix
 * Salva no Google Drive (pasta 'Comprovantes — Retiro 2027') e vincula o link na planilha
 */
function handleUploadComprovante(payload) {
  const orderId = (payload.orderId || "").trim();
  if (!orderId) {
    return createJsonResponse(false, "Código do pedido não informado.", null, 400);
  }

  if (!payload.fileBase64) {
    return createJsonResponse(false, "Nenhum arquivo de comprovante recebido.", null, 400);
  }

  try {
    let base64Data = payload.fileBase64;
    if (base64Data.indexOf("base64,") > -1) {
      base64Data = base64Data.split("base64,")[1];
    }
    const bytes = Utilities.base64Decode(base64Data);

    const safeOrderId = orderId.replace(/[^a-zA-Z0-9]/g, "");
    const cleanExt = (payload.fileName && payload.fileName.indexOf(".") > -1) 
      ? payload.fileName.split(".").pop().toLowerCase() 
      : "jpg";
    const fileName = `Comprovante_${safeOrderId}_${new Date().getTime()}.${cleanExt}`;
    const mimeType = payload.mimeType || (cleanExt === "pdf" ? "application/pdf" : "image/jpeg");
    const blob = Utilities.newBlob(bytes, mimeType, fileName);

    // Obter ou criar pasta no Google Drive
    let folder;
    const folderName = CONFIG.DRIVE_FOLDER_NAME || "Comprovantes — Retiro 2027";
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log("Aviso permissão compartilhamento: " + e.toString());
    }

    const fileUrl = file.getUrl();

    // Localizar o pedido na planilha PEDIDOS
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetPedidos = ss.getSheetByName(CONFIG.SHEET_PEDIDOS);
    if (!sheetPedidos) {
      setupSpreadsheet();
      sheetPedidos = ss.getSheetByName(CONFIG.SHEET_PEDIDOS);
    }

    const lastRow = sheetPedidos.getLastRow();
    let targetRow = -1;
    if (lastRow > 1) {
      const orderIds = sheetPedidos.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < orderIds.length; i++) {
        if (orderIds[i][0] === orderId) {
          targetRow = i + 2;
          break;
        }
      }
    }

    const now = new Date();
    const dataHoraFormatted = Utilities.formatDate(now, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");

    if (targetRow > 1) {
      // Atualizar Coluna 14: Status da inscrição para "Comprovante enviado"
      sheetPedidos.getRange(targetRow, 14).setValue("Comprovante enviado");

      // Atualizar Coluna 15: Comprovante (Link clicável)
      const formula = `=HYPERLINK("${fileUrl}"; "Visualizar Comprovante")`;
      sheetPedidos.getRange(targetRow, 15).setValue(formula);

      // Atualizar Coluna 17: Observações administrativas
      const obsCell = sheetPedidos.getRange(targetRow, 17);
      const currentObs = obsCell.getValue() ? String(obsCell.getValue()) : "";
      const newObs = currentObs 
        ? `${currentObs} | Comprovante anexado em ${dataHoraFormatted}`
        : `Comprovante anexado em ${dataHoraFormatted}`;
      obsCell.setValue(newObs);
    } else {
      // Caso o pedido não tenha sido localizado por algum motivo, registra linha avulsa de salvamento
      const rowAvulsa = [
        orderId,
        dataHoraFormatted,
        "Não identificado",
        "",
        1,
        1,
        0,
        0,
        0,
        0,
        1,
        "A conferir",
        "Pix",
        "Comprovante enviado",
        `=HYPERLINK("${fileUrl}"; "Visualizar Comprovante")`,
        "",
        "Comprovante recebido antes da gravação do pedido"
      ];
      sheetPedidos.appendRow(rowAvulsa);
    }

    return createJsonResponse(true, "Comprovante anexado com sucesso!", {
      orderId: orderId,
      fileUrl: fileUrl,
      fileName: fileName,
      statusInscricao: "Comprovante enviado",
      timestamp: dataHoraFormatted
    });

  } catch (err) {
    Logger.log("Erro ao processar comprovante: " + err.toString());
    return createJsonResponse(false, "Erro ao salvar comprovante no Google Drive: " + err.message, null, 500);
  }
}

function calculateAge(dateStr, refDate) {
  if (!dateStr) return 0;
  let day, month, year;

  if (dateStr.indexOf("-") > -1) {
    const parts = dateStr.split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (dateStr.indexOf("/") > -1) {
    const parts = dateStr.split("/");
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  } else {
    return 0;
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

  const birth = new Date(year, month, day);
  let age = refDate.getFullYear() - birth.getFullYear();
  const m = refDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  if (dateStr.indexOf("/") > -1) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return dateStr;
}

function formatCurrency(cents) {
  const value = (cents / 100).toFixed(2).replace(".", ",");
  return CONFIG.CURRENCY_SYMBOL + value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function generateOrderId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return "#" + num;
}

function createJsonResponse(success, message, data, httpCode) {
  const output = {
    success: success,
    message: message,
    data: data || null
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
