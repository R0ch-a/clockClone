# Plano de Projeto — Clone do Relógio Windows 11
**Versão:** 1.4  
**Data:** 22/04/2026  
**Autor:** Rafael Rocha  
**Tecnologia:** Rust + Tauri + HTML + CSS + JavaScript  

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Objetivos e Escopo](#2-objetivos-e-escopo)
3. [Requisitos](#3-requisitos)
   - 3.1 Requisitos Funcionais
   - 3.2 Requisitos Não Funcionais
4. [Casos de Uso](#4-casos-de-uso)
5. [Arquitetura do Sistema](#5-arquitetura-do-sistema)
6. [Estrutura de Diretórios](#6-estrutura-de-diretórios)
7. [Modelagem de Dados](#7-modelagem-de-dados)
8. [Especificação dos Módulos](#8-especificação-dos-módulos)
   - 8.1 Relógio Mundial
   - 8.2 Temporizador
   - 8.3 Alarme
   - 8.4 Cronômetro
   - 8.5 Configurações
9. [Interface do Usuário](#9-interface-do-usuário)
10. [Plano de Testes](#10-plano-de-testes)
11. [Cronograma](#11-cronograma)
12. [Dependências e Ferramentas](#12-dependências-e-ferramentas)
13. [Riscos e Mitigações](#13-riscos-e-mitigações)
14. [Glossário](#14-glossário)

---

## 1. Visão Geral do Projeto

Este projeto consiste no desenvolvimento de um aplicativo desktop **clone do Relógio do Windows 11**, recriando fielmente sua interface e funcionalidades principais. O app é construído com **Tauri** (framework Rust para aplicativos desktop) e tecnologias web (HTML, CSS, JavaScript) para o frontend.

O aplicativo oferece quatro módulos: **Relógio Mundial**, **Temporizador**, **Alarme** e **Cronômetro**, replicando o design em tema escuro característico do Windows 11, incluindo o acento dourado (`#c9b97a`), animações de anel circular e comportamentos interativos documentados nas telas de referência.

---

## 2. Objetivos e Escopo

### 2.1 Objetivos

- Replicar fielmente a interface visual e o comportamento do app Relógio do Windows 11
- Aprender e aplicar o stack Rust + Tauri em um projeto prático
- Praticar engenharia de software com documentação formal, testes e arquitetura bem definida
- Produzir um executável nativo para Windows (`.exe` via instalador NSIS ou MSI)

### 2.2 Escopo — Incluído

| Módulo | Descrição |
|--------|-----------|
| Relógio Mundial | Mapa mundi com pins, lista de cidades, adicionar/remover locais, ícones dia/noite |
| Temporizador | Múltiplos timers simultâneos em grid 2×2, anel circular animado, modo expandido |
| Alarme | Lista de alarmes com horário, nome, toggle on/off, adicionar e remover |
| Cronômetro | Contagem em hh:mm:ss,ms, voltas (laps), modo expandido |
| Configurações | Tema do app (claro/escuro/sistema), atalho para notificações do sistema, privacidade (limpar histórico), seção Sobre |

### 2.3 Fora do Escopo (v1.0)

- Sessões de Concentração (Focus Sessions)
- Sincronização com conta Microsoft
- Widgets do Windows
- Suporte a macOS e Linux (foco em Windows)

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

#### RF-01 — Relógio Mundial
- **RF-01.1** O sistema deve exibir um mapa mundi em tema escuro com pins de localização
- **RF-01.2** O sistema deve exibir uma lista de cidades cadastradas com hora atual, nome, data e diferença de fuso em relação à hora local
- **RF-01.3** O sistema deve identificar visualmente se é dia (ícone ☀️) ou noite (ícone 🌙) em cada localização
- **RF-01.4** O usuário deve poder adicionar uma nova cidade através de um modal com campo de busca
- **RF-01.5** O modal de adicionar cidade deve conter botões "Adicionar" (acento dourado) e "Cancelar"
- **RF-01.6** O usuário deve poder entrar em modo de edição ao clicar no ícone de lápis (✏️) na barra de ações
- **RF-01.7** No modo de edição, cada linha de cidade deve exibir um ícone de lixeira vermelha (🗑️) para exclusão
- **RF-01.8** O modo de edição deve ser encerrado pelo botão "Concluído"
- **RF-01.9** A barra de ações inferior deve exibir tooltips ("Comparar", "Editar Relógios", "Adicionar nova cidade") ao passar o mouse
- **RF-01.10** O pin no mapa deve ser destacado com a cor de acento dourada quando a cidade está selecionada/em foco

#### RF-02 — Temporizador
- **RF-02.1** O sistema deve suportar múltiplos timers simultâneos exibidos em grid 2×2; ao excluir um timer o grid se reorganiza automaticamente (ex: 4→3 cards, o espaço vazio desaparece)
- **RF-02.2** Cada card de timer deve exibir: nome no topo, anel circular SVG, tempo restante (`hh:mm:ss`) centralizado no anel, botões de controle na base
- **RF-02.3** O anel SVG deve ser exibido em cinza escuro no estado parado e em **dourado** (`#c9b97a`) com `stroke-linecap: round` durante a contagem, diminuindo no sentido anti-horário
- **RF-02.4** O botão ▶ deve ter tooltip **"Iniciar"** e o botão ↺ deve ter tooltip **"Redefinir"**; durante a contagem, ▶ vira ⏸ com tooltip **"Pausar"**
- **RF-02.5** O hover sobre o card deve exibir o tooltip **"Editar temporizador"** na parte inferior do card
- **RF-02.6** O timer deve exibir o horário de término previsto (ex: `🔔 22:05`) abaixo do tempo restante, visível apenas durante a contagem
- **RF-02.7** O botão ↗ deve ter tooltip **"Expandir"** e abrir o timer em modo tela cheia
- **RF-02.8** O botão ⧉ deve ter tooltip **"Manter na parte superior"** e fixar a janela em always-on-top
- **RF-02.9** O sistema deve emitir notificação nativa do Windows ao término do timer
- **RF-02.10** O usuário deve poder adicionar um novo timer pelo botão `+` na barra de ações inferior, que abre o modal **"Adicionar novo temporizador"**
- **RF-02.11** O modal de adição de timer deve conter: seletor `hh : mm : ss` com setas ∧/∨ por campo (o campo ativo fica em **negrito e maior** que os demais), campo de nome com ícone de lápis, nome sugerido automaticamente e botão ✕ de limpar visível apenas quando o campo está em foco com borda dourada inferior; botões **"Salvar"** (ícone 💾, fundo dourado) e **"Cancelar"** (ícone ✕, fundo escuro)
- **RF-02.12** Ao abrir o modal, o fundo do app deve ficar com overlay escuro semitransparente
- **RF-02.13** O usuário deve poder entrar em **modo de edição** pelo botão ✏️ na barra de ações inferior; no modo de edição: os botões ✏️ e `+` são substituídos por ✓ e `+`, os botões ↗ e ⧉ **somem** dos cards, e cada card exibe uma **lixeira vermelha** 🗑️ no canto superior direito com tooltip **"Excluir"**
- **RF-02.14** O modo de edição é encerrado pelo botão ✓ na barra de ações

#### RF-03 — Alarme
- **RF-03.1** O sistema deve exibir uma lista de cards de alarme configurados
- **RF-03.2** Cada card de alarme deve exibir: horário grande (`hh:mm`), ícone de sino com texto "em X horas, Y minutos", nome do alarme, pílulas dos dias da semana e toggle de ativação
- **RF-03.3** O horário e o nome do alarme devem ser exibidos em **branco e negrito** quando ativo, e em **cinza** quando inativo
- **RF-03.4** Os dias da semana (Dom/Seg/Ter/Qua/Qui/Sex/Sab) devem ser pílulas circulares — **douradas** (`#c9b97a`) nos dias selecionados, **cinza** nos demais
- **RF-03.5** O toggle deve ser **dourado** quando ativado e **cinza** quando desativado
- **RF-03.6** O hover sobre o card deve exibir o tooltip **"Editar alarme"** e tornar o card clicável para edição
- **RF-03.7** O usuário deve poder adicionar um novo alarme pelo botão `+` na barra de ações inferior
- **RF-03.8** O usuário deve poder editar alarmes existentes pelo botão ✏️ na barra de ações inferior
- **RF-03.9** O sistema deve emitir notificação nativa do Windows no horário configurado, apenas nos dias da semana selecionados
- **RF-03.10** O sistema deve exibir um **banner fixo no rodapé** com o texto "Os alarmes soarão apenas quando o seu PC estiver ativo." e o link "Alterar configurações de energia" (abre configurações de energia do Windows)
- **RF-03.11** Os alarmes devem persistir entre sessões do aplicativo via `tauri-plugin-store`

#### RF-04 — Cronômetro
- **RF-04.1** O sistema deve exibir um cronômetro no formato `hh:mm:ss,ms` com rótulos `h`, `min`, `seg` abaixo de cada campo
- **RF-04.2** O sistema deve ter três botões: ▶/⏸ (play/pause em dourado), 🚩 (registrar volta, cinza), ↺ (reset, cinza)
- **RF-04.3** A tabela de voltas deve aparecer abaixo dos botões **somente após a primeira volta ser registrada**, com cabeçalho de três colunas: **Voltas** | **Hora** | **Total**
- **RF-04.4** Cada linha da tabela exibe: número da volta | tempo parcial daquela volta (`hh:mm:ss,ms`) | tempo total acumulado (`hh:mm:ss,ms`)
- **RF-04.5** O sistema deve identificar automaticamente e exibir o label **"Mais rápida"** na volta com menor tempo parcial e **"Mais lento"** na volta com maior tempo parcial (visível a partir de 2 voltas registradas)
- **RF-04.6** O usuário deve poder expandir o cronômetro para modo tela cheia pelo botão ↗ (tooltip **"Expandir"**)
- **RF-04.7** O usuário deve poder fixar a janela em always-on-top pelo botão ⧉ (tooltip **"Manter na parte superior"**)
- **RF-04.8** O cronômetro deve continuar rodando em background enquanto o usuário navega entre abas

#### RF-05 — Navegação e Shell
- **RF-05.1** O sistema deve ter uma barra lateral de navegação com ícones para cada módulo
- **RF-05.2** O módulo ativo deve ser destacado com a barra de acento dourada na lateral
- **RF-05.3** O menu lateral deve poder ser expandido exibindo os nomes dos módulos (ícone hambúrguer)

#### RF-06 — Configurações
- **RF-06.1** A tela de Configurações deve ser acessada pelo ícone de engrenagem (⚙️) fixo no rodapé da sidebar
- **RF-06.2** A seção **Geral** deve conter exatamente três cards: Tema do aplicativo, Notificações e Privacidade
- **RF-06.3** O card "Tema do aplicativo" deve exibir um dropdown/accordion expansível com três opções de rádio: **Claro**, **Escuro** e **Usar as configurações do sistema** (padrão selecionado)
- **RF-06.4** Ao selecionar o tema, a interface deve mudar de aparência imediatamente sem reiniciar o app
- **RF-06.5** O card "Notificações" deve exibir o link/botão "Alterar configurações de notificações", que abre as configurações de notificação do Windows via comando Tauri
- **RF-06.6** O card "Privacidade" deve exibir a descrição "Seus dados são armazenados em seu dispositivo por 90 dias" e o botão **"Limpar histórico"**
- **RF-06.7** O botão "Limpar histórico" deve apagar todos os dados do `store.json` e reiniciar o estado em memória, exibindo confirmação ao usuário
- **RF-06.8** A seção **Sobre** deve exibir o nome "Relógio", a versão atual do app (lida do `Cargo.toml` em tempo de build) e um accordion expansível com links para "Termos de Licença" e "Política de Privacidade"
- **RF-06.9** O rodapé da tela deve conter o link "Enviar comentários" (abre URL externa no browser padrão)
- **RF-06.10** A preferência de tema selecionada deve persistir entre sessões via `tauri-plugin-store`

### 3.2 Requisitos Não Funcionais

| ID | Categoria | Descrição |
|----|-----------|-----------|
| RNF-01 | Desempenho | A interface deve atualizar o cronômetro e timers com precisão de 10ms |
| RNF-02 | Desempenho | O tempo de inicialização do app deve ser inferior a 2 segundos |
| RNF-03 | Usabilidade | O design deve seguir fielmente o tema escuro do Windows 11 com acento `#c9b97a` |
| RNF-04 | Confiabilidade | Alarmes e timers salvos devem sobreviver ao fechamento do app |
| RNF-05 | Portabilidade | O app deve gerar instalador `.exe` para Windows 10/11 x64 |
| RNF-06 | Manutenibilidade | O código frontend deve ser modular, um arquivo JS por módulo |
| RNF-07 | Segurança | O app não deve requerer permissões elevadas (sem UAC) |
| RNF-08 | Acessibilidade | Todos os botões devem ter `aria-label` descritivo |

---

## 4. Casos de Uso

### UC-01 — Adicionar cidade no Relógio Mundial

**Ator:** Usuário  
**Pré-condição:** O usuário está na aba Relógio Mundial  
**Fluxo Principal:**
1. Usuário clica no botão `+` na barra de ações inferior
2. Sistema exibe tooltip "Adicionar nova cidade"
3. Sistema abre modal "Adicionar novo local" com campo de busca e botões "Adicionar" e "Cancelar"
4. Usuário digita o nome da cidade no campo
5. Usuário clica em "Adicionar"
6. Sistema adiciona a cidade à lista com hora atual e pin no mapa
7. Modal é fechado

**Fluxo Alternativo — Cancelar:**
- No passo 5, usuário clica em "Cancelar" → modal fecha sem alterações

**Fluxo de Exceção — Cidade não encontrada:**
- No passo 6, cidade inválida → sistema exibe mensagem de erro inline no campo

---

### UC-02 — Remover cidade no Relógio Mundial

**Ator:** Usuário  
**Pré-condição:** Há pelo menos uma cidade cadastrada além da hora local  
**Fluxo Principal:**
1. Usuário clica no ícone de lápis (✏️) → sistema entra em modo de edição
2. Ícones de lixeira vermelha aparecem ao lado de cada cidade removível
3. Botão "Concluído" aparece na barra de ações
4. Usuário clica na lixeira da cidade desejada
5. Sistema remove a cidade da lista e o pin do mapa com animação de saída
6. Usuário clica em "Concluído" → modo de edição é encerrado

---

### UC-03 — Criar novo temporizador

**Ator:** Usuário  
**Pré-condição:** O usuário está na aba Temporizador  
**Fluxo Principal:**
1. Usuário clica no botão `+` na barra de ações inferior
2. Fundo do app escurece com overlay semitransparente
3. Modal "Adicionar novo temporizador" aparece centralizado com seletor `hh:mm:ss` zerado e nome sugerido automaticamente (ex: "Cronômetro (2)")
4. Usuário ajusta o tempo usando as setas ∧/∨ de cada campo ou clicando no campo e digitando
5. Usuário edita o nome se desejar
6. Usuário clica em "Salvar" → modal fecha, novo card aparece no grid, overlay some
7. Novo timer aparece no grid com o anel cinza e tempo configurado

**Fluxo Alternativo — Cancelar:**
- No passo 6, usuário clica em "Cancelar" → modal fecha sem criar timer

**Fluxo de Exceção — Tempo zerado:**
- Usuário tenta salvar com `00:00:00` → botão "Salvar" permanece desabilitado ou exibe erro inline

---

### UC-04 — Iniciar e pausar Temporizador

**Ator:** Usuário  
**Pré-condição:** Há pelo menos um timer configurado  
**Fluxo Principal:**
1. Usuário clica em ▶ (tooltip "Iniciar") no card do timer
2. Anel SVG começa a diminuir no sentido anti-horário na cor dourada
3. Horário de término é exibido abaixo do tempo
4. Botão muda para ⏸ (tooltip "Pausar")
5. Usuário clica em ⏸ → contagem pausa, anel congela
6. Usuário clica em ▶ novamente → contagem retoma

**Fluxo Alternativo — Timer chega a zero:**
- Sistema emite notificação nativa do Windows
- Anel completa o ciclo e para
- Botão retorna ao estado ▶ (tooltip "Iniciar")

---

### UC-04 — Registrar volta no Cronômetro

**Ator:** Usuário  
**Pré-condição:** Cronômetro está em execução  
**Fluxo Principal:**
1. Usuário clica no botão de bandeira (🚩)
2. Sistema registra o tempo atual como uma volta
3. Volta é adicionada à lista com número sequencial e tempo parcial
4. Cronômetro continua rodando

---

### UC-05 — Adicionar e ativar Alarme

**Ator:** Usuário  
**Pré-condição:** O usuário está na aba Alarme  
**Fluxo Principal:**
1. Usuário clica em `+` para adicionar alarme
2. Sistema exibe formulário com campo de horário e nome
3. Usuário preenche e confirma
4. Alarme aparece na lista com toggle ativado por padrão
5. No horário configurado, sistema dispara notificação nativa

**Fluxo Alternativo — Desativar alarme:**
- Usuário clica no toggle → alarme permanece na lista mas não dispara

---

### UC-06 — Alterar tema do aplicativo

**Ator:** Usuário  
**Pré-condição:** O usuário está na tela de Configurações  
**Fluxo Principal:**
1. Usuário clica no card "Tema do aplicativo" → accordion expande exibindo as três opções
2. Usuário seleciona "Claro" ou "Escuro"
3. A interface muda de aparência imediatamente (troca variáveis CSS globais)
4. Preferência é salva no `store.json`
5. Na próxima abertura do app, o tema salvo é aplicado antes do primeiro render

**Fluxo Alternativo — Usar configuração do sistema:**
- Usuário seleciona "Usar as configurações do sistema"
- App escuta `prefers-color-scheme` via `window.matchMedia` e aplica tema automaticamente

---

### UC-07 — Limpar histórico

**Ator:** Usuário  
**Pré-condição:** O usuário está na tela de Configurações  
**Fluxo Principal:**
1. Usuário clica em "Limpar histórico" no card Privacidade
2. Sistema exibe diálogo de confirmação nativo do Tauri
3. Usuário confirma
4. Sistema apaga o `store.json`, zera o estado em memória e recarrega os módulos
5. App exibe estado vazio (sem cidades, alarmes ou timers salvos)

**Fluxo Alternativo — Cancelar:**
- Usuário cancela no diálogo → nenhum dado é removido

O sistema segue a arquitetura em duas camadas imposta pelo Tauri:

```
┌─────────────────────────────────────────────────────────┐
│                    PROCESSO FRONTEND                     │
│              (WebView — Chromium/WebKit)                 │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ world-   │ │  timer   │ │  alarm   │ │stopwatch │  │
│  │ clock.js │ │   .js    │ │   .js    │ │   .js    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │             │             │             │        │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐  │
│  │              router.js + shell.js                  │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────┘
                        │ invoke() / listen()
                        │ Tauri IPC Bridge
┌───────────────────────┼─────────────────────────────────┐
│                    PROCESSO BACKEND (Rust)               │
│                                                         │
│  ┌─────────────────┐  │  ┌──────────────────────────┐  │
│  │   commands.rs   │◄─┘  │       state.rs            │  │
│  │                 │     │  Mutex<AppState>           │  │
│  │ play_sound()    │     │  - alarmes: Vec<Alarm>     │  │
│  │ send_notif()    │     │  - timers: Vec<Timer>      │  │
│  │ get_timezone()  │     │  - world_clocks: Vec<City> │  │
│  │ save_state()    │     └──────────────┬─────────────┘  │
│  └─────────────────┘                    │                │
│                              ┌──────────▼───────────┐   │
│                              │   store.json (disco)  │   │
│                              └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.1 Comunicação Frontend ↔ Backend

| Direção | Mecanismo | Exemplo |
|---------|-----------|---------|
| JS → Rust | `invoke()` | `invoke('send_notification', { title, body })` |
| Rust → JS | `emit()` / `listen()` | `listen('alarm_fired', callback)` |
| Persistência | `tauri-plugin-store` | JSON automático em `%APPDATA%` |

---

## 6. Estrutura de Diretórios

```
windows-clock-clone/
├── src/                          # Frontend
│   ├── index.html                # Entry point HTML
│   ├── style/
│   │   ├── variables.css         # Variáveis CSS (cores, fontes, espaçamentos)
│   │   ├── shell.css             # Layout base, sidebar, barra de navegação
│   │   ├── world-clock.css       # Estilos do Relógio Mundial
│   │   ├── timer.css             # Estilos do Temporizador + anel SVG
│   │   ├── alarm.css             # Estilos do Alarme
│   │   └── stopwatch.css         # Estilos do Cronômetro
│   ├── js/
│   │   ├── router.js             # Navegação entre abas
│   │   ├── world-clock.js        # Lógica do Relógio Mundial
│   │   ├── timer.js              # Lógica do Temporizador
│   │   ├── alarm.js              # Lógica do Alarme
│   │   ├── stopwatch.js          # Lógica do Cronômetro
│   │   ├── settings.js           # Lógica de Configurações (tema, limpar histórico)
│   │   └── tauri-bridge.js       # Wrapper das chamadas invoke/listen
│   └── assets/
│       ├── world-map.svg         # Mapa mundi SVG em tema escuro
│       └── sounds/
│           ├── alarm.mp3
│           └── timer-end.mp3
│
├── src-tauri/                    # Backend Rust
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Configuração da janela e permissões
│   ├── icons/                    # Ícones do app (.ico, .png)
│   └── src/
│       ├── main.rs               # Entrada Rust, setup do Tauri
│       ├── commands.rs           # Comandos expostos ao frontend
│       ├── state.rs              # AppState compartilhado (Mutex)
│       ├── alarm_scheduler.rs    # Thread de verificação de alarmes
│       └── audio.rs              # Reprodução de sons via rodio
│
├── tests/                        # Testes
│   ├── unit/
│   │   ├── timer.test.js
│   │   ├── stopwatch.test.js
│   │   └── world-clock.test.js
│   └── rust/
│       └── commands_test.rs
│
├── package.json                  # Scripts npm (dev, build)
├── vite.config.js                # Configuração do Vite
└── README.md
```

---

## 7. Modelagem de Dados

### 7.1 Estruturas Rust (`state.rs`)

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct City {
    pub id: String,          // UUID
    pub name: String,        // "Montreal"
    pub timezone: String,    // "America/Toronto"
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Alarm {
    pub id: String,          // UUID
    pub label: String,       // "Bom dia"
    pub time: String,        // "07:00" (HH:MM)
    pub enabled: bool,
    pub days: Vec<u8>,       // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab (vazio = todo dia)
}

// Função auxiliar: tempo até o próximo disparo
// Exibida no card como "em X horas, Y minutos"
fn time_until_alarm(alarm: &Alarm) -> Option<(u64, u64)> {
    // Retorna (horas, minutos) ou None se desativado
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TimerConfig {
    pub id: String,
    pub label: String,       // "Cozinhando ovo"
    pub duration_secs: u64,  // duração total em segundos
}

pub struct AppState {
    pub cities: Mutex<Vec<City>>,
    pub alarms: Mutex<Vec<Alarm>>,
    pub timers: Mutex<Vec<TimerConfig>>,
    pub theme: Mutex<String>,        // "light" | "dark" | "system"
}
```

### 7.2 Persistência

Os dados são salvos via `tauri-plugin-store` em:

```
%APPDATA%\windows-clock-clone\store.json
```

Formato:
```json
{
  "cities": [...],
  "alarms": [...],
  "timers": [...],
  "theme": "system"
}
```

### 7.3 Estado do Frontend (em memória — JavaScript)

```javascript
// timer.js
const timersState = {
  "uuid-1": {
    remaining: 1200,      // segundos restantes
    running: false,
    intervalId: null,
    ringProgress: 1.0     // 0.0 a 1.0 (para o dashoffset do SVG)
  }
}

// stopwatch.js
const stopwatchState = {
  elapsed: 0,             // ms
  running: false,
  laps: [],               // [{lap: 1, time: 15470}]
  intervalId: null
}
```

---

## 8. Especificação dos Módulos

### 8.1 Relógio Mundial

**Componentes visuais:**
- Mapa SVG do mundo em cinza escuro (`#2c2c2a`) com a região iluminada de forma suave no topo
- Pins de localização (ícone de gota/marker) em cinza claro por padrão; dourado (`#c9b97a`) quando selecionado/em foco
- Lista de cards abaixo do mapa, cada um com: ícone dia/noite | hora em negrito | nome da cidade | data e diferença de fuso
- Barra de ações inferior com três botões: Comparar (`⊙`), Editar (`✏️`), Adicionar (`+`)

**Comportamento do Modal "Adicionar novo local":**
- Fundo escurecido (overlay) sobre o app
- Input com borda dourada ao focar
- Botão "Adicionar" com fundo dourado claro e ícone `+`
- Botão "Cancelar" com fundo escuro e ícone `×`

**Lógica de fuso horário:**
```javascript
// Usar Intl.DateTimeFormat para calcular hora por timezone
function getTimeInTimezone(timezone) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
}
```

**Determinação dia/noite:**
```javascript
function isDaytime(timezone) {
  const hour = parseInt(getHourInTimezone(timezone));
  return hour >= 6 && hour < 20;
}
```

---

### 8.2 Temporizador

**Componentes visuais — Card:**
- Grid CSS 2×2 com cards de timer, fundo `#2c2c2a`, `border-radius: 8px`
- Cada card contém (topo → base):
  - **Nome** do timer (ex: "Cozinhando ovo") alinhado à esquerda
  - Dois botões de ação no canto superior direito do card: **↗** ("Expandir") e **⧉** ("Manter na parte superior")
  - **Anel SVG circular** centralizado — cinza escuro no estado parado, dourado (`#c9b97a`, `stroke-linecap: round`) em contagem
  - **Tempo restante** (`hh:mm:ss`) centralizado dentro do anel, em fonte grande
  - **Horário de término** (`🔔 hh:mm`) abaixo do tempo, visível apenas durante a contagem
  - **Botão ▶** (dourado, tooltip "Iniciar") → vira ⏸ (tooltip "Pausar") durante contagem
  - **Botão ↺** (cinza, tooltip "Redefinir")
- Hover no card exibe tooltip **"Editar temporizador"** no canto inferior direito do card
- Barra de ações inferior com botões ✏️ ("Editar temporizadores") e `+` ("Adicionar novo temporizador")

**Componentes visuais — Modal "Adicionar novo temporizador":**
- Overlay escuro semitransparente (`rgba(0,0,0,0.6)`) sobre todo o app
- Modal centralizado com fundo `#2c2c2a`, `border-radius: 8px`, padding generoso
- **Seletor de tempo** `hh : mm : ss`:
  - Três campos numéricos separados por `:`, dentro de um container com borda e fundo levemente diferente
  - Setas **∧** (incrementar) acima e **∨** (decrementar) abaixo de cada campo
  - Campo ativo com borda de acento dourada inferior
- **Campo de nome** com ícone de lápis à esquerda e texto sugerido automaticamente (ex: "Cronômetro (2)")
- **Botão "Salvar"**: fundo dourado claro, ícone 💾, texto "Salvar"
- **Botão "Cancelar"**: fundo escuro, ícone ✕, texto "Cancelar"

**Implementação do anel SVG circular:**
```html
<svg viewBox="0 0 200 200">
  <!-- Trilha de fundo (cinza) -->
  <circle cx="100" cy="100" r="90"
    fill="none" stroke="#3a3a38" stroke-width="8"/>
  <!-- Anel de progresso (dourado, só visível durante contagem) -->
  <circle cx="100" cy="100" r="90"
    fill="none" stroke="#c9b97a" stroke-width="8"
    stroke-dasharray="565.48"
    stroke-dashoffset="0"
    stroke-linecap="round"
    transform="rotate(-90 100 100)"
    id="progress-ring"/>
</svg>
```

**Atualização do anel por frame:**
```javascript
// dashoffset: 0 = anel cheio; 565.48 = anel vazio
const circumference = 2 * Math.PI * 90; // ≈ 565.48

function updateRing(remaining, total) {
  const progress = remaining / total; // 1.0 → 0.0
  ring.style.strokeDashoffset = circumference * (1 - progress);
}
```

**Nomeação automática de timers novos:**
```javascript
function suggestTimerName(existingTimers) {
  const count = existingTimers.length + 1;
  return `Cronômetro (${count})`;
}
```

**Comportamento do campo ativo no seletor `hh:mm:ss`:**
```css
/* O campo selecionado recebe destaque visual */
.time-field.active {
  font-weight: 700;
  font-size: 2.2rem;   /* maior que os campos inativos */
}
.time-field:not(.active) {
  font-weight: 400;
  font-size: 1.8rem;
}
/* Input de nome em foco */
.timer-name-input:focus {
  border-bottom: 2px solid #c9b97a;
  outline: none;
}
```

**Modo de edição do grid (✏️ → ✓):**
```javascript
function enterEditMode() {
  // Troca botões da barra: ✏️ → ✓, mantém +
  editBtn.innerHTML = '✓';
  editBtn.onclick = exitEditMode;

  // Para cada card:
  cards.forEach(card => {
    // Esconde botões ↗ e ⧉
    card.querySelector('.btn-expand').style.display = 'none';
    card.querySelector('.btn-pin').style.display = 'none';
    // Exibe lixeira vermelha
    const trash = card.querySelector('.btn-delete');
    trash.style.display = 'flex';
    trash.setAttribute('title', 'Excluir');
  });
}

function deleteTimer(id) {
  timers = timers.filter(t => t.id !== id);
  renderGrid(); // Grid se reorganiza automaticamente
  saveState();
}
```

**Notificação Tauri ao término:**
```javascript
import { invoke } from '@tauri-apps/api/core';
await invoke('send_notification', {
  title: timerLabel,
  body: 'Seu temporizador terminou!'
});
```

---

### 8.3 Alarme

**Componentes visuais:**
- Lista vertical de cards com cantos arredondados (`8px`) e fundo `#2c2c2a`
- Cada card contém:
  - **Horário** em fonte grande (`~48px`, negrito branco quando ativo, cinza quando inativo)
  - **Ícone 🔔 + texto "em X horas, Y minutos"** abaixo do horário
  - **Nome do alarme** (ex: "Bom dia") em negrito quando ativo, cinza quando inativo
  - **Pílulas de dias** — sete círculos (Dom/Seg/Ter/Qua/Qui/Sex/Sab): fundo dourado + texto escuro nos dias ativos, fundo cinza escuro nos inativos
  - **Toggle switch** no canto superior direito — dourado quando ativo (`#c9b97a`), cinza quando inativo
  - **Tooltip "Editar alarme"** aparece no hover do card inteiro
- Barra de ações inferior com botões ✏️ (editar) e `+` (adicionar)
- **Banner fixo no rodapé** com fundo `#3a3010` e borda amarelada: ícone ⚠️ + texto "Os alarmes soarão apenas quando o seu PC estiver ativo." + link "Alterar configurações de energia"

**Cálculo dinâmico "em X horas, Y minutos":**
```javascript
function timeUntilAlarm(alarmTime) {
  const now = new Date();
  const [h, m] = alarmTime.split(':').map(Number);
  const alarm = new Date();
  alarm.setHours(h, m, 0, 0);
  if (alarm <= now) alarm.setDate(alarm.getDate() + 1);
  const diff = alarm - now;
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `em ${hours} hora${hours !== 1 ? 's' : ''}, ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
}
```

**Abrir configurações de energia do Windows (Rust):**
```rust
#[tauri::command]
fn open_power_settings() {
    std::process::Command::new("powershell")
        .args(["-Command", "Start-Process ms-settings:powersleep"])
        .spawn()
        .ok();
}
```

**Thread de verificação (Rust — `alarm_scheduler.rs`):**
```rust
pub fn start_alarm_scheduler(app_handle: AppHandle, state: Arc<AppState>) {
    std::thread::spawn(move || {
        loop {
            let now = Local::now();
            let current_time = format!("{:02}:{:02}", now.hour(), now.minute());
            let current_day = now.weekday().num_days_from_sunday() as u8; // 0=Dom
            
            let alarms = state.alarms.lock().unwrap();
            for alarm in alarms.iter() {
                let day_matches = alarm.days.is_empty() || alarm.days.contains(&current_day);
                if alarm.enabled && alarm.time == current_time && day_matches {
                    app_handle.emit("alarm_fired", alarm.id.clone()).unwrap();
                }
            }
            drop(alarms);
            
            std::thread::sleep(Duration::from_secs(30));
        }
    });
}
```

---

### 8.4 Cronômetro

**Componentes visuais:**
- Display central `hh:mm:ss,ms` em fonte grande (branco quando em execução, cinza claro quando parado)
- Rótulos `h`, `min`, `seg` abaixo de cada campo em texto secundário
- Dois botões de ação no canto superior direito: **↗** ("Expandir") e **⧉** ("Manter na parte superior")
- Três botões centrais: ▶/⏸ (dourado, play/pause) | 🚩 (cinza, registrar volta) | ↺ (cinza, reset)
- **Tabela de voltas** — aparece somente após a primeira volta, com três colunas:
  - **Voltas**: número + label opcional ("Mais rápida" / "Mais lento")
  - **Hora**: tempo parcial daquela volta no formato `hh:mm:ss,ms`
  - **Total**: tempo acumulado desde o início no formato `hh:mm:ss,ms`
  - Separador horizontal entre cabeçalho e linhas
  - Linhas listadas em ordem decrescente (volta mais recente no topo)

**Lógica de identificação da volta mais rápida e mais lenta:**
```javascript
function updateLapLabels(laps) {
  if (laps.length < 2) return; // Só identifica com 2+ voltas

  const times = laps.map(l => l.partial);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  laps.forEach(lap => {
    if (lap.partial === minTime) lap.label = 'Mais rápida';
    else if (lap.partial === maxTime) lap.label = 'Mais lento';
    else lap.label = '';
  });
}
```

**Estado das voltas:**
```javascript
const stopwatchState = {
  elapsed: 0,          // ms total
  lapStart: 0,         // ms no início da volta atual
  running: false,
  laps: [
    // { number: 1, partial: 37180, total: 37180, label: 'Mais lento' },
    // { number: 2, partial: 8170,  total: 45350, label: 'Mais rápida' },
  ]
}
```

**Always-on-top via Tauri:**
```javascript
import { getCurrentWindow } from '@tauri-apps/api/window';

let isAlwaysOnTop = false;

async function toggleAlwaysOnTop() {
  isAlwaysOnTop = !isAlwaysOnTop;
  await getCurrentWindow().setAlwaysOnTop(isAlwaysOnTop);
  pinBtn.classList.toggle('active', isAlwaysOnTop);
}
```

**Precisão via `requestAnimationFrame`:**
```javascript
let startTime, elapsed = 0, running = false;

function start() {
  startTime = performance.now() - elapsed;
  running = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  if (!running) return;
  elapsed = now - startTime;
  updateDisplay(elapsed);
  requestAnimationFrame(tick);
}
```

---

### 8.5 Configurações

**Componentes visuais:**
- Título "Configurações" em fonte grande (`h1`) no topo da página
- Divisor horizontal abaixo do título
- Seção **Geral** com rótulo de seção e três cards empilhados verticalmente
- Seção **Sobre** com rótulo de seção e um card expansível
- Link "Enviar comentários" no rodapé da página

**Card — Tema do aplicativo:**
- Linha principal: ícone de paleta | título + descrição | valor atual + chevron (▲/▼)
- Accordion: três opções de rádio — Claro | Escuro | Usar as configurações do sistema
- A opção selecionada usa o rádio com acento dourado (`#c9b97a`)

**Card — Notificações:**
- Linha única: ícone de sino | título + descrição | link "Alterar configurações de notificações" em dourado

**Card — Privacidade:**
- Linha: ícone de escudo | título + descrição ("Seus dados são armazenados em seu dispositivo por 90 dias. Selecione Limpar histórico para remover esses dados.") | botão "Limpar histórico"

**Card — Sobre:**
- Linha principal: ícone do app | "Relógio" | versão + chevron
- Accordion: links "Termos de Licença" e "Política de Privacidade" em dourado, um por linha

**Implementação do tema (`settings.js`):**
```javascript
const THEMES = { light: 'light', dark: 'dark', system: 'system' };

function applyTheme(theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Escuta mudanças do sistema quando em modo "system"
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (getCurrentThemeSetting() === 'system') {
    applyTheme('system');
  }
});
```

**Comando Tauri — abrir notificações do Windows:**
```rust
#[tauri::command]
fn open_notification_settings() {
    std::process::Command::new("ms-settings:notifications")
        .spawn()
        .ok();
}
```

**Comando Tauri — abrir link externo:**
```javascript
import { open } from '@tauri-apps/plugin-shell';
await open('https://example.com/terms');
```

**Leitura da versão em tempo de build:**
```rust
// Em main.rs — a versão vem automaticamente do Cargo.toml
const VERSION: &str = env!("CARGO_PKG_VERSION");

#[tauri::command]
fn get_app_version() -> String {
    VERSION.to_string()
}
```

### 9.1 Design System

| Token | Valor |
|-------|-------|
| Fundo principal | `#1c1c1a` |
| Fundo secundário (cards) | `#2c2c2a` |
| Fundo sidebar | `#242422` |
| Cor de acento | `#c9b97a` |
| Texto primário | `#ffffff` |
| Texto secundário | `#a0a09a` |
| Borda | `#3a3a38` |
| Vermelho (lixeira) | `#e24b4a` |
| Fonte | Segoe UI Variable (Windows 11) |
| Border radius (cards) | `8px` |
| Border radius (botões) | `50%` (circulares) |

### 9.2 Animações

| Elemento | Animação | Duração |
|----------|----------|---------|
| Troca de aba | Fade + slide horizontal | 150ms ease |
| Modal abrir (timer/cidade) | Scale 0.95→1 + fade + overlay escurece | 120ms ease-out |
| Modal fechar | Scale 1→0.95 + fade + overlay some | 100ms ease-in |
| Lixeira aparecer (modo edição) | Slide-in da esquerda | 150ms ease |
| Anel do timer | `stroke-dashoffset` contínuo | por frame (rAF) |
| Anel do timer (parar/zerar) | `stroke-dashoffset` → 0 com `transition: 300ms ease` | 300ms |
| Pin do mapa selecionado | Pulse scale 1→1.15→1 | 300ms ease |
| Hover nos botões da barra | Background fade | 100ms |
| Accordion de configurações (tema/sobre) | `max-height` 0→auto + fade | 200ms ease |
| Troca de tema (claro/escuro) | Transição de `background-color` e `color` | 200ms ease |
| Toggle do alarme (ativar/desativar) | Deslize do thumb + fade de cor | 150ms ease |
| Pílulas de dia (selecionar/desselecionar) | Fade de cor de fundo | 100ms ease |
| Botão ⧉ always-on-top (ativo) | Fundo de acento dourado no botão | 100ms ease |
| Tooltip dos botões | Fade-in após 400ms de hover | 400ms delay + 100ms fade |

---

## 10. Plano de Testes

### 10.1 Testes Unitários — JavaScript

| Teste | Arquivo | Descrição |
|-------|---------|-----------|
| `formatTime(0)` | `timer.test.js` | Deve retornar `"00:00:00"` |
| `formatTime(3661000)` | `timer.test.js` | Deve retornar `"01:01:01"` |
| `ringProgress(half)` | `timer.test.js` | dashoffset deve ser `282.74` |
| `suggestTimerName([...2 timers])` | `timer.test.js` | Retorna `"Cronômetro (3)"` |
| `saveBtnDisabled when time=0` | `timer.test.js` | Botão Salvar desabilitado com `00:00:00` |
| `deleteTimer removes from grid` | `timer.test.js` | Array de timers diminui e grid re-renderiza |
| `editMode hides expand/pin buttons` | `timer.test.js` | Botões ↗ e ⧉ ficam `display:none` no modo edição |
| `isDaytime('America/Sao_Paulo')` | `world-clock.test.js` | Retorna bool conforme hora atual |
| `getTimeDiff(timezone)` | `world-clock.test.js` | Diferença correta em horas |
| `lap recording` | `stopwatch.test.js` | Array de laps cresce corretamente |
| `reset clears laps` | `stopwatch.test.js` | Reset zera elapsed e laps |
| `updateLapLabels - fastest/slowest` | `stopwatch.test.js` | Label "Mais rápida" na menor, "Mais lento" na maior |
| `updateLapLabels - single lap` | `stopwatch.test.js` | Com 1 volta, nenhuma label é atribuída |
| `lap table hidden on zero laps` | `stopwatch.test.js` | Tabela não renderiza sem voltas |
| `timeUntilAlarm('07:00')` | `alarm.test.js` | Retorna string "em X horas, Y minutos" correta |
| `alarm day filter` | `alarm.test.js` | Alarme não dispara em dia não selecionado |
| `applyTheme('dark')` | `settings.test.js` | `data-theme="dark"` aplicado ao `documentElement` |
| `applyTheme('system')` | `settings.test.js` | Tema segue `prefers-color-scheme` do sistema |

### 10.2 Testes Unitários — Rust

| Teste | Arquivo | Descrição |
|-------|---------|-----------|
| `alarm_fires_at_correct_time` | `commands_test.rs` | Verifica comparação de string de hora |
| `state_serialization` | `commands_test.rs` | AppState serializa/deserializa sem perda |
| `add_city_returns_ok` | `commands_test.rs` | Comando add_city retorna Ok |

### 10.3 Testes de Integração

| Cenário | Resultado esperado |
|---------|-------------------|
| Adicionar cidade → reiniciar app | Cidade persiste na lista |
| Criar alarme → aguardar horário | Notificação nativa disparada |
| Timer chega a zero | Notificação + anel para |
| Modo expandido do timer | Anel maior, mesmos controles funcionais |
| Selecionar tema "Escuro" → reiniciar app | Tema escuro aplicado imediatamente na abertura |
| Selecionar tema "Claro" | Interface inteira muda para paleta clara sem recarregar |
| Clicar "Limpar histórico" → confirmar | store.json zerado, todos os módulos voltam ao estado vazio |
| Clicar "Alterar configurações de notificações" | Abre página de Notificações do Windows Settings |

### 10.4 Testes de UI (manual)

- [ ] Hover nos 3 botões da barra exibe tooltip correto
- [ ] Modal abre e fecha com animação
- [ ] Modo edição exibe lixeiras vermelhas e botão "Concluído"
- [ ] Pin dourado no mapa ao selecionar cidade
- [ ] Cronômetro continua ao trocar de aba

---

## 11. Cronograma

| Sprint | Semanas | Entregas |
|--------|---------|----------|
| **Sprint 0** — Setup | 1 | Repositório, Tauri init, Vite config, CSS variables, sidebar |
| **Sprint 1** — Shell | 1 | Navegação entre abas, layout base, animação de transição |
| **Sprint 2** — Cronômetro | 1 | Lógica completa, laps, modo expandido |
| **Sprint 3** — Temporizador | 2 | Anel SVG, múltiplos timers, notificação Rust |
| **Sprint 4** — Alarme | 1 | Lista, toggle, scheduler Rust, notificação |
| **Sprint 5** — Relógio Mundial | 2 | Mapa SVG, pins, fusos, modal, modo edição |
| **Sprint 6** — Polimento | 1 | Animações, testes, ajustes de pixel |
| **Sprint 7** — Build | 1 | Instalador `.exe`, ícones, README |
| **Total** | **~10 semanas** | |

---

## 12. Dependências e Ferramentas

### 12.1 Rust (`Cargo.toml`)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-notification = "2"
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rodio = "0.19"             # Reprodução de áudio
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
```

### 12.2 Frontend (`package.json`)

```json
{
  "devDependencies": {
    "vite": "^5.0.0",
    "@tauri-apps/cli": "^2.0.0",
    "vitest": "^1.0.0"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  }
}
```

### 12.3 Ferramentas de Desenvolvimento

| Ferramenta | Uso |
|-----------|-----|
| VS Code | IDE principal |
| rust-analyzer | LSP para Rust |
| Tauri DevTools | Inspetor de IPC e estado |
| Vitest | Testes unitários JavaScript |
| cargo test | Testes unitários Rust |
| Git + GitHub | Controle de versão |

---

## 13. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| API de fusos horários inconsistente entre cidades | Média | Alto | Usar banco IANA via `chrono-tz` crate + fallback para `Intl` |
| Alarme não dispara quando PC está em sleep | Alta | Médio | Exibir aviso igual ao app original ("timers soarão somente quando PC estiver ativo") |
| Mapa SVG muito pesado | Baixa | Médio | Usar versão simplificada do Natural Earth com compressão |
| Notificação nativa não funciona sem permissão | Baixa | Alto | Solicitar permissão no onboarding via `tauri-plugin-notification` |
| Diferença visual entre WebView e Windows nativo | Média | Baixo | Testar no Windows 11 real desde o Sprint 1 |

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| **Tauri** | Framework Rust para criar aplicativos desktop usando tecnologias web |
| **IPC** | Inter-Process Communication — comunicação entre o processo Rust e o WebView |
| **invoke()** | Função Tauri que chama um comando Rust a partir do JavaScript |
| **dashoffset** | Propriedade SVG usada para animar o progresso do anel circular |
| **rAF** | `requestAnimationFrame` — loop de animação de alta precisão do browser |
| **IANA Timezone** | Identificadores de fuso horário padrão (ex: `"America/Sao_Paulo"`) |
| **AppState** | Estrutura Rust compartilhada entre threads via `Mutex`, contém todos os dados persistentes |
| **Plugin Store** | Plugin Tauri que persiste dados em JSON no disco automaticamente |
