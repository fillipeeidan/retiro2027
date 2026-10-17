/**
 * RETIRO 2027 — CONECTADOS
 * Igreja Adventista da Promessa — Boa Vista
 * Arquivo de Configurações Centrais da Aplicação
 */

const RETIRO_CONFIG = {
  // Informações Oficiais do Evento
  eventName: "Retiro 2027 — Conectados",
  organization: "Igreja Adventista da Promessa — Boa Vista",
  biblicalTheme: "João 15:4",
  verseText: "Permaneçam em mim, e eu permanecerei em vocês.",
  datesDisplay: "6 a 9 de fevereiro de 2027",
  locationDisplay: "Barão Branco Resort · a aproximadamente 15 km de Boa Vista, Roraima",
  resortName: "Barão Branco Resort",
  city: "Boa Vista, Roraima",
  inclusions: "Alimentação e hospedagem incluídas na inscrição",

  // Fuso horário oficial do evento
  timeZone: "America/Boa_Vista", // UTC-4 (sem horário de verão)
  timeZoneOffsetHours: -4,

  // Prazo final das inscrições: 30 de janeiro de 2027 às 23:59:59 (horário de Boa Vista)
  deadlineISO: "2027-01-30T23:59:59-04:00",
  deadlineDisplay: "30 de janeiro de 2027",

  // Tabela de Preços e Regras de Categoria (valores em centavos para precisão)
  pricing: {
    inteira: {
      id: "inteira",
      label: "Ingresso inteiro",
      minAge: 12,
      maxAge: 150,
      priceInCents: 15000, // R$ 150,00
      displayPrice: "R$ 150,00",
      description: "Para participantes com 12 anos ou mais na data da inscrição.",
    },
    meia: {
      id: "meia",
      label: "Meia-entrada",
      minAge: 7,
      maxAge: 11,
      priceInCents: 7500, // R$ 75,00
      displayPrice: "R$ 75,00",
      description: "Para crianças de 7 a 11 anos na data da inscrição.",
    },
    infantil: {
      id: "infantil",
      label: "Isenção infantil",
      minAge: 0,
      maxAge: 6,
      priceInCents: 0, // Gratuito
      displayPrice: "Gratuito",
      description: "Para crianças de 0 a 6 anos na data da inscrição.",
    },
    pcd: {
      id: "pcd",
      label: "Isenção por deficiência",
      priceInCents: 0, // Pendente de validação, não entra no total a pagar inicial
      displayPrice: "Sob validação manual",
      description: "Pessoas com deficiência podem solicitar isenção integral, independentemente da idade. Sujeito à validação manual da equipe.",
    }
  },

  // Contatos Oficiais
  contacts: {
    diaconoJunior: {
      name: "Diácono Junior",
      role: "Responsável Financeiro (Pix e Dúvidas)",
      phone: "+55 95 99175-6439",
      phoneRaw: "5595991756439",
    },
    irFillipe: {
      name: "Ir. Fillipe",
      role: "Responsável por Pagamentos com Cartão de Crédito",
      phone: "+55 95 99137-8350",
      phoneRaw: "5595991378350",
    }
  },

  // Configuração Oficial do Pix
  pix: {
    key: "+5595991756439", // Chave Pix celular oficial (Diácono Junior)
    keyDisplay: "(95) 99175-6439",
    keyType: "PHONE",
    receiverName: "Diácono Junior",
    receiverCity: "Boa Vista",
  },

  // URL do Google Apps Script publicado como Web App
  // Conectado à planilha 'Inscrições — Retiro 2027' no Google Sheets
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbzFtF9qvpgdprT7yRitCVKi_HYWg0LOODJWyAs605YrTstGnRCkAHBiYAfNY02EdvXspg/exec"
};

// Exportar globalmente
if (typeof window !== "undefined") {
  window.RETIRO_CONFIG = RETIRO_CONFIG;
}
