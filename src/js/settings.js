/* ═══════════════════════════════════════════════════════════
   settings.js — Módulo Configurações
   Responsável por: troca de tema, abertura de configurações
   de notificação do Windows, limpeza de histórico e
   links externos via Tauri.
════════════════════════════════════════════════════════════ */

import { invoke } from '@tauri-apps/api/core';
import { open }   from '@tauri-apps/plugin-shell';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
════════════════════════════════════════════════════════════ */
const TEMAS = ['light', 'dark', 'system'];
const NOMES_TEMA = {
  light:  'Claro',
  dark:   'Escuro',
  system: 'Usar as configurações do sistema',
};

const STORAGE_KEY_TEMA = 'clockClone:theme';

/* ═══════════════════════════════════════════════════════════
   ELEMENTOS DO DOM
════════════════════════════════════════════════════════════ */
const btnToggleTheme   = document.getElementById('btnToggleTheme');
const themeAccordion   = document.getElementById('themeAccordion');
const themeCurrentValue = document.getElementById('themeCurrentValue');
const themeChevron     = btnToggleTheme?.querySelector('.settings-chevron');
const radioInputs      = document.querySelectorAll('input[name="theme"]');

const btnToggleAbout   = document.getElementById('btnToggleAbout');
const aboutAccordion   = document.getElementById('aboutAccordion');
const aboutChevron     = btnToggleAbout?.querySelector('.settings-chevron');
const appVersionEl     = document.getElementById('appVersion');

const btnNotifSettings = document.getElementById('btnNotifSettings');
const btnClearHistory  = document.getElementById('btnClearHistory');
const btnFeedback      = document.getElementById('btnFeedback');
const btnTerms         = document.getElementById('btnTerms');
const btnPrivacy       = document.getElementById('btnPrivacy');

/* ═══════════════════════════════════════════════════════════
   TEMA
════════════════════════════════════════════════════════════ */

/**
 * Aplica o tema na tag <html> via data-theme.
 * Se "system", detecta a preferência do SO via matchMedia.
 */
function aplicarTema(tema) {
  if (!TEMAS.includes(tema)) tema = 'system';

  let temaEfetivo = tema;

  if (tema === 'system') {
    const prefereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    temaEfetivo = prefereDark ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', temaEfetivo);
}

/**
 * Salva a preferência de tema no localStorage.
 * (Substituir por tauri-plugin-store quando o backend estiver pronto)
 */
function salvarTema(tema) {
  try {
    localStorage.setItem(STORAGE_KEY_TEMA, tema);
  } catch (err) {
    console.warn('[settings] Não foi possível salvar tema:', err);
  }
}

/**
 * Carrega o tema salvo ou retorna "system" como padrão.
 */
function carregarTema() {
  try {
    return localStorage.getItem(STORAGE_KEY_TEMA) || 'system';
  } catch {
    return 'system';
  }
}

/**
 * Atualiza o texto exibido no card de tema ("Claro", "Escuro", etc.)
 */
function atualizarLabelTema(tema) {
  if (themeCurrentValue) {
    themeCurrentValue.textContent = NOMES_TEMA[tema] || NOMES_TEMA.system;
  }
}

/**
 * Marca o radio button correspondente ao tema atual.
 */
function atualizarRadioTema(tema) {
  radioInputs.forEach(radio => {
    radio.checked = radio.value === tema;
  });
}

function alterarTema(novoTema) {
  aplicarTema(novoTema);
  salvarTema(novoTema);
  atualizarLabelTema(novoTema);
  atualizarRadioTema(novoTema);
}

/* ═══════════════════════════════════════════════════════════
   ACCORDIONS (Tema e Sobre)
════════════════════════════════════════════════════════════ */
function alternarAccordion(accordionEl, chevronEl, btnEl) {
  if (!accordionEl) return;

  const aberto = !accordionEl.classList.contains('hidden');

  if (aberto) {
    accordionEl.classList.add('hidden');
    chevronEl?.classList.remove('chevron--open');
    btnEl?.setAttribute('aria-expanded', 'false');
  } else {
    accordionEl.classList.remove('hidden');
    chevronEl?.classList.add('chevron--open');
    btnEl?.setAttribute('aria-expanded', 'true');
  }
}

/* ═══════════════════════════════════════════════════════════
   VERSÃO DO APP
════════════════════════════════════════════════════════════ */
async function carregarVersao() {
  try {
    const versao = await invoke('get_app_version');
    if (appVersionEl) appVersionEl.textContent = versao;
  } catch {
    // Fallback caso o comando Rust ainda não esteja implementado
    if (appVersionEl) appVersionEl.textContent = '1.0.0';
  }
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICAÇÕES DO WINDOWS
════════════════════════════════════════════════════════════ */
async function abrirConfigsNotificacao() {
  try {
    await invoke('open_notification_settings');
  } catch (err) {
    console.warn('[settings] Não foi possível abrir notificações:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   LIMPAR HISTÓRICO
════════════════════════════════════════════════════════════ */
async function limparHistorico() {
  try {
    localStorage.clear();
    await invoke('clear_history');
  } catch (err) {
    console.warn('[settings] Erro ao limpar histórico:', err);
  }

  // Feedback visual — mostra ✓ temporariamente no botão
  const btn = document.getElementById('btnClearHistory');
  if (btn) {
    const textoOriginal = btn.textContent;
    btn.textContent = '✓ Limpo';
    btn.style.color = 'var(--accent)';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.style.color = '';
      btn.disabled = false;
    }, 3000);
  }
}

/* ═══════════════════════════════════════════════════════════
   LINKS EXTERNOS
════════════════════════════════════════════════════════════ */
async function abrirLink(url) {
  try {
    await open(url);
  } catch (err) {
    console.warn('[settings] Não foi possível abrir link:', err);
    // Fallback para ambiente de desenvolvimento
    window.open(url, '_blank');
  }
}

/* ═══════════════════════════════════════════════════════════
   LISTENER — mudança de tema pelo SO
════════════════════════════════════════════════════════════ */
function ouvirMudancaTema() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const temaAtual = carregarTema();
    if (temaAtual === 'system') {
      aplicarTema('system');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════════════════ */
export function iniciarConfiguracoes() {
  // Carrega e aplica tema salvo
  const temaSalvo = carregarTema();
  aplicarTema(temaSalvo);
  atualizarLabelTema(temaSalvo);
  atualizarRadioTema(temaSalvo);

  // Accordion de tema
  btnToggleTheme?.addEventListener('click', () => {
    alternarAccordion(themeAccordion, themeChevron, btnToggleTheme);
  });

  // Radio buttons de tema
  radioInputs.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) alterarTema(radio.value);
    });
  });

  // Accordion de sobre
  btnToggleAbout?.addEventListener('click', () => {
    alternarAccordion(aboutAccordion, aboutChevron, btnToggleAbout);
  });

  // Botões de ação
  btnNotifSettings?.addEventListener('click', abrirConfigsNotificacao);
  btnClearHistory?.addEventListener('click',  limparHistorico);

  // Links externos
  btnFeedback?.addEventListener('click', () =>
    abrirLink('https://github.com/R0ch-a/clockClone/issues')
  );
  btnTerms?.addEventListener('click', () =>
    abrirLink('https://github.com/R0ch-a/clockClone/blob/main/LICENSE')
  );
  btnPrivacy?.addEventListener('click', () =>
    abrirLink('https://github.com/R0ch-a/clockClone/blob/main/PRIVACY.md')
  );

  // Versão do app
  carregarVersao();

  // Escuta mudança de tema do SO
  ouvirMudancaTema();
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarConfiguracoes();
});
