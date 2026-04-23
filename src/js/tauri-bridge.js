/* ═══════════════════════════════════════════════════════════
   tauri-bridge.js — Wrapper centralizado das chamadas Tauri
   Abstrai todos os invoke() e listen() em funções nomeadas,
   facilitando mocks em testes e evitando imports espalhados.
════════════════════════════════════════════════════════════ */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-shell';

/* ═══════════════════════════════════════════════════════════
   DETECÇÃO DE AMBIENTE
   Em desenvolvimento (browser puro sem Tauri), as chamadas
   retornam valores padrão para não quebrar a UI.
════════════════════════════════════════════════════════════ */
const IS_TAURI = '__TAURI_INTERNALS__' in window;

/* ═══════════════════════════════════════════════════════════
   NOTIFICAÇÕES
════════════════════════════════════════════════════════════ */

/**
 * Dispara uma notificação nativa do Windows.
 * @param {string} title — Título da notificação
 * @param {string} body  — Corpo da notificação
 */
export async function enviarNotificacao(title, body) {
  if (!IS_TAURI) {
    console.info(`[bridge] Notificação (dev): ${title} — ${body}`);
    return;
  }
  try {
    await invoke('send_notification', { title, body });
  } catch (err) {
    console.warn('[bridge] enviarNotificacao:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÕES DO WINDOWS
════════════════════════════════════════════════════════════ */

/**
 * Abre a página de configurações de energia do Windows.
 */
export async function abrirConfigsEnergia() {
  if (!IS_TAURI) {
    console.info('[bridge] abrirConfigsEnergia (dev — sem efeito)');
    return;
  }
  try {
    await invoke('open_power_settings');
  } catch (err) {
    console.warn('[bridge] abrirConfigsEnergia:', err);
  }
}

/**
 * Abre a página de configurações de notificações do Windows.
 */
export async function abrirConfigsNotificacao() {
  if (!IS_TAURI) {
    console.info('[bridge] abrirConfigsNotificacao (dev — sem efeito)');
    return;
  }
  try {
    await invoke('open_notification_settings');
  } catch (err) {
    console.warn('[bridge] abrirConfigsNotificacao:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   VERSÃO DO APP
════════════════════════════════════════════════════════════ */

/**
 * Retorna a versão do app lida do Cargo.toml.
 * @returns {Promise<string>} ex: "1.0.0"
 */
export async function getVersaoApp() {
  if (!IS_TAURI) return '1.0.0-dev';
  try {
    return await invoke('get_app_version');
  } catch (err) {
    console.warn('[bridge] getVersaoApp:', err);
    return '1.0.0';
  }
}

/* ═══════════════════════════════════════════════════════════
   HISTÓRICO
════════════════════════════════════════════════════════════ */

/**
 * Limpa todos os dados persistidos no store.json.
 */
export async function limparHistorico() {
  if (!IS_TAURI) {
    console.info('[bridge] limparHistorico (dev — sem efeito)');
    return;
  }
  try {
    await invoke('clear_history');
  } catch (err) {
    console.warn('[bridge] limparHistorico:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   JANELA — Always-on-top e maximizar
════════════════════════════════════════════════════════════ */

/**
 * Ativa ou desativa o modo always-on-top da janela.
 * @param {boolean} ativo
 */
export async function setAlwaysOnTop(ativo) {
  if (!IS_TAURI) return;
  try {
    await getCurrentWindow().setAlwaysOnTop(ativo);
  } catch (err) {
    console.warn('[bridge] setAlwaysOnTop:', err);
  }
}

/**
 * Alterna entre maximizado e restaurado.
 */
export async function alternarMaximizar() {
  if (!IS_TAURI) return;
  try {
    const win = getCurrentWindow();
    const max = await win.isMaximized();
    max ? await win.unmaximize() : await win.maximize();
  } catch (err) {
    console.warn('[bridge] alternarMaximizar:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   LINKS EXTERNOS
════════════════════════════════════════════════════════════ */

/**
 * Abre uma URL no browser padrão do sistema.
 * @param {string} url
 */
export async function abrirLink(url) {
  if (!IS_TAURI) {
    window.open(url, '_blank');
    return;
  }
  try {
    await open(url);
  } catch (err) {
    console.warn('[bridge] abrirLink:', err);
    window.open(url, '_blank');
  }
}

/* ═══════════════════════════════════════════════════════════
   EVENTOS — escutar eventos emitidos pelo backend Rust
════════════════════════════════════════════════════════════ */

/**
 * Escuta o evento de alarme disparado pelo scheduler Rust.
 * @param {function} callback — Recebe o id do alarme disparado
 * @returns {Promise<function>} unlisten — chame para parar de escutar
 */
export async function onAlarmeFired(callback) {
  if (!IS_TAURI) return () => {};
  try {
    return await listen('alarm_fired', (event) => {
      callback(event.payload);
    });
  } catch (err) {
    console.warn('[bridge] onAlarmeFired:', err);
    return () => {};
  }
}
