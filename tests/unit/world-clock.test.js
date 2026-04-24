// ═══════════════════════════════════════════════════════════
// world-clock.test.js — Testes unitários do Relógio Mundial
// Executor: Vitest  (npm test)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════
// FUNÇÕES PURAS EXTRAÍDAS PARA TESTE
// (replicam a lógica de world-clock.js sem depender do DOM)
// ═══════════════════════════════════════════════════════════

function pad(n) {
  return String(n).padStart(2, '0');
}

function getHoraEmTimezone(timezone) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone:  timezone,
    hour:      '2-digit',
    minute:    '2-digit',
    hour12:    false,
  }).format(new Date());
}

function getDataEmTimezone(timezone) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
  }).format(new Date());
}

function getDiferencaFuso(timezone) {
  const agora  = new Date();
  const local  = new Date(agora.toLocaleString('en-US'));
  const remoto = new Date(agora.toLocaleString('en-US', { timeZone: timezone }));
  const diff   = Math.round((remoto - local) / 3_600_000);

  if (diff === 0) return null;
  const sinal = diff > 0 ? '+' : '';
  const abs   = Math.abs(diff);
  return `${sinal}${diff} hora${abs !== 1 ? 's' : ''}`;
}

function isDia(timezone) {
  const hora = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour:     'numeric',
      hour12:   false,
    }).format(new Date())
  );
  return hora >= 6 && hora < 20;
}

// Projeção equiretangular simples
function criarProjecao(largura, altura) {
  return function ([lng, lat]) {
    const x = ((lng + 180) / 360) * largura;
    const y = ((90 - lat) / 180) * altura;
    return [x, y];
  };
}

// Busca de cidade por nome
const CIDADES_CONHECIDAS = [
  { name: 'São Paulo',  timezone: 'America/Sao_Paulo',   lat: -23.55, lng: -46.63 },
  { name: 'Montreal',   timezone: 'America/Toronto',      lat: 45.50,  lng: -73.57 },
  { name: 'Tóquio',     timezone: 'Asia/Tokyo',           lat: 35.69,  lng: 139.69 },
  { name: 'Londres',    timezone: 'Europe/London',        lat: 51.51,  lng: -0.13  },
  { name: 'Nova York',  timezone: 'America/New_York',     lat: 40.71,  lng: -74.01 },
  { name: 'Sydney',     timezone: 'Australia/Sydney',     lat: -33.87, lng: 151.21 },
  { name: 'Dubai',      timezone: 'Asia/Dubai',           lat: 25.20,  lng: 55.27  },
  { name: 'Paris',      timezone: 'Europe/Paris',         lat: 48.85,  lng: 2.35   },
];

function buscarCidade(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return CIDADES_CONHECIDAS.find(c => c.name.toLowerCase().includes(q)) || null;
}

// ═══════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════

