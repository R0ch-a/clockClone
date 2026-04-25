/* ═══════════════════════════════════════════════════════════
   timer.js — Módulo Temporizador
   Responsável por: múltiplos timers simultâneos em grid,
   anel SVG animado, modal de criação, modo de edição
   e notificações nativas via Tauri.
════════════════════════════════════════════════════════════ */

import { invoke }          from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
════════════════════════════════════════════════════════════ */
const CIRCUMFERENCE = 2 * Math.PI * 90; // ≈ 565.48 (raio 90 do SVG)

/* ═══════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════════ */

// Lista de configurações salvas (persistidas no futuro via Tauri store)
let timers = [];

// Estado em tempo real de cada timer (não persistido)
// Chave: id do timer
const timerStates = {};

// Modo de edição ativo?
let editMode = false;

// Estado do always-on-top (compartilhado entre todos os timers)
let isOnTop = false;

/* ═══════════════════════════════════════════════════════════
   ELEMENTOS DO DOM
════════════════════════════════════════════════════════════ */
const timerGrid       = document.getElementById('timerGrid');
const btnEditTimers   = document.getElementById('btnEditTimers');
const btnAddTimer     = document.getElementById('btnAddTimer');

/* ═══════════════════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════════════════ */
function pad(n) {
  return String(n).padStart(2, '0');
}

