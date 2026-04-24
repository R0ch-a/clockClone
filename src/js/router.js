/* ═══════════════════════════════════════════════════════════
   router.js — Navegação entre páginas do app
   Controla qual seção está visível e qual item da
   sidebar está marcado como ativo.
════════════════════════════════════════════════════════════ */

import { getCurrentWindow } from '@tauri-apps/api/window';

// ── Páginas disponíveis (devem bater com os IDs do HTML) ──
const PAGES = [
  'world-clock',
  'timer',
  'alarm',
  'stopwatch',
  'settings',
];

// Página exibida ao abrir o app
const DEFAULT_PAGE = 'world-clock';

// ── Estado interno ──
let currentPage = null;

/* ═══════════════════════════════════════════════════════════
   navegarPara(pageId)
   Exibe a página solicitada e atualiza o item ativo
   na sidebar. Ignora se já estiver na mesma página.
════════════════════════════════════════════════════════════ */
export function navegarPara(pageId) {
  if (!PAGES.includes(pageId)) {
    console.warn(`[router] Página desconhecida: "${pageId}"`);
    return;
  }

  if (pageId === currentPage) return;

  // Oculta a página atual
  if (currentPage) {
    const pageAtual = document.getElementById(`page-${currentPage}`);
    if (pageAtual) pageAtual.classList.add('hidden');
  }

  // Exibe a nova página
  const novaPagina = document.getElementById(`page-${pageId}`);
  if (novaPagina) {
    novaPagina.classList.remove('hidden');
  }

  // Atualiza estado ativo na sidebar
  atualizarSidebar(pageId);

  currentPage = pageId;
}

/* ═══════════════════════════════════════════════════════════
   atualizarSidebar(pageId)
   Remove a classe .active de todos os itens e aplica
   no item correspondente à página atual.
════════════════════════════════════════════════════════════ */
function atualizarSidebar(pageId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const itemAtivo = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (itemAtivo) itemAtivo.classList.add('active');
}

/* ═══════════════════════════════════════════════════════════
   paginaAtual()
   Retorna o ID da página visível no momento.
════════════════════════════════════════════════════════════ */
export function paginaAtual() {
  return currentPage;
}

/* ═══════════════════════════════════════════════════════════
   iniciarRouter()
   Liga os event listeners da sidebar e exibe a
   página padrão. Deve ser chamado uma única vez.
════════════════════════════════════════════════════════════ */
export function iniciarRouter() {
  // Clique em cada item de navegação
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const destino = item.getAttribute('data-page');
      navegarPara(destino);
    });
  });

  // Botão hambúrguer — expande/colapsa a sidebar
  const sidebar       = document.getElementById('sidebar');
  const toggleBtn     = document.getElementById('sidebarToggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      const expandida = sidebar.classList.toggle('expanded');
      toggleBtn.setAttribute(
        'aria-label',
        expandida ? 'Recolher menu' : 'Expandir menu'
      );
    });
  }

  // Navega para a página padrão ao iniciar
  navegarPara(DEFAULT_PAGE);

  const appWindow = getCurrentWindow();

  document.getElementById('min')
    ?.addEventListener('click', () => appWindow.minimize());

  document.getElementById('max')
    ?.addEventListener('click', async () => {
      const maximized = await appWindow.isMaximized();
      maximized ? appWindow.unmaximize() : appWindow.maximize();
    });

  document.getElementById('close')
    ?.addEventListener('click', () => appWindow.close());
}

/* ═══════════════════════════════════════════════════════════
   Inicialização automática quando o DOM estiver pronto
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  iniciarRouter();
});
