// ═══════════════════════════════════════════════════════════
// state.rs — Estado compartilhado do app (AppState)
//
// Define as estruturas de dados persistidas e o estado
// global compartilhado entre threads via Mutex.
// ═══════════════════════════════════════════════════════════

#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ═══════════════════════════════════════════════════════════
// MODELOS DE DADOS
// ═══════════════════════════════════════════════════════════

/// Cidade salva no Relógio Mundial.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct City {
    /// Identificador único (UUID gerado no frontend)
    pub id: String,

    /// Nome de exibição (ex: "Montreal")
    pub name: String,

    /// Identificador IANA de fuso horário (ex: "America/Toronto")
    pub timezone: String,

    /// Latitude para posicionamento do pin no mapa
    pub latitude: f64,

    /// Longitude para posicionamento do pin no mapa
    pub longitude: f64,

    /// Indica se é a hora local do usuário (não pode ser removida)
    pub is_local: bool,
}

/// Alarme configurado pelo usuário.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alarm {
    /// Identificador único
    pub id: String,

    /// Nome do alarme (ex: "Bom dia")
    pub label: String,

    /// Horário no formato "HH:MM" (ex: "07:00")
    pub time: String,

    /// Se o alarme está ativo
    pub enabled: bool,

    /// Dias da semana em que dispara.
    /// 0 = Domingo, 1 = Segunda ... 6 = Sábado.
    /// Array vazio = todos os dias.
    pub days: Vec<u8>,
}

/// Configuração de um temporizador.
/// O estado em tempo real (remaining, running) fica no frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerConfig {
    /// Identificador único
    pub id: String,

    /// Nome do timer (ex: "Cozinhando ovo")
    pub label: String,

    /// Duração total em segundos
    pub duration_secs: u64,
}

/// Preferência de tema do app.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl Default for Theme {
    fn default() -> Self {
        Theme::System
    }
}

// ═══════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════

/// Estado compartilhado entre todas as threads do app.
/// Gerenciado pelo Tauri via `.manage()` no main.rs.
/// Cada campo usa `Mutex` para acesso thread-safe.
pub struct AppState {
    /// Lista de cidades do Relógio Mundial
    pub cities: Mutex<Vec<City>>,

    /// Lista de alarmes configurados
    pub alarms: Mutex<Vec<Alarm>>,

    /// Lista de configurações de timers
    pub timers: Mutex<Vec<TimerConfig>>,

    /// Preferência de tema (light / dark / system)
    pub theme: Mutex<Theme>,
}

impl AppState {
    /// Cria um AppState vazio com valores padrão.
    pub fn new() -> Self {
        AppState {
            cities: Mutex::new(Vec::new()),
            alarms: Mutex::new(Vec::new()),
            timers: Mutex::new(Vec::new()),
            theme:  Mutex::new(Theme::default()),
        }
    }

    /// Cria um AppState a partir de dados carregados do store.json.
    pub fn from_store(
        cities: Vec<City>,
        alarms: Vec<Alarm>,
        timers: Vec<TimerConfig>,
        theme:  Theme,
    ) -> Self {
        AppState {
            cities: Mutex::new(cities),
            alarms: Mutex::new(alarms),
            timers: Mutex::new(timers),
            theme:  Mutex::new(theme),
        }
    }
}

// ═══════════════════════════════════════════════════════════
// ESTRUTURA DE PERSISTÊNCIA
// Serializada para / desserializada do store.json
// ═══════════════════════════════════════════════════════════

/// Snapshot completo do estado para salvar em disco.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredState {
    #[serde(default)]
    pub cities: Vec<City>,

    #[serde(default)]
    pub alarms: Vec<Alarm>,

    #[serde(default)]
    pub timers: Vec<TimerConfig>,

    #[serde(default)]
    pub theme: Theme,
}

impl Default for StoredState {
    fn default() -> Self {
        StoredState {
            cities: Vec::new(),
            alarms: Vec::new(),
            timers: Vec::new(),
            theme:  Theme::default(),
        }
    }
}

impl From<StoredState> for AppState {
    fn from(stored: StoredState) -> Self {
        AppState::from_store(
            stored.cities,
            stored.alarms,
            stored.timers,
            stored.theme,
        )
    }
}