function gerarId() {
  return `timer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sugerirNome() {
  return `Cronômetro (${timers.length + 1})`;
}

/**
 * Formata segundos totais em "hh:mm:ss"
 */
function formatarTempoTimer(totalSeg) {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Calcula o horário de término previsto
 * Retorna string "hh:mm"
 */
function calcularHorarioFim(remainingSeg) {
  const fim = new Date(Date.now() + remainingSeg * 1000);
  return `${pad(fim.getHours())}:${pad(fim.getMinutes())}`;
}

/* ═══════════════════════════════════════════════════════════
   ANEL SVG — atualização de progresso
════════════════════════════════════════════════════════════ */
function atualizarAnel(ringEl, remaining, total) {
  if (!ringEl) return;
  const progress = total > 0 ? remaining / total : 0;
  ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICAÇÃO NATIVA (Tauri)
════════════════════════════════════════════════════════════ */
async function dispararNotificacao(label) {
  try {
    await invoke('send_notification', {
      title: label,
      body: 'Seu temporizador terminou!',
    });
  } catch (err) {
    console.warn('[timer] Notificação não disponível:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   LÓGICA DE CONTAGEM DE CADA TIMER
════════════════════════════════════════════════════════════ */
function iniciarTimer(id) {
  const st    = timerStates[id];
  const timer = timers.find(t => t.id === id);
  if (!st || !timer || st.running) return;

  st.running   = true;
  // Recalcula startedAt baseado no remaining atual
  st.startedAt = performance.now() - ((st.remainingOnPause - st.remainingOnPause) * 1000);

  function tick() {
    if (!st.running) return;

    const decorrido = (performance.now() - st.startedAt) / 1000;
    st.remaining    = Math.max(0, st.remainingOnPause - decorrido);

    const card = document.getElementById(`card-${id}`);
    if (card) {
      const display = card.querySelector('.timer-display');
      const ring    = card.querySelector('.timer-ring-fill');
      const endTime = card.querySelector('.timer-end-time');

      if (display) display.textContent = formatarTempoTimer(Math.ceil(st.remaining));
      if (ring)    atualizarAnel(ring, st.remaining, timer.durationSecs);
      if (endTime) endTime.textContent = `🔔 ${calcularHorarioFim(st.remaining)}`;
    }

    if (st.remaining <= 0) {
      pararTimer(id, true);
      return;
    }

    st.rafId = requestAnimationFrame(tick);
  }

  st.rafId = requestAnimationFrame(tick);
  atualizarBotoesCard(id);
}

function pausarTimer(id) {
  const st = timerStates[id];
  if (!st || !st.running) return;

  cancelAnimationFrame(st.rafId);
  st.running          = false;
  // Salva o tempo restante no momento da pausa
  st.remainingOnPause = st.remaining;
  st.startedAt        = 0; // reseta para forçar recálculo no próximo início

  atualizarBotoesCard(id);
}

function pararTimer(id, terminou = false) {
  const st = timerStates[id];
  if (!st) return;

  cancelAnimationFrame(st.rafId);
  st.running          = false;
  st.remaining        = 0;
  st.remainingOnPause = 0;

  const timer = timers.find(t => t.id === id);
  const card  = document.getElementById(`card-${id}`);

  if (card) {
    const display = card.querySelector('.timer-display');
    const ring    = card.querySelector('.timer-ring-fill');
    const endTime = card.querySelector('.timer-end-time');

    if (display) display.textContent = formatarTempoTimer(timer?.durationSecs ?? 0);
    if (ring && terminou) {
      ring.style.strokeDashoffset = CIRCUMFERENCE;
      ring.style.stroke = 'var(--ring-track)';
    }
    if (endTime) endTime.textContent = '';
  }

  if (terminou && timer) dispararNotificacao(timer.label);

  atualizarBotoesCard(id);
}

function redefinirTimer(id) {
  const timer = timers.find(t => t.id === id);
  if (!timer) return;

  pararTimer(id);

  const st = timerStates[id];
  if (st) {
    st.remaining        = timer.durationSecs;
    st.remainingOnPause = timer.durationSecs;
  }

  const card = document.getElementById(`card-${id}`);
  if (card) {
    const display = card.querySelector('.timer-display');
    const ring    = card.querySelector('.timer-ring-fill');
    const endTime = card.querySelector('.timer-end-time');

    if (display) display.textContent = formatarTempoTimer(timer.durationSecs);
    if (ring) {
      ring.style.strokeDashoffset = 0; // anel cheio (cinza)
      ring.style.stroke = 'var(--ring-fill)';
    }
    if (endTime) endTime.textContent = '';
  }

  atualizarBotoesCard(id);
}

/* ═══════════════════════════════════════════════════════════
   ATUALIZAÇÃO DOS BOTÕES DE UM CARD
════════════════════════════════════════════════════════════ */
function atualizarBotoesCard(id) {
  const card = document.getElementById(`card-${id}`);
  const st   = timerStates[id];
  if (!card || !st) return;

  const btnPlay  = card.querySelector('.timer-btn-play');
  const iconPlay  = card.querySelector('.timer-icon-play');
  const iconPause = card.querySelector('.timer-icon-pause');
  const endTime   = card.querySelector('.timer-end-time');

  if (st.running) {
    iconPlay?.classList.add('hidden');
    iconPause?.classList.remove('hidden');
    btnPlay?.setAttribute('aria-label', 'Pausar');
    if (endTime) endTime.classList.remove('hidden');
  } else {
    iconPause?.classList.add('hidden');
    iconPlay?.classList.remove('hidden');
    btnPlay?.setAttribute('aria-label', 'Iniciar');
    if (endTime) endTime.classList.add('hidden');

    // Restaura cor do anel ao pausar
    const ring = card.querySelector('.timer-ring-fill');
    if (ring && st.remaining > 0) {
      ring.style.stroke = 'var(--ring-fill)';
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   ALWAYS-ON-TOP de um card específico
════════════════════════════════════════════════════════════ */
async function alternarPin(btnPinEl, timerId) {
  try {
    isOnTop = !isOnTop;
    const win = getCurrentWindow();

    if (isOnTop) {
      await win.setAlwaysOnTop(true);
      await win.setSize({ type: 'Logical', width: 400, height: 480 });

      // Esconde sidebar e action bar
      document.getElementById('sidebar')?.style.setProperty('width', '0');
      document.getElementById('sidebar')?.style.setProperty('min-width', '0');
      document.getElementById('sidebar')?.style.setProperty('border', 'none');
      document.getElementById('sidebar')?.style.setProperty('overflow', 'hidden');
      document.getElementById('timerActions')?.classList.add('hidden');
      document.getElementById('timerGrid')?.style.setProperty('display', 'block');

      // Esconde todos os outros cards
      document.querySelectorAll('.timer-card').forEach(c => {
        if (c.id !== `card-${timerId}`) c.style.setProperty('display', 'none');
      });

      // Esconde botão expandir do card ativo
      document.getElementById(`card-${timerId}`)
        ?.querySelector('.timer-btn-expand')
        ?.style.setProperty('display', 'none');

      // Adiciona header PiP ao card
      const cardAtivo = document.getElementById(`card-${timerId}`);
      cardAtivo?.classList.add('timer-pip');
      const headerExistente = cardAtivo?.querySelector('.timer-pip-header');
      if (!headerExistente && cardAtivo) {
        const pipHeader = document.createElement('div');
        pipHeader.className = 'timer-pip-header';
        pipHeader.innerHTML = `
          <button class="timer-pip-btn" id="btnTimerPipIcon" title="Sair do PiP">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
              <rect x="7" y="7" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="var(--bg-surface)"/>
            </svg>
          </button>
          <span class="timer-pip-title">${timers.find(t => t.id === timerId)?.label || ''}</span>
          <button class="timer-pip-btn timer-pip-close" title="Fechar PiP">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>`;
        cardAtivo.insertBefore(pipHeader, cardAtivo.firstChild);
      
        // Esconde o header original do card
        cardAtivo.querySelector('.timer-card-header')?.style.setProperty('display', 'none');
      
        // Botão fechar PiP
        pipHeader.querySelector('.timer-pip-close')?.addEventListener('click', (e) => {
          e.stopPropagation();
          alternarPin(btnPinEl, timerId);
        });
      
        // Botão ícone PiP também sai
        pipHeader.querySelector('#btnTimerPipIcon')?.addEventListener('click', (e) => {
          e.stopPropagation();
          alternarPin(btnPinEl, timerId);
        });
      }

    } else {
      await win.setAlwaysOnTop(false);
      await win.setSize({ type: 'Logical', width: 800, height: 600 });

      // Restaura sidebar
      const sidebar = document.getElementById('sidebar');
      sidebar?.style.removeProperty('width');
      sidebar?.style.removeProperty('min-width');
      sidebar?.style.removeProperty('border');
      sidebar?.style.removeProperty('overflow');
      document.getElementById('timerActions')?.classList.remove('hidden');
      document.getElementById('timerGrid')?.style.removeProperty('display');

      // Restaura todos os cards
      document.querySelectorAll('.timer-card').forEach(c => {
        c.style.removeProperty('display');
      });

      // Restaura botão expandir
      document.getElementById(`card-${timerId}`)
        ?.querySelector('.timer-btn-expand')
        ?.style.removeProperty('display');

      // Remove header PiP e restaura header original
      const cardAtivo = document.getElementById(`card-${timerId}`);
      cardAtivo?.classList.remove('timer-pip');
      cardAtivo?.querySelector('.timer-pip-header')?.remove();
      cardAtivo?.querySelector('.timer-card-header')?.style.removeProperty('display');
    }

    btnPinEl.classList.toggle('active', isOnTop);
    btnPinEl.setAttribute(
      'title',
      isOnTop ? 'Desafixar da parte superior' : 'Manter na parte superior'
    );

  } catch (err) {
    console.warn('[timer] Não foi possível alterar PiP:', err);
  }
}

function svgExpandir() {
  return '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function svgRecolher() {
  return '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2l-4 4M2 2h4v4M10 14l4-4M14 14h-4v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/* ═══════════════════════════════════════════════════════════
   CRIAÇÃO DO CARD HTML DE UM TIMER
════════════════════════════════════════════════════════════ */
function criarCardTimer(timer) {
  const card = document.createElement('div');
  card.className = 'timer-card';
  card.id = `card-${timer.id}`;

  card.innerHTML = `
    <div class="timer-card-header">
      <span class="timer-card-title">${timer.label}</span>
      <div class="timer-card-actions">
        <button class="icon-btn timer-btn-expand" title="Expandir" aria-label="Expandir">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5"
              stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="icon-btn timer-btn-pin" title="Manter na parte superior" aria-label="Manter na parte superior">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
            <rect x="7" y="7" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="var(--bg-surface)"/>
          </svg>
        </button>
        <button class="icon-btn timer-btn-delete hidden" title="Excluir" aria-label="Excluir">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4"
              stroke="var(--danger)" stroke-width="1.4"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="timer-ring-container">
      <svg class="timer-ring-svg" viewBox="0 0 200 200">
        <!-- Trilha cinza -->
        <circle cx="100" cy="100" r="90"
          fill="none"
          stroke="var(--ring-track)"
          stroke-width="8"/>
        <!-- Anel de progresso dourado -->
        <circle class="timer-ring-fill"
          cx="100" cy="100" r="90"
          fill="none"
          stroke="var(--ring-fill)"
          stroke-width="8"
          stroke-dasharray="${CIRCUMFERENCE}"
          stroke-dashoffset="0"
          stroke-linecap="round"
          transform="rotate(-90 100 100)"/>
      </svg>

      <div class="timer-ring-content">
        <span class="timer-display">${formatarTempoTimer(timer.durationSecs)}</span>
        <span class="timer-end-time hidden"></span>
      </div>
    </div>

    <div class="timer-controls">
      <button class="ctrl-btn ctrl-btn--primary timer-btn-play" aria-label="Iniciar">
        <svg class="timer-icon-play" width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M6 4l10 6-10 6V4z" fill="currentColor"/>
        </svg>
        <svg class="timer-icon-pause hidden" width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="5"    y="4" width="3.5" height="12" rx="1" fill="currentColor"/>
          <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/>
        </svg>
      </button>
      <button class="ctrl-btn timer-btn-reset" aria-label="Redefinir" title="Redefinir">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M4 10a6 6 0 1 1 1.5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M4 14v-4h4"            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

  `;

  // ── Event listeners do card ──
  const btnPlay   = card.querySelector('.timer-btn-play');
  const btnReset  = card.querySelector('.timer-btn-reset');
  const btnExpand = card.querySelector('.timer-btn-expand');
  const btnPin    = card.querySelector('.timer-btn-pin');
  const btnDelete = card.querySelector('.timer-btn-delete');

  btnPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    const st = timerStates[timer.id];
    if (st.running) pausarTimer(timer.id);
    else iniciarTimer(timer.id);
  });

  btnReset.addEventListener('click', (e) => {
    e.stopPropagation();
    redefinirTimer(timer.id);
  });

  btnExpand.addEventListener('click', async (e) => {
    e.stopPropagation();
    const sidebar = document.getElementById('sidebar');
    const timerGrid = document.getElementById('timerGrid');
    const actionBar = document.getElementById('timerActions');
  
    // Verifica se já está expandido
    const jaExpandido = card.classList.contains('timer-expandido');
  
    // Fecha qualquer outro expandido
    document.querySelectorAll('.timer-expandido').forEach(c => {
      c.classList.remove('timer-expandido');
      const exp = c.querySelector('.timer-btn-expand');
      if (exp) exp.innerHTML = svgExpandir();
      c.querySelector('.timer-btn-pin')?.style.removeProperty('display');
    });

    if (!jaExpandido) {
      card.classList.add('timer-expandido');
      sidebar?.style.setProperty('width', '0');
      sidebar?.style.setProperty('min-width', '0');
      sidebar?.style.setProperty('border', 'none');
      sidebar?.style.setProperty('overflow', 'hidden');
      timerGrid?.style.setProperty('display', 'block');
      actionBar?.classList.add('hidden');
      card.querySelector('.timer-btn-pin')?.style.setProperty('display', 'none');
      btnExpand.innerHTML = svgRecolher();
    } else {
      sidebar?.style.removeProperty('width');
      sidebar?.style.removeProperty('min-width');
      sidebar?.style.removeProperty('border');
      sidebar?.style.removeProperty('overflow');
      timerGrid?.style.removeProperty('display');
      actionBar?.classList.remove('hidden');
    }
  });

  btnPin.addEventListener('click', (e) => {
    e.stopPropagation();
    alternarPin(btnPin, timer.id);
  });

  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    excluirTimer(timer.id);
  });

  card.addEventListener('click', (e) => {
    if (editMode) return;
    if (e.target.closest('button')) return; // ignora cliques em botões
    abrirModalEdicao(timer.id);
  });  

  return card;
}

/* ═══════════════════════════════════════════════════════════
   RENDERIZAÇÃO DO GRID
════════════════════════════════════════════════════════════ */
function renderizarGrid() {
  if (!timerGrid) return;
  timerGrid.innerHTML = '';
  timers.forEach(timer => {
    timerGrid.appendChild(criarCardTimer(timer));
  });
  aplicarModoEdicao();
}

/* ═══════════════════════════════════════════════════════════
   MODO DE EDIÇÃO
════════════════════════════════════════════════════════════ */
function aplicarModoEdicao() {
  document.querySelectorAll('.timer-card').forEach(card => {
    const btnExpand = card.querySelector('.timer-btn-expand');
    const btnPin    = card.querySelector('.timer-btn-pin');
    const btnDelete = card.querySelector('.timer-btn-delete');

    if (editMode) {
      btnExpand?.classList.add('hidden');
      btnPin?.classList.add('hidden');
      btnDelete?.classList.remove('hidden');
      card.classList.add('edit-mode');
    } else {
      btnExpand?.classList.remove('hidden');
      btnPin?.classList.remove('hidden');
      btnDelete?.classList.add('hidden');
      card.classList.remove('edit-mode');
    }
  });

  // Atualiza botão da barra de ações
  if (btnEditTimers) {
    if (editMode) {
      btnEditTimers.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 8l4 4 7-7"
            stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      btnEditTimers.setAttribute('title', 'Concluído');
      btnEditTimers.setAttribute('aria-label', 'Concluído');
    } else {
      btnEditTimers.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z"
            stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>`;
      btnEditTimers.setAttribute('title', 'Editar temporizadores');
      btnEditTimers.setAttribute('aria-label', 'Editar temporizadores');
    }
  }
}

