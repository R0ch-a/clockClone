mod state;
mod commands;
mod alarm_scheduler;
mod audio;
use std::sync::Arc;

fn main() {
    let app_state = Arc::new(state::AppState::new());
    let state_clone = Arc::clone(&app_state);

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(move |app| {
            alarm_scheduler::iniciar_scheduler(
                app.handle().clone(),
                Arc::clone(&state_clone),
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::send_notification,
            commands::open_power_settings,
            commands::open_notification_settings,
            commands::get_app_version,
            commands::clear_history,
            // Novos:
            commands::carregar_dados,
            commands::salvar_alarmes,
            commands::salvar_timers,
            commands::salvar_cidades,
            commands::salvar_tema,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o clockClone");
}