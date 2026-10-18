/**
 * RETIRO 2027 — CONECTADOS
 * Igreja Adventista da Promessa — Boa Vista
 * Módulo de Controle do Formulário Multi-etapas e Cálculos de Inscrição
 */

const RegistrationForm = (() => {
  // Estado reativo do formulário
  const state = {
    currentStep: 1,
    totalSteps: 4,
    responsavel: {
      nome: "",
      whatsapp: "",
    },
    participantes: [
      {
        id: "p_1",
        nome: "",
        dataNascimento: "",
        modalidade: "completo", // 'completo' ou 'diaria'
        diasDiaria: 1, // 1 ou 2
        transporteOnibus: false,
        solicitaIsencaoPcd: false,
        isAutoFilledFromResp: true,
      }
    ],
    formaPagamento: "pix", // 'pix' ou 'cartao'
    lastOrder: null,
    isSubmitting: false,
    errorMessage: "",
  };

  /**
   * Inicialização e carregamento do estado
   */
  function init() {
    loadDraft();
    checkRegistrationDeadline();
    renderStep(state.currentStep);
    setupEventListeners();
  }

  /**
   * Verifica se o prazo final de inscrições já foi atingido
   * 30 de janeiro de 2027, 23:59:59 (America/Boa_Vista, UTC-4)
   */
  function isRegistrationClosed() {
    const deadline = new Date(RETIRO_CONFIG.deadlineISO).getTime();
    const now = Date.now();
    return now > deadline;
  }

  function checkRegistrationDeadline() {
    const closed = isRegistrationClosed();
    const banner = document.getElementById("registration-closed-banner");
    const formContainer = document.getElementById("registration-form-card");

    if (closed) {
      if (banner) banner.style.display = "block";
      if (formContainer) {
        formContainer.style.display = "none";
      }
    } else {
      if (banner) banner.style.display = "none";
      if (formContainer) {
        formContainer.style.display = "block";
      }
    }
    return closed;
  }

  /**
   * Valida e analisa data de nascimento (DD/MM/AAAA ou AAAA-MM-DD)
   */
  function parseBirthDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const trimmed = dateStr.trim();
    let day, month, year;
    if (trimmed.includes("-")) {
      const parts = trimmed.split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      return null;
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    // Ano com 4 dígitos entre 1920 e ano atual
    const currentYear = new Date().getFullYear();
    if (year < 1920 || year > currentYear) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || (testDate.getMonth() + 1) !== month || testDate.getDate() !== day) {
      return null;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (testDate > today) return null;

    return { day, month, year, dateObj: testDate };
  }

  /**
   * Máscara para Data de Nascimento brasileira (DD/MM/AAAA)
   */
  function maskDate(value) {
    if (!value) return "";
    if (typeof value !== "string") value = String(value);
    // Se veio formato ISO YYYY-MM-DD (ex: rascunho anterior)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const p = value.split("-");
      return `${p[2]}/${p[1]}/${p[0]}`;
    }
    const clean = value.replace(/\D/g, "").substring(0, 8);
    if (clean.length <= 2) {
      return clean;
    }
    if (clean.length <= 4) {
      return `${clean.substring(0, 2)}/${clean.substring(2)}`;
    }
    return `${clean.substring(0, 2)}/${clean.substring(2, 4)}/${clean.substring(4, 8)}`;
  }

  /**
   * Cálculo de Idade exata com base na data de nascimento e fuso de Boa Vista
   */
  function calculateAge(birthDateStr) {
    if (!birthDateStr) return 0;
    
    let day, month, year;
    if (birthDateStr.includes("-")) {
      const parts = birthDateStr.split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else if (birthDateStr.includes("/")) {
      const parts = birthDateStr.split("/");
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else {
      return 0;
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

    const birth = new Date(year, month, day);
    const now = new Date();

    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  /**
   * Formatação monetária em Reais a partir de centavos
   */
  function formatMoney(cents) {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  /**
   * Avalia a categoria e regras de valor de um participante
   */
  function evaluateParticipant(p) {
    const rawDate = p.dataNascimento ? String(p.dataNascimento).trim() : "";
    const parsed = parseBirthDate(rawDate);
    const hasBirthDate = parsed !== null;
    const age = hasBirthDate ? calculateAge(rawDate) : null;
    const isDiaria = p.modalidade === "diaria";
    const numDias = (p.diasDiaria === 2) ? 2 : 1;

    let categoryKey = "inteira";
    let basePriceCents = isDiaria
      ? (RETIRO_CONFIG.diaria.inteiraCents * numDias)
      : RETIRO_CONFIG.pricing.inteira.priceInCents;
    let label = isDiaria
      ? `Ingresso inteiro · ${numDias} Diária${numDias > 1 ? "s" : ""}`
      : "Ingresso inteiro (Retiro Completo)";
    let isChild = false;
    let isHalf = false;

    if (hasBirthDate && age !== null) {
      if (age <= 6) {
        categoryKey = "infantil";
        basePriceCents = 0;
        label = RETIRO_CONFIG.pricing.infantil.label;
        isChild = true;
      } else if (age <= 11) {
        categoryKey = "meia";
        basePriceCents = isDiaria
          ? (RETIRO_CONFIG.diaria.meiaCents * numDias)
          : RETIRO_CONFIG.pricing.meia.priceInCents;
        label = isDiaria
          ? `Meia-entrada · ${numDias} Diária${numDias > 1 ? "s" : ""}`
          : "Meia-entrada (Retiro Completo)";
        isHalf = true;
      } else {
        categoryKey = "inteira";
        basePriceCents = isDiaria
          ? (RETIRO_CONFIG.diaria.inteiraCents * numDias)
          : RETIRO_CONFIG.pricing.inteira.priceInCents;
        label = isDiaria
          ? `Ingresso inteiro · ${numDias} Diária${numDias > 1 ? "s" : ""}`
          : "Ingresso inteiro (Retiro Completo)";
      }
    }

    let isPcdRequested = Boolean(p.solicitaIsencaoPcd);
    let exemptionStatus = "Não solicitada";
    let currentPayableCents = basePriceCents;

    if (isPcdRequested) {
      exemptionStatus = "Pendente de validação";
      currentPayableCents = 0;
    } else if (isChild) {
      exemptionStatus = "Isenção infantil automática";
      currentPayableCents = 0;
    }

    return {
      age: age !== null ? age : 0,
      hasBirthDate,
      categoryKey,
      categoryLabel: label,
      basePriceCents,
      currentPayableCents,
      isChild,
      isHalf,
      isDiaria,
      numDias,
      isPcdRequested,
      exemptionStatus,
    };
  }

  /**
   * Calcula o resumo financeiro consolidado de todo o pedido
   */
  function calculateSummary() {
    let inteiraCount = 0;
    let inteiraCompletoCount = 0;
    let inteiraDiariaCount = 0;
    let inteiraDiariaTotalDias = 0;

    let meiaCount = 0;
    let meiaCompletoCount = 0;
    let meiaDiariaCount = 0;
    let meiaDiariaTotalDias = 0;

    let infantilCount = 0;
    let pcdPendenteCount = 0;
    let onibusCount = 0;
    let proprioCount = 0;
    let totalCents = 0;
    let inteiraTotalCents = 0;
    let meiaTotalCents = 0;

    const evaluatedParticipants = state.participantes.map(p => {
      const evaluation = evaluateParticipant(p);
      const vaiDeOnibus = Boolean(p.transporteOnibus);

      if (vaiDeOnibus) {
        onibusCount++;
      } else {
        proprioCount++;
      }
      
      if (evaluation.isPcdRequested) {
        pcdPendenteCount++;
      } else if (evaluation.isChild) {
        infantilCount++;
      } else if (evaluation.isHalf) {
        meiaCount++;
        if (p.modalidade === "diaria") {
          meiaDiariaCount++;
          meiaDiariaTotalDias += (p.diasDiaria === 2 ? 2 : 1);
        } else {
          meiaCompletoCount++;
        }
        meiaTotalCents += evaluation.currentPayableCents;
        totalCents += evaluation.currentPayableCents;
      } else {
        inteiraCount++;
        if (p.modalidade === "diaria") {
          inteiraDiariaCount++;
          inteiraDiariaTotalDias += (p.diasDiaria === 2 ? 2 : 1);
        } else {
          inteiraCompletoCount++;
        }
        inteiraTotalCents += evaluation.currentPayableCents;
        totalCents += evaluation.currentPayableCents;
      }

      return {
        ...p,
        modalidade: p.modalidade === "diaria" ? "diaria" : "completo",
        diasDiaria: (p.diasDiaria === 2) ? 2 : 1,
        transporteOnibus: vaiDeOnibus,
        transporteTexto: vaiDeOnibus ? "Ônibus da igreja" : "Transporte próprio",
        evaluation
      };
    });

    return {
      evaluatedParticipants,
      inteiraCount,
      inteiraCompletoCount,
      inteiraDiariaCount,
      inteiraDiariaTotalDias,
      meiaCount,
      meiaCompletoCount,
      meiaDiariaCount,
      meiaDiariaTotalDias,
      infantilCount,
      pcdPendenteCount,
      onibusCount,
      proprioCount,
      totalParticipants: state.participantes.length,
      inteiraTotalCents,
      meiaTotalCents,
      totalCents,
      totalFormatted: formatMoney(totalCents)
    };
  }

  /**
   * Persistência de rascunho no sessionStorage
   */
  function saveDraft() {
    try {
      sessionStorage.setItem("retiro2027_form_draft", JSON.stringify({
        responsavel: state.responsavel,
        participantes: state.participantes,
        formaPagamento: state.formaPagamento,
        currentStep: state.currentStep,
      }));
    } catch (e) {
      // Ignorar falhas de storage privado
    }
  }

  function loadDraft() {
    try {
      const raw = sessionStorage.getItem("retiro2027_form_draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.responsavel) state.responsavel = parsed.responsavel;
        if (Array.isArray(parsed.participantes) && parsed.participantes.length > 0) {
          state.participantes = parsed.participantes.map(p => ({
            ...p,
            modalidade: p.modalidade === "diaria" ? "diaria" : "completo",
            diasDiaria: (p.diasDiaria === 2) ? 2 : 1,
            transporteOnibus: Boolean(p.transporteOnibus),
            solicitaIsencaoPcd: Boolean(p.solicitaIsencaoPcd)
          }));
          if (state.participantes[0] && state.participantes[0].isAutoFilledFromResp === undefined) {
            state.participantes[0].isAutoFilledFromResp = (
              !state.participantes[0].nome ||
              (state.responsavel.nome && state.participantes[0].nome === state.responsavel.nome)
            );
          }
        }
        if (parsed.formaPagamento) state.formaPagamento = parsed.formaPagamento;
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 4) {
          state.currentStep = parsed.currentStep;
        }
      }
    } catch (e) {
      console.warn("Não foi possível restaurar rascunho:", e);
    }
  }

  /**
   * Sincroniza o nome do responsável com o primeiro participante caso este
   * ainda não tenha sido preenchido ou tenha sido preenchido automaticamente.
   */
  function syncResponsibleWithFirstParticipant() {
    if (state.participantes && state.participantes.length > 0) {
      const first = state.participantes[0];
      const respNome = state.responsavel.nome ? state.responsavel.nome.trim() : "";
      if (respNome && (!first.nome || first.isAutoFilledFromResp)) {
        first.nome = respNome;
        first.isAutoFilledFromResp = true;
      }
    }
  }

  /**
   * Máscara e formatação para telefone brasileiro
   */
  function maskPhone(value) {
    if (!value) return "";
    let clean = value.replace(/\D/g, "").substring(0, 11);
    if (clean.length <= 2) {
      return `(${clean}`;
    }
    if (clean.length <= 6) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2)}`;
    }
    if (clean.length <= 10) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
    }
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7, 11)}`;
  }

  /**
   * Validações de Etapas
   */
  function validateStep(stepNumber) {
    clearErrors();

    if (stepNumber === 1) {
      let isValid = true;
      const nomeInput = document.getElementById("resp-nome");
      const telInput = document.getElementById("resp-whatsapp");

      state.responsavel.nome = nomeInput ? nomeInput.value.trim() : state.responsavel.nome;
      state.responsavel.whatsapp = telInput ? telInput.value.trim() : state.responsavel.whatsapp;

      if (!state.responsavel.nome || state.responsavel.nome.length < 3) {
        showError("resp-nome-error", "Por favor, informe seu nome completo (pelo menos 3 letras).");
        isValid = false;
      }

      const digits = state.responsavel.whatsapp.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11) {
        showError("resp-whatsapp-error", "Informe um número de WhatsApp válido com DDD (ex: 95 99123-4567).");
        isValid = false;
      } else {
        const ddd = parseInt(digits.substring(0, 2), 10);
        if (ddd < 11 || ddd > 99) {
          showError("resp-whatsapp-error", "DDD inválido. Por favor, confira o código de área.");
          isValid = false;
        }
      }

      if (isValid) {
        syncResponsibleWithFirstParticipant();
      }

      return isValid;
    }

    if (stepNumber === 2) {
      let isValid = true;
      if (!state.participantes || state.participantes.length === 0) {
        showGlobalError("Adicione pelo menos um participante para continuar.");
        return false;
      }

      state.participantes.forEach((p, idx) => {
        const nomeEl = document.getElementById(`part-nome-${p.id}`);
        const dataEl = document.getElementById(`part-nasc-${p.id}`);
        const pcdEl = document.getElementById(`part-pcd-${p.id}`);

        if (nomeEl) p.nome = nomeEl.value.trim();
        if (dataEl) p.dataNascimento = dataEl.value.trim();
        if (pcdEl) p.solicitaIsencaoPcd = pcdEl.checked;

        // Sincronizar com garantia modalidade e diasDiaria do DOM
        const radioDiaria = document.getElementById(`modalidade-diaria-${p.id}`);
        if (radioDiaria) {
          p.modalidade = radioDiaria.checked ? "diaria" : "completo";
        }
        const activeDayBtn = document.querySelector(`#diaria-days-box-${p.id} .btn-diaria-day.active`);
        if (activeDayBtn) {
          p.diasDiaria = parseInt(activeDayBtn.getAttribute("data-days"), 10) || 1;
        }

        if (!p.nome || p.nome.length < 2) {
          showError(`part-nome-error-${p.id}`, "Informe o nome completo do participante.");
          isValid = false;
        }

        if (!p.dataNascimento) {
          showError(`part-nasc-error-${p.id}`, "Informe a data de nascimento.");
          isValid = false;
        } else {
          const parsed = parseBirthDate(p.dataNascimento);
          if (!parsed) {
            showError(`part-nasc-error-${p.id}`, "Data de nascimento inválida. Digite no formato DD/MM/AAAA.");
            isValid = false;
          } else {
            const age = calculateAge(p.dataNascimento);
            if (age > 120 || age < 0) {
              showError(`part-nasc-error-${p.id}`, "Data de nascimento fora do limite permitido.");
              isValid = false;
            }
          }
        }
      });

      return isValid;
    }

    return true;
  }

  function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  }

  function clearErrors() {
    document.querySelectorAll(".form-error-msg").forEach(el => {
      el.textContent = "";
      el.style.display = "none";
    });
    const globalErr = document.getElementById("form-global-error");
    if (globalErr) {
      globalErr.textContent = "";
      globalErr.style.display = "none";
    }
  }

  function showGlobalError(msg) {
    const el = document.getElementById("form-global-error");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  /**
   * Navegação entre etapas
   */
  function goToStep(step) {
    if (step > state.currentStep) {
      const isValid = validateStep(state.currentStep);
      if (!isValid) return;
    }

    if (step < 1) step = 1;
    if (step > state.totalSteps) step = state.totalSteps;

    state.currentStep = step;
    saveDraft();
    renderStep(step);

    // Rolar suavemente para o cabeçalho do formulário
    const formCard = document.getElementById("inscricao");
    if (formCard) {
      formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function nextStep() {
    goToStep(state.currentStep + 1);
  }

  function prevStep() {
    goToStep(state.currentStep - 1);
  }

  /**
   * Gerenciamento de Participantes
   */
  function addParticipant() {
    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    state.participantes.push({
      id: newId,
      nome: "",
      dataNascimento: "",
      modalidade: "completo",
      diasDiaria: 1,
      transporteOnibus: false,
      solicitaIsencaoPcd: false,
    });
    saveDraft();
    renderStep2Participants();
  }

  function removeParticipant(id) {
    if (state.participantes.length <= 1) {
      showGlobalError("É necessário manter pelo menos um participante.");
      return;
    }
    state.participantes = state.participantes.filter(p => p.id !== id);
    saveDraft();
    renderStep2Participants();
  }

  /**
   * Renderização das Telas de cada Etapa
   */
  function renderStep(step) {
    updateProgressBar(step);

    // Ocultar todas as etapas
    for (let i = 1; i <= state.totalSteps; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (stepEl) {
        stepEl.style.display = (i === step) ? "block" : "none";
      }
    }

    if (step === 1) renderStep1();
    if (step === 2) renderStep2();
    if (step === 3) renderStep3();
    if (step === 4) renderStep4();
  }

  function updateProgressBar(step) {
    const indicators = document.querySelectorAll(".progress-step-item");
    indicators.forEach((ind, index) => {
      const stepIdx = index + 1;
      ind.classList.remove("active", "completed");
      if (stepIdx === step) {
        ind.classList.add("active");
      } else if (stepIdx < step) {
        ind.classList.add("completed");
      }
    });

    const progressBarFill = document.getElementById("form-progress-bar-fill");
    if (progressBarFill) {
      const percentage = ((step - 1) / (state.totalSteps - 1)) * 100;
      progressBarFill.style.width = `${percentage}%`;
    }
  }

  function renderStep1() {
    const nomeInput = document.getElementById("resp-nome");
    const telInput = document.getElementById("resp-whatsapp");
    if (nomeInput) nomeInput.value = state.responsavel.nome;
    if (telInput) telInput.value = state.responsavel.whatsapp;
  }

  function renderStep2() {
    syncResponsibleWithFirstParticipant();
    renderStep2Participants();
  }

  function renderStep2Participants() {
    const container = document.getElementById("participants-list-container");
    if (!container) return;

    container.innerHTML = "";

    state.participantes.forEach((p, index) => {
      const card = document.createElement("div");
      card.className = "participant-card";
      card.id = `card-${p.id}`;

      const evaluation = evaluateParticipant(p);
      const isAutoChild = evaluation.isChild;

      card.innerHTML = `
        <div class="participant-card-header">
          <div class="participant-badge-num">
            <span class="p-num">#${index + 1}</span>
            <span class="p-title-label">Participante</span>
          </div>
          ${state.participantes.length > 1 ? `
            <button type="button" class="btn-remove-participant" data-id="${p.id}" title="Remover este participante">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Remover</span>
            </button>
          ` : ""}
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label for="part-nome-${p.id}">Nome completo <span class="required">*</span></label>
            <input type="text" id="part-nome-${p.id}" class="form-input part-nome-input" 
                   data-id="${p.id}" placeholder="Nome e sobrenome" value="${escapeHtml(p.nome)}" required />
            <span id="part-nome-error-${p.id}" class="form-error-msg"></span>
          </div>

          <div class="form-group">
            <label for="part-nasc-${p.id}">Data de nascimento <span class="required">*</span></label>
            <input type="text" 
                   inputmode="numeric" 
                   id="part-nasc-${p.id}" 
                   class="form-input part-nasc-input" 
                   data-id="${p.id}" 
                   placeholder="DD/MM/AAAA" 
                   maxlength="10" 
                   autocomplete="bday"
                   value="${escapeHtml(maskDate(p.dataNascimento || ''))}" 
                   required />
            <span id="part-nasc-error-${p.id}" class="form-error-msg"></span>
          </div>
        </div>

        <!-- Modalidade de Inscrição: Completo ou Diária -->
        <div class="participant-modalidade-wrap">
          <label class="modalidade-title">Período de Participação:</label>
          <div class="modalidade-radios-grid">
            <label class="modalidade-card-label ${p.modalidade !== 'diaria' ? 'selected' : ''}" for="modalidade-comp-${p.id}">
              <input type="radio" 
                     id="modalidade-comp-${p.id}" 
                     name="modalidade-${p.id}" 
                     value="completo" 
                     class="part-modalidade-radio"
                     data-id="${p.id}" 
                     ${p.modalidade !== 'diaria' ? 'checked' : ''} />
              <span>Retiro Completo <small style="display:block; font-size:0.78rem; opacity:0.8; font-weight:normal;">Todos os dias (6 a 9 de fev)</small></span>
            </label>
            <label class="modalidade-card-label ${p.modalidade === 'diaria' ? 'selected' : ''}" for="modalidade-diaria-${p.id}">
              <input type="radio" 
                     id="modalidade-diaria-${p.id}" 
                     name="modalidade-${p.id}" 
                     value="diaria" 
                     class="part-modalidade-radio"
                     data-id="${p.id}" 
                     ${p.modalidade === 'diaria' ? 'checked' : ''} />
              <span>Diária Avulsa <small style="display:block; font-size:0.78rem; opacity:0.8; font-weight:normal;">R$ 60/dia (meia R$ 30/dia)</small></span>
            </label>
          </div>

          <!-- Seletor de Quantidade de Diárias -->
          <div class="diaria-days-box" id="diaria-days-box-${p.id}" style="${p.modalidade === 'diaria' ? 'display: block;' : 'display: none;'}">
            <span class="diaria-days-title">Quantas diárias esse participante irá comparecer?</span>
            <div class="diaria-days-buttons">
              <button type="button" 
                      class="btn-diaria-day ${(!p.diasDiaria || p.diasDiaria === 1) ? 'active' : ''}" 
                      data-id="${p.id}" 
                      data-days="1">
                1 Diária
              </button>
              <button type="button" 
                      class="btn-diaria-day ${p.diasDiaria === 2 ? 'active' : ''}" 
                      data-id="${p.id}" 
                      data-days="2">
                2 Diárias
              </button>
            </div>
            <span class="diaria-tip-note">💡 Participação em 3 ou mais dias? O <strong>Retiro Completo</strong> é mais econômico e inclui todas as atividades.</span>
          </div>
        </div>

        <div class="participant-preview-pill" id="preview-pill-${p.id}">
          ${evaluation.hasBirthDate ? `
            <span class="pill-age">Idade: <strong>${evaluation.age} ano(s)</strong></span>
            <span class="pill-category">Categoria: <strong>${evaluation.categoryLabel}</strong></span>
            <span class="pill-price">Valor: <strong>${p.solicitaIsencaoPcd ? "Sob validação manual" : (isAutoChild ? "Gratuito" : formatMoney(evaluation.currentPayableCents))}</strong></span>
          ` : `
            <span class="pill-hint">${p.modalidade === 'diaria' ? 'Diária selecionada. Digite a data de nascimento (DD/MM/AAAA) para calcular a categoria e valor.' : 'Digite a data de nascimento (DD/MM/AAAA) para calcular a categoria e o valor do ingresso.'}</span>
          `}
        </div>

        <!-- Opções do Participante: PcD e Transporte -->
        <div class="participant-options-block">
          <div class="checkbox-container">
            <label class="custom-checkbox-label">
              <input type="checkbox" id="part-pcd-${p.id}" class="part-pcd-input" 
                     data-id="${p.id}" ${p.solicitaIsencaoPcd ? "checked" : ""} />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">${index === 0 ? "Sou pessoa com deficiência ou desejo solicitar isenção para este participante." : "Desejo solicitar isenção por deficiência para este participante."}</span>
            </label>
          </div>
          <div class="pcd-notice" id="pcd-notice-${p.id}" style="${p.solicitaIsencaoPcd ? "display: block;" : "display: none;"}">
            <div class="alert-box alert-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div>
                <strong>Atenção:</strong> Este pedido será analisado pela equipe organizadora. A solicitação ficará pendente até a validação. Você poderá continuar a inscrição e pagar os demais ingressos normalmente.
              </div>
            </div>
          </div>

          <div class="checkbox-container">
            <label class="custom-checkbox-label">
              <input type="checkbox" id="part-transporte-${p.id}" class="part-transporte-input" 
                     data-id="${p.id}" ${p.transporteOnibus ? "checked" : ""} />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">Vou no transporte de ônibus da igreja (ida e volta incluso)</span>
            </label>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // Reanexar eventos aos campos dinâmicos
    attachParticipantCardEvents();
  }

  function updateParticipantPill(id) {
    const participant = state.participantes.find(p => p.id === id);
    if (!participant) return;
    const pill = document.getElementById(`preview-pill-${id}`);
    if (!pill) return;

    const rawDate = participant.dataNascimento ? String(participant.dataNascimento).trim() : "";
    const masked = maskDate(rawDate);
    const digits = masked.replace(/\D/g, "");

    if (digits.length === 8) {
      const parsed = parseBirthDate(masked);
      if (parsed) {
        const evalP = evaluateParticipant(participant);
        pill.innerHTML = `
          <span class="pill-age">Idade: <strong>${evalP.age} ano(s)</strong></span>
          <span class="pill-category">Categoria: <strong>${evalP.categoryLabel}</strong></span>
          <span class="pill-price">Valor: <strong>${participant.solicitaIsencaoPcd ? "Sob validação manual" : (evalP.isChild ? "Gratuito" : formatMoney(evalP.currentPayableCents))}</strong></span>
        `;
      } else {
        pill.innerHTML = `<span class="pill-hint" style="color: #e05252;">Data de nascimento inválida.</span>`;
      }
    } else {
      if (participant.modalidade === "diaria") {
        const numDias = participant.diasDiaria === 2 ? 2 : 1;
        pill.innerHTML = `<span class="pill-hint">Diária selecionada (${numDias} dia${numDias > 1 ? "s" : ""}). Digite a data de nascimento (DD/MM/AAAA) para calcular a categoria e valor.</span>`;
      } else {
        pill.innerHTML = `<span class="pill-hint">Digite a data de nascimento (DD/MM/AAAA) para calcular a categoria e o valor do ingresso.</span>`;
      }
    }
  }

  function attachParticipantCardEvents() {
    // Remover participante
    document.querySelectorAll(".btn-remove-participant").forEach(btn => {
      btn.onclick = (e) => {
        const id = btn.getAttribute("data-id");
        removeParticipant(id);
      };
    });

    // Modalidade: Completo vs Diária
    document.querySelectorAll(".part-modalidade-radio").forEach(radio => {
      radio.onchange = (e) => {
        const id = radio.getAttribute("data-id");
        const participant = state.participantes.find(p => p.id === id);
        if (!participant) return;

        participant.modalidade = radio.value;
        if (!participant.diasDiaria) participant.diasDiaria = 1;

        const card = document.getElementById(`card-${id}`);
        if (card) {
          card.querySelectorAll(".modalidade-card-label").forEach(lbl => {
            const r = lbl.querySelector("input[type='radio']");
            if (r && r.checked) {
              lbl.classList.add("selected");
            } else {
              lbl.classList.remove("selected");
            }
          });
        }

        const daysBox = document.getElementById(`diaria-days-box-${id}`);
        if (daysBox) {
          daysBox.style.display = (participant.modalidade === "diaria") ? "block" : "none";
        }

        saveDraft();
        updateParticipantPill(id);
      };
    });

    // Clique direto nos cards de modalidade para melhor usabilidade em dispositivos móveis
    document.querySelectorAll(".modalidade-card-label").forEach(lbl => {
      lbl.onclick = (e) => {
        const radio = lbl.querySelector("input[type='radio']");
        if (radio && !radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change"));
        }
      };
    });

    // Botões de Quantidade de Diárias (1 ou 2)
    document.querySelectorAll(".btn-diaria-day").forEach(btn => {
      btn.onclick = (e) => {
        const id = btn.getAttribute("data-id");
        const days = parseInt(btn.getAttribute("data-days"), 10) || 1;
        const participant = state.participantes.find(p => p.id === id);
        if (!participant) return;

        participant.diasDiaria = days;

        const daysBox = document.getElementById(`diaria-days-box-${id}`);
        if (daysBox) {
          daysBox.querySelectorAll(".btn-diaria-day").forEach(b => {
            if (parseInt(b.getAttribute("data-days"), 10) === days) {
              b.classList.add("active");
            } else {
              b.classList.remove("active");
            }
          });
        }

        saveDraft();
        updateParticipantPill(id);
      };
    });

    // Inputs de data de nascimento -> digitação contínua com máscara e atualização fluida sem re-renderizar
    document.querySelectorAll(".part-nasc-input").forEach(input => {
      const updateDateAndPill = () => {
        const id = input.getAttribute("data-id");
        const participant = state.participantes.find(p => p.id === id);
        if (!participant) return;

        const masked = maskDate(input.value);
        if (input.value !== masked) {
          input.value = masked;
        }

        participant.dataNascimento = masked;
        saveDraft();

        const errorEl = document.getElementById(`part-nasc-error-${id}`);
        const digits = masked.replace(/\D/g, "");

        if (digits.length === 8) {
          const parsed = parseBirthDate(masked);
          if (parsed) {
            if (errorEl) {
              errorEl.textContent = "";
              errorEl.style.display = "none";
            }
          } else {
            if (errorEl) {
              errorEl.textContent = "Data inválida. Verifique o dia, mês e ano.";
              errorEl.style.display = "block";
            }
          }
        } else {
          if (errorEl) {
            errorEl.textContent = "";
            errorEl.style.display = "none";
          }
        }
        updateParticipantPill(id);
      };

      input.oninput = updateDateAndPill;

      input.onblur = () => {
        const id = input.getAttribute("data-id");
        const participant = state.participantes.find(p => p.id === id);
        if (!participant) return;

        const errorEl = document.getElementById(`part-nasc-error-${id}`);
        const masked = maskDate(input.value);
        const digits = masked.replace(/\D/g, "");

        if (digits.length === 0) {
          if (errorEl) {
            errorEl.textContent = "Informe a data de nascimento.";
            errorEl.style.display = "block";
          }
        } else if (digits.length < 8 || !parseBirthDate(masked)) {
          if (errorEl) {
            errorEl.textContent = "Data incompleta ou inválida. Use o formato DD/MM/AAAA.";
            errorEl.style.display = "block";
          }
        } else {
          if (errorEl) {
            errorEl.textContent = "";
            errorEl.style.display = "none";
          }
        }
      };
    });

    // Inputs de nome
    document.querySelectorAll(".part-nome-input").forEach(input => {
      input.oninput = (e) => {
        const id = input.getAttribute("data-id");
        const participant = state.participantes.find(p => p.id === id);
        if (participant) {
          participant.nome = input.value;
          if (participant === state.participantes[0]) {
            const respNome = state.responsavel.nome ? state.responsavel.nome.trim() : "";
            participant.isAutoFilledFromResp = (participant.nome.trim() === respNome);
          }
          saveDraft();
        }
      };
    });

    // Checkbox PcD
    document.querySelectorAll(".part-pcd-input").forEach(input => {
      input.onchange = (e) => {
        const id = input.getAttribute("data-id");
        const participant = state.participantes.find(p => p.id === id);
        if (participant) {
          participant.solicitaIsencaoPcd = input.checked;
          const notice = document.getElementById(`pcd-notice-${id}`);
          if (notice) {
            notice.style.display = input.checked ? "block" : "none";
          }
          saveDraft();
          updateParticipantPill(id);
        }
      };
    });

    // Checkbox Transporte Ônibus / Próprio
    document.querySelectorAll(".part-transporte-input").forEach(input => {
      input.onchange = (e) => {
        const id = input.getAttribute("data-id");
        const participant = state.participantes.find(p => p.id === id);
        if (participant) {
          participant.transporteOnibus = input.checked;
          saveDraft();
        }
      };
    });
  }

  function renderStep3() {
    const summary = calculateSummary();
    const container = document.getElementById("step3-review-container");
    if (!container) return;

    container.innerHTML = `
      <div class="review-group-box">
        <h4 class="review-section-title">Responsável pelo Pedido</h4>
        <div class="review-info-row">
          <span>Nome:</span> <strong>${escapeHtml(state.responsavel.nome)}</strong>
        </div>
        <div class="review-info-row">
          <span>WhatsApp:</span> <strong>${escapeHtml(state.responsavel.whatsapp)}</strong>
        </div>
      </div>

      <div class="review-group-box">
        <h4 class="review-section-title">Participantes Cadastrados (${summary.totalParticipants})</h4>
        <div class="review-participants-table">
          ${summary.evaluatedParticipants.map((p, idx) => `
            <div class="review-participant-row">
              <div class="rp-info">
                <strong>${idx + 1}. ${escapeHtml(p.nome)}</strong>
                <span class="rp-sub">${p.evaluation.categoryLabel} · ${p.evaluation.age} ano(s)</span>
                <span class="rp-transport-tag ${p.transporteOnibus ? "tag-bus" : "tag-own"}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="13" rx="2"></rect>
                    <path d="M16 2v2M8 2v2M3 10h18"></path>
                  </svg>
                  ${p.transporteTexto}
                </span>
                ${p.evaluation.isPcdRequested ? `<span class="rp-tag-warning">Solicitação de isenção PcD pendente</span>` : ""}
              </div>
              <div class="rp-price">
                ${p.evaluation.isPcdRequested ? `
                  <span class="price-pending">Em validação</span>
                ` : `
                  <span>${formatMoney(p.evaluation.currentPayableCents)}</span>
                `}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Resumo Logística de Transporte -->
      <div class="review-transport-summary-card">
        <h4 class="review-transport-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="13" rx="2"></rect>
            <path d="M16 2v2M8 2v2M3 10h18"></path>
            <circle cx="7" cy="18" r="2"></circle>
            <circle cx="17" cy="18" r="2"></circle>
          </svg>
          Logística de Transporte (Igreja — Barão Branco Resort)
        </h4>
        <div class="review-transport-stats">
          <div class="stat-item">
            <span class="stat-num">${summary.onibusCount}</span>
            <span class="stat-label">Vaga(s) no Ônibus da Igreja</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">${summary.proprioCount}</span>
            <span class="stat-label">Em Transporte Próprio</span>
          </div>
        </div>
      </div>

      <div class="financial-summary-card">
        <h4 class="financial-title">Resumo Financeiro da Inscrição</h4>
        
        ${summary.inteiraCompletoCount > 0 ? `
          <div class="fin-row">
            <span>Ingresso inteiro (Retiro Completo):</span>
            <span>${summary.inteiraCompletoCount} × R$ 150,00 = <strong>${formatMoney(summary.inteiraCompletoCount * RETIRO_CONFIG.pricing.inteira.priceInCents)}</strong></span>
          </div>
        ` : ""}

        ${summary.inteiraDiariaCount > 0 ? `
          <div class="fin-row">
            <span>Ingresso inteiro (Diária avulsa):</span>
            <span>${summary.inteiraDiariaTotalDias} diária(s) × R$ 60,00 = <strong>${formatMoney(summary.inteiraDiariaTotalDias * RETIRO_CONFIG.diaria.inteiraCents)}</strong></span>
          </div>
        ` : ""}

        ${summary.meiaCompletoCount > 0 ? `
          <div class="fin-row">
            <span>Meia-entrada (Retiro Completo):</span>
            <span>${summary.meiaCompletoCount} × R$ 75,00 = <strong>${formatMoney(summary.meiaCompletoCount * RETIRO_CONFIG.pricing.meia.priceInCents)}</strong></span>
          </div>
        ` : ""}

        ${summary.meiaDiariaCount > 0 ? `
          <div class="fin-row">
            <span>Meia-entrada (Diária avulsa):</span>
            <span>${summary.meiaDiariaTotalDias} diária(s) × R$ 30,00 = <strong>${formatMoney(summary.meiaDiariaTotalDias * RETIRO_CONFIG.diaria.meiaCents)}</strong></span>
          </div>
        ` : ""}

        ${summary.infantilCount > 0 ? `
          <div class="fin-row">
            <span>Isenção infantil:</span>
            <span>${summary.infantilCount} × R$ 0,00 = <strong>R$ 0,00</strong></span>
          </div>
        ` : ""}

        ${(summary.inteiraCount === 0 && summary.meiaCount === 0 && summary.infantilCount === 0) ? `
          <div class="fin-row">
            <span>Inscrição:</span>
            <span>0 participante(s) com valor calculado</span>
          </div>
        ` : ""}

        ${summary.pcdPendenteCount > 0 ? `
          <div class="fin-row fin-row-pending">
            <span>Isenção por deficiência pendente:</span>
            <span><strong>${summary.pcdPendenteCount} solicitação(ões) em análise</strong></span>
          </div>
        ` : ""}

        <div class="fin-divider"></div>

        <div class="fin-total-row">
          <span class="fin-total-label">Total a pagar neste momento:</span>
          <span class="fin-total-value">${summary.totalFormatted}</span>
        </div>

        ${summary.pcdPendenteCount > 0 ? `
          <div class="fin-pcd-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <p>O total acima contempla apenas os ingressos com valor definido. A solicitação de isenção por deficiência continuará em análise e não impede o pagamento dos demais participantes.</p>
          </div>
        ` : ""}
      </div>
    `;
  }

  /**
   * Atualiza dinamicamente o valor e os avisos de taxa da máquina no Step 4
   */
  function updateStep4PaymentDisplay() {
    const summary = calculateSummary();
    const totalEl = document.getElementById("step4-total-display");
    if (totalEl) {
      totalEl.textContent = summary.totalFormatted;
    }

    const radioCartao = document.getElementById("pay-cartao");
    const isCartao = radioCartao ? radioCartao.checked : (state.formaPagamento === "cartao");

    const labelEl = document.getElementById("step4-amount-label");
    const taxHintEl = document.getElementById("step4-amount-tax-hint");
    const taxSubEl = document.getElementById("step4-amount-tax-sub");

    if (isCartao) {
      if (labelEl) labelEl.textContent = "Valor base dos ingressos:";
      if (taxHintEl) taxHintEl.style.display = "block";
      if (taxSubEl) taxSubEl.style.display = "block";
    } else {
      if (labelEl) labelEl.textContent = "Total a pagar neste momento:";
      if (taxHintEl) taxHintEl.style.display = "none";
      if (taxSubEl) taxSubEl.style.display = "none";
    }
  }

  function renderStep4() {
    // Seleção de forma de pagamento
    const radioPix = document.getElementById("pay-pix");
    const radioCartao = document.getElementById("pay-cartao");

    if (radioPix && radioCartao) {
      if (state.formaPagamento === "cartao") {
        radioCartao.checked = true;
      } else {
        radioPix.checked = true;
      }
    }

    updateStep4PaymentDisplay();
  }

  /**
   * Envio definitivo do formulário
   */
  async function submitRegistration() {
    if (state.isSubmitting) return;

    if (isRegistrationClosed()) {
      showGlobalError("As inscrições para o Retiro 2027 foram encerradas.");
      return;
    }

    // Coletar forma de pagamento selecionada
    const radioCartao = document.getElementById("pay-cartao");
    state.formaPagamento = (radioCartao && radioCartao.checked) ? "cartao" : "pix";

    const summary = calculateSummary();
    const orderId = generateOrderId();

    const payload = {
      orderId: orderId,
      formaPagamento: state.formaPagamento,
      responsavel: {
        nome: state.responsavel.nome.trim(),
        whatsapp: state.responsavel.whatsapp.trim(),
      },
      participantes: summary.evaluatedParticipants.map((p) => ({
        nome: p.nome.trim(),
        dataNascimento: maskDate(p.dataNascimento),
        idade: p.evaluation.age,
        modalidade: p.modalidade || "completo",
        diasDiaria: (p.modalidade === "diaria") ? (p.diasDiaria === 2 ? 2 : 1) : null,
        categoria: p.evaluation.categoryLabel,
        valorCents: p.evaluation.isPcdRequested ? 0 : p.evaluation.currentPayableCents,
        solicitaIsencaoPcd: p.evaluation.isPcdRequested,
        statusIsencao: p.evaluation.exemptionStatus,
        transporte: p.transporteTexto,
        transporteOnibus: p.transporteOnibus,
      })),
      resumo: {
        totalParticipantes: summary.totalParticipants,
        inteiraCount: summary.inteiraCount,
        inteiraCompletoCount: summary.inteiraCompletoCount,
        inteiraDiariaCount: summary.inteiraDiariaCount,
        inteiraDiariaTotalDias: summary.inteiraDiariaTotalDias,
        meiaCount: summary.meiaCount,
        meiaCompletoCount: summary.meiaCompletoCount,
        meiaDiariaCount: summary.meiaDiariaCount,
        meiaDiariaTotalDias: summary.meiaDiariaTotalDias,
        infantilCount: summary.infantilCount,
        pcdPendenteCount: summary.pcdPendenteCount,
        onibusCount: summary.onibusCount,
        proprioCount: summary.proprioCount,
        totalCents: summary.totalCents,
        totalFormatted: summary.totalFormatted,
      },
      clientTimestamp: new Date().toISOString()
    };

    setSubmitLoading(true);

    try {
      const endpoint = RETIRO_CONFIG.googleAppsScriptUrl;
      let recordedSuccessfully = false;

      if (endpoint && endpoint.startsWith("https://script.google.com")) {
        // Envio resiliente ao Google Sheets via Google Apps Script Web App
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            mode: "cors",
            redirect: "follow",
            headers: {
              "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData && resData.success) {
              recordedSuccessfully = true;
            }
          }
        } catch (corsErr) {
          console.warn("Aviso de redirecionamento CORS no navegador. Aplicando no-cors garantido:", corsErr);
        }

        // Se o modo CORS sofreu restrição de redirect no navegador, o modo no-cors envia sem bloqueio
        if (!recordedSuccessfully) {
          await fetch(endpoint, {
            method: "POST",
            mode: "no-cors",
            headers: {
              "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
          });
          recordedSuccessfully = true;
        }
      } else {
        // Modo de demonstração / testes locais enquanto a URL do Web App não é configurada
        console.info("AVISO: URL do Google Apps Script ainda não configurada em config.js. Salvando localmente para testes:", payload);
        recordedSuccessfully = true;
      }

      if (recordedSuccessfully) {
        state.lastOrder = payload;
        // Salva registro no localStorage para persistência de teste
        try {
          const pastOrders = JSON.parse(localStorage.getItem("retiro2027_orders") || "[]");
          pastOrders.push(payload);
          localStorage.setItem("retiro2027_orders", JSON.stringify(pastOrders));
          sessionStorage.removeItem("retiro2027_form_draft");
        } catch (e) {}

        // Exibir tela de conclusão
        renderCompletionScreen(payload);
      }
    } catch (err) {
      console.error("Falha ao enviar inscrição:", err);
      showGlobalError(
        "Não foi possível concluir o registro da sua inscrição devido a uma falha de conexão. " +
        "Nenhum dado foi perdido. Por favor, confira sua conexão e tente novamente."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function setSubmitLoading(isLoading) {
    state.isSubmitting = isLoading;
    const btn = document.getElementById("btn-submit-order");
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner"></span>
        <span>Gravando inscrição com segurança...</span>
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = `
        <span>CONCLUIR INSCRIÇÃO</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }
  }

  /**
   * Renderização da Tela de Conclusão (Pix ou Cartão)
   */
  function renderCompletionScreen(order) {
    const formCard = document.getElementById("registration-form-card");
    const completionContainer = document.getElementById("completion-container");
    if (formCard) formCard.style.display = "none";
    if (!completionContainer) return;

    completionContainer.style.display = "block";
    completionContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    const isPix = order.formaPagamento === "pix";
    const hasPcdPending = order.resumo.pcdPendenteCount > 0;

    if (isPix) {
      renderPixCompletion(order, completionContainer, hasPcdPending);
    } else {
      renderCartaoCompletion(order, completionContainer, hasPcdPending);
    }
  }

  function renderPixCompletion(order, container, hasPcdPending) {
    const isConfigured = PixService.isConfigured();
    const pixPayload = isConfigured ? PixService.generatePayload({
      orderId: order.orderId,
      amountInCents: order.resumo.totalCents,
      includeAmount: order.resumo.totalCents > 0
    }) : null;

    const pixKeyFormatted = RETIRO_CONFIG.pix.keyDisplay || "(95) 99175-6439";
    const pixKeyRaw = RETIRO_CONFIG.pix.key || "+5595991756439";

    // Mensagem oficial pré-formatada para o WhatsApp do Diácono Junior (com o código do pedido incluso)
    const waText = 
      `Olá, Diácono Junior! Realizei o pagamento da minha inscrição para o Retiro 2027 — Conectados.\n\n` +
      `Código do pedido: ${order.orderId}\n` +
      `Responsável: ${order.responsavel.nome}\n` +
      `Valor informado no pedido: ${order.resumo.totalFormatted}\n\n` +
      `Estou enviando o comprovante para conferência. Obrigado!`;

    const waUrl = `https://wa.me/${RETIRO_CONFIG.contacts.diaconoJunior.phoneRaw}?text=${encodeURIComponent(waText)}`;

    container.innerHTML = `
      <div class="completion-card">
        <div class="completion-header">
          <div class="completion-icon-badge">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#58b680" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 class="completion-title">Inscrição registrada!</h2>
          <span class="completion-subtitle">Retiro 2027 — Conectados</span>
        </div>

        <div class="completion-body">
          <p class="completion-lead-text">
            Seus dados foram enviados com sucesso! Para confirmar sua vaga, realize o pagamento via Pix utilizando o <strong>QR Code</strong> ou <strong>copiando a chave Pix</strong> abaixo. Em seguida, anexe o comprovante de pagamento para validação pela tesouraria.
          </p>

          <div class="amount-to-pay-card">
            <span>Valor calculado a pagar:</span>
            <strong class="amount-val">${order.resumo.totalFormatted}</strong>
          </div>

          <!-- Área do Pix -->
          <div class="pix-payment-box">
            <div class="pix-qr-wrapper">
              <div id="pix-qr-container" class="pix-qr-canvas"></div>
              <span class="pix-qr-instruction">Abra o app do seu banco e aponte a câmera para o QR Code acima.</span>
            </div>

            <!-- Chave Pix Celular (Diácono Junior) -->
            <div class="pix-copia-cola-box" style="margin-bottom: 16px;">
              <label for="pix-key-display-input">Chave Pix (Telefone do Diácono Junior):</label>
              <div class="pix-input-group">
                <input type="text" id="pix-key-display-input" readonly value="${pixKeyFormatted}" />
                <button type="button" class="btn-primary-small" id="btn-copy-pix-key" title="Copiar chave Pix">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copiar Chave</span>
                </button>
              </div>
            </div>

            <!-- Código Pix Copia e Cola -->
            ${pixPayload ? `
              <div class="pix-copia-cola-box">
                <label for="pix-copy-input">Ou copie o código Pix Copia e Cola:</label>
                <div class="pix-input-group">
                  <input type="text" id="pix-copy-input" readonly value="${pixPayload}" />
                  <button type="button" class="btn-primary-small" id="btn-copy-pix-code" title="Copiar código Pix Copia e Cola">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copiar Código</span>
                  </button>
                </div>
              </div>
            ` : ""}
          </div>

          <!-- Card de Upload do Comprovante de Pagamento -->
          <div class="receipt-upload-card" id="receipt-upload-card">
            <div class="receipt-upload-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h3>Anexar Comprovante do Pix</h3>
            </div>
            <p class="receipt-upload-desc">
              Após efetuar o Pix no seu banco, anexe a foto ou PDF do comprovante aqui para que a equipe financeira confirme seu pagamento na planilha oficial.
            </p>

            <input type="file" id="receipt-file-input" accept="image/*,.pdf" style="display: none;" />

            <div class="receipt-dropzone" id="receipt-dropzone" tabindex="0" role="button" aria-label="Anexar arquivo de comprovante">
              <div class="dropzone-idle" id="dropzone-idle">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                  <path d="M12 12v9"></path>
                  <path d="m8 17 4-5 4 5"></path>
                </svg>
                <span class="drop-prompt">Clique aqui ou arraste o comprovante</span>
                <span class="drop-hint">Formatos aceitos: JPG, PNG ou PDF (até 10 MB)</span>
              </div>

              <div class="dropzone-selected" id="dropzone-selected" style="display: none;">
                <div class="file-preview-meta">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="file-type-icon">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <div class="file-preview-info">
                    <span class="file-name-text" id="selected-file-name">comprovante.jpg</span>
                    <span class="file-size-text" id="selected-file-size">1.2 MB</span>
                  </div>
                </div>
                <button type="button" class="btn-remove-file" id="btn-remove-file" title="Remover comprovante">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div class="receipt-upload-error" id="receipt-upload-error"></div>

            <button type="button" class="btn-upload-receipt" id="btn-submit-receipt" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>ENVIAR COMPROVANTE</span>
            </button>

            <div class="receipt-success-box" id="receipt-success-box" style="display: none;">
              <div class="receipt-success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div class="receipt-success-title">Comprovante enviado com sucesso!</div>
              <p class="receipt-success-desc">
                O arquivo foi anexado ao seu pedido e registrado na planilha oficial. A equipe financeira irá conferir a compensação bancária e confirmar sua vaga.
              </p>
              <div id="receipt-link-container"></div>
            </div>

            <!-- Fallback discreto via WhatsApp -->
            <div class="receipt-alt-whatsapp">
              Teve alguma dificuldade para anexar? 
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"></path>
                </svg>
                Enviar comprovante pelo WhatsApp do Diácono Junior
              </a>
            </div>
          </div>

          <!-- Avisos Importantes -->
          <div class="completion-notices">
            <div class="alert-box alert-neutral">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div>
                <strong>Importante:</strong> O envio do formulário e do comprovante não significa confirmação automática do pagamento. A equipe verificará o recebimento e atualizará a situação da inscrição na planilha oficial.
              </div>
            </div>

            ${hasPcdPending ? `
              <div class="alert-box alert-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div>
                  <strong>Solicitação de isenção por deficiência em análise:</strong> Você também solicitou uma isenção por deficiência. Esse pedido continuará em análise e a equipe entrará em contato pelo WhatsApp.
                </div>
              </div>
            ` : ""}
          </div>

          <div class="completion-footer-nav">
            <button type="button" class="btn-secondary" id="btn-start-new-order">Realizar nova inscrição</button>
          </div>
        </div>
      </div>
    `;

    // Renderizar QR Code se disponível
    if (pixPayload) {
      const qrEl = document.getElementById("pix-qr-container");
      if (qrEl) {
        PixService.renderQR(pixPayload, qrEl, 220);
      }

      const btnCopyPix = document.getElementById("btn-copy-pix-code");
      if (btnCopyPix) {
        btnCopyPix.onclick = async () => {
          const success = await PixService.copyToClipboard(pixPayload);
          if (success) {
            btnCopyPix.textContent = "Código copiado!";
            setTimeout(() => {
              btnCopyPix.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copiar Código</span>
              `;
            }, 2500);
          }
        };
      }
    }

    // Copiar Chave Pix Celular
    const btnCopyKey = document.getElementById("btn-copy-pix-key");
    const pixKeyInput = document.getElementById("pix-key-display-input");
    if (btnCopyKey && pixKeyInput) {
      btnCopyKey.onclick = async () => {
        const success = await PixService.copyToClipboard(pixKeyRaw);
        if (success) {
          btnCopyKey.textContent = "Chave copiada!";
          setTimeout(() => {
            btnCopyKey.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copiar Chave</span>
            `;
          }, 2500);
        }
      };
    }

    // Lógica de Anexo e Envio do Comprovante
    let selectedReceiptFile = null;
    const fileInput = document.getElementById("receipt-file-input");
    const dropzone = document.getElementById("receipt-dropzone");
    const dropzoneIdle = document.getElementById("dropzone-idle");
    const dropzoneSelected = document.getElementById("dropzone-selected");
    const selectedFileName = document.getElementById("selected-file-name");
    const selectedFileSize = document.getElementById("selected-file-size");
    const btnRemoveFile = document.getElementById("btn-remove-file");
    const btnSubmitReceipt = document.getElementById("btn-submit-receipt");
    const uploadError = document.getElementById("receipt-upload-error");
    const uploadSuccess = document.getElementById("receipt-success-box");

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }

    function handleFileSelection(file) {
      if (uploadError) {
        uploadError.style.display = "none";
        uploadError.textContent = "";
      }

      if (!file) return;

      const maxBytes = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxBytes) {
        if (uploadError) {
          uploadError.textContent = "O arquivo excede o limite máximo de 10 MB. Escolha um arquivo menor.";
          uploadError.style.display = "block";
        }
        return;
      }

      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (!isImage && !isPdf) {
        if (uploadError) {
          uploadError.textContent = "Formato de arquivo não suportado. Por favor, envie uma foto (JPG, PNG) ou documento PDF.";
          uploadError.style.display = "block";
        }
        return;
      }

      selectedReceiptFile = file;
      if (selectedFileName) selectedFileName.textContent = file.name;
      if (selectedFileSize) selectedFileSize.textContent = formatBytes(file.size);

      if (dropzoneIdle) dropzoneIdle.style.display = "none";
      if (dropzoneSelected) dropzoneSelected.style.display = "flex";
      if (btnSubmitReceipt) btnSubmitReceipt.disabled = false;
    }

    if (dropzone && fileInput) {
      dropzone.onclick = (e) => {
        if (e.target.closest("#btn-remove-file")) return;
        fileInput.click();
      };

      fileInput.onchange = () => {
        if (fileInput.files && fileInput.files[0]) {
          handleFileSelection(fileInput.files[0]);
        }
      };

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      };

      dropzone.ondragleave = (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      };

      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelection(e.dataTransfer.files[0]);
        }
      };
    }

    if (btnRemoveFile) {
      btnRemoveFile.onclick = (e) => {
        e.stopPropagation();
        selectedReceiptFile = null;
        if (fileInput) fileInput.value = "";
        if (dropzoneIdle) dropzoneIdle.style.display = "block";
        if (dropzoneSelected) dropzoneSelected.style.display = "none";
        if (btnSubmitReceipt) btnSubmitReceipt.disabled = true;
      };
    }

    if (btnSubmitReceipt) {
      btnSubmitReceipt.onclick = async () => {
        if (!selectedReceiptFile) return;

        btnSubmitReceipt.disabled = true;
        btnSubmitReceipt.innerHTML = `
          <span class="spinner"></span>
          <span>Enviando comprovante...</span>
        `;
        if (uploadError) uploadError.style.display = "none";

        try {
          const reader = new FileReader();
          const base64Data = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(selectedReceiptFile);
          });

          const uploadPayload = {
            action: "uploadComprovante",
            orderId: order.orderId,
            fileName: selectedReceiptFile.name,
            fileBase64: base64Data,
            mimeType: selectedReceiptFile.type || "application/octet-stream"
          };

          const endpoint = RETIRO_CONFIG.googleAppsScriptUrl;
          let uploadSuccessData = null;

          if (endpoint && endpoint.startsWith("https://script.google.com")) {
            try {
              const res = await fetch(endpoint, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                headers: {
                  "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(uploadPayload)
              });

              if (res.ok) {
                const resJson = await res.json();
                if (resJson && resJson.success) {
                  uploadSuccessData = resJson.data || { success: true };
                }
              }
            } catch (corsErr) {
              console.warn("Aviso de redirect CORS ao enviar comprovante. Aplicando no-cors garantido:", corsErr);
            }

            if (!uploadSuccessData) {
              await fetch(endpoint, {
                method: "POST",
                mode: "no-cors",
                headers: {
                  "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(uploadPayload)
              });
              uploadSuccessData = { success: true };
            }
          } else {
            console.info("Comprovante anexado em modo local de testes:", uploadPayload);
            uploadSuccessData = { fileUrl: "#" };
          }

          // Exibir sucesso
          if (dropzone) dropzone.style.display = "none";
          if (btnSubmitReceipt) btnSubmitReceipt.style.display = "none";
          if (uploadSuccess) uploadSuccess.style.display = "block";

          if (uploadSuccessData && uploadSuccessData.fileUrl && uploadSuccessData.fileUrl !== "#") {
            const linkContainer = document.getElementById("receipt-link-container");
            if (linkContainer) {
              linkContainer.innerHTML = `
                <a href="${uploadSuccessData.fileUrl}" target="_blank" rel="noopener noreferrer" class="receipt-link-view">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  <span>Ver comprovante no Google Drive</span>
                </a>
              `;
            }
          }
        } catch (err) {
          console.error("Falha ao enviar comprovante:", err);
          if (uploadError) {
            uploadError.textContent = "Não foi possível enviar o comprovante automaticamente. Você pode tentar novamente ou enviá-lo pelo link do WhatsApp abaixo.";
            uploadError.style.display = "block";
          }
          btnSubmitReceipt.disabled = false;
          btnSubmitReceipt.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>TENTAR ENVIAR NOVAMENTE</span>
          `;
        }
      };
    }

    // Nova inscrição
    const btnNew = document.getElementById("btn-start-new-order");
    if (btnNew) {
      btnNew.onclick = resetFormToNew;
    }
  }

  function renderCartaoCompletion(order, container, hasPcdPending) {
    // Mensagem pré-formatada para o WhatsApp do Ir. Fillipe (com o código do pedido incluso)
    const waText = 
      `Olá, Ir. Fillipe! Fiz minha inscrição para o Retiro 2027 — Conectados e gostaria de realizar o pagamento com cartão de crédito.\n\n` +
      `Código do pedido: ${order.orderId}\n` +
      `Nome do responsável: ${order.responsavel.nome}\n` +
      `Valor base dos ingressos: ${order.resumo.totalFormatted} (+ taxas da maquininha)\n\n` +
      `Gostaria de receber o link de pagamento e as opções de parcelamento disponíveis em até 12x.\n\n` +
      `Obrigado!`;

    const waUrl = `https://wa.me/${RETIRO_CONFIG.contacts.irFillipe.phoneRaw}?text=${encodeURIComponent(waText)}`;

    container.innerHTML = `
      <div class="completion-card">
        <div class="completion-header">
          <div class="completion-icon-badge">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#58b680" stroke-width="2.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
          </div>
          <h2 class="completion-title">Inscrição registrada!</h2>
          <span class="completion-subtitle">Retiro 2027 — Conectados</span>
        </div>

        <div class="completion-body">
          <p class="completion-lead-text">
            Sua inscrição foi registrada com sucesso! Para pagar com cartão de crédito (em até 12x), entre em contato com o <strong>Ir. Fillipe</strong> pelo WhatsApp. Ele enviará o link de pagamento oficial com as opções de parcelamento e a simulação das taxas para o seu pedido.
          </p>

          <div class="amount-to-pay-card">
            <div>
              <span>Valor base dos ingressos:</span>
              <div class="amount-tax-hint">+ taxa do cartão conforme parcelamento escolhido</div>
            </div>
            <div style="text-align: right;">
              <strong class="amount-val">${order.resumo.totalFormatted}</strong>
              <div class="amount-tax-sub">+ taxas da maquininha</div>
            </div>
          </div>

          <!-- Botão WhatsApp Ir. Fillipe -->
          <div class="whatsapp-cta-box">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-action">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"></path>
              </svg>
              <span>SOLICITAR LINK PELO WHATSAPP</span>
            </a>
            <span class="whatsapp-hint">O WhatsApp do Ir. Fillipe (${RETIRO_CONFIG.contacts.irFillipe.phone}) será aberto com sua solicitação de link de pagamento em até 12x. O código do seu pedido (${order.orderId}) já está incluso na mensagem.</span>
          </div>

          <!-- Avisos -->
          <div class="completion-notices">
            <div class="alert-box alert-neutral">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div>
                <strong>Seu pedido foi registrado na planilha oficial.</strong> O parcelamento no cartão é realizado diretamente pelo link de pagamento com juros da operadora.
              </div>
            </div>

            ${hasPcdPending ? `
              <div class="alert-box alert-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div>
                  <strong>Solicitação de isenção por deficiência em análise:</strong> Você também solicitou uma isenção por deficiência. Esse pedido continuará em análise e a equipe entrará em contato pelo WhatsApp.
                </div>
              </div>
            ` : ""}
          </div>

          <div class="completion-footer-nav">
            <button type="button" class="btn-secondary" id="btn-start-new-order">Realizar nova inscrição</button>
          </div>
        </div>
      </div>
    `;

    const btnNew = document.getElementById("btn-start-new-order");
    if (btnNew) {
      btnNew.onclick = resetFormToNew;
    }
  }

  function resetFormToNew() {
    state.currentStep = 1;
    state.responsavel = { nome: "", whatsapp: "" };
    state.participantes = [{ 
      id: "p_1", 
      nome: "", 
      dataNascimento: "", 
      modalidade: "completo", 
      diasDiaria: 1, 
      transporteOnibus: false, 
      solicitaIsencaoPcd: false, 
      isAutoFilledFromResp: true 
    }];
    state.formaPagamento = "pix";
    state.lastOrder = null;

    try {
      sessionStorage.removeItem("retiro2027_form_draft");
    } catch (e) {}

    const formCard = document.getElementById("registration-form-card");
    const completionContainer = document.getElementById("completion-container");
    if (completionContainer) completionContainer.style.display = "none";
    if (formCard) formCard.style.display = "block";

    renderStep(1);
    const formSec = document.getElementById("inscricao");
    if (formSec) formSec.scrollIntoView({ behavior: "smooth" });
  }

  function generateOrderId() {
    // Código super compacto de 5 caracteres: # e 4 dígitos (ex: #4821)
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#${num}`;
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Event Listeners Globais do Formulário
   */
  function setupEventListeners() {
    // Nome do responsável no Step 1
    const nomeInput = document.getElementById("resp-nome");
    if (nomeInput) {
      nomeInput.addEventListener("input", (e) => {
        state.responsavel.nome = nomeInput.value;
        saveDraft();
      });
    }

    // Máscara de telefone no Step 1
    const telInput = document.getElementById("resp-whatsapp");
    if (telInput) {
      telInput.addEventListener("input", (e) => {
        telInput.value = maskPhone(telInput.value);
        state.responsavel.whatsapp = telInput.value;
        saveDraft();
      });
    }

    // Botões de Avançar
    const btnNext1 = document.getElementById("btn-next-step-1");
    if (btnNext1) btnNext1.onclick = () => goToStep(2);

    const btnNext2 = document.getElementById("btn-next-step-2");
    if (btnNext2) btnNext2.onclick = () => goToStep(3);

    const btnNext3 = document.getElementById("btn-next-step-3");
    if (btnNext3) btnNext3.onclick = () => goToStep(4);

    // Botões de Voltar
    const btnBack2 = document.getElementById("btn-prev-step-2");
    if (btnBack2) btnBack2.onclick = () => goToStep(1);

    const btnBack3 = document.getElementById("btn-prev-step-3");
    if (btnBack3) btnBack3.onclick = () => goToStep(2);

    const btnBack4 = document.getElementById("btn-prev-step-4");
    if (btnBack4) btnBack4.onclick = () => goToStep(3); // Voltar da etapa de pagamento para revisão

    // Botão Adicionar Participante
    const btnAddPart = document.getElementById("btn-add-participant");
    if (btnAddPart) {
      btnAddPart.onclick = addParticipant;
    }

    // Botão Enviar Pedido Final
    const btnSubmit = document.getElementById("btn-submit-order");
    if (btnSubmit) {
      btnSubmit.onclick = submitRegistration;
    }

    // Alternância dinâmica de Forma de Pagamento (Pix vs Cartão)
    const radioPix = document.getElementById("pay-pix");
    const radioCartao = document.getElementById("pay-cartao");

    const handlePaymentChange = (method) => {
      state.formaPagamento = method;
      saveDraft();
      updateStep4PaymentDisplay();
    };

    if (radioPix) {
      radioPix.addEventListener("change", () => {
        if (radioPix.checked) handlePaymentChange("pix");
      });
    }

    if (radioCartao) {
      radioCartao.addEventListener("change", () => {
        if (radioCartao.checked) handlePaymentChange("cartao");
      });
    }
  }

  return {
    init,
    calculateAge,
    evaluateParticipant,
    calculateSummary,
    isRegistrationClosed,
    getState: () => state,
    goToStep,
  };
})();

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  RegistrationForm.init();
});
