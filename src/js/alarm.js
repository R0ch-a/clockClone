/* ═══════════════════════════════════════════════════════════
   alarm.js — Módulo Alarme (v2)
   Modal visual completo, modo de edição com lixeira,
   checkbox de repetição, pílulas de dias, som e soneca.
════════════════════════════════════════════════════════════ */

import { invoke } from '@tauri-apps/api/core';
import {
  salvarAlarmes,
  onAlarmeFired,
  enviarNotificacao,
  abrirConfigsEnergia,
  pararSom,
} from './tauri-bridge.js';

// Carrega dados ao iniciar
window.addEventListener('dados-carregados', (e) => {
  if (e.detail.alarms?.length) {
    alarmes = e.detail.alarms;
    renderizarAlarmes();
  }
});

// Salva sempre que mudar
async function persistir() {
  await salvarAlarmes(alarmes);
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
════════════════════════════════════════════════════════════ */
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const OPCOES_SOM = ['Alarmes', 'Bells', 'Chimes', 'Digital', 'Piano'];

const OPCOES_SONECA = [
  { label: '5 minutos',  value: 5  },
  { label: '10 minutos', value: 10 },
  { label: '15 minutos', value: 15 },
  { label: '20 minutos', value: 20 },
  { label: '30 minutos', value: 30 },
];

/* ═══════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════════ */
let alarmes = [
  {
    id:      'alarm-exemplo',
    label:   'Bom dia',
    time:    '07:00',
    enabled: false,
    repeat:  true,
    days:    [0, 1, 2, 3, 4, 5, 6],
    sound:   'Alarmes',
    snooze:  10,
  },
];

let editMode  = false;
let modalMode = 'add'; // 'add' | 'edit'
let editingId = null;
let intervaloCálculo = null;

// Estado temporário do modal
const modalState = {
  hours:   7,
  minutes: 0,
  label:   '',
  repeat:  true,
  days:    [0, 1, 2, 3, 4, 5, 6],
  sound:   'Alarmes',
  snooze:  10,
};

/* ═══════════════════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════════════════ */
function pad(n) {
  return String(n).padStart(2, '0');
}

function gerarId() {
  return `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sugerirNome() {
  return `Alarme (${alarmes.length + 1})`;
}

function tempoAteAlarme(alarm) {
  if (!alarm.enabled) return '';

  const agora = new Date();
  const [h, m] = alarm.time.split(':').map(Number);
  const proximo = new Date();
  proximo.setHours(h, m, 0, 0);

  if (proximo <= agora) proximo.setDate(proximo.getDate() + 1);

  if (alarm.days.length > 0 && alarm.days.length < 7) {
    let tentativas = 0;
    while (!alarm.days.includes(proximo.getDay()) && tentativas < 8) {
      proximo.setDate(proximo.getDate() + 1);
      tentativas++;
    }
  }

  const diffMs  = proximo - agora;
  const horas   = Math.floor(diffMs / 3_600_000);
  const minutos = Math.floor((diffMs % 3_600_000) / 60_000);

  const parteH = horas   > 0 ? `${horas} hora${horas   !== 1 ? 's' : ''}` : '';
  const parteM = minutos > 0 ? `${minutos} minuto${minutos !== 1 ? 's' : ''}` : '';

  if (parteH && parteM) return `em ${parteH}, ${parteM}`;
  if (parteH)           return `em ${parteH}`;
  if (parteM)           return `em ${parteM}`;
  return 'em menos de 1 minuto';
}

/* ═══════════════════════════════════════════════════════════
   VERIFICAÇÃO DE ALARMES
════════════════════════════════════════════════════════════ */
function verificarAlarmes() {
  const agora     = new Date();
  const horaAtual = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
  const diaAtual  = agora.getDay();

  alarmes.forEach(alarm => {
    if (!alarm.enabled || alarm.time !== horaAtual) return;
    const diaOk = alarm.days.length === 0 || alarm.days.includes(diaAtual);
    if (diaOk) dispararAlarme(alarm);
  });
}

async function dispararAlarme(alarm) {
  try {
    await invoke('send_notification', {
      title: alarm.label || 'Alarme',
      body:  `Alarme das ${alarm.time}`,
    });
  } catch (err) {
    console.warn('[alarm] Notificação não disponível:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDERIZAÇÃO DOS CARDS
════════════════════════════════════════════════════════════ */
function renderizarAlarmes() {
  const alarmList = document.getElementById('alarmList');
  if (!alarmList) return;

  alarmList.innerHTML = '';
  alarmes.forEach(alarm => alarmList.appendChild(criarCardAlarme(alarm)));

  // Mostra o banner apenas se houver pelo menos um alarme ativo
  const banner = document.getElementById('alarmBanner');
  if (banner) {
    const temAtivo = alarmes.some(a => a.enabled);
    banner.classList.toggle('hidden', !temAtivo);
  }
}

function criarCardAlarme(alarm) {
  const card = document.createElement('div');
  card.className = `alarm-card ${alarm.enabled ? 'alarm-card--active' : ''}`;
  card.id = `alarm-${alarm.id}`;

  const tempoTexto = tempoAteAlarme(alarm);

  card.innerHTML = `
    <div class="alarm-card-main">
      <div class="alarm-card-left">
        <div class="alarm-time">${alarm.time}</div>
        ${alarm.enabled && tempoTexto
          ? `<div class="alarm-countdown">
               <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                 <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1z" stroke="currentColor" stroke-width="1.3"/>
                 <path d="M8 4v4l2.5 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
               </svg>
               <span class="alarm-countdown-text">${tempoTexto}</span>
             </div>`
          : '<div class="alarm-countdown-placeholder"></div>'
        }
        <div class="alarm-label">${alarm.label}</div>
        <div class="alarm-days">
          ${DIAS.map((dia, i) => `
            <span class="alarm-day-pill ${alarm.days.includes(i) ? 'alarm-day-pill--active' : ''}"
                  data-day="${i}">${dia}</span>
          `).join('')}
        </div>
      </div>

      <div class="alarm-card-right">
        ${editMode
          ? `<button class="alarm-delete-btn" aria-label="Excluir alarme" title="Excluir">
               <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                 <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4"
                   stroke="var(--danger)" stroke-width="1.4"
                   stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
             </button>`
          : `<label class="alarm-toggle" aria-label="Ativar/desativar alarme">
               <input type="checkbox" class="alarm-toggle-input"
                 ${alarm.enabled ? 'checked' : ''} data-id="${alarm.id}" />
               <span class="alarm-toggle-track">
                 <span class="alarm-toggle-thumb"></span>
               </span>
             </label>`
        }
      </div>
    </div>
  `;

  // Toggle on/off
  const toggleInput = card.querySelector('.alarm-toggle-input');
  toggleInput?.addEventListener('change', (e) => {
    e.stopPropagation();
    alternarAlarme(alarm.id, toggleInput.checked);
    persistir();
  });

  // Impede que o clique no toggle abra o modal de edição
  const toggleLabel = card.querySelector('.alarm-toggle');
  toggleLabel?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Pílulas de dias
  card.querySelectorAll('.alarm-day-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      alternarDia(alarm.id, parseInt(pill.getAttribute('data-day')));
    });
  });

  // Lixeira (modo edição)
  const btnDelete = card.querySelector('.alarm-delete-btn');
  btnDelete?.addEventListener('click', (e) => {
    e.stopPropagation();
    excluirAlarme(alarm.id);
    persistir();
  });

  // Clique no card → editar (apenas fora do modo edição)
  if (!editMode) {
    card.addEventListener('click', () => abrirModal('edit', alarm.id));
  }

  return card;
}

/* ═══════════════════════════════════════════════════════════
   AÇÕES
════════════════════════════════════════════════════════════ */
function alternarAlarme(id, ativo) {
  const alarm = alarmes.find(a => a.id === id);
  if (!alarm) return;
  alarm.enabled = ativo;
  renderizarAlarmes();
}

function alternarDia(id, dia) {
  const alarm = alarmes.find(a => a.id === id);
  if (!alarm) return;
  const idx = alarm.days.indexOf(dia);
  if (idx >= 0) alarm.days.splice(idx, 1);
  else { alarm.days.push(dia); alarm.days.sort(); }
  renderizarAlarmes();
}

function excluirAlarme(id) {
  const card = document.getElementById(`alarm-${id}`);
  if (card) {
    card.style.animation = 'alarmSair 150ms ease forwards';
    setTimeout(() => {
      alarmes = alarmes.filter(a => a.id !== id);
      renderizarAlarmes();
    }, 150);
  }
}

/* ═══════════════════════════════════════════════════════════
   MODO DE EDIÇÃO
════════════════════════════════════════════════════════════ */
function alternarModoEdicao() {
  editMode = !editMode;

  if (btnEditAlarms) {
    if (editMode) {
      btnEditAlarms.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 8l4 4 7-7" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      btnEditAlarms.setAttribute('title', 'Concluído');
    } else {
      btnEditAlarms.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z"
            stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>`;
      btnEditAlarms.setAttribute('title', 'Editar alarmes');
    }
  }

  renderizarAlarmes();
}

