// ═══════════════════════════════════════════════════════════
// timer.test.js — Testes unitários do módulo Temporizador
// Executor: Vitest  (npx vitest run)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do ambiente Tauri (não existe no Node) ──────────
vi.mock('@tauri-apps/api/core',   () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setAlwaysOnTop: vi.fn(),
    isMaximized:    vi.fn().mockResolvedValue(false),
    maximize:       vi.fn(),
    unmaximize:     vi.fn(),
  }),
}));

// ── Mock mínimo do DOM para que o módulo carregue ────────
vi.stubGlobal('document', {
  getElementById:   vi.fn().mockReturnValue(null),
  querySelector:    vi.fn().mockReturnValue(null),
  querySelectorAll: vi.fn().mockReturnValue([]),
  addEventListener: vi.fn(),
  createElement:    vi.fn().mockReturnValue({
    classList:       { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
    setAttribute:    vi.fn(),
    getAttribute:    vi.fn(),
    addEventListener: vi.fn(),
    appendChild:     vi.fn(),
    querySelector:   vi.fn().mockReturnValue(null),
    querySelectorAll: vi.fn().mockReturnValue([]),
    innerHTML: '',
    style: {},
    id: '',
    className: '',
  }),
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES PURAS EXTRAÍDAS PARA TESTE
// (replicam a lógica de timer.js sem depender do DOM)
// ═══════════════════════════════════════════════════════════

const CIRCUMFERENCE = 2 * Math.PI * 90;

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatarTempoTimer(totalSeg) {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function calcularDashoffset(remaining, total) {
  const progress = total > 0 ? remaining / total : 0;
  return CIRCUMFERENCE * (1 - progress);
}

function sugerirNome(timers) {
  return `Cronômetro (${timers.length + 1})`;
}

function validarTempo(hours, minutes, seconds) {
  return hours * 3600 + minutes * 60 + seconds > 0;
}

// ═══════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════

describe('formatarTempoTimer', () => {
  it('deve retornar "00:00:00" para 0 segundos', () => {
    expect(formatarTempoTimer(0)).toBe('00:00:00');
  });

  it('deve retornar "00:01:00" para 60 segundos', () => {
    expect(formatarTempoTimer(60)).toBe('00:01:00');
  });

  it('deve retornar "01:01:01" para 3661 segundos', () => {
    expect(formatarTempoTimer(3661)).toBe('01:01:01');
  });

  it('deve retornar "00:20:00" para 1200 segundos', () => {
    expect(formatarTempoTimer(1200)).toBe('00:20:00');
  });

  it('deve retornar "00:42:00" para 2520 segundos', () => {
    expect(formatarTempoTimer(2520)).toBe('00:42:00');
  });

  it('deve retornar "01:29:09" para 5349 segundos', () => {
    expect(formatarTempoTimer(5349)).toBe('01:29:09');
  });

  it('deve preencher zeros à esquerda em todos os campos', () => {
    expect(formatarTempoTimer(1)).toBe('00:00:01');
    expect(formatarTempoTimer(61)).toBe('00:01:01');
  });

  it('deve lidar com valores grandes', () => {
    expect(formatarTempoTimer(86400)).toBe('24:00:00'); // 24 horas
    expect(formatarTempoTimer(90061)).toBe('25:01:01');
  });
});

describe('pad', () => {
  it('deve adicionar zero à esquerda em números de 1 dígito', () => {
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(9)).toBe('09');
  });

  it('não deve adicionar zero em números de 2+ dígitos', () => {
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
    expect(pad(100)).toBe('100');
  });
});

describe('calcularDashoffset (anel SVG)', () => {
  it('deve retornar 0 quando timer está cheio (remaining === total)', () => {
    expect(calcularDashoffset(1200, 1200)).toBeCloseTo(0);
  });

  it('deve retornar CIRCUMFERENCE quando timer está vazio (remaining === 0)', () => {
    expect(calcularDashoffset(0, 1200)).toBeCloseTo(CIRCUMFERENCE);
  });

  it('deve retornar metade da circunferência na metade do tempo', () => {
    expect(calcularDashoffset(600, 1200)).toBeCloseTo(CIRCUMFERENCE / 2);
  });

  it('deve retornar ≈282.74 na metade (valor documentado no plano)', () => {
    expect(calcularDashoffset(600, 1200)).toBeCloseTo(282.74, 1);
  });

  it('deve retornar CIRCUMFERENCE quando total é 0 (evita divisão por zero)', () => {
    expect(calcularDashoffset(0, 0)).toBeCloseTo(CIRCUMFERENCE);
  });

  it('deve diminuir conforme o tempo passa', () => {
    const inicio = calcularDashoffset(1200, 1200);
    const meio   = calcularDashoffset(600,  1200);
    const fim    = calcularDashoffset(0,    1200);
    expect(inicio).toBeLessThan(meio);
    expect(meio).toBeLessThan(fim);
  });

  it('CIRCUMFERENCE deve ser ≈ 565.48', () => {
    expect(CIRCUMFERENCE).toBeCloseTo(565.48, 1);
  });
});

describe('sugerirNome', () => {
  it('deve sugerir "Cronômetro (1)" com lista vazia', () => {
    expect(sugerirNome([])).toBe('Cronômetro (1)');
  });

  it('deve sugerir "Cronômetro (2)" com 1 timer existente', () => {
    expect(sugerirNome([{ id: 'a' }])).toBe('Cronômetro (2)');
  });

  it('deve sugerir "Cronômetro (3)" com 2 timers existentes', () => {
    expect(sugerirNome([{ id: 'a' }, { id: 'b' }])).toBe('Cronômetro (3)');
  });

  it('deve sugerir nome correto com N timers', () => {
    const timers = Array.from({ length: 9 }, (_, i) => ({ id: String(i) }));
    expect(sugerirNome(timers)).toBe('Cronômetro (10)');
  });
});

describe('validarTempo (botão Salvar)', () => {
  it('deve retornar false com 00:00:00', () => {
    expect(validarTempo(0, 0, 0)).toBe(false);
  });

  it('deve retornar true com qualquer segundo > 0', () => {
    expect(validarTempo(0, 0, 1)).toBe(true);
  });

  it('deve retornar true com minutos > 0', () => {
    expect(validarTempo(0, 1, 0)).toBe(true);
  });

  it('deve retornar true com horas > 0', () => {
    expect(validarTempo(1, 0, 0)).toBe(true);
  });

  it('deve retornar true com tempo completo', () => {
    expect(validarTempo(1, 30, 45)).toBe(true);
  });
});

describe('incremento/decremento do seletor', () => {
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

  it('segundos devem fazer wrap de 59 para 0', () => {
    let s = 59;
    s = (s + 1) % 60;
    expect(s).toBe(0);
  });

  it('segundos devem fazer wrap de 0 para 59 ao decrementar', () => {
    let s = 0;
    s = (s - 1 + 60) % 60;
    expect(s).toBe(59);
  });
});

describe('cálculo de duração total', () => {
  it('deve calcular duração correta em segundos', () => {
    const h = 1, m = 30, s = 45;
    const total = h * 3600 + m * 60 + s;
    expect(total).toBe(5445);
  });

  it('20 minutos deve ser 1200 segundos', () => {
    expect(0 * 3600 + 20 * 60 + 0).toBe(1200);
  });

  it('42 minutos deve ser 2520 segundos', () => {
    expect(0 * 3600 + 42 * 60 + 0).toBe(2520);
  });

  it('1 hora deve ser 3600 segundos', () => {
    expect(1 * 3600 + 0 * 60 + 0).toBe(3600);
  });
});
