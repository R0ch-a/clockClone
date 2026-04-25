/* ═══════════════════════════════════════════════════════════
   stopwatch.js — Módulo Cronômetro
   Responsável por: contagem de tempo, voltas (laps),
   identificação de volta mais rápida/lenta,
   expandir e always-on-top via Tauri.
════════════════════════════════════════════════════════════ */

import { getCurrentWindow } from '@tauri-apps/api/window';

/* ═══════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════════ */
const state = {
  elapsed:   0,       // ms totais decorridos
  lapStart:  0,       // ms no início da volta atual
  running:   false,
  rafId:     null,    // ID do requestAnimationFrame
  startedAt: 0,       // performance.now() quando iniciou/retomou
  laps:      [],      // Array de objetos de volta
  isOnTop:   false,   // Estado do always-on-top
};

/* ═══════════════════════════════════════════════════════════
   ELEMENTOS DO DOM
════════════════════════════════════════════════════════════ */
const elHours    = document.getElementById('swHours');
const elMinutes  = document.getElementById('swMinutes');
const elSeconds  = document.getElementById('swSeconds');
const elMs       = document.getElementById('swMs');
const btnPlay    = document.getElementById('btnSwPlayPause');
const btnLap     = document.getElementById('btnSwLap');
const btnReset   = document.getElementById('btnSwReset');
const btnExpand  = document.getElementById('btnStopwatchExpand');
const btnPin     = document.getElementById('btnStopwatchPin');
const lapTable   = document.getElementById('lapTable');
const lapList    = document.getElementById('lapList');
const iconPlay   = btnPlay?.querySelector('.icon-play');
const iconPause  = btnPlay?.querySelector('.icon-pause');

/* ═══════════════════════════════════════════════════════════
   FORMATAÇÃO DE TEMPO
════════════════════════════════════════════════════════════ */

/**
 * Formata milissegundos em { h, m, s, ms }
 * @param {number} ms
 */
function parseTempo(ms) {
  const totalSeg = Math.floor(ms / 1000);
  return {
    h:  Math.floor(totalSeg / 3600),
    m:  Math.floor((totalSeg % 3600) / 60),
    s:  totalSeg % 60,
    ms: Math.floor((ms % 1000) / 10), // dois dígitos (0–99)
  };
}

/**
 * Pad numérico com zeros à esquerda
 * @param {number} n
 * @param {number} digits
 */
function pad(n, digits = 2) {
  return String(n).padStart(digits, '0');
}

/**
 * Formata ms em string "hh:mm:ss,ms"
 * @param {number} ms
 */
export function formatarTempo(ms) {
  const { h, m, s, ms: centesimos } = parseTempo(ms);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(centesimos)}`;
}

/* ═══════════════════════════════════════════════════════════
   ATUALIZAÇÃO DO DISPLAY
════════════════════════════════════════════════════════════ */
function atualizarDisplay(ms) {
  const { h, m, s, ms: centesimos } = parseTempo(ms);
  if (elHours)   elHours.textContent   = pad(h);
  if (elMinutes) elMinutes.textContent = pad(m);
  if (elSeconds) elSeconds.textContent = pad(s);
  if (elMs)      elMs.textContent      = pad(centesimos);
}

/* ═══════════════════════════════════════════════════════════
   LOOP DE ANIMAÇÃO
════════════════════════════════════════════════════════════ */
function tick(agora) {
  if (!state.running) return;
  state.elapsed = agora - state.startedAt;
  atualizarDisplay(state.elapsed);
  state.rafId = requestAnimationFrame(tick);
}

/* ═══════════════════════════════════════════════════════════
   CONTROLES
════════════════════════════════════════════════════════════ */
function iniciar() {
  if (state.running) return;
  state.startedAt = performance.now() - state.elapsed;
  state.running   = true;
  state.rafId     = requestAnimationFrame(tick);

  // Troca ícone play → pause
  iconPlay?.classList.add('hidden');
  iconPause?.classList.remove('hidden');
  btnPlay?.setAttribute('aria-label', 'Pausar');
}

function pausar() {
  if (!state.running) return;
  cancelAnimationFrame(state.rafId);
  state.running = false;

  // Troca ícone pause → play
  iconPause?.classList.add('hidden');
  iconPlay?.classList.remove('hidden');
  btnPlay?.setAttribute('aria-label', 'Iniciar');
}

function alternarPlayPause() {
  state.running ? pausar() : iniciar();
}

function redefinir() {
  pausar();
  state.elapsed  = 0;
  state.lapStart = 0;
  state.laps     = [];
  atualizarDisplay(0);
  renderizarVoltas();
}

function registrarVolta() {
  if (!state.running) return;

  const agora      = state.elapsed;
  const parcial    = agora - state.lapStart;
  const numero     = state.laps.length + 1;

  state.laps.unshift({ // mais recente no topo
    number:  numero,
    partial: parcial,
    total:   agora,
    label:   '',
  });

  state.lapStart = agora;
  atualizarLabelsVolta();
  renderizarVoltas();
}

/* ═══════════════════════════════════════════════════════════
   LÓGICA DE LABELS (Mais rápida / Mais lento)
════════════════════════════════════════════════════════════ */
function atualizarLabelsVolta() {
  // Limpa todos os labels
  state.laps.forEach(lap => { lap.label = ''; });

  if (state.laps.length < 2) return;

  const tempos   = state.laps.map(l => l.partial);
  const minTempo = Math.min(...tempos);
  const maxTempo = Math.max(...tempos);

  state.laps.forEach(lap => {
    if (lap.partial === minTempo) lap.label = 'Mais rápida';
    else if (lap.partial === maxTempo) lap.label = 'Mais lento';
  });
}

/* ═══════════════════════════════════════════════════════════
   RENDERIZAÇÃO DA TABELA DE VOLTAS
════════════════════════════════════════════════════════════ */
function renderizarVoltas() {
  if (!lapList || !lapTable) return;

  // Esconde a tabela se não houver voltas
  if (state.laps.length === 0) {
    lapTable.classList.add('hidden');
    lapList.innerHTML = '';
    return;
  }

  lapTable.classList.remove('hidden');

  lapList.innerHTML = state.laps.map(lap => `
    <div class="lap-row">
      <span class="lap-number">
        ${lap.number}
        ${lap.label
          ? `<span class="lap-label ${lap.label === 'Mais rápida' ? 'lap-label--fast' : 'lap-label--slow'}">${lap.label}</span>`
          : ''}
      </span>
      <span class="lap-time">${formatarTempo(lap.partial)}</span>
      <span class="lap-total">${formatarTempo(lap.total)}</span>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════
   EXPANDIR (modo tela cheia)
