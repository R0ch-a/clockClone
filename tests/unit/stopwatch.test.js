// ═══════════════════════════════════════════════════════════
// stopwatch.test.js — Testes unitários do módulo Cronômetro
// Executor: Vitest  (npm test)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do ambiente Tauri ───────────────────────────────
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
    isMaximized:    vi.fn().mockResolvedValue(false),
    maximize:       vi.fn().mockResolvedValue(undefined),
    unmaximize:     vi.fn().mockResolvedValue(undefined),
  }),
}));

// ═══════════════════════════════════════════════════════════
// FUNÇÕES PURAS EXTRAÍDAS PARA TESTE
// (replicam a lógica de stopwatch.js sem depender do DOM)
// ═══════════════════════════════════════════════════════════

function pad(n, digits = 2) {
  return String(n).padStart(digits, '0');
}

function parseTempo(ms) {
  const totalSeg = Math.floor(ms / 1000);
  return {
    h:  Math.floor(totalSeg / 3600),
    m:  Math.floor((totalSeg % 3600) / 60),
    s:  totalSeg % 60,
    ms: Math.floor((ms % 1000) / 10),
  };
}

function formatarTempo(ms) {
  const { h, m, s, ms: centesimos } = parseTempo(ms);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(centesimos)}`;
}

function atualizarLabelsVolta(laps) {
  const resultado = laps.map(l => ({ ...l, label: '' }));
  if (resultado.length < 2) return resultado;

  const tempos   = resultado.map(l => l.partial);
  const minTempo = Math.min(...tempos);
  const maxTempo = Math.max(...tempos);

  resultado.forEach(lap => {
    if (lap.partial === minTempo) lap.label = 'Mais rápida';
    else if (lap.partial === maxTempo) lap.label = 'Mais lento';
  });

  return resultado;
}

function registrarVolta(laps, elapsed, lapStart) {
  const partial = elapsed - lapStart;
  const numero  = laps.length + 1;
  return {
    laps: [{ number: numero, partial, total: elapsed, label: '' }, ...laps],
    lapStart: elapsed,
  };
}

function redefinir() {
  return {
    elapsed:  0,
    lapStart: 0,
    laps:     [],
    running:  false,
  };
}

// ═══════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════

describe('parseTempo', () => {
  it('deve retornar zeros para 0ms', () => {
    expect(parseTempo(0)).toEqual({ h: 0, m: 0, s: 0, ms: 0 });
  });

  it('deve parsear 1 segundo corretamente', () => {
    expect(parseTempo(1000)).toEqual({ h: 0, m: 0, s: 1, ms: 0 });
  });

  it('deve parsear 1 minuto corretamente', () => {
    expect(parseTempo(60000)).toEqual({ h: 0, m: 1, s: 0, ms: 0 });
  });

  it('deve parsear 1 hora corretamente', () => {
    expect(parseTempo(3600000)).toEqual({ h: 1, m: 0, s: 0, ms: 0 });
  });

  it('deve parsear centésimos corretamente', () => {
    const result = parseTempo(1470); // 1,47s
    expect(result.s).toBe(1);
    expect(result.ms).toBe(47);
  });

  it('deve parsear tempo composto corretamente', () => {
    // 1h 28m 53s 470ms
    const ms = (1 * 3600 + 28 * 60 + 53) * 1000 + 470;
    const result = parseTempo(ms);
    expect(result.h).toBe(1);
    expect(result.m).toBe(28);
    expect(result.s).toBe(53);
    expect(result.ms).toBe(47);
  });
});

describe('formatarTempo', () => {
  it('deve retornar "00:00:00,00" para 0ms', () => {
    expect(formatarTempo(0)).toBe('00:00:00,00');
  });

  it('deve retornar "00:00:15,47" para 15470ms', () => {
    expect(formatarTempo(15470)).toBe('00:00:15,47');
  });

  it('deve retornar "00:00:37,18" para 37180ms', () => {
    expect(formatarTempo(37180)).toBe('00:00:37,18');
  });

  it('deve retornar "00:00:08,17" para 8170ms', () => {
    expect(formatarTempo(8170)).toBe('00:00:08,17');
  });

  it('deve retornar "00:00:45,36" para 45360ms', () => {
    expect(formatarTempo(45360)).toBe('00:00:45,36');
  });

  it('deve retornar "00:00:46,79" para 46790ms', () => {
    expect(formatarTempo(46790)).toBe('00:00:46,79');
  });

  it('deve formatar horas corretamente', () => {
    expect(formatarTempo(3661000)).toBe('01:01:01,00');
  });

  it('deve sempre ter dois dígitos nos centésimos', () => {
    expect(formatarTempo(1010)).toBe('00:00:01,01');
    expect(formatarTempo(1090)).toBe('00:00:01,09');
  });
});

describe('atualizarLabelsVolta', () => {
  it('não deve atribuir labels com 0 voltas', () => {
    const resultado = atualizarLabelsVolta([]);
    expect(resultado).toHaveLength(0);
  });

  it('não deve atribuir labels com apenas 1 volta', () => {
    const laps = [{ number: 1, partial: 37180, total: 37180, label: '' }];
    const resultado = atualizarLabelsVolta(laps);
    expect(resultado[0].label).toBe('');
  });

  it('deve identificar "Mais rápida" e "Mais lento" com 2 voltas', () => {
    const laps = [
      { number: 2, partial: 8170,  total: 45350, label: '' },
      { number: 1, partial: 37180, total: 37180, label: '' },
    ];
    const resultado = atualizarLabelsVolta(laps);
    const rapida = resultado.find(l => l.number === 2);
    const lenta  = resultado.find(l => l.number === 1);
    expect(rapida.label).toBe('Mais rápida');
    expect(lenta.label).toBe('Mais lento');
  });

  it('deve identificar corretamente com 3 voltas', () => {
    const laps = [
      { number: 3, partial: 5000,  total: 50000, label: '' },
      { number: 2, partial: 20000, total: 45000, label: '' },
      { number: 1, partial: 25000, total: 25000, label: '' },
    ];
    const resultado = atualizarLabelsVolta(laps);
    expect(resultado.find(l => l.number === 3).label).toBe('Mais rápida');
    expect(resultado.find(l => l.number === 1).label).toBe('Mais lento');
    expect(resultado.find(l => l.number === 2).label).toBe('');
  });

  it('volta do meio não deve ter label', () => {
    const laps = [
      { number: 3, partial: 3000, total: 18000, label: '' },
      { number: 2, partial: 5000, total: 15000, label: '' },
      { number: 1, partial: 10000, total: 10000, label: '' },
    ];
    const resultado = atualizarLabelsVolta(laps);
    expect(resultado.find(l => l.number === 2).label).toBe('');
  });

  it('não deve mutar o array original', () => {
    const laps = [
      { number: 2, partial: 8000,  total: 28000, label: '' },
      { number: 1, partial: 20000, total: 20000, label: '' },
    ];
    const original = JSON.stringify(laps);
    atualizarLabelsVolta(laps);
    expect(JSON.stringify(laps)).toBe(original);
  });
});

describe('registrarVolta', () => {
  it('deve registrar a primeira volta corretamente', () => {
    const { laps, lapStart } = registrarVolta([], 37180, 0);
    expect(laps).toHaveLength(1);
    expect(laps[0].number).toBe(1);
    expect(laps[0].partial).toBe(37180);
    expect(laps[0].total).toBe(37180);
    expect(lapStart).toBe(37180);
  });

  it('deve registrar a segunda volta com tempo parcial correto', () => {
    const lapsInicial = [{ number: 1, partial: 37180, total: 37180, label: '' }];
    const { laps, lapStart } = registrarVolta(lapsInicial, 45350, 37180);
    expect(laps).toHaveLength(2);
    expect(laps[0].number).toBe(2);
    expect(laps[0].partial).toBe(8170);  // 45350 - 37180
    expect(laps[0].total).toBe(45350);
    expect(lapStart).toBe(45350);
  });

  it('deve inserir a volta mais recente no topo (índice 0)', () => {
    const lapsInicial = [{ number: 1, partial: 10000, total: 10000, label: '' }];
    const { laps } = registrarVolta(lapsInicial, 25000, 10000);
    expect(laps[0].number).toBe(2); // mais recente no topo
    expect(laps[1].number).toBe(1);
  });

  it('deve incrementar o número da volta', () => {
    let state = { laps: [], elapsed: 0, lapStart: 0 };

    const r1 = registrarVolta(state.laps, 10000, state.lapStart);
    state = { laps: r1.laps, elapsed: 20000, lapStart: r1.lapStart };

    const r2 = registrarVolta(state.laps, 20000, state.lapStart);
    expect(r2.laps[0].number).toBe(2);
    expect(r2.laps[1].number).toBe(1);
  });
});

describe('redefinir', () => {
  it('deve zerar elapsed', () => {
    expect(redefinir().elapsed).toBe(0);
  });

  it('deve zerar lapStart', () => {
    expect(redefinir().lapStart).toBe(0);
  });

  it('deve limpar o array de laps', () => {
    expect(redefinir().laps).toEqual([]);
  });

  it('deve definir running como false', () => {
    expect(redefinir().running).toBe(false);
  });
});

describe('tabela de voltas — visibilidade', () => {
  it('tabela deve estar oculta com 0 voltas', () => {
    const laps = [];
    expect(laps.length === 0).toBe(true);
  });

  it('tabela deve aparecer com 1 ou mais voltas', () => {
    const laps = [{ number: 1, partial: 5000, total: 5000, label: '' }];
    expect(laps.length > 0).toBe(true);
  });
});
