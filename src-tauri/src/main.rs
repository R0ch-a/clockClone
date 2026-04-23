mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::send_notification,
            commands::open_power_settings,
            commands::open_notification_settings,
            commands::get_app_version,
            commands::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o clockClone");
}