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
async function alternarExpandir() {
  try {
    const win = getCurrentWindow();
    const maximizada = await win.isMaximized();
    if (maximizada) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  } catch (err) {
    console.warn('[stopwatch] Não foi possível alternar janela:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   ALWAYS-ON-TOP (manter na parte superior)
════════════════════════════════════════════════════════════ */
async function alternarPin() {
  try {
    state.isOnTop = !state.isOnTop;
    await getCurrentWindow().setAlwaysOnTop(state.isOnTop);

    // Feedback visual no botão
    btnPin?.classList.toggle('active', state.isOnTop);
    btnPin?.setAttribute(
      'aria-label',
      state.isOnTop ? 'Desafixar da parte superior' : 'Manter na parte superior'
    );
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
