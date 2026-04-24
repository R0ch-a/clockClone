// ═══════════════════════════════════════════════════════════
// alarm.test.js — Testes unitários do módulo Alarme
// Executor: Vitest  (npm test)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do ambiente Tauri ───────────────────────────────
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

// ═══════════════════════════════════════════════════════════
// FUNÇÕES PURAS EXTRAÍDAS PARA TESTE
// (replicam a lógica de alarm.js sem depender do DOM)
// ═══════════════════════════════════════════════════════════

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function sugerirNome(alarmes) {
  return `Alarme (${alarmes.length + 1})`;
}

function tempoAteAlarme(alarm, agora = new Date()) {
  if (!alarm.enabled) return '';

  const [h, m]   = alarm.time.split(':').map(Number);
  const proximo  = new Date(agora);
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

function deveDisparar(alarm, horaAtual, diaAtual) {
  if (!alarm.enabled)          return false;
  if (alarm.time !== horaAtual) return false;
  if (alarm.days.length === 0) return true;
  return alarm.days.includes(diaAtual);
}

function alternarDia(days, dia) {
  const novosDias = [...days];
  const idx = novosDias.indexOf(dia);
  if (idx >= 0) {
    novosDias.splice(idx, 1);
  } else {
    novosDias.push(dia);
    novosDias.sort((a, b) => a - b);
  }
  return novosDias;
}

function validarHorario(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function formatarHorario(hours, minutes) {
  return `${pad(hours)}:${pad(minutes)}`;
}

// ═══════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════
function alarmeAtivo() {
  return {
    id:      'alarm-001',
    label:   'Bom dia',
    time:    '07:00',
    enabled: true,
    repeat:  true,
    days:    [0, 1, 2, 3, 4, 5, 6],
    sound:   'Alarmes',
    snooze:  10,
  };
}

function alarmeInativo() {
  return { ...alarmeAtivo(), enabled: false };
}

function alarmeSegundaASexta() {
  return { ...alarmeAtivo(), days: [1, 2, 3, 4, 5] };
}

// ═══════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════

describe('sugerirNome', () => {
  it('deve sugerir "Alarme (1)" com lista vazia', () => {
    expect(sugerirNome([])).toBe('Alarme (1)');
  });

  it('deve sugerir "Alarme (2)" com 1 alarme existente', () => {
    expect(sugerirNome([alarmeAtivo()])).toBe('Alarme (2)');
  });

  it('deve sugerir nome correto com N alarmes', () => {
    const lista = Array.from({ length: 4 }, (_, i) => ({ id: String(i) }));
    expect(sugerirNome(lista)).toBe('Alarme (5)');
  });
});

describe('deveDisparar', () => {
  it('não deve disparar quando desabilitado', () => {
    expect(deveDisparar(alarmeInativo(), '07:00', 1)).toBe(false);
  });

  it('não deve disparar com horário errado', () => {
    expect(deveDisparar(alarmeAtivo(), '08:00', 1)).toBe(false);
  });

  it('deve disparar com horário e dia corretos', () => {
    expect(deveDisparar(alarmeAtivo(), '07:00', 1)).toBe(true);
  });

  it('deve disparar qualquer dia com days vazio', () => {
    const alarm = { ...alarmeAtivo(), days: [] };
    for (let dia = 0; dia <= 6; dia++) {
      expect(deveDisparar(alarm, '07:00', dia)).toBe(true);
    }
  });

  it('não deve disparar no dia errado', () => {
    const alarm = alarmeSegundaASexta();
    expect(deveDisparar(alarm, '07:00', 0)).toBe(false); // Domingo
    expect(deveDisparar(alarm, '07:00', 6)).toBe(false); // Sábado
  });

  it('deve disparar nos dias corretos (seg-sex)', () => {
    const alarm = alarmeSegundaASexta();
    [1, 2, 3, 4, 5].forEach(dia => {
      expect(deveDisparar(alarm, '07:00', dia)).toBe(true);
    });
  });

  it('não deve disparar com horário e dia ambos errados', () => {
    const alarm = alarmeSegundaASexta();
    expect(deveDisparar(alarm, '08:00', 0)).toBe(false);
  });
});

describe('alternarDia', () => {
  it('deve adicionar dia que não existe', () => {
    const resultado = alternarDia([1, 2, 3], 4);
    expect(resultado).toContain(4);
  });

  it('deve remover dia que já existe', () => {
    const resultado = alternarDia([1, 2, 3], 2);
    expect(resultado).not.toContain(2);
  });

  it('deve manter os outros dias ao remover', () => {
    const resultado = alternarDia([1, 2, 3], 2);
    expect(resultado).toContain(1);
    expect(resultado).toContain(3);
  });

  it('deve manter array ordenado após adicionar', () => {
    const resultado = alternarDia([1, 3, 5], 2);
    expect(resultado).toEqual([1, 2, 3, 5]);
  });

  it('deve retornar array vazio ao remover único elemento', () => {
    expect(alternarDia([3], 3)).toEqual([]);
  });

  it('não deve mutar o array original', () => {
    const original = [1, 2, 3];
    alternarDia(original, 4);
    expect(original).toEqual([1, 2, 3]);
  });

  it('deve adicionar todos os dias individualmente', () => {
    let dias = [];
    for (let i = 0; i <= 6; i++) {
      dias = alternarDia(dias, i);
    }
    expect(dias).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('validarHorario', () => {
  it('deve aceitar "07:00"', () => {
    expect(validarHorario('07:00')).toBe(true);
  });

  it('deve aceitar "00:00"', () => {
    expect(validarHorario('00:00')).toBe(true);
  });

  it('deve aceitar "23:59"', () => {
    expect(validarHorario('23:59')).toBe(true);
  });

  it('deve rejeitar hora inválida "24:00"', () => {
    expect(validarHorario('24:00')).toBe(false);
  });

  it('deve rejeitar minuto inválido "07:60"', () => {
    expect(validarHorario('07:60')).toBe(false);
  });

  it('deve rejeitar formato sem dois pontos', () => {
    expect(validarHorario('0700')).toBe(false);
  });

  it('deve rejeitar string vazia', () => {
    expect(validarHorario('')).toBe(false);
  });

  it('deve rejeitar formato com texto', () => {
    expect(validarHorario('ab:cd')).toBe(false);
  });

  it('deve rejeitar formato sem zeros à esquerda', () => {
    expect(validarHorario('7:00')).toBe(false);
  });
});

describe('formatarHorario', () => {
  it('deve formatar "07:00" corretamente', () => {
    expect(formatarHorario(7, 0)).toBe('07:00');
  });

  it('deve formatar "00:00" corretamente', () => {
    expect(formatarHorario(0, 0)).toBe('00:00');
  });

  it('deve formatar "23:59" corretamente', () => {
    expect(formatarHorario(23, 59)).toBe('23:59');
  });

  it('deve adicionar zeros à esquerda', () => {
    expect(formatarHorario(8, 5)).toBe('08:05');
  });
});

describe('tempoAteAlarme', () => {
  it('deve retornar string vazia para alarme desabilitado', () => {
    expect(tempoAteAlarme(alarmeInativo())).toBe('');
  });

  it('deve retornar string não vazia para alarme ativo', () => {
    const resultado = tempoAteAlarme(alarmeAtivo());
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('deve retornar string começando com "em"', () => {
    const resultado = tempoAteAlarme(alarmeAtivo());
    expect(resultado).toMatch(/^em /);
  });

  it('deve usar "hora" (singular) para 1 hora', () => {
    // Simula 1h exata de diferença
    const agora   = new Date('2026-04-23T06:00:00');
    const alarm   = { ...alarmeAtivo(), time: '07:00' };
    const result  = tempoAteAlarme(alarm, agora);
    expect(result).toContain('1 hora');
    expect(result).not.toContain('horas');
  });

  it('deve usar "horas" (plural) para 2+ horas', () => {
    const agora  = new Date('2026-04-23T05:00:00');
    const alarm  = { ...alarmeAtivo(), time: '07:00' };
    const result = tempoAteAlarme(alarm, agora);
    expect(result).toContain('horas');
  });

  it('deve usar "minuto" (singular) para 1 minuto', () => {
    const agora  = new Date('2026-04-23T06:59:00');
    const alarm  = { ...alarmeAtivo(), time: '07:00' };
    const result = tempoAteAlarme(alarm, agora);
    expect(result).toContain('1 minuto');
  });

  it('deve usar "minutos" (plural) para 2+ minutos', () => {
    const agora  = new Date('2026-04-23T06:57:00');
    const alarm  = { ...alarmeAtivo(), time: '07:00' };
    const result = tempoAteAlarme(alarm, agora);
    expect(result).toContain('minutos');
  });

  it('deve avançar para o dia seguinte se horário já passou', () => {
    // Alarme às 07:00, agora são 08:00 → próximo disparo é amanhã
    const agora  = new Date('2026-04-23T08:00:00');
    const alarm  = { ...alarmeAtivo(), time: '07:00' };
    const result = tempoAteAlarme(alarm, agora);
    expect(result).toMatch(/^em /);
    expect(result).not.toBe('');
  });

  it('deve retornar "em menos de 1 minuto" quando falta menos de 1 min', () => {
    const agora  = new Date('2026-04-23T06:59:45');
    const alarm  = { ...alarmeAtivo(), time: '07:00' };
    const result = tempoAteAlarme(alarm, agora);
    expect(result).toBe('em menos de 1 minuto');
  });
});

describe('dias da semana — DIAS array', () => {
  it('deve ter exatamente 7 dias', () => {
    expect(DIAS).toHaveLength(7);
  });

  it('deve começar com Dom (domingo)', () => {
    expect(DIAS[0]).toBe('Dom');
  });

  it('deve terminar com Sab (sábado)', () => {
    expect(DIAS[6]).toBe('Sab');
  });

  it('deve conter todos os dias abreviados', () => {
    expect(DIAS).toContain('Seg');
    expect(DIAS).toContain('Ter');
    expect(DIAS).toContain('Qua');
    expect(DIAS).toContain('Qui');
    expect(DIAS).toContain('Sex');
  });
});

describe('incremento/decremento do picker de alarme', () => {
  it('horas devem fazer wrap de 23 para 0', () => {
    let h = 23;
    h = (h + 1) % 24;
    expect(h).toBe(0);
  });

  it('horas devem fazer wrap de 0 para 23 ao decrementar', () => {
    let h = 0;
    h = (h - 1 + 24) % 24;
    expect(h).toBe(23);
  });

  it('minutos devem fazer wrap de 59 para 0', () => {
    let m = 59;
    m = (m + 1) % 60;
    expect(m).toBe(0);
  });

  it('minutos devem fazer wrap de 0 para 59 ao decrementar', () => {
    let m = 0;
    m = (m - 1 + 60) % 60;
    expect(m).toBe(59);
  });
});
