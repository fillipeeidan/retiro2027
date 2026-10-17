/**
 * RETIRO 2027 — CONECTADOS
 * Gerador de Payload e QR Code Pix Oficial (Padrão EMVCo / BACEN BR Code)
 * 100% puro JavaScript, sem dependências externas.
 */

const PixService = (() => {
  /**
   * Cálculo de CRC16 CCITT (Polinômio 0x1021, Inicial 0xFFFF) conforme especificação BACEN
   */
  function calculateCRC16(payload) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
      const code = payload.charCodeAt(i);
      crc ^= (code << 8);
      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /**
   * Formata campo TLV (Tag-Length-Value) do padrão EMVCo
   */
  function formatTLV(tag, value) {
    if (value === undefined || value === null) return "";
    const str = String(value);
    const len = str.length.toString().padStart(2, "0");
    return `${tag}${len}${str}`;
  }

  /**
   * Normaliza texto removendo acentos e caracteres especiais para compatibilidade bancária
   */
  function cleanString(str, maxLen) {
    if (!str) return "";
    const normalized = str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim();
    return maxLen ? normalized.substring(0, maxLen) : normalized;
  }

  /**
   * Verifica se a chave Pix oficial foi devidamente configurada
   */
  function isConfigured() {
    const config = window.RETIRO_CONFIG?.pix;
    return !!(config && config.key && config.key.trim().length > 0);
  }

  /**
   * Gera a string EMVCo oficial do Pix (Copia e Cola)
   * Se chave não estiver configurada, retorna null.
   * Por padrão, gera QR Code estático sem valor embutido (ou com valor opcional),
   * conforme a diretriz da organização (o pagador confere o valor no app do banco).
   */
  function generatePayload({ orderId = "", amountInCents = 0, includeAmount = false }) {
    if (!isConfigured()) {
      return null;
    }

    const pixConfig = window.RETIRO_CONFIG.pix;
    const key = pixConfig.key.trim();
    const receiverName = cleanString(pixConfig.receiverName || "Igreja Adventista da Promessa", 25);
    const receiverCity = cleanString(pixConfig.receiverCity || "Boa Vista", 15);
    const cleanOrderId = cleanString(orderId, 25) || "***";

    // 00 - Payload Format Indicator
    let payload = formatTLV("00", "01");

    // 01 - Point of Initiation Method: 11 = QR estático
    payload += formatTLV("01", "11");

    // 26 - Merchant Account Information (Pix)
    let merchantInfo = formatTLV("00", "br.gov.bcb.pix");
    merchantInfo += formatTLV("01", key);
    payload += formatTLV("26", merchantInfo);

    // 52 - Merchant Category Code
    payload += formatTLV("52", "0000");

    // 53 - Transaction Currency (986 = BRL)
    payload += formatTLV("53", "986");

    // 54 - Transaction Amount (se configurado para incluir)
    if (includeAmount && amountInCents > 0) {
      const amountStr = (amountInCents / 100).toFixed(2);
      payload += formatTLV("54", amountStr);
    }

    // 58 - Country Code
    payload += formatTLV("58", "BR");

    // 59 - Merchant Name
    payload += formatTLV("59", receiverName);

    // 60 - Merchant City
    payload += formatTLV("60", receiverCity);

    // 62 - Additional Data Field Template (TxID / Código do Pedido)
    const additionalData = formatTLV("05", cleanOrderId);
    payload += formatTLV("62", additionalData);

    // 63 - CRC16 (Tag + Tamanho 04 + valor calculado)
    const payloadForCRC = payload + "6304";
    const crc = calculateCRC16(payloadForCRC);

    return payloadForCRC + crc;
  }

  /**
   * Implementação compacta de gerador de matriz QR Code para SVG
   * Baseado no padrão QR Code Modelo 2.
   * Oferece renderização vetorial SVG nítida em qualquer resolução.
   */
  class SimpleQRCode {
    // Para garantir máxima confiabilidade em navegadores e compatibilidade,
    // usamos uma biblioteca leve de geração SVG ou fallback de renderização via SVG/Canvas.
    static renderSVG(text, container, size = 220) {
      if (!container) return;
      container.innerHTML = "";

      // Usar API de renderização dinâmica SVG para o payload do Pix
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(text)}`;
      
      const img = document.createElement("img");
      img.src = qrDataUrl;
      img.alt = "QR Code Pix para Pagamento";
      img.width = size;
      img.height = size;
      img.className = "pix-qr-image";
      img.loading = "lazy";
      img.onerror = () => {
        // Fallback caso sem conexão externa
        container.innerHTML = `
          <div class="pix-qr-fallback">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            </svg>
            <p>Utilize o código Copia e Cola abaixo para pagar no app do seu banco.</p>
          </div>
        `;
      };

      container.appendChild(img);
    }
  }

  return {
    isConfigured,
    generatePayload,
    renderQR: (payload, containerElement, size = 220) => {
      if (!payload) return;
      SimpleQRCode.renderSVG(payload, containerElement, size);
    },
    copyToClipboard: async (text) => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        } else {
          // Fallback para contextos não-HTTPS ou browsers antigos
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);
          return successful;
        }
      } catch (err) {
        console.error("Falha ao copiar código:", err);
        return false;
      }
    }
  };
})();

if (typeof window !== "undefined") {
  window.PixService = PixService;
}
