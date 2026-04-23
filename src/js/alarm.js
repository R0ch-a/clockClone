/* ═══════════════════════════════════════════════════════════
   alarm.js — Módulo Alarme
   Responsável por: lista de alarmes, toggle on/off,
   seleção de dias da semana, cálculo de "em X horas Y min",
   notificações nativas via Tauri e banner de energia.
════════════════════════════════════════════════════════════ */

import { invoke } from '@tauri-apps/api/core';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
════════════════════════════════════════════════════════════ */
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

/* ═══════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════════ */
let alarmes = [
  // Alarme de exemplo para visualização inicial
  {
    id:      'alarm-exemplo',
    label:   'Bom dia',
    time:    '07:00',
    enabled: false,
    days:    [0, 1, 2, 3, 4, 5, 6], // todos os dias
  },
];

// Referência ao intervalo que atualiza "em X horas Y min"
let intervaloCálculo = null;

/* ═══════════════════════════════════════════════════════════
   ELEMENTOS DO DOM
════════════════════════════════════════════════════════════ */
const alarmList       = document.getElementById('alarmList');
const btnAddAlarm     = document.getElementById('btnAddAlarm');
const btnPowerSettings = document.getElementById('btnPowerSettings');

/* ═══════════════════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════════════════ */
function pad(n) {
  return String(n).padStart(2, '0');
}

function gerarId() {
  return `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Calcula o tempo até o próximo disparo do alarme.
 * Retorna string "em X horas, Y minutos" ou "" se desativado.
 */
function tempoAteAlarme(alarm) {
  if (!alarm.enabled) return '';

  const agora = new Date();
  const [h, m] = alarm.time.split(':').map(Number);

  // Próximo disparo candidato
  const proximo = new Date();
  proximo.setHours(h, m, 0, 0);

  // Se já passou hoje, avança para amanhã
  if (proximo <= agora) {
    proximo.setDate(proximo.getDate() + 1);
  }

  // Se há dias específicos, avança até o próximo dia válido
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
   VERIFICAÇÃO DE ALARMES (polling a cada 30s)
════════════════════════════════════════════════════════════ */
function verificarAlarmes() {
  const agora     = new Date();
  const horaAtual = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
  const diaAtual  = agora.getDay(); // 0=Dom

  alarmes.forEach(alarm => {
    if (!alarm.enabled) return;
    if (alarm.time !== horaAtual) return;

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
   RENDERIZAÇÃO
════════════════════════════════════════════════════════════ */
function renderizarAlarmes() {
  if (!alarmList) return;
  alarmList.innerHTML = '';
  alarmes.forEach(alarm => {
    alarmList.appendChild(criarCardAlarme(alarm));
  });
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
        ${alarm.enabled && tempoTexto ? `
          <div class="alarm-countdown">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M10 17.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.4"/>
              <path d="M11.5 3.5a5 5 0 0 1 5 5v3.5l1.5 2H2l1.5-2V8.5a5 5 0 0 1 5-5"
                stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <span class="alarm-countdown-text">${tempoTexto}</span>
          </div>
        ` : '<div class="alarm-countdown-placeholder"></div>'}
        <div class="alarm-label">${alarm.label}</div>
        <div class="alarm-days">
          ${DIAS.map((dia, i) => `
            <span class="alarm-day-pill ${alarm.days.includes(i) ? 'alarm-day-pill--active' : ''}"
                  data-day="${i}">${dia}</span>
          `).join('')}
        </div>
      </div>

      <div class="alarm-card-right">
        <label class="alarm-toggle" aria-label="Ativar/desativar alarme">
          <input type="checkbox"
            class="alarm-toggle-input"
            ${alarm.enabled ? 'checked' : ''}
            data-id="${alarm.id}" />
          <span class="alarm-toggle-track">
            <span class="alarm-toggle-thumb"></span>
          </span>
        </label>
      </div>
    </div>

    <div class="alarm-card-hover-label">Editar alarme</div>
  `;

  // ── Toggle on/off ──
  const toggleInput = card.querySelector('.alarm-toggle-input');
  toggleInput?.addEventListener('change', (e) => {
    e.stopPropagation();
    alternarAlarme(alarm.id, toggleInput.checked);
  });

  // ── Pílulas de dias ──
  card.querySelectorAll('.alarm-day-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const dia = parseInt(pill.getAttribute('data-day'));
      alternarDia(alarm.id, dia);
    });
  });

  // ── Clique no card → editar ──
  card.addEventListener('click', () => abrirEdicao(alarm.id));

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
  if (idx >= 0) {
    alarm.days.splice(idx, 1);
  } else {
    alarm.days.push(dia);
    alarm.days.sort();
  }
  renderizarAlarmes();
}

function excluirAlarme(id) {
  alarmes = alarmes.filter(a => a.id !== id);
  renderizarAlarmes();
}

/* ═══════════════════════════════════════════════════════════
   MODAL DE EDIÇÃO / ADIÇÃO
   (implementação simples via prompt nativo por enquanto —
    o modal visual completo será adicionado no alarm.css sprint)
════════════════════════════════════════════════════════════ */
function abrirEdicao(id) {
  const alarm = alarmes.find(a => a.id === id);
  if (!alarm) return;

  // TODO: abrir modal visual de edição
  // Por ora usamos prompt para não bloquear o desenvolvimento
  const novoLabel = prompt('Nome do alarme:', alarm.label);
  if (novoLabel === null) return; // cancelou
  alarm.label = novoLabel.trim() || alarm.label;

  const novoHorario = prompt('Horário (HH:MM):', alarm.time);
  if (novoHorario === null) return;
  if (/^\d{2}:\d{2}$/.test(novoHorario)) alarm.time = novoHorario;

  renderizarAlarmes();
}

function adicionarAlarme() {
  const novoLabel = prompt('Nome do alarme:', 'Alarme');
  if (novoLabel === null) return;

  const novoHorario = prompt('Horário (HH:MM):', '08:00');
  if (novoHorario === null) return;
  if (!/^\d{2}:\d{2}$/.test(novoHorario)) {
    alert('Horário inválido. Use o formato HH:MM.');
    return;
  }

  const novoAlarme = {
    id:      gerarId(),
    label:   novoLabel.trim() || 'Alarme',
    time:    novoHorario,
    enabled: true,
    days:    [0, 1, 2, 3, 4, 5, 6],
  };

  alarmes.push(novoAlarme);
  renderizarAlarmes();
}

/* ═══════════════════════════════════════════════════════════
   BANNER — Alterar configurações de energia
════════════════════════════════════════════════════════════ */
async function abrirConfigsEnergia() {
  try {
    await invoke('open_power_settings');
  } catch (err) {
    console.warn('[alarm] Não foi possível abrir configurações de energia:', err);
  }
}

/* ═══════════════════════════════════════════════════════════
   ATUALIZAÇÃO PERIÓDICA DO COUNTDOWN
════════════════════════════════════════════════════════════ */
function iniciarAtualizacaoCountdown() {
  // Atualiza o texto "em X horas, Y min" a cada minuto
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
  btnAddAlarm?.addEventListener('click', adicionarAlarme);
  btnPowerSettings?.addEventListener('click', abrirConfigsEnergia);

  // Verificação de alarmes a cada 30 segundos
  setInterval(verificarAlarmes, 30_000);

  // Atualização do countdown
  iniciarAtualizacaoCountdown();

  renderizarAlarmes();
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarAlarme();
});