function alternarModoEdicao() {
  editMode = !editMode;
  aplicarModoEdicao();
}

/* ═══════════════════════════════════════════════════════════
   EXCLUIR TIMER
════════════════════════════════════════════════════════════ */
function excluirTimer(id) {
  // Para a contagem se estiver rodando
  const st = timerStates[id];
  if (st?.running) cancelAnimationFrame(st.rafId);

  // Remove do estado
  delete timerStates[id];
  timers = timers.filter(t => t.id !== id);

  // Remove o card do DOM
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.style.animation = 'cardSair 150ms ease forwards';
    setTimeout(() => card.remove(), 150);
  }
}

function resetarModal() {
  const modalTitle = document.getElementById('modalTimerTitle');
  if (modalTitle) modalTitle.textContent = 'Adicionar novo temporizador';
  const lixeira = document.querySelector('.timer-modal-delete');
  lixeira?.remove();
}

/* ═══════════════════════════════════════════════════════════
   MODAL — Adicionar novo temporizador
════════════════════════════════════════════════════════════ */

// Valores temporários do seletor
const pick = { hours: 0, minutes: 0, seconds: 0 };

function abrirModal() {
  const timerNameInput = document.getElementById('timerNameInput');
  const btnClearName   = document.getElementById('btnClearTimerName');
  const modalOverlay   = document.getElementById('modalTimerOverlay');

  // Reseta o seletor
  pick.hours   = 0;
  pick.minutes = 0;
  pick.seconds = 0;
  atualizarPickerDisplay();

  // Nome sugerido
  if (timerNameInput) {
    timerNameInput.value = sugerirNome();
    btnClearName?.classList.remove('hidden');
  }

  modalOverlay?.classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modalTimerOverlay')?.classList.add('hidden');
  resetarModal();
  //modalOverlay?.classList.add('hidden');
}

