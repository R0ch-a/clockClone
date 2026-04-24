# 🕐 clockClone

Clone do app **Relógio do Windows 11** desenvolvido com **Rust + Tauri** e **HTML + CSS + JavaScript**.

![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?style=flat&logo=windows)
![Rust](https://img.shields.io/badge/Rust-1.77%2B-orange?style=flat&logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8D8?style=flat&logo=tauri)
![License](https://img.shields.io/badge/license-MIT-green?style=flat)

---

## 📸 Módulos

| Módulo | Descrição |
|--------|-----------|
| ⏱️ **Temporizador** | Múltiplos timers simultâneos com anel SVG animado |
| ⏰ **Alarme** | Alarmes com dias da semana, som e soneca |
| ⏲️ **Cronômetro** | Contador com voltas e identificação de mais rápida/lenta |
| 🌍 **Relógio Mundial** | Mapa interativo com cidades e fusos horários |
| ⚙️ **Configurações** | Tema claro/escuro/sistema, notificações e privacidade |

---

## 🚀 Como rodar

### Pré-requisitos

- **Windows 10/11**
- **Rust** — instale em [rustup.rs](https://rustup.rs)
- **Node.js** 18+ — instale em [nodejs.org](https://nodejs.org)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/R0ch-a/clockClone.git
cd clockClone

# Instale as dependências JavaScript
npm install
```

### Desenvolvimento

Abra **dois terminais** na pasta do projeto:

```bash
# Terminal 1 — servidor Vite
npm run dev

# Terminal 2 — app Tauri
cargo tauri dev
```

### Build

```bash
cargo tauri build
```

O instalador `.exe` será gerado em:
```
src-tauri/target/release/bundle/
```

---

## 🧪 Testes

### JavaScript (Vitest)

```bash
npm test
```

### Rust (cargo test)

```bash
cd src-tauri
cargo test
```

---

## 🗂️ Estrutura do projeto

```
clockClone/
├── src/                    # Frontend
│   ├── index.html          # Estrutura completa do app
│   ├── style/              # CSS por módulo
│   └── js/                 # Lógica por módulo
├── src-tauri/              # Backend Rust
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs     # Comandos Tauri (invoke)
│   │   ├── state.rs        # Modelos de dados
│   │   ├── alarm_scheduler.rs
│   │   └── audio.rs
│   └── sounds/             # Sons .mp3 embutidos
├── tests/
│   ├── unit/               # Testes JavaScript
│   └── rust/               # Testes Rust
└── docs/                   # Documentação
```

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES Modules) |
| Bundler | Vite |
| Backend | Rust + Tauri 2.x |
| Áudio | rodio |
| Mapa | world-atlas + topojson-client |
| Testes JS | Vitest |
| Testes Rust | cargo test |

---

## 📄 Documentação

A documentação completa do projeto está na pasta [`docs/`](./docs/):

- [`plano-projeto-relogio-win11.md`](./docs/plano-projeto-relogio-win11.md) — Plano de projeto com requisitos, casos de uso e arquitetura
- [`documentacao-tecnica.md`](./docs/documentacao-tecnica.md) — Documentação técnica de implementação

---

## 👤 Autor

**Rafael Rocha**  
GitHub: [@R0ch-a](https://github.com/R0ch-a)

---

## 📝 Licença

Este projeto é um clone desenvolvido para fins educacionais.  
O design original pertence à **Microsoft Corporation**.