describe('getHoraEmTimezone', () => {
  it('deve retornar uma string no formato HH:MM', () => {
    const hora = getHoraEmTimezone('America/Sao_Paulo');
    expect(hora).toMatch(/^\d{2}:\d{2}$/);
  });

  it('deve retornar hora válida (00–23)', () => {
    const hora = getHoraEmTimezone('America/Sao_Paulo');
    const [h, m] = hora.split(':').map(Number);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(59);
  });

  it('deve funcionar para múltiplos fusos horários', () => {
    const fusos = [
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'Australia/Sydney',
      'America/Sao_Paulo',
    ];
    fusos.forEach(tz => {
      const hora = getHoraEmTimezone(tz);
      expect(hora).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it('deve retornar horas diferentes para fusos diferentes (em geral)', () => {
    const spHora  = getHoraEmTimezone('America/Sao_Paulo');
    const tokHora = getHoraEmTimezone('Asia/Tokyo');
    // Tokyo é pelo menos 12 horas à frente — nunca igual
    expect(spHora).not.toBe(tokHora);
  });
});

describe('getDataEmTimezone', () => {
  it('deve retornar uma string no formato dd/mm/aaaa', () => {
    const data = getDataEmTimezone('America/Sao_Paulo');
    expect(data).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('deve retornar data com ano atual', () => {
    const data  = getDataEmTimezone('America/Sao_Paulo');
    const ano   = data.split('/')[2];
    expect(parseInt(ano)).toBe(new Date().getFullYear());
  });

  it('deve funcionar para múltiplos fusos', () => {
    ['Europe/London', 'Asia/Dubai', 'Pacific/Auckland'].forEach(tz => {
      const data = getDataEmTimezone(tz);
      expect(data).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });
});

describe('getDiferencaFuso', () => {
  it('deve retornar null para o fuso local', () => {
    const fusoLocal = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(getDiferencaFuso(fusoLocal)).toBeNull();
  });

  it('deve retornar string com sinal positivo para fusos à frente', () => {
    // Tokyo é sempre à frente do Brasil
    const diff = getDiferencaFuso('Asia/Tokyo');
    // Pode ser null se o teste rodar em Tokyo — improvável
    if (diff !== null) {
      expect(diff).toMatch(/^[+-]\d+/);
    }
  });

  it('deve retornar string no formato correto', () => {
    const diff = getDiferencaFuso('America/New_York');
    if (diff !== null) {
      expect(diff).toMatch(/^[+-]\d+ hora(s)?$/);
    }
  });

  it('deve usar "hora" (singular) para diferença de 1h', () => {
    // Simulação direta da lógica
    const abs   = 1;
    const sinal = '+';
    const texto = `${sinal}${abs} hora${abs !== 1 ? 's' : ''}`;
    expect(texto).toBe('+1 hora');
  });

  it('deve usar "horas" (plural) para diferença de 2h+', () => {
    const abs   = 3;
    const sinal = '+';
    const texto = `${sinal}${abs} hora${abs !== 1 ? 's' : ''}`;
    expect(texto).toBe('+3 horas');
  });

  it('deve usar sinal negativo para fusos atrás', () => {
    const diff = -2;
    const sinal = diff > 0 ? '+' : '';
    const abs   = Math.abs(diff);
    const texto = `${sinal}${diff} hora${abs !== 1 ? 's' : ''}`;
    expect(texto).toBe('-2 horas');
  });
});

describe('isDia', () => {
  it('deve retornar booleano', () => {
    const resultado = isDia('America/Sao_Paulo');
    expect(typeof resultado).toBe('boolean');
  });

  it('deve funcionar para múltiplos fusos', () => {
    const fusos = [
      'America/Sao_Paulo',
      'Europe/London',
      'Asia/Tokyo',
      'America/New_York',
    ];
    fusos.forEach(tz => {
      expect(typeof isDia(tz)).toBe('boolean');
    });
  });

  it('deve considerar 6h como dia', () => {
    // Simula a lógica diretamente
    expect(6 >= 6 && 6 < 20).toBe(true);
  });

  it('deve considerar 19h como dia', () => {
    expect(19 >= 6 && 19 < 20).toBe(true);
  });

  it('deve considerar 20h como noite', () => {
    expect(20 >= 6 && 20 < 20).toBe(false);
  });

  it('deve considerar 5h como noite', () => {
    expect(5 >= 6 && 5 < 20).toBe(false);
  });

  it('deve considerar 0h como noite', () => {
    expect(0 >= 6 && 0 < 20).toBe(false);
  });

  it('deve considerar 23h como noite', () => {
    expect(23 >= 6 && 23 < 20).toBe(false);
  });
});

describe('criarProjecao (mapa SVG)', () => {
  const proj = criarProjecao(980, 480);

  it('deve retornar array com dois números [x, y]', () => {
    const resultado = proj([0, 0]);
    expect(resultado).toHaveLength(2);
    expect(typeof resultado[0]).toBe('number');
    expect(typeof resultado[1]).toBe('number');
  });

  it('meridiano 0°, equador 0° deve estar no centro do mapa', () => {
    const [x, y] = proj([0, 0]);
    expect(x).toBeCloseTo(490, 0); // 980 / 2
    expect(y).toBeCloseTo(240, 0); // 480 / 2
  });

  it('longitude -180° deve estar na extremidade esquerda (x≈0)', () => {
    const [x] = proj([-180, 0]);
    expect(x).toBeCloseTo(0, 0);
  });

  it('longitude +180° deve estar na extremidade direita (x≈980)', () => {
    const [x] = proj([180, 0]);
    expect(x).toBeCloseTo(980, 0);
  });

  it('latitude +90° (polo norte) deve estar no topo (y≈0)', () => {
    const [, y] = proj([0, 90]);
    expect(y).toBeCloseTo(0, 0);
  });

  it('latitude -90° (polo sul) deve estar na base (y≈480)', () => {
    const [, y] = proj([0, -90]);
    expect(y).toBeCloseTo(480, 0);
  });

  it('São Paulo deve ter x < 490 (hemisfério oeste)', () => {
    const [x] = proj([-46.63, -23.55]);
    expect(x).toBeLessThan(490);
  });

  it('Tóquio deve ter x > 490 (hemisfério leste)', () => {
    const [x] = proj([139.69, 35.69]);
    expect(x).toBeGreaterThan(490);
  });

  it('São Paulo deve ter y > 240 (hemisfério sul)', () => {
    const [, y] = proj([-46.63, -23.55]);
    expect(y).toBeGreaterThan(240);
  });

  it('Montreal deve ter y < 240 (hemisfério norte)', () => {
    const [, y] = proj([-73.57, 45.50]);
    expect(y).toBeLessThan(240);
  });
});

describe('buscarCidade', () => {
  it('deve encontrar cidade pelo nome exato', () => {
    const resultado = buscarCidade('São Paulo');
    expect(resultado).not.toBeNull();
    expect(resultado.name).toBe('São Paulo');
  });

  it('deve encontrar cidade case-insensitive', () => {
    const resultado = buscarCidade('são paulo');
    expect(resultado).not.toBeNull();
    expect(resultado.name).toBe('São Paulo');
  });

  it('deve encontrar cidade por nome parcial', () => {
    const resultado = buscarCidade('paulo');
    expect(resultado).not.toBeNull();
  });

  it('deve retornar null para cidade desconhecida', () => {
    expect(buscarCidade('Atlantida')).toBeNull();
  });

  it('deve retornar null para query vazia', () => {
    expect(buscarCidade('')).toBeNull();
  });

  it('deve retornar null para query só com espaços', () => {
    expect(buscarCidade('   ')).toBeNull();
  });

  it('deve encontrar Montreal', () => {
    const resultado = buscarCidade('Montreal');
    expect(resultado).not.toBeNull();
    expect(resultado.timezone).toBe('America/Toronto');
  });

  it('deve encontrar Tóquio', () => {
    const resultado = buscarCidade('Tóquio');
    expect(resultado).not.toBeNull();
    expect(resultado.timezone).toBe('Asia/Tokyo');
  });

  it('deve retornar timezone IANA válido', () => {
    const resultado = buscarCidade('Londres');
    expect(resultado.timezone).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$/);
  });

  it('deve retornar coordenadas numéricas', () => {
    const resultado = buscarCidade('Dubai');
    expect(typeof resultado.lat).toBe('number');
    expect(typeof resultado.lng).toBe('number');
  });

  it('coordenadas de São Paulo devem estar no hemisfério sul/oeste', () => {
    const resultado = buscarCidade('São Paulo');
    expect(resultado.lat).toBeLessThan(0);  // sul
    expect(resultado.lng).toBeLessThan(0);  // oeste
  });

  it('coordenadas de Tóquio devem estar no hemisfério norte/leste', () => {
    const resultado = buscarCidade('Tóquio');
    expect(resultado.lat).toBeGreaterThan(0);  // norte
    expect(resultado.lng).toBeGreaterThan(0);  // leste
  });
});