function atualizarPickerDisplay() {
  const pickHours   = document.getElementById('pickHours');
  const pickMinutes = document.getElementById('pickMinutes');
  const pickSeconds = document.getElementById('pickSeconds');
  const btnSaveTimer = document.getElementById('btnSaveTimer');

  if (pickHours)   pickHours.textContent   = pad(pick.hours);
  if (pickMinutes) pickMinutes.textContent = pad(pick.minutes);
  if (pickSeconds) pickSeconds.textContent = pad(pick.seconds);

  // Botão Salvar desabilitado se tempo for zero
  const totalSeg = pick.hours * 3600 + pick.minutes * 60 + pick.seconds;
  if (btnSaveTimer) {
    btnSaveTimer.disabled = totalSeg === 0;
    btnSaveTimer.style.opacity = totalSeg === 0 ? '0.4' : '1';
    btnSaveTimer.style.cursor  = totalSeg === 0 ? 'not-allowed' : 'pointer';
  }
}

function incrementarCampo(campo) {
  if (campo === 'hours')   pick.hours   = (pick.hours   + 1) % 24;
  if (campo === 'minutes') pick.minutes = (pick.minutes + 1) % 60;
  if (campo === 'seconds') pick.seconds = (pick.seconds + 1) % 60;
  atualizarPickerDisplay();
}

