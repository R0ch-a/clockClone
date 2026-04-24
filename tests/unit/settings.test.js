// ═══════════════════════════════════════════════════════════
// settings.test.js — Testes unitários do módulo Configurações
// Executor: Vitest  (npm test)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock do ambiente Tauri ───────────────────────────────
vi.mock('@tauri-apps/api/core',   () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-shell', () => ({ open: vi.fn() }));

// ═══════════════════════════════════════════════════════════
// FUNÇÕES PURAS EXTRAÍDAS PARA TESTE
// (replicam a lógica de settings.js sem depender do DOM)
// ═══════════════════════════════════════════════════════════

const TEMAS = ['light', 'dark', 'system'];

const NOMES_TEMA = {
  light:  'Claro',
  dark:   'Escuro',
  system: 'Usar as configurações do sistema',
};

const STORAGE_KEY_TEMA = 'clockClone:theme';

// Simula o localStorage com um Map em memória
function criarStorageFake() {
  const store = new Map();
  return {
    getItem:    (key) => store.get(key) ?? null,
    setItem:    (key, val) => store.set(key, val),
    removeItem: (key) => store.delete(key),
    clear:      () => store.clear(),
    get length() { return store.size; },
  };
}

function carregarTema(storage) {
  return storage.getItem(STORAGE_KEY_TEMA) || 'system';
}

function salvarTema(storage, tema) {
  storage.setItem(STORAGE_KEY_TEMA, tema);
}

function aplicarTema(tema, prefereDark = false) {
  if (!TEMAS.includes(tema)) return 'system';
  if (tema === 'system') return prefereDark ? 'dark' : 'light';
  return tema;
}

function nomeTema(tema) {
  return NOMES_TEMA[tema] || NOMES_TEMA.system;
}

function temaValido(tema) {
  return TEMAS.includes(tema);
}

function alterarTema(storage, novoTema, prefereDark = false) {
  if (!temaValido(novoTema)) return null;
  salvarTema(storage, novoTema);
  return aplicarTema(novoTema, prefereDark);
}

// ═══════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════

describe('temaValido', () => {
  it('deve aceitar "light"', () => {
    expect(temaValido('light')).toBe(true);
  });

  it('deve aceitar "dark"', () => {
    expect(temaValido('dark')).toBe(true);
  });

  it('deve aceitar "system"', () => {
    expect(temaValido('system')).toBe(true);
  });

  it('deve rejeitar tema desconhecido', () => {
    expect(temaValido('blue')).toBe(false);
  });

  it('deve rejeitar string vazia', () => {
    expect(temaValido('')).toBe(false);
  });

  it('deve rejeitar null/undefined convertido', () => {
    expect(temaValido('null')).toBe(false);
    expect(temaValido('undefined')).toBe(false);
  });
});

describe('aplicarTema', () => {
  it('deve retornar "dark" para tema "dark"', () => {
    expect(aplicarTema('dark')).toBe('dark');
  });

  it('deve retornar "light" para tema "light"', () => {
    expect(aplicarTema('light')).toBe('light');
  });

  it('deve retornar "dark" para "system" quando SO prefere escuro', () => {
    expect(aplicarTema('system', true)).toBe('dark');
  });

  it('deve retornar "light" para "system" quando SO prefere claro', () => {
    expect(aplicarTema('system', false)).toBe('light');
  });

  it('deve retornar "system" para tema inválido', () => {
    expect(aplicarTema('roxo')).toBe('system');
  });

  it('não deve alterar "dark" independente do SO', () => {
    expect(aplicarTema('dark', true)).toBe('dark');
    expect(aplicarTema('dark', false)).toBe('dark');
  });

  it('não deve alterar "light" independente do SO', () => {
    expect(aplicarTema('light', true)).toBe('light');
    expect(aplicarTema('light', false)).toBe('light');
  });
});

describe('nomeTema', () => {
  it('deve retornar "Claro" para "light"', () => {
    expect(nomeTema('light')).toBe('Claro');
  });

  it('deve retornar "Escuro" para "dark"', () => {
    expect(nomeTema('dark')).toBe('Escuro');
  });

  it('deve retornar nome completo para "system"', () => {
    expect(nomeTema('system')).toBe('Usar as configurações do sistema');
  });

  it('deve retornar o nome do system para tema desconhecido', () => {
    expect(nomeTema('inexistente')).toBe('Usar as configurações do sistema');
  });

  it('deve retornar o nome do system para string vazia', () => {
    expect(nomeTema('')).toBe('Usar as configurações do sistema');
  });
});

describe('carregarTema', () => {
  it('deve retornar "system" quando não há tema salvo', () => {
    const storage = criarStorageFake();
    expect(carregarTema(storage)).toBe('system');
  });

  it('deve retornar o tema salvo', () => {
    const storage = criarStorageFake();
    storage.setItem(STORAGE_KEY_TEMA, 'dark');
    expect(carregarTema(storage)).toBe('dark');
  });

  it('deve retornar "light" quando "light" está salvo', () => {
    const storage = criarStorageFake();
    storage.setItem(STORAGE_KEY_TEMA, 'light');
    expect(carregarTema(storage)).toBe('light');
  });

  it('deve usar a chave correta do storage', () => {
    const storage = criarStorageFake();
    storage.setItem('outro:tema', 'dark');
    // Usa chave diferente, deve retornar padrão
    expect(carregarTema(storage)).toBe('system');
  });
});

describe('salvarTema', () => {
  it('deve salvar o tema no storage', () => {
    const storage = criarStorageFake();
    salvarTema(storage, 'dark');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBe('dark');
  });

  it('deve sobrescrever tema anterior', () => {
    const storage = criarStorageFake();
    salvarTema(storage, 'dark');
    salvarTema(storage, 'light');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBe('light');
  });

  it('deve salvar usando a chave correta', () => {
    const storage = criarStorageFake();
    salvarTema(storage, 'system');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBe('system');
  });
});

describe('alterarTema', () => {
  it('deve salvar e aplicar "dark"', () => {
    const storage = criarStorageFake();
    const resultado = alterarTema(storage, 'dark');
    expect(resultado).toBe('dark');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBe('dark');
  });

  it('deve salvar e aplicar "light"', () => {
    const storage = criarStorageFake();
    const resultado = alterarTema(storage, 'light');
    expect(resultado).toBe('light');
  });

  it('deve aplicar "dark" para "system" com SO escuro', () => {
    const storage   = criarStorageFake();
    const resultado = alterarTema(storage, 'system', true);
    expect(resultado).toBe('dark');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBe('system');
  });

  it('deve aplicar "light" para "system" com SO claro', () => {
    const storage   = criarStorageFake();
    const resultado = alterarTema(storage, 'system', false);
    expect(resultado).toBe('light');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBe('system');
  });

  it('deve retornar null para tema inválido', () => {
    const storage = criarStorageFake();
    expect(alterarTema(storage, 'roxo')).toBeNull();
  });

  it('não deve salvar tema inválido no storage', () => {
    const storage = criarStorageFake();
    alterarTema(storage, 'invalido');
    expect(storage.getItem(STORAGE_KEY_TEMA)).toBeNull();
  });

  it('deve persistir o tema salvo entre chamadas', () => {
    const storage = criarStorageFake();
    alterarTema(storage, 'dark');
    const temaSalvo = carregarTema(storage);
    expect(temaSalvo).toBe('dark');
  });
});

describe('TEMAS — lista de temas válidos', () => {
  it('deve ter exatamente 3 temas', () => {
    expect(TEMAS).toHaveLength(3);
  });

  it('deve conter "light"', () => {
    expect(TEMAS).toContain('light');
  });

  it('deve conter "dark"', () => {
    expect(TEMAS).toContain('dark');
  });

  it('deve conter "system"', () => {
    expect(TEMAS).toContain('system');
  });
});

describe('NOMES_TEMA — mapeamento de nomes', () => {
  it('deve ter nome para cada tema válido', () => {
    TEMAS.forEach(tema => {
      expect(NOMES_TEMA[tema]).toBeDefined();
      expect(NOMES_TEMA[tema].length).toBeGreaterThan(0);
    });
  });

  it('nome de "light" deve ser em português', () => {
    expect(NOMES_TEMA.light).toBe('Claro');
  });

  it('nome de "dark" deve ser em português', () => {
    expect(NOMES_TEMA.dark).toBe('Escuro');
  });

  it('nome de "system" deve ser descritivo', () => {
    expect(NOMES_TEMA.system).toContain('sistema');
  });
});

describe('STORAGE_KEY_TEMA', () => {
  it('deve ter o prefixo do app', () => {
    expect(STORAGE_KEY_TEMA).toMatch(/^clockClone:/);
  });

  it('deve ser uma string não vazia', () => {
    expect(typeof STORAGE_KEY_TEMA).toBe('string');
    expect(STORAGE_KEY_TEMA.length).toBeGreaterThan(0);
  });
});

describe('fluxo completo de troca de tema', () => {
  it('deve aplicar dark → salvar → carregar → verificar', () => {
    const storage = criarStorageFake();

    // 1. Carrega padrão
    expect(carregarTema(storage)).toBe('system');

    // 2. Altera para dark
    const temaEfetivo = alterarTema(storage, 'dark');
    expect(temaEfetivo).toBe('dark');

    // 3. Verifica que foi salvo
    expect(carregarTema(storage)).toBe('dark');

    // 4. Altera para light
    alterarTema(storage, 'light');
    expect(carregarTema(storage)).toBe('light');

    // 5. Altera para system com SO escuro
    const sistemaEscuro = alterarTema(storage, 'system', true);
    expect(sistemaEscuro).toBe('dark');
    expect(carregarTema(storage)).toBe('system'); // salva "system", não "dark"
  });

  it('tema system deve seguir a preferência do SO', () => {
    const storage = criarStorageFake();
    salvarTema(storage, 'system');

    // SO claro
    expect(aplicarTema(carregarTema(storage), false)).toBe('light');

    // SO escuro
    expect(aplicarTema(carregarTema(storage), true)).toBe('dark');
  });
});
