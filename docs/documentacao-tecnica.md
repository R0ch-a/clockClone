# Documentação Técnica — clockClone
**Versão:** 3.0  
**Data:** 25/04/2026  
**Autor:** Rafael Rocha  
**Repositório:** https://github.com/R0ch-a/clockClone  

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Arquitetura](#5-arquitetura)
6. [Frontend — Arquivos e Responsabilidades](#6-frontend--arquivos-e-responsabilidades)
7. [Backend Rust — Arquivos e Responsabilidades](#7-backend-rust--arquivos-e-responsabilidades)
8. [Módulos Implementados](#8-módulos-implementados)
9. [Design System](#9-design-system)
10. [Testes](#10-testes)
11. [Decisões Técnicas e Problemas Resolvidos](#11-decisões-técnicas-e-problemas-resolvidos)
12. [Histórico de Commits](#12-histórico-de-commits)
13. [Próximos Passos](#13-próximos-passos)

---

## 1. Visão Geral

O **clockClone** é um aplicativo desktop para Windows que reproduz fielmente o app **Relógio do Windows 11**, desenvolvido com **Rust + Tauri** no backend e **HTML + CSS + JavaScript** no frontend.

O app possui cinco módulos funcionais:

| Módulo | Descrição |
|--------|-----------|
| Relógio Mundial | Mapa SVG interativo com pins de cidades e fusos horários |
| Temporizador | Múltiplos timers simultâneos com anel SVG animado, modo expandido e PiP |
| Alarme | Lista de alarmes com dias da semana, som, soneca e modal visual completo |
| Cronômetro | Contador com voltas, labels de mais rápida/lenta, modo expandido e PiP |
| Configurações | Tema claro/escuro/sistema, notificações, privacidade e sobre |

### Funcionalidades transversais
- Titlebar customizada com botões minimizar, maximizar e fechar (decorações nativas desativadas)
- Sidebar expansível com hambúrguer, brand, ícones animados e usuário no rodapé
- Modo PiP (Picture-in-Picture) no Temporizador e Cronômetro
- Modo expandido no Temporizador e Cronômetro
- Notificações nativas do Windows + sons via `rodio`
- Tema claro/escuro/sistema com detecção de `prefers-color-scheme`
- Ícone personalizado no Explorer e barra de tarefas

### Limitação conhecida — Persistência de dados
Os dados criados pelo usuário (alarmes, timers, cidades do Relógio Mundial) **não são persistidos entre sessões**. O backend Rust possui os comandos de persistência implementados (`carregar_dados`, `salvar_alarmes`, `salvar_timers`, `salvar_cidades`) e o `tauri-bridge.js` tem os wrappers prontos, mas a integração completa com o frontend ainda não foi concluída. Cada vez que o app é aberto, começa com apenas o timer padrão de 20 minutos e a hora local no Relógio Mundial.

---

## 2. Stack Tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| HTML5 | — | Estrutura da interface |
| CSS3 | — | Estilização com variáveis CSS |
| JavaScript (ES Modules) | — | Lógica dos módulos |
| Vite | 8.x | Bundler e servidor de desenvolvimento |
| world-atlas | 2.x | Dados geográficos do mapa |
| topojson-client | — | Conversão de dados geográficos para SVG |

### Backend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Rust | 1.77.2+ | Linguagem do backend |
| Tauri | 2.10.3 | Framework desktop |
| tauri-plugin-notification | 2 | Notificações nativas do Windows |
| tauri-plugin-store | 2 | Persistência de dados em JSON |
| tauri-plugin-shell | 2 | Abrir links e apps externos |
| tauri-plugin-log | 2 | Logging estruturado |
| chrono | 0.4 | Manipulação de datas e horas |
| rodio | 0.19 | Reprodução de áudio |
| serde / serde_json | 1.0 | Serialização de dados |

---

## 3. Estrutura de Diretórios

```
clockClone/
├── src/                          # Frontend
│   ├── index.html                # Entry point — estrutura completa do app
│   ├── assets/                   # Recursos estáticos
│   │   └── (world-map reservado para SVG futuro)
│   ├── style/
│   │   ├── variables.css         # Tokens de design (cores, fontes, espaçamento)
│   │   ├── shell.css             # Layout base, sidebar, modais, utilitários
│   │   ├── world-clock.css       # Estilos do Relógio Mundial
│   │   ├── timer.css             # Estilos do Temporizador
│   │   ├── alarm.css             # Estilos do Alarme
│   │   ├── stopwatch.css         # Estilos do Cronômetro
│   │   └── settings.css          # Estilos das Configurações
│   └── js/
│       ├── router.js             # Navegação entre abas
│       ├── world-clock.js        # Módulo Relógio Mundial
│       ├── timer.js              # Módulo Temporizador
│       ├── alarm.js              # Módulo Alarme
│       ├── stopwatch.js          # Módulo Cronômetro
│       ├── settings.js           # Módulo Configurações
│       └── tauri-bridge.js       # Wrapper centralizado das APIs Tauri
│
├── src-tauri/                    # Backend Rust
│   ├── Cargo.toml                # Dependências Rust
│   ├── tauri.conf.json           # Configuração da janela e plugins
│   ├── sounds/
│   │   ├── timer-end.mp3         # Som de fim de temporizador
│   │   └── alarm.mp3             # Som de alarme
│   ├── icons/                    # Ícones do app
│   └── src/
│       ├── main.rs               # Entrada do app, setup do Tauri
│       ├── lib.rs                # Exposição de módulos públicos para testes
│       ├── commands.rs           # Comandos expostos ao frontend via invoke()
│       ├── state.rs              # AppState e modelos de dados
│       ├── alarm_scheduler.rs    # Thread de verificação de alarmes
│       └── audio.rs              # Reprodução de sons via rodio
│
├── tests/
│   ├── unit/
│   │   ├── timer.test.js         # 37 testes do Temporizador
│   │   ├── stopwatch.test.js     # 34 testes do Cronômetro
│   │   ├── world-clock.test.js   # 38 testes do Relógio Mundial
│   │   ├── alarm.test.js         # 47 testes do Alarme
│   │   └── settings.test.js      # 46 testes das Configurações
│   └── rust/
│       └── commands_test.rs      # 31 testes do backend Rust
│
├── docs/
│   ├── plano-projeto-relogio-win11.md  # Plano de projeto completo (v1.4)
│   └── documentacao-tecnica.md         # Este arquivo (v2.0)
│
├── README.md                     # Documentação principal do repositório
├── vite.config.js                # Configuração do Vite (root: src/, test: tests/)
├── .gitignore                    # Arquivos ignorados pelo Git
└── package.json
```

---

## 4. Configuração do Ambiente

### Pré-requisitos
- **Windows 10/11** (target principal)
- **Rust** — instalar via [rustup.rs](https://rustup.rs)
- **Node.js** — 18+ recomendado
- **WebView2** — já incluído no Windows 11

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/R0ch-a/clockClone.git
cd clockClone

# Instalar dependências JavaScript
npm install

# Verificar instalação do Rust
rustc --version
cargo --version
```

### Executar em desenvolvimento

```bash
# Terminal 1 — servidor Vite
npm run dev

# Terminal 2 — app Tauri
cargo tauri dev
```

### Build para produção

```bash
cargo tauri build
# Gera instalador em: src-tauri/target/release/bundle/
```

### Configuração do PowerShell (Windows)

Se aparecer erro de política de execução:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 5. Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (WebView2)                     │
│                                                         │
│  router.js — navegação entre páginas                    │
│                                                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐ │
│  │world-clock│ │  timer.js │ │  alarm.js │ │stopwatch│ │
│  │    .js    │ │           │ │           │ │   .js  │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───┬────┘ │
│        │              │              │            │      │
│  ┌─────┴──────────────┴──────────────┴────────────┴───┐ │
│  │              tauri-bridge.js                        │ │
│  └────────────────────┬────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────┘
                        │ invoke() / emit() / listen()
                        │ Tauri IPC
┌───────────────────────┼─────────────────────────────────┐
│                  BACKEND (Rust)                          │
│                                                         │
│  main.rs ──► commands.rs ──► audio.rs                  │
│      │                                                  │
│      ├──► state.rs (AppState com Mutex)                 │
│      │         ├── Vec<City>                            │
│      │         ├── Vec<Alarm>                           │
│      │         ├── Vec<TimerConfig>                     │
│      │         └── Theme                                │
│      │                                                  │
│      └──► alarm_scheduler.rs (thread background)        │
│               └── emite "alarm_fired" ao frontend       │
└─────────────────────────────────────────────────────────┘
```

### Comunicação IPC

| Direção | Mecanismo | Exemplo |
|---------|-----------|---------|
| JS → Rust | `invoke()` | `invoke('send_notification', { title, body })` |
| Rust → JS | `emit()` + `listen()` | `listen('alarm_fired', callback)` |

---

## 6. Frontend — Arquivos e Responsabilidades

### `index.html`
Estrutura completa do app em um único arquivo HTML. Contém:
- Shell do app (sidebar + área de conteúdo)
- 5 seções de página (`world-clock`, `timer`, `alarm`, `stopwatch`, `settings`)
- Modal de adicionar cidade (Relógio Mundial)
- Modal de adicionar/editar temporizador
- Todos os ícones SVG inline (sem dependências externas)
- Tags `<script type="module">` para cada módulo JS

### `style/variables.css`
Token centralizado de design. Define:
- **Dois temas completos**: escuro (padrão) e claro, via `[data-theme]` no `<html>`
- Cores: fundo, texto, acento dourado `#c9b97a`, bordas, semânticas
- Tipografia: `Segoe UI Variable` + fallbacks
- Espaçamento, bordas, animações
- Reset global e scrollbar customizada
- Classe utilitária `.hidden`

### `style/shell.css`
Layout base compartilhado entre todos os módulos:
- Sidebar com transição de largura colapsada/expandida
- Itens de navegação com barra de acento dourada animada
- Animação `pageEnter` na troca de abas
- Barra de ações inferior
- Sistema de modais (overlay + container)
- Botões de ação e ícone

### `js/router.js`
Navegação entre as 5 páginas do app:
- `navegarPara(pageId)` — troca `.hidden` entre seções
- `iniciarRouter()` — liga listeners dos nav-items e hambúrguer
- `paginaAtual()` — exportada para outros módulos consultarem

### `js/tauri-bridge.js`
Wrapper centralizado de todas as chamadas Tauri:
- Detecção de ambiente (`IS_TAURI`) — fallbacks para desenvolvimento no browser
- Funções: `enviarNotificacao()`, `abrirConfigsEnergia()`, `setAlwaysOnTop()`, `alternarMaximizar()`, `abrirLink()`, `onAlarmeFired()`

### `js/world-clock.js`
Módulo Relógio Mundial:
- Renderização do mapa SVG via `world-atlas` + `topojson-client`
- Projeção equiretangular simples para posicionar pins
- Base de 40 cidades com timezone IANA e coordenadas
- Cálculo de fuso via `Intl.DateTimeFormat`
- Ícones dia/noite baseados na hora local da cidade
- Modal de adicionar cidade com busca por nome
- Modo de edição com lixeira vermelha
- Atualização automática a cada 30 segundos

### `js/timer.js`
Módulo Temporizador:
- Múltiplos timers simultâneos, cada um com seu próprio `requestAnimationFrame`
- Anel SVG animado via `stroke-dashoffset` (CIRCUMFERENCE ≈ 565.48)
- Modal com seletor `hh:mm:ss` por setas ∧/∨
- Nomeação automática ("Cronômetro (N)")
- Botão Salvar desabilitado com tempo zero
- Modo de edição: esconde ↗/⧉, exibe lixeira vermelha
- Horário de término previsto durante contagem
- Notificação Tauri ao terminar + som via `audio.rs`
- Always-on-top via `getCurrentWindow().setAlwaysOnTop()`

### `js/alarm.js`
Módulo Alarme (v2):
- Modal visual completo com seletor `hh:mm`, nome, checkbox "Repetir alarme", pílulas de dias, dropdown de som e soneca
- Funciona em modo `add` e `edit`
- Toggle on/off com `stopPropagation` para não abrir modal ao clicar
- Pílulas de dias interativas no card e no modal
- Modo de edição com lixeira vermelha (substitui toggle)
- Verificação de alarmes a cada 30 segundos
- Cálculo dinâmico "em X horas, Y minutos" atualizado a cada minuto
- Notificação Tauri ao disparar

### `js/stopwatch.js`
Módulo Cronômetro:
- Loop de precisão via `performance.now()` + `requestAnimationFrame`
- Formato `hh:mm:ss,ms` com dois dígitos de centésimos
- Tabela de voltas aparece somente após a primeira volta
- Labels automáticos "Mais rápida" / "Mais lento" a partir de 2 voltas
- Voltas em ordem decrescente (mais recente no topo)
- Always-on-top e expandir via Tauri
- `formatarTempo()` exportada para uso externo

### `js/settings.js`
Módulo Configurações:
- Troca de tema imediata via `data-theme` no `<html>`
- Detecção automática de `prefers-color-scheme` no modo "system"
- Persistência do tema via `localStorage`
- Listener de mudança de tema do SO em tempo real
- Acordeões de Tema e Sobre com animação de chevron
- Versão do app via `invoke('get_app_version')`
- Limpar histórico com confirmação
- Links externos via `tauri-plugin-shell`

---

## 7. Backend Rust — Arquivos e Responsabilidades

### `main.rs`
Entrada do app. Responsabilidades:
- Inicializa o `AppState` via `Arc`
- Registra todos os plugins Tauri
- Registra todos os comandos via `invoke_handler`
- Inicia o `alarm_scheduler` no hook `.setup()`

```rust
mod state;
mod commands;
mod alarm_scheduler;
mod audio;
```

### `commands.rs`
Comandos expostos ao frontend via `invoke()`:

| Comando | Descrição |
|---------|-----------|
| `send_notification(title, body)` | Notificação nativa do Windows + toca som |
| `open_power_settings()` | Abre `ms-settings:powersleep` |
| `open_notification_settings()` | Abre `ms-settings:notifications` |
| `get_app_version()` | Retorna versão do `Cargo.toml` |
| `clear_history(app)` | Limpa o `store.json` via `tauri-plugin-store` |

### `state.rs`
Modelos de dados e estado compartilhado:

```rust
pub struct City      { id, name, timezone, latitude, longitude, is_local }
pub struct Alarm     { id, label, time, enabled, days: Vec<u8> }
pub struct TimerConfig { id, label, duration_secs }
pub enum   Theme     { Light, Dark, System }

pub struct AppState {
    cities: Mutex<Vec<City>>,
    alarms: Mutex<Vec<Alarm>>,
    timers: Mutex<Vec<TimerConfig>>,
    theme:  Mutex<Theme>,
}

pub struct StoredState { ... } // Para serialização em store.json
```

### `alarm_scheduler.rs`
Thread background para verificação de alarmes:
- Verifica alarmes a cada 30 segundos
- Compara hora atual (`HH:MM`) com cada alarme habilitado
- Filtra por dia da semana (array vazio = todos os dias)
- Proteção contra duplo disparo no mesmo minuto via `HashSet`
- Emite evento `alarm_fired` com payload `{ id, label, time }`

### `audio.rs`
Reprodução de sons via `rodio`:
- Sons embutidos no binário via `include_bytes!()`
- `tocar_alarme()` e `tocar_timer()` — cada uma dispara em thread separada
- Timeout de 5 segundos para parar o som automaticamente
- Fallback gracioso se dispositivo de áudio não estiver disponível

---

## 8. Módulos Implementados

### 8.1 Relógio Mundial
- [x] Mapa SVG renderizado com world-atlas + topojson
- [x] Pins de localização no mapa com fix do antimeridiano
- [x] Lista de cidades com hora, data e diferença de fuso
- [x] Ícones de dia (☀) e noite (🌙)
- [x] Modal "Adicionar novo local" com busca
- [x] Modo de edição com lixeira vermelha
- [x] Atualização automática a cada 30s
- [ ] Persistência das cidades no store.json ⚠️ não implementado

### 8.2 Temporizador
- [x] Grid 2×N com múltiplos timers simultâneos e scroll
- [x] Anel SVG dourado animado via stroke-dashoffset
- [x] Modal com seletor hh:mm:ss por setas
- [x] Modal de edição ao clicar no card com lixeira vermelha
- [x] Horário de término previsto durante contagem
- [x] Modo de edição com lixeira vermelha
- [x] Modo expandido — ocupa a janela inteira sem sidebar
- [x] Modo PiP — janela menor always-on-top com header customizado
- [x] Notificação nativa ao término + som
- [x] Timer padrão de 20 minutos ao abrir o app
- [ ] Persistência dos timers no store.json ⚠️ não implementado

### 8.3 Alarme
- [x] Lista de cards com hora, nome, dias e toggle
- [x] Modal completo com seletor hh:mm
- [x] Checkbox "Repetir alarme" com pílulas de dias
- [x] Dropdown de som e soneca
- [x] Toggle on/off sem interferir no modal de edição
- [x] Modo de edição com lixeira vermelha no card e no modal
- [x] Countdown "em X horas, Y minutos"
- [x] Banner visível apenas quando há alarme ativo
- [x] Notificação nativa ao disparar
- [ ] Persistência dos alarmes no store.json ⚠️ não implementado
- [ ] Integração com evento `alarm_fired` do Rust

### 8.4 Cronômetro
- [x] Display hh:mm:ss,ms com precisão de ~10ms
- [x] Play/pause, volta e reset
- [x] Tabela de voltas com Hora e Total
- [x] Labels "Mais rápida" e "Mais lento"
- [x] Modo expandido — ocupa a janela sem sidebar, voltas somem
- [x] Modo PiP — janela menor always-on-top
- [x] Continua em background ao trocar de aba

### 8.5 Configurações
- [x] Troca de tema claro/escuro/sistema
- [x] Detecção de `prefers-color-scheme`
- [x] Acordeões de tema e sobre com animação
- [x] Link para configurações de notificação do Windows
- [x] Limpar histórico com feedback visual ✓
- [x] Versão do app via Rust
- [x] Links externos abrindo no browser padrão

---

## 9. Design System

### Paleta de Cores — Tema Escuro

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-app` | `#1c1c1a` | Fundo principal da janela |
| `--bg-surface` | `#2c2c2a` | Cards, modais |
| `--bg-surface-2` | `#343432` | Hover, inputs |
| `--bg-sidebar` | `#242422` | Barra lateral |
| `--accent` | `#c9b97a` | Dourado — cor de destaque |
| `--text-primary` | `#ffffff` | Texto principal |
| `--text-secondary` | `#a0a09a` | Texto secundário |
| `--danger` | `#e24b4a` | Lixeira, erros |
| `--ring-fill` | `#c9b97a` | Anel do temporizador |
| `--toggle-on` | `#c9b97a` | Toggle ativo |
| `--pill-on-bg` | `#c9b97a` | Pílula de dia ativa |

### Tipografia
- **Fonte principal:** `Segoe UI Variable` (Windows 11)
- **Fallback:** `Segoe UI`, `system-ui`, `sans-serif`
- **Tamanhos:** 11px (xs) → 80px (display cronômetro)
- **Pesos:** 400 (regular), 500 (medium), 600 (bold)

### Animações

| Elemento | Animação | Duração |
|----------|----------|---------|
| Troca de aba | Fade + slide 8px | 150ms ease |
| Modal abrir | Scale 0.95→1 + fade | 120ms ease-out |
| Sidebar expandir | Largura + opacity labels | 200ms ease-out |
| Anel do timer | `stroke-dashoffset` | por frame (rAF) |
| Excluir card | Scale + fade | 150ms ease |
| Toggle alarme | Slide do thumb | 150ms ease |
| Accordion | Fade + translateY | 200ms ease |

---

## 10. Testes

### 10.1 Testes JavaScript — Vitest

**Configuração:** `vite.config.js` com `test.root: '.'` e `test.include: ['tests/**/*.test.js']`

**Rodar:** `npm test` na raiz do projeto

| Arquivo | Casos | Módulo |
|---------|-------|--------|
| `timer.test.js` | 37 | Temporizador |
| `stopwatch.test.js` | 34 | Cronômetro |
| `world-clock.test.js` | 38 | Relógio Mundial |
| `alarm.test.js` | 47 | Alarme |
| `settings.test.js` | 46 | Configurações |
| **Total** | **202** | |

**O que cada arquivo testa:**

`timer.test.js` — `formatarTempoTimer`, `pad`, `calcularDashoffset` (anel SVG), `sugerirNome`, `validarTempo`, incremento/decremento do picker e cálculo de duração total.

`stopwatch.test.js` — `parseTempo`, `formatarTempo`, `atualizarLabelsVolta` (Mais rápida/Mais lento), `registrarVolta`, `redefinir` e visibilidade da tabela de voltas.

`world-clock.test.js` — `getHoraEmTimezone`, `getDataEmTimezone`, `getDiferencaFuso`, `isDia` (limites exatos 6h-20h), `criarProjecao` (mapa SVG com coordenadas reais) e `buscarCidade`.

`alarm.test.js` — `sugerirNome`, `deveDisparar` (com filtro de dias), `alternarDia` (imutabilidade), `validarHorario`, `formatarHorario`, `tempoAteAlarme` (singular/plural, avanço de dia), array DIAS e picker de alarme.

`settings.test.js` — `temaValido`, `aplicarTema` (com `prefers-color-scheme`), `nomeTema`, `carregarTema`, `salvarTema`, `alterarTema`, constantes TEMAS/NOMES_TEMA/STORAGE_KEY e fluxo completo de troca de tema.

### 10.2 Testes Rust — cargo test

**Rodar:** `cargo test` dentro de `src-tauri/`

| Arquivo | Casos | Cobertura |
|---------|-------|-----------|
| `commands_test.rs` | 31 | `state.rs`, `commands.rs`, scheduler |

**O que está testado:**

- **Versão do app** — não vazia e formato semver válido
- **AppState** — `new()` vazio, tema padrão `System`, `from_store()` preserva dados, acesso thread-safe via Mutex
- **Alarm** — roundtrip JSON, 7 dias, dias vazios = todo dia, formato `HH:MM`, desabilitado não dispara
- **City** — roundtrip JSON, coordenadas de São Paulo (sul/oeste), timezone IANA
- **TimerConfig** — roundtrip JSON, 20min = 1200s, duração positiva
- **Theme** — padrão `System`, serialização `"dark"/"light"/"system"`, deserialização
- **StoredState** — default vazio, roundtrip JSON, JSON parcial usa defaults, conversão `into()` para AppState
- **Scheduler** — desabilitado não dispara, horário errado, correto dispara, dias vazios = todo dia, dia errado bloqueia

---

## 11. Decisões Técnicas e Problemas Resolvidos

### Caminho com `#` quebrava o Vite
**Problema:** O projeto estava em `project#l1sbeth` — o `#` é interpretado como fragmento de URL pelo bundler.  
**Solução:** Mover o projeto para `C:\dev\clockClone` (caminho sem caracteres especiais).

### Porta 5173 em uso
**Problema:** Vite tentava porta 5173 (já em uso) e subia na 5174.  
**Solução:** Atualizar `devUrl` no `tauri.conf.json` para `http://localhost:5174`.

### `npm` bloqueado pelo PowerShell
**Problema:** Política de execução do Windows impedia scripts `.ps1`.  
**Solução:** `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Vite não encontrava `main.js`
**Problema:** Vite gerava template com `main.js` mas o projeto usa `index.html` em `src/`.  
**Solução:** Criar `vite.config.js` na raiz com `root: 'src'`.

### Anel do timer não diminuía
**Problema:** O `pararTimer()` estava resetando o `strokeDashoffset` e a cor do anel na inicialização.  
**Solução:** Aplicar reset visual apenas quando `terminou === true`, manter a cor dourada no estado parado.

### Som do alarme não parava
**Problema:** `sink.sleep_until_end()` aguardava o arquivo inteiro — arquivos longos tocavam indefinidamente.  
**Solução:** Substituir por `std::thread::sleep(Duration::from_secs(5))` + `sink.stop()`.

### Toggle do alarme abria modal de edição
**Problema:** O clique no `<label>` do toggle propagava para o card, disparando o evento de edição.  
**Solução:** Adicionar `e.stopPropagation()` no listener de clique do elemento `.alarm-toggle`.

### Autenticação GitHub no terminal
**Problema:** GitHub não aceita senha pelo terminal desde 2021.  
**Solução:** Gerar Personal Access Token (PAT) em Settings → Developer settings e usar na URL: `https://USUARIO:TOKEN@github.com/...`

### Duplicatas no `Cargo.toml`
**Problema:** Múltiplas entradas de `tauri`, `serde` e `serde_json` causavam erro de parse.  
**Solução:** Manter apenas uma entrada por crate, usando a versão mais específica disponível.

### Anel do timer aparecia apenas ao redefinir
**Problema:** A trilha de fundo do anel SVG usava `var(--ring-fill)` em vez de `var(--ring-track)`, e o `redefinirTimer()` mudava a cor para cinza — fazendo o anel dourado aparecer apenas ao redefinir.  
**Solução:** Trilha de fundo usa `var(--ring-track)` (cinza), anel de progresso usa `var(--ring-fill)` (dourado) desde a criação. Reset visual aplica `var(--ring-fill)` (não cinza) ao redefinir.

### Cards do timer sem bordas arredondadas
**Problema:** O grid usava `gap: 1px` com `background-color: var(--border)` para criar divisórias — essa técnica remove o `border-radius` dos cards nas bordas externas.  
**Solução:** Substituir por `gap: var(--space-3)` com `padding: var(--space-3)` e `background-color: var(--bg-app)`, mantendo `border-radius` visível em todos os cards.

### Vitest não encontrava os arquivos de teste
**Problema:** `vite.config.js` tinha `root: 'src'`, fazendo o Vitest procurar testes dentro de `src/`.  
**Solução:** Adicionar seção `test` no `vite.config.js` com `root: '.'` e `include: ['tests/**/*.test.js']`.

### Doctest do `audio.rs` falhava no `cargo test`
**Problema:** O comentário da função `tocar()` tinha um bloco de código que o Rust tentava compilar como doctest — mas sem o contexto do módulo, o `audio::tocar()` não resolvia.  
**Solução:** Remover o bloco de exemplo do comentário da função.

### `@tauri-apps/plugin-shell` não instalado
**Problema:** O `settings.js` importava `@tauri-apps/plugin-shell` que não estava instalado, causando erro no Vite.  
**Solução:** `npm install @tauri-apps/plugin-shell` e adicionar `tauri-plugin-shell = "2"` no `Cargo.toml`.

### `.gitignore` com erro de digitação
**Problema:** `.gitignore` tinha `node.modules/` (com ponto) em vez de `node_modules/` (com underline).  
**Solução:** Corrigir a entrada e adicionar outras entradas importantes (`.env`, logs, arquivos de editor, sistema operacional e `WixTools`).

### Modal do alarme usava `prompt()` nativo
**Problema:** A primeira versão do `alarm.js` usava `prompt()` do browser para adicionar e editar alarmes — solução temporária e visualmente inconsistente com o resto do app.  
**Solução:** Reescrever o `alarm.js` (v2) com modal visual completo criado dinamicamente via JavaScript, incluindo seletor `hh:mm`, campo de nome, checkbox "Repetir alarme", pílulas de dias, dropdown de som e soneca.

---

## 12. Histórico de Commits

| Commit | Descrição |
|--------|-----------|
| `chore: initial project setup` | Tauri + Vite configurados, janela funcionando |
| `feat: add base HTML structure and CSS foundation` | `index.html`, `variables.css`, `shell.css` |
| `feat: add router and stopwatch module` | `router.js`, `stopwatch.js` |
| `feat: add stopwatch styles` | `stopwatch.css` |
| `feat: add timer module and styles` | `timer.js`, `timer.css` |
| `feat: add alarm module and styles` | `alarm.js` v1, `alarm.css` |
| `feat: add settings module, styles and vite config` | `settings.js`, `settings.css`, `vite.config.js` |
| `feat: add world clock module and styles` | `world-clock.js`, `world-clock.css` |
| `feat: add Tauri backend commands` | `commands.rs`, `main.rs` atualizado |
| `feat: add state.rs with AppState and data models` | `state.rs` |
| `feat: add alarm_scheduler and update main.rs` | `alarm_scheduler.rs`, `main.rs` com `.setup()` |
| `feat: add audio.rs with rodio sound playback` | `audio.rs`, sons `.mp3` embutidos |
| `feat: add tauri-bridge.js` | Wrapper centralizado das APIs Tauri |
| `feat: rewrite alarm module with full modal` | `alarm.js` v2 com modal visual completo |
| `fix: timer ring now starts full and golden` | Correção do anel SVG do temporizador |
| `fix: stop toggle click from opening alarm edit modal` | `stopPropagation` no toggle do alarme |
| `feat: add unit tests for all modules` | 202 testes JS + 31 testes Rust |
| `docs: add README.md and remaining unit tests` | `README.md`, `alarm.test.js`, `settings.test.js` |
| `chore: fix .gitignore typo and add missing entries` | Correção do `.gitignore` |
| `fix: resolve world map horizontal line glitch` | Fix do antimeridiano no mapa SVG |
| `feat: add custom titlebar with drag and window controls` | Titlebar customizada, decorações desativadas |
| `feat: add picture-in-picture and expand modes to stopwatch` | PiP e expand no Cronômetro |
| `feat: timer expand mode, edit modal and default 20min timer` | Modo expandido e edição no Temporizador |
| `feat: add PiP mode to timer cards` | PiP no Temporizador |
| `fix: multiple UI improvements` | Scroll no grid, sidebar brand, usuário no rodapé |
| `docs: add screenshots to README.md` | Screenshots de todos os módulos |

---

## 13. Limitações Conhecidas

### Persistência de dados não implementada
O maior gap do projeto é a falta de persistência entre sessões. A infraestrutura está pronta:

**Backend (Rust) — implementado:**
- `carregar_dados()` — lê `store.json` via `tauri-plugin-store`
- `salvar_alarmes()`, `salvar_timers()`, `salvar_cidades()`, `salvar_tema()` — gravam no `store.json`

**Frontend (JS) — implementado:**
- `tauri-bridge.js` tem `carregarDados()`, `salvarAlarmes()`, `salvarTimers()`, `salvarCidades()`
- `router.js` dispara evento `dados-carregados` ao iniciar

**O que falta:**
- Cada módulo (`alarm.js`, `timer.js`, `world-clock.js`) precisa escutar `dados-carregados` e carregar os dados
- Cada ação de salvar/excluir precisa chamar a função de persistência correspondente

**Impacto:** Ao fechar e reabrir o app, todos os alarmes, timers e cidades adicionados são perdidos. Apenas o tema é persistido via `localStorage`.

---

## 14. Próximos Passos

### Alta prioridade
- [ ] **Persistência completa** — integrar `dados-carregados` em `alarm.js`, `timer.js` e `world-clock.js`
- [ ] **Integração do `alarm_fired`** — conectar evento Rust com `alarm.js` via `onAlarmeFired()` do `tauri-bridge.js`

### Média prioridade
- [ ] Som diferente por alarme (campo `sound` já salvo no estado)
- [ ] Soneca funcional (campo `snooze` já salvo no estado)
- [ ] Busca com autocomplete no modal de adicionar cidade
- [ ] Substituir `localStorage` por `tauri-plugin-store` no `settings.js`
- [ ] Suporte a tema claro completo (revisar contrastes)

### Baixa prioridade
- [ ] Sessões de concentração (Focus Sessions) — fora do escopo v1.0
- [ ] Aumentar cobertura de testes com casos de erro e edge cases
- [ ] Remover `#[allow(dead_code)]` conforme campos forem usados
- [ ] Adicionar `aria-live` nas regiões que atualizam dinamicamente
- [ ] Revisar acessibilidade dos modais (foco ao abrir, ESC fecha, trap de foco)