function decrementarCampo(campo) {
  if (campo === 'hours')   pick.hours   = (pick.hours   - 1 + 24) % 24;
  if (campo === 'minutes') pick.minutes = (pick.minutes - 1 + 60) % 60;
  if (campo === 'seconds') pick.seconds = (pick.seconds - 1 + 60) % 60;
  atualizarPickerDisplay();
}

function salvarTimer() {
  const totalSeg = pick.hours * 3600 + pick.minutes * 60 + pick.seconds;
  if (totalSeg === 0) return;

  const timerNameInput = document.getElementById('timerNameInput');
  const label          = timerNameInput?.value.trim() || sugerirNome();
  const modalEl        = document.getElementById('modalTimer');
  const editandoId     = modalEl?.getAttribute('data-editing-id');

  if (editandoId) {
    const timer = timers.find(t => t.id === editandoId);
    if (timer) {
      timer.label        = label;
      timer.durationSecs = totalSeg;
      const st = timerStates[editandoId];
      if (st && !st.running) {
        st.remaining        = totalSeg;
        st.remainingOnPause = totalSeg;
      }
    }
    modalEl?.removeAttribute('data-editing-id');
    resetarModal();
  } else {
    const id = gerarId();
    timers.push({ id, label, durationSecs: totalSeg });
    timerStates[id] = {
      remaining: totalSeg, remainingOnPause: totalSeg,
      running: false, rafId: null, startedAt: 0,
    };
  }

  fecharModal();
  renderizarGrid();
}