════════════════════════════════════════════════════════════ */
let modoExpandido = false;

async function alternarExpandir() {
  modoExpandido = !modoExpandido;
  const sidebar  = document.getElementById('sidebar');
  const display  = document.querySelector('.stopwatch-display');
  const controls = document.querySelector('.stopwatch-controls');
  const labels   = document.querySelector('.stopwatch-labels');

  if (modoExpandido) {
    // Esconde sidebar
    sidebar?.style.setProperty('width', '0');
    sidebar?.style.setProperty('min-width', '0');
    sidebar?.style.setProperty('border', 'none');
    sidebar?.style.setProperty('overflow', 'hidden');

    // Esconde tabela de voltas
    lapTable?.classList.add('hidden');

    // Aumenta o display
    if (display) display.style.transform = 'scale(1.6)';
    if (labels)  labels.style.fontSize   = 'var(--fs-lg)';

    // Ícone de recolher — setas se encontrando
    btnExpand.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 2l-4 4M2 2h4v4M10 14l4-4M14 14h-4v-4"
          stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    btnExpand.setAttribute('title', 'Recolher');
    btnPin?.style.setProperty('display', 'none');

  } else {
    // Restaura sidebar
    sidebar?.style.removeProperty('width');
    sidebar?.style.removeProperty('min-width');
    sidebar?.style.removeProperty('border');
    sidebar?.style.removeProperty('overflow');

    // Restaura tabela de voltas se houver voltas
    if (state.laps.length > 0) lapTable?.classList.remove('hidden');

    // Restaura display
    if (display) display.style.transform = '';
    if (labels)  labels.style.fontSize   = '';

    // Ícone de expandir — setas se afastando
    btnExpand.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5"
          stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    btnExpand.setAttribute('title', 'Expandir');
    btnPin?.style.removeProperty('display');
  }
}

/* ═══════════════════════════════════════════════════════════
   ALWAYS-ON-TOP (manter na parte superior)
════════════════════════════════════════════════════════════ */
async function alternarPin() {
  try {
    state.isOnTop = !state.isOnTop;
    const win = getCurrentWindow();

    if (state.isOnTop) {
      await win.setAlwaysOnTop(true);
      await win.setSize({ type: 'Logical', width: 400, height: 480 });

      // Esconde sidebar
      document.getElementById('sidebar')?.style.setProperty('width', '0');
      document.getElementById('sidebar')?.style.setProperty('min-width', '0');
      document.getElementById('sidebar')?.style.setProperty('border', 'none');
      document.getElementById('sidebar')?.style.setProperty('overflow', 'hidden');

      // Esconde botão expandir e voltas
      btnExpand?.style.setProperty('display', 'none');
      lapTable?.classList.add('hidden');

    } else {
      await win.setAlwaysOnTop(false);
      await win.setSize({ type: 'Logical', width: 800, height: 600 });

      // Restaura sidebar
      const sidebar = document.getElementById('sidebar');
      sidebar?.style.removeProperty('width');
      sidebar?.style.removeProperty('min-width');
      sidebar?.style.removeProperty('border');
      sidebar?.style.removeProperty('overflow');

      // Restaura botão expandir e voltas
      btnExpand?.style.removeProperty('display');
      if (state.laps.length > 0) lapTable?.classList.remove('hidden');
    }

    btnPin?.classList.toggle('active', state.isOnTop);

  } catch (err) {
    console.warn('[stopwatch] Não foi possível alterar always-on-top:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════════════════ */
export function iniciarCronometro() {
  btnPlay?.addEventListener('click', alternarPlayPause);
  btnLap?.addEventListener('click', registrarVolta);
  btnReset?.addEventListener('click', redefinir);
  btnExpand?.addEventListener('click', alternarExpandir);
  btnPin?.addEventListener('click', alternarPin);

  // Display inicial zerado
  atualizarDisplay(0);
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarCronometro();
});