/* ═══════════════════════════════════════════════════════════
   MODAL — Adicionar / Editar alarme
════════════════════════════════════════════════════════════ */
function criarModal() {
  document.getElementById('modalAlarmeOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalAlarmeOverlay';

  overlay.innerHTML = `
    <div class="modal modal--alarm" id="modalAlarme">
      <div class="modal-title-row">
        <h2 class="modal-title">
          ${modalMode === 'add' ? 'Adicionar novo alarme' : 'Editar alarme'}
        </h2>
        ${modalMode === 'edit' ? `
          <button class="alarm-modal-delete-btn" id="btnModalDeleteAlarme" aria-label="Excluir alarme">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4"
                stroke="var(--danger)" stroke-width="1.4"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="time-picker time-picker--alarm">
        <div class="time-field-wrap">
          <button class="time-arrow time-arrow--up" data-field="hours" aria-label="Aumentar horas">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10l5-5 5 5" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="time-field" id="alarmPickHours">${pad(modalState.hours)}</span>
          <button class="time-arrow time-arrow--down" data-field="hours" aria-label="Diminuir horas">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4l5 5 5-5" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <span class="time-sep">:</span>
        <div class="time-field-wrap">
          <button class="time-arrow time-arrow--up" data-field="minutes" aria-label="Aumentar minutos">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10l5-5 5 5" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="time-field" id="alarmPickMinutes">${pad(modalState.minutes)}</span>
          <button class="time-arrow time-arrow--down" data-field="minutes" aria-label="Diminuir minutos">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4l5 5 5-5" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="timer-name-row">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10.5 2.5l3 3L4 15H1v-3L10.5 2.5z"
            stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        <div class="timer-name-input-wrap">
          <input type="text" class="timer-name-input" id="alarmNameInput"
            placeholder="Nome do alarme" value="${modalState.label}" />
        </div>
      </div>

      <label class="alarm-modal-repeat">
        <input type="checkbox" id="alarmRepeatCheck"
          ${modalState.repeat ? 'checked' : ''} />
        <span>Repetir alarme</span>
      </label>

      <div class="alarm-modal-days ${modalState.repeat ? '' : 'hidden'}" id="alarmModalDays">
        ${DIAS.map((dia, i) => `
          <span class="alarm-day-pill ${modalState.days.includes(i) ? 'alarm-day-pill--active' : ''}"
                data-day="${i}">${dia}</span>
        `).join('')}
      </div>

      <div class="alarm-modal-select-row">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 5.5h3l4-3v11l-4-3H2V5.5zM11 6a3 3 0 0 1 0 4"
            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <select class="alarm-modal-select" id="alarmSoundSelect">
          ${OPCOES_SOM.map(s => `
            <option value="${s}" ${modalState.sound === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </div>

      <div class="alarm-modal-select-row">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="9" r="5.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M8 6v3l2 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M5.5 1.5l-2 2M10.5 1.5l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <select class="alarm-modal-select" id="alarmSnoozeSelect">
          ${OPCOES_SONECA.map(s => `
            <option value="${s.value}" ${modalState.snooze === s.value ? 'selected' : ''}>${s.label}</option>
          `).join('')}
        </select>
      </div>

      <div class="modal-actions">
        <button class="modal-btn modal-btn--primary" id="btnSalvarAlarme">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <rect x="4" y="1" width="6" height="4" rx="0.5" fill="currentColor" opacity="0.5"/>
            <rect x="3" y="8" width="8" height="4" rx="0.5" fill="currentColor" opacity="0.5"/>
          </svg>
          Salvar
        </button>
        <button class="modal-btn modal-btn--secondary" id="btnCancelarAlarme">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          Cancelar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  ligarEventosModal(overlay);
}

function ligarEventosModal(overlay) {
  overlay.querySelectorAll('.time-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const campo = btn.getAttribute('data-field');
      const subir = btn.classList.contains('time-arrow--up');
      if (campo === 'hours') {
        modalState.hours   = subir ? (modalState.hours + 1) % 24 : (modalState.hours - 1 + 24) % 24;
        document.getElementById('alarmPickHours').textContent = pad(modalState.hours);
      } else {
        modalState.minutes = subir ? (modalState.minutes + 1) % 60 : (modalState.minutes - 1 + 60) % 60;
        document.getElementById('alarmPickMinutes').textContent = pad(modalState.minutes);
      }
    });
  });

  const repeatCheck = overlay.querySelector('#alarmRepeatCheck');
  const daysRow     = overlay.querySelector('#alarmModalDays');
  repeatCheck?.addEventListener('change', () => {
    modalState.repeat = repeatCheck.checked;
    daysRow?.classList.toggle('hidden', !modalState.repeat);
  });

  overlay.querySelectorAll('#alarmModalDays .alarm-day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const dia = parseInt(pill.getAttribute('data-day'));
      const idx = modalState.days.indexOf(dia);
      if (idx >= 0) modalState.days.splice(idx, 1);
      else { modalState.days.push(dia); modalState.days.sort(); }
      pill.classList.toggle('alarm-day-pill--active', modalState.days.includes(dia));
    });
  });

  overlay.querySelector('#alarmSoundSelect')?.addEventListener('change', (e) => {
    modalState.sound = e.target.value;
  });

  overlay.querySelector('#alarmSnoozeSelect')?.addEventListener('change', (e) => {
    modalState.snooze = parseInt(e.target.value);
  });

  overlay.querySelector('#btnSalvarAlarme')?.addEventListener('click', salvarAlarme);
  overlay.querySelector('#btnCancelarAlarme')?.addEventListener('click', fecharModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
  document.addEventListener('keydown', onEsc);

  overlay.querySelector('#btnModalDeleteAlarme')?.addEventListener('click', () => {
    excluirAlarme(editingId);
    fecharModal();
  });
}

function onEsc(e) {
  if (e.key === 'Escape') fecharModal();
}

function abrirModal(modo = 'add', id = null) {
  modalMode = modo;
  editingId = id;

  if (modo === 'edit' && id) {
    const alarm = alarmes.find(a => a.id === id);
    if (!alarm) return;
    const [h, m]       = alarm.time.split(':').map(Number);
    modalState.hours   = h;
    modalState.minutes = m;
    modalState.label   = alarm.label;
    modalState.repeat  = alarm.repeat ?? true;
    modalState.days    = [...alarm.days];
    modalState.sound   = alarm.sound  ?? 'Alarmes';
    modalState.snooze  = alarm.snooze ?? 10;
  } else {
    modalState.hours   = 7;
    modalState.minutes = 0;
    modalState.label   = sugerirNome();
    modalState.repeat  = true;
    modalState.days    = [0, 1, 2, 3, 4, 5, 6];
    modalState.sound   = 'Alarmes';
    modalState.snooze  = 10;
  }

  criarModal();
}

function fecharModal() {
  document.getElementById('modalAlarmeOverlay')?.remove();
  document.removeEventListener('keydown', onEsc);
}

function salvarAlarme() {
  const nomeInput = document.getElementById('alarmNameInput');
  const label     = nomeInput?.value.trim() || sugerirNome();
  const time      = `${pad(modalState.hours)}:${pad(modalState.minutes)}`;

  if (modalMode === 'edit' && editingId) {
    const alarm = alarmes.find(a => a.id === editingId);
    if (alarm) {
      alarm.time   = time;
      alarm.label  = label;
      alarm.repeat = modalState.repeat;
      alarm.days   = modalState.repeat ? [...modalState.days] : [];
      alarm.sound  = modalState.sound;
      alarm.snooze = modalState.snooze;
    }
  } else {
    alarmes.push({
      id:      gerarId(),
      label,
      time,
      enabled: true,
      repeat:  modalState.repeat,
      days:    modalState.repeat ? [...modalState.days] : [],
      sound:   modalState.sound,
      snooze:  modalState.snooze,
    });
  }

  fecharModal();
  renderizarAlarmes();
}

/* ═══════════════════════════════════════════════════════════
   COUNTDOWN
════════════════════════════════════════════════════════════ */
function iniciarAtualizacaoCountdown() {
  intervaloCálculo = setInterval(() => {
    document.querySelectorAll('.alarm-countdown-text').forEach(el => {
      const card  = el.closest('.alarm-card');
      const id    = card?.id?.replace('alarm-', '');
      const alarm = alarmes.find(a => a.id === id);
      if (alarm) el.textContent = tempoAteAlarme(alarm);
    });
  }, 60_000);
}

/* ═══════════════════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════════════════ */
export function iniciarAlarme() {

  /* ═══════════════════════════════════════════════════════════
     ELEMENTOS DO DOM
  ════════════════════════════════════════════════════════════ */
  const alarmList        = document.getElementById('alarmList');
  const btnAddAlarm      = document.getElementById('btnAddAlarm');
  const btnEditAlarms    = document.getElementById('btnEditAlarms');
  const btnPowerSettings = document.getElementById('btnPowerSettings');

  btnAddAlarm?.addEventListener('click',      () => abrirModal('add'));
  btnEditAlarms?.addEventListener('click',    alternarModoEdicao);
  btnPowerSettings?.addEventListener('click', abrirConfigsEnergia);

  setInterval(verificarAlarmes, 30_000);
  iniciarAtualizacaoCountdown();
  renderizarAlarmes();

  // Escuta alarmes disparados pelo scheduler Rust
  onAlarmeFired((payload) => {
    enviarNotificacao(payload.label, `Alarme: ${payload.time}`);
    mostrarBannerAlarme(payload.label);

    const alarme = alarmes.find(a => a.id === payload.id);
    if (alarme && !alarme.repeat) {
      alarme.enabled = false;
      renderizarAlarmes();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarAlarme();
});

function mostrarBannerAlarme(label) {
  // Remove banner anterior se existir
  document.getElementById('bannerAlarmeTocando')?.remove();

  const banner = document.createElement('div');
  banner.id = 'bannerAlarmeTocando';
  banner.className = 'alarm-playing-banner';
  banner.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 17.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M11.5 3.5a5 5 0 0 1 5 5v3.5l1.5 2H2l1.5-2V8.5a5 5 0 0 1 5-5"
        stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>${label} está tocando</span>
    <button class="alarm-stop-btn" id="btnPararAlarme">Parar</button>
  `;

  // Insere ANTES do banner de energia
  const bannerEnergia = document.getElementById('alarmBanner');
  bannerEnergia
    ? bannerEnergia.before(banner)
    : document.getElementById('page-alarm')?.appendChild(banner);

  document.getElementById('btnPararAlarme')?.addEventListener('click', async () => {
    await pararSom();
    banner.remove();
  });
}