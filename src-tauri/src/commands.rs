// ═══════════════════════════════════════════════════════════
// commands.rs — Comandos Tauri expostos ao frontend
//
// Cada função marcada com #[tauri::command] pode ser
// chamada pelo JavaScript via invoke('nome_do_comando').
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// NOTIFICAÇÕES NATIVAS
// ═══════════════════════════════════════════════════════════

/// Dispara uma notificação nativa do Windows.
/// Chamado pelo JS ao término de um timer ou alarme.
///
/// Exemplo JS:
/// ```js
/// await invoke('send_notification', { title: 'Alarme', body: 'Bom dia!' })
/// ```

use crate::audio;
use crate::state::{AppState, Alarm, City, TimerConfig, StoredState};
use tauri::State;
use tauri_plugin_store::StoreExt;

/// Carrega todos os dados do store.json ao iniciar o app
#[tauri::command]
pub async fn carregar_dados(app: tauri::AppHandle) -> Result<StoredState, String> {
    let store = app.store("store.json")
        .map_err(|e| format!("Erro ao abrir store: {e}"))?;

    let estado = StoredState {
        alarms: store.get("alarms")
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default(),
        timers: store.get("timers")
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default(),
        cities: store.get("cities")
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default(),
        theme: store.get("theme")
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default(),
    };

    Ok(estado)
}

/// Salva todos os alarmes no store.json
#[tauri::command]
pub async fn salvar_alarmes(
    app:   tauri::AppHandle,
    state: State<'_, AppState>,
    alarmes: Vec<Alarm>,
) -> Result<(), String> {
    let store = app.store("store.json")
        .map_err(|e| format!("Erro ao abrir store: {e}"))?;

    store.set("alarms", serde_json::to_value(&alarmes)
        .map_err(|e| format!("Erro ao serializar: {e}"))?);
    store.save().map_err(|e| format!("Erro ao salvar: {e}"))?;

    *state.alarms.lock().unwrap() = alarmes;
    Ok(())
}

/// Salva todos os timers no store.json
#[tauri::command]
pub async fn salvar_timers(
    app:   tauri::AppHandle,
    state: State<'_, AppState>,
    timers: Vec<TimerConfig>,
) -> Result<(), String> {
    let store = app.store("store.json")
        .map_err(|e| format!("Erro ao abrir store: {e}"))?;

    store.set("timers", serde_json::to_value(&timers)
        .map_err(|e| format!("Erro ao serializar: {e}"))?);
    store.save().map_err(|e| format!("Erro ao salvar: {e}"))?;

    *state.timers.lock().unwrap() = timers;
    Ok(())
}

/// Salva todas as cidades no store.json
#[tauri::command]
pub async fn salvar_cidades(
    app:    tauri::AppHandle,
    state:  State<'_, AppState>,
    cities: Vec<City>,
) -> Result<(), String> {
    let store = app.store("store.json")
        .map_err(|e| format!("Erro ao abrir store: {e}"))?;

    store.set("cities", serde_json::to_value(&cities)
        .map_err(|e| format!("Erro ao serializar: {e}"))?);
    store.save().map_err(|e| format!("Erro ao salvar: {e}"))?;

    *state.cities.lock().unwrap() = cities;
    Ok(())
}

/// Salva o tema no store.json
#[tauri::command]
pub async fn salvar_tema(
    app:    tauri::AppHandle,
    _state: State<'_, AppState>,  // ← underscore aqui
    tema:   String,
) -> Result<(), String> {
    let store = app.store("store.json")
        .map_err(|e| format!("Erro ao abrir store: {e}"))?;

    store.set("theme", serde_json::Value::String(tema.clone()));
    store.save().map_err(|e| format!("Erro ao salvar: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn send_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Erro ao enviar notificação: {e}"))?;

    // Toca o som de alarme junto com a notificação
    audio::tocar_alarme();

    Ok(())
}

// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÕES DO WINDOWS
// ═══════════════════════════════════════════════════════════

/// Abre a página de configurações de energia do Windows.
/// Chamado pelo banner da aba Alarme.
///
/// Exemplo JS:
/// ```js
/// await invoke('open_power_settings')
/// ```
#[tauri::command]
pub async fn open_power_settings() -> Result<(), String> {
    std::process::Command::new("powershell")
        .args(["-Command", "Start-Process ms-settings:powersleep"])
        .spawn()
        .map_err(|e| format!("Erro ao abrir configurações de energia: {e}"))?;

    Ok(())
}

/// Abre a página de configurações de notificações do Windows.
/// Chamado pelo card Notificações nas Configurações.
///
/// Exemplo JS:
/// ```js
/// await invoke('open_notification_settings')
/// ```
#[tauri::command]
pub async fn open_notification_settings() -> Result<(), String> {
    std::process::Command::new("powershell")
        .args(["-Command", "Start-Process ms-settings:notifications"])
        .spawn()
        .map_err(|e| format!("Erro ao abrir configurações de notificações: {e}"))?;

    Ok(())
}

// ═══════════════════════════════════════════════════════════
// VERSÃO DO APP
// ═══════════════════════════════════════════════════════════

/// Retorna a versão atual do app lida do Cargo.toml em tempo de build.
/// Exibida na seção Sobre das Configurações.
///
/// Exemplo JS:
/// ```js
/// const versao = await invoke('get_app_version') // "1.0.0"
/// ```
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ═══════════════════════════════════════════════════════════
// HISTÓRICO / DADOS SALVOS
// ═══════════════════════════════════════════════════════════

/// Limpa todos os dados persistidos pelo tauri-plugin-store.
/// Chamado pelo botão "Limpar histórico" nas Configurações.
///
/// Exemplo JS:
/// ```js
/// await invoke('clear_history')
/// ```
#[tauri::command]
pub async fn clear_history(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    // Nome do arquivo de store definido no main.rs
    let store = app
        .store("store.json")
        .map_err(|e| format!("Erro ao acessar store: {e}"))?;

    store.clear();
    store
        .save()
        .map_err(|e| format!("Erro ao salvar store após limpar: {e}"))?;

    Ok(())
}
