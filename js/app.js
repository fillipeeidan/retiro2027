/**
 * RETIRO 2027 — CONECTADOS
 * Igreja Adventista da Promessa — Boa Vista
 * Interações da Landing Page, Navegação Suave e Inicialização
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Navegação Suave para Âncoras
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId === "#") return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        // Fechar menu mobile se estiver aberto
        const navMenu = document.getElementById("main-nav-menu");
        const navToggle = document.getElementById("nav-toggle-btn");
        if (navMenu && navMenu.classList.contains("is-open")) {
          navMenu.classList.remove("is-open");
          if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        }
      }
    });
  });

  // 2. Menu Mobile Toggle
  const navToggleBtn = document.getElementById("nav-toggle-btn");
  const mainNavMenu = document.getElementById("main-nav-menu");
  if (navToggleBtn && mainNavMenu) {
    navToggleBtn.addEventListener("click", () => {
      const isOpen = mainNavMenu.classList.toggle("is-open");
      navToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // 3. Efeito de Scroll no Navbar (adiciona sombra e fundo compacto)
  const navbar = document.querySelector(".site-navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 40) {
        navbar.classList.add("navbar-scrolled");
      } else {
        navbar.classList.remove("navbar-scrolled");
      }
    }, { passive: true });
  }

  // 4. Configurar Link do Botão de Contato Oficial (Seção Dúvidas)
  const btnDuvidas = document.getElementById("btn-falar-diacono-duvidas");
  if (btnDuvidas && window.RETIRO_CONFIG) {
    const djPhone = window.RETIRO_CONFIG.contacts.diaconoJunior.phoneRaw;
    const msg = "Olá, Diácono Junior! Tenho uma dúvida sobre o Retiro 2027 — Conectados.";
    btnDuvidas.href = `https://wa.me/${djPhone}?text=${encodeURIComponent(msg)}`;
  }

  // 5. Botões de Ação para Inscrição (focam no início do formulário)
  const ctaButtons = document.querySelectorAll(".btn-cta-inscricao");
  ctaButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const inscricaoSec = document.getElementById("inscricao");
      if (inscricaoSec) {
        e.preventDefault();
        inscricaoSec.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          const firstInput = document.getElementById("resp-nome");
          if (firstInput) firstInput.focus();
        }, 500);
      }
    });
  });
});