/* ═══════════════════════════════════════════════════════════
   MODAL — Adicionar novo temporizador
════════════════════════════════════════════════════════════ */

function abrirModalEdicao(id) {
  const timer = timers.find(t => t.id === id);
  if (!timer) return;

  const timerNameInput = document.getElementById('timerNameInput');
  const btnClearName   = document.getElementById('btnClearTimerName');

  pick.hours   = Math.floor(timer.durationSecs / 3600);
  pick.minutes = Math.floor((timer.durationSecs % 3600) / 60);
  pick.seconds = timer.durationSecs % 60;
  atualizarPickerDisplay();

  if (timerNameInput) {
    timerNameInput.value = timer.label;
    btnClearName?.classList.remove('hidden');
  }

  const modalTitle = document.getElementById('modalTimerTitle');
  if (modalTitle) modalTitle.textContent = 'Editar temporizador';

  const modalEl = document.getElementById('modalTimer');
  let lixeira = modalEl?.querySelector('.timer-modal-delete');
  if (!lixeira && modalEl) {
    lixeira = document.createElement('button');
    lixeira.className = 'timer-modal-delete';
    lixeira.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4"
          stroke="var(--danger)" stroke-width="1.4"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    lixeira.style.cssText = `
      position: absolute; top: var(--space-5); right: var(--space-5);
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: var(--radius-sm);
      color: var(--danger); cursor: pointer;`;
    modalEl.style.position = 'relative';
    modalEl.appendChild(lixeira);
  }

  lixeira?.addEventListener('click', () => {
    excluirTimer(id);
    fecharModal();
    resetarModal();
  });

  modalEl?.setAttribute('data-editing-id', id);
  document.getElementById('modalTimerOverlay')?.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════
   LIGAÇÃO DOS EVENT LISTENERS DO MODAL
════════════════════════════════════════════════════════════ */
function ligarModal() {
  const btnSaveTimer  = document.getElementById('btnSaveTimer');
  const btnCancelTimer = document.getElementById('btnCancelTimer');
  const modalOverlay  = document.getElementById('modalTimerOverlay');
  const timerNameInput = document.getElementById('timerNameInput');
  const btnClearName  = document.getElementById('btnClearTimerName');

  btnSaveTimer?.addEventListener('click',   salvarTimer);
  btnCancelTimer?.addEventListener('click', fecharModal);

  // Fechar clicando no overlay fora do modal
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
  });

  // Setas ∧/∨ do seletor de tempo
  document.querySelectorAll('.time-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const campo = btn.getAttribute('data-field');
      const direcao = btn.classList.contains('time-arrow--up') ? 'up' : 'down';
      direcao === 'up' ? incrementarCampo(campo) : decrementarCampo(campo);
    });
  });

  // Campo de nome — botão limpar
  timerNameInput?.addEventListener('input', () => {
    const temTexto = timerNameInput.value.length > 0;
    btnClearName?.classList.toggle('hidden', !temTexto);
  });

  timerNameInput?.addEventListener('focus', () => {
    timerNameInput.classList.add('focused');
  });

  timerNameInput?.addEventListener('blur', () => {
    timerNameInput.classList.remove('focused');
  });

  btnClearName?.addEventListener('click', () => {
    if (timerNameInput) timerNameInput.value = '';
    btnClearName.classList.add('hidden');
    timerNameInput?.focus();
  });
}

/* ═══════════════════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════════════════ */
export function iniciarTimer_modulo() {
  btnAddTimer?.addEventListener('click',   abrirModal);
  btnEditTimers?.addEventListener('click', alternarModoEdicao);

  ligarModal();
  atualizarPickerDisplay();

  // Timer padrão de 20 minutos
  const idPadrao = gerarId();
  timers.push({ id: idPadrao, label: 'Cronômetro (1)', durationSecs: 1200 });
  timerStates[idPadrao] = {
    remaining: 1200, remainingOnPause: 1200,
    running: false, rafId: null, startedAt: 0,
  };

  renderizarGrid();
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarTimer_modulo();
});