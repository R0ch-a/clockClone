/* ═══════════════════════════════════════════════════════════
   world-clock.js — Módulo Relógio Mundial
   Responsável por: mapa SVG com world-atlas + topojson,
   pins de localização, lista de cidades com fusos,
   ícones dia/noite, modal de adicionar e modo de edição.
════════════════════════════════════════════════════════════ */

import * as topojson from 'topojson-client';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
════════════════════════════════════════════════════════════ */
const WORLD_ATLAS_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';

// Cidades pré-carregadas (hora local sempre incluída)
const CIDADES_INICIAIS = [
  {
    id:       'local',
    name:     'Hora local',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lat:      -10.9,
    lng:      -37.1, // Aracaju, SE — localização do usuário
    isLocal:  true,
  },
];

/* ═══════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════════ */
let cidades     = [...CIDADES_INICIAIS];
let editMode    = false;
let intervaloCidades = null;
let projection  = null; // função de projeção geográfica

/* ═══════════════════════════════════════════════════════════
   ELEMENTOS DO DOM
════════════════════════════════════════════════════════════ */
const mapContainer    = document.querySelector('.world-map-container');
const clockList       = document.getElementById('clockList');
const btnAddCity      = document.getElementById('btnAddCity');
const btnEditClocks   = document.getElementById('btnEditClocks');
const btnDoneClocks   = document.getElementById('btnDoneClocks');
const worldClockDone  = document.getElementById('worldClockDone');
const modalOverlay    = document.getElementById('modalCityOverlay');
const citySearchInput = document.getElementById('citySearchInput');
const btnConfirmCity  = document.getElementById('btnConfirmCity');
const btnCancelCity   = document.getElementById('btnCancelCity');

/* ═══════════════════════════════════════════════════════════
   UTILITÁRIOS DE FUSO HORÁRIO
════════════════════════════════════════════════════════════ */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Retorna hora atual em uma timezone específica no formato "hh:mm"
 */
function getHoraEmTimezone(timezone) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone:  timezone,
    hour:      '2-digit',
    minute:    '2-digit',
    hour12:    false,
  }).format(new Date());
}

/**
 * Retorna a data atual em uma timezone no formato "dd/mm/aaaa"
 */
function getDataEmTimezone(timezone) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
  }).format(new Date());
}

/**
 * Retorna a diferença de horas em relação à hora local.
 * Ex: "-1 hora", "+3 horas"
 */
function getDiferencaFuso(timezone) {
  const agora     = new Date();
  const local     = new Date(agora.toLocaleString('en-US'));
  const remoto    = new Date(agora.toLocaleString('en-US', { timeZone: timezone }));
  const diffHoras = Math.round((remoto - local) / 3_600_000);

  if (diffHoras === 0) return null;
  const sinal = diffHoras > 0 ? '+' : '';
  const abs   = Math.abs(diffHoras);
  return `${sinal}${diffHoras} hora${abs !== 1 ? 's' : ''}`;
}

/**
 * Verifica se é dia na timezone (entre 6h e 20h).
 */
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

/* ═══════════════════════════════════════════════════════════
   ÍCONE DIA / NOITE
════════════════════════════════════════════════════════════ */
function iconeDiaNoite(timezone) {
  if (isDia(timezone)) {
    // Ícone de sol
    return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.4"/>
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"
        stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;
  }
  // Ícone de lua
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M17 12A7 7 0 0 1 8 3a7 7 0 1 0 9 9z"
      stroke="currentColor" stroke-width="1.4"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════
   MAPA SVG — renderização com world-atlas + topojson
════════════════════════════════════════════════════════════ */

/**
 * Projeção equiretangular simples:
 * converte [lng, lat] → [x, y] dentro do viewBox do SVG.
 */
function criarProjecao(largura, altura) {
  return function ([lng, lat]) {
    const x = ((lng + 180) / 360) * largura;
    const y = ((90 - lat) / 180) * altura;
    return [x, y];
  };
}

/**
 * Converte uma geometria GeoJSON em path SVG usando a projeção.
 */
function geometriaParaPath(geometria, proj, largura = 980) {
  if (!geometria) return '';

  function anel(coords) {
    const pontos = [];
    for (let i = 0; i < coords.length; i++) {
      const [x, y] = proj(coords[i]);
      if (i > 0) {
        const [xAnterior] = proj(coords[i - 1]);
        if (Math.abs(x - xAnterior) > largura / 2) {
          if (pontos.length > 0) pontos.push('Z');
          pontos.push(`M${x.toFixed(2)},${y.toFixed(2)}`);
          continue;
        }
      }
      const cmd = (i === 0 || pontos[pontos.length - 1] === 'Z') ? 'M' : 'L';
      pontos.push(`${cmd}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pontos.join(' ') + ' Z';
  }

  function polygonParaPath(poly) {
    return poly.map(anel).join(' ');
  }

  if (geometria.type === 'Polygon') {
    return polygonParaPath(geometria.coordinates);
  }
  if (geometria.type === 'MultiPolygon') {
    return geometria.coordinates.map(polygonParaPath).join(' ');
  }
  return '';
}

async function renderizarMapa() {
  if (!mapContainer) return;

  const LARGURA = 980;
  const ALTURA  = 480;

  // Cria o SVG do mapa
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${LARGURA} ${ALTURA}`);
  svg.setAttribute('class', 'world-map-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.overflow = 'hidden';

  // Fundo do oceano
  const fundo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fundo.setAttribute('width',  LARGURA);
  fundo.setAttribute('height', ALTURA);
  fundo.setAttribute('fill', 'transparent');
  svg.appendChild(fundo);

  // Define área de recorte
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
  clipPath.setAttribute('id', 'mapaClip');
  const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  clipRect.setAttribute('width', LARGURA);
  clipRect.setAttribute('height', ALTURA);
  clipPath.appendChild(clipRect);
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  // Grupo dos países
  const grupoMapa = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  grupoMapa.setAttribute('class', 'mapa-paises');
  grupoMapa.setAttribute('clip-path', 'url(#mapaClip)');

  // Grupo dos pins (fica acima dos países)
  const grupoPins = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  grupoPins.setAttribute('class', 'mapa-pins');
  grupoPins.setAttribute('id', 'mapaPins');

  try {
    const resp  = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    const mundo = await resp.json();

    projection = criarProjecao(LARGURA, ALTURA);

    const paises = topojson.feature(mundo, mundo.objects.countries);

    paises.features.forEach(feature => {
      // Ignora geometrias que não são polígonos (linhas de grade, etc.)
      if (!feature.geometry) return;
      if (
        feature.geometry.type !== 'Polygon' &&
        feature.geometry.type !== 'MultiPolygon'
      ) return;

      const d = geometriaParaPath(feature.geometry, projection, LARGURA);
      if (!d) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'mapa-pais');
      grupoMapa.appendChild(path);
    });

  } catch (err) {
    console.warn('[world-clock] Não foi possível carregar o mapa:', err);
    const texto = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    texto.setAttribute('x', LARGURA / 2);
    texto.setAttribute('y', ALTURA / 2);
    texto.setAttribute('text-anchor', 'middle');
    texto.setAttribute('fill', 'currentColor');
    texto.setAttribute('font-size', '14');
    texto.textContent = 'Mapa não disponível';
    svg.appendChild(texto);
  }

  svg.appendChild(grupoMapa);
  svg.appendChild(grupoPins);

  // Remove img placeholder se existir
  const imgPlaceholder = mapContainer.querySelector('.world-map');
  if (imgPlaceholder) imgPlaceholder.remove();

  mapContainer.appendChild(svg);

  // Renderiza os pins das cidades iniciais
  renderizarPins();
}

/* ═══════════════════════════════════════════════════════════
   PINS NO MAPA
════════════════════════════════════════════════════════════ */
function renderizarPins() {
  const grupoPins = document.getElementById('mapaPins');
  if (!grupoPins || !projection) return;

  grupoPins.innerHTML = '';

  cidades.forEach(cidade => {
    const [x, y] = projection([cidade.lng, cidade.lat]);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `mapa-pin ${cidade.isLocal ? 'mapa-pin--local' : ''}`);
    g.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)})`);

    // Símbolo de pin (gota invertida)
    g.innerHTML = `
      <circle r="5" class="pin-circle"/>
      <circle r="2.5" class="pin-dot"/>
    `;

    grupoPins.appendChild(g);
  });
}

/* ═══════════════════════════════════════════════════════════
   LISTA DE CIDADES
════════════════════════════════════════════════════════════ */
function renderizarCidades() {
  if (!clockList) return;
  clockList.innerHTML = '';

  cidades.forEach(cidade => {
    clockList.appendChild(criarCardCidade(cidade));
  });
}

function criarCardCidade(cidade) {
  const card = document.createElement('div');
  card.className = 'clock-card';
  card.id = `city-${cidade.id}`;

  const hora      = getHoraEmTimezone(cidade.timezone);
  const data      = getDataEmTimezone(cidade.timezone);
  const diff      = cidade.isLocal ? null : getDiferencaFuso(cidade.timezone);
  const icone     = iconeDiaNoite(cidade.timezone);
  const diffTexto = diff ? `, ${diff}` : '';

  card.innerHTML = `
    <div class="clock-card-inner">
      <div class="clock-icon ${isDia(cidade.timezone) ? 'clock-icon--day' : 'clock-icon--night'}">
        ${icone}
      </div>
      <div class="clock-time">${hora}</div>
      <div class="clock-info">
        <span class="clock-name">${cidade.isLocal ? 'Hora local' : cidade.name}</span>
        <span class="clock-date">${data}${diffTexto}</span>
      </div>
      ${!cidade.isLocal && editMode ? `
        <button class="clock-delete-btn" aria-label="Remover ${cidade.name}" title="Remover">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4"
              stroke="var(--danger)" stroke-width="1.4"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;

  // Listener do botão de deletar
  const btnDelete = card.querySelector('.clock-delete-btn');
  btnDelete?.addEventListener('click', (e) => {
    e.stopPropagation();
    removerCidade(cidade.id);
  });

  return card;
}

/* ═══════════════════════════════════════════════════════════
   MODO DE EDIÇÃO
════════════════════════════════════════════════════════════ */
function entrarModoEdicao() {
  editMode = true;
  worldClockDone?.classList.remove('hidden');
  btnEditClocks?.classList.add('hidden');
  renderizarCidades();
}

function sairModoEdicao() {
  editMode = false;
  worldClockDone?.classList.add('hidden');
  btnEditClocks?.classList.remove('hidden');
  renderizarCidades();
}

function removerCidade(id) {
  cidades = cidades.filter(c => c.id !== id);
  renderizarCidades();
  renderizarPins();
}

/* ═══════════════════════════════════════════════════════════
   MODAL — Adicionar novo local
════════════════════════════════════════════════════════════ */

// Base de cidades conhecidas com timezone e coordenadas
const CIDADES_CONHECIDAS = [
  { name: 'Nova York',    timezone: 'America/New_York',    lat: 40.71,  lng: -74.01  },
  { name: 'Los Angeles',  timezone: 'America/Los_Angeles', lat: 34.05,  lng: -118.24 },
  { name: 'Chicago',      timezone: 'America/Chicago',     lat: 41.85,  lng: -87.65  },
  { name: 'Montreal',     timezone: 'America/Toronto',     lat: 45.50,  lng: -73.57  },
  { name: 'Toronto',      timezone: 'America/Toronto',     lat: 43.65,  lng: -79.38  },
  { name: 'Vancouver',    timezone: 'America/Vancouver',   lat: 49.25,  lng: -123.12 },
  { name: 'São Paulo',    timezone: 'America/Sao_Paulo',   lat: -23.55, lng: -46.63  },
  { name: 'Rio de Janeiro', timezone: 'America/Sao_Paulo', lat: -22.91, lng: -43.17  },
  { name: 'Brasília',     timezone: 'America/Sao_Paulo',   lat: -15.78, lng: -47.93  },
  { name: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', lat: -34.60, lng: -58.38 },
  { name: 'Santiago',     timezone: 'America/Santiago',    lat: -33.45, lng: -70.67  },
  { name: 'Lima',         timezone: 'America/Lima',        lat: -12.05, lng: -77.04  },
  { name: 'Bogotá',       timezone: 'America/Bogota',      lat: 4.71,   lng: -74.07  },
  { name: 'Cidade do México', timezone: 'America/Mexico_City', lat: 19.43, lng: -99.13 },
  { name: 'Londres',      timezone: 'Europe/London',       lat: 51.51,  lng: -0.13   },
  { name: 'Paris',        timezone: 'Europe/Paris',        lat: 48.85,  lng: 2.35    },
  { name: 'Berlim',       timezone: 'Europe/Berlin',       lat: 52.52,  lng: 13.40   },
  { name: 'Madrid',       timezone: 'Europe/Madrid',       lat: 40.42,  lng: -3.70   },
  { name: 'Roma',         timezone: 'Europe/Rome',         lat: 41.90,  lng: 12.50   },
  { name: 'Amsterdã',     timezone: 'Europe/Amsterdam',    lat: 52.37,  lng: 4.90    },
  { name: 'Lisboa',       timezone: 'Europe/Lisbon',       lat: 38.72,  lng: -9.14   },
  { name: 'Moscou',       timezone: 'Europe/Moscow',       lat: 55.75,  lng: 37.62   },
  { name: 'Istambul',     timezone: 'Europe/Istanbul',     lat: 41.01,  lng: 28.95   },
  { name: 'Dubai',        timezone: 'Asia/Dubai',          lat: 25.20,  lng: 55.27   },
  { name: 'Mumbai',       timezone: 'Asia/Kolkata',        lat: 19.08,  lng: 72.88   },
  { name: 'Nova Delhi',   timezone: 'Asia/Kolkata',        lat: 28.61,  lng: 77.21   },
  { name: 'Pequim',       timezone: 'Asia/Shanghai',       lat: 39.91,  lng: 116.39  },
  { name: 'Xangai',       timezone: 'Asia/Shanghai',       lat: 31.23,  lng: 121.47  },
  { name: 'Tóquio',       timezone: 'Asia/Tokyo',          lat: 35.69,  lng: 139.69  },
  { name: 'Seul',         timezone: 'Asia/Seoul',          lat: 37.57,  lng: 126.98  },
  { name: 'Singapura',    timezone: 'Asia/Singapore',      lat: 1.35,   lng: 103.82  },
  { name: 'Hong Kong',    timezone: 'Asia/Hong_Kong',      lat: 22.32,  lng: 114.17  },
  { name: 'Sydney',       timezone: 'Australia/Sydney',    lat: -33.87, lng: 151.21  },
  { name: 'Melbourne',    timezone: 'Australia/Melbourne', lat: -37.81, lng: 144.96  },
  { name: 'Auckland',     timezone: 'Pacific/Auckland',    lat: -36.85, lng: 174.76  },
  { name: 'Cairo',        timezone: 'Africa/Cairo',        lat: 30.06,  lng: 31.25   },
  { name: 'Lagos',        timezone: 'Africa/Lagos',        lat: 6.45,   lng: 3.40    },
  { name: 'Joanesburgo',  timezone: 'Africa/Johannesburg', lat: -26.20, lng: 28.04   },
  { name: 'Nairobi',      timezone: 'Africa/Nairobi',      lat: -1.29,  lng: 36.82   },
];

function buscarCidade(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return CIDADES_CONHECIDAS.find(c =>
    c.name.toLowerCase().includes(q)
  ) || null;
}

function abrirModal() {
  if (citySearchInput) citySearchInput.value = '';
  modalOverlay?.classList.remove('hidden');
  citySearchInput?.focus();
}

function fecharModal() {
  modalOverlay?.classList.add('hidden');
}

function confirmarCidade() {
  const query    = citySearchInput?.value || '';
  const encontrada = buscarCidade(query);

  if (!encontrada) {
    if (citySearchInput) {
      citySearchInput.style.borderColor = 'var(--danger)';
      citySearchInput.placeholder = 'Cidade não encontrada';
      setTimeout(() => {
        citySearchInput.style.borderColor = '';
        citySearchInput.placeholder = 'Inserir um local';
      }, 2000);
    }
    return;
  }

  // Evita duplicatas
  const jáExiste = cidades.some(c => c.timezone === encontrada.timezone && c.name === encontrada.name);
  if (jáExiste) {
    fecharModal();
    return;
  }

  const novaCidade = {
    id:       `city-${Date.now()}`,
    name:     encontrada.name,
    timezone: encontrada.timezone,
    lat:      encontrada.lat,
    lng:      encontrada.lng,
    isLocal:  false,
  };

  cidades.push(novaCidade);
  fecharModal();
  renderizarCidades();
  renderizarPins();
}

/* ═══════════════════════════════════════════════════════════
   ATUALIZAÇÃO PERIÓDICA DOS HORÁRIOS
════════════════════════════════════════════════════════════ */
function iniciarAtualizacao() {
  // Atualiza os horários a cada 30 segundos
  intervaloCidades = setInterval(() => {
    renderizarCidades();
  }, 30_000);
}

/* ═══════════════════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════════════════ */
export function iniciarRelogio() {
  // Renderiza o mapa
  renderizarMapa();

  // Renderiza lista de cidades
  renderizarCidades();

  // Barra de ações
  btnAddCity?.addEventListener('click',    abrirModal);
  btnEditClocks?.addEventListener('click', entrarModoEdicao);
  btnDoneClocks?.addEventListener('click', sairModoEdicao);

  // Modal
  btnConfirmCity?.addEventListener('click', confirmarCidade);
  btnCancelCity?.addEventListener('click',  fecharModal);

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
  });

  citySearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmarCidade();
    if (e.key === 'Escape') fecharModal();
  });

  // Atualização periódica
  iniciarAtualizacao();
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
});
