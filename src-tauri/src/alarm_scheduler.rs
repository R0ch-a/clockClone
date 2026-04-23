// ═══════════════════════════════════════════════════════════
// alarm_scheduler.rs — Thread de verificação de alarmes
//
// Roda em background e verifica a cada 30 segundos se
// algum alarme deve disparar, emitindo um evento Tauri
// que o frontend escuta via tauri-bridge.js.
// ═══════════════════════════════════════════════════════════

use crate::state::{AppState, Alarm};
use chrono::{Datelike, Local, Timelike};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// ═══════════════════════════════════════════════════════════
// PAYLOAD DO EVENTO
// ═══════════════════════════════════════════════════════════

/// Dados enviados ao frontend quando um alarme dispara.
#[derive(Debug, Clone, serde::Serialize)]
pub struct AlarmFiredPayload {
    /// ID do alarme que disparou
    pub id: String,

    /// Label para exibir na notificação
    pub label: String,

    /// Horário configurado (ex: "07:00")
    pub time: String,
}

// ═══════════════════════════════════════════════════════════
// LÓGICA DE VERIFICAÇÃO
// ═══════════════════════════════════════════════════════════

/// Verifica se um alarme deve disparar agora.
/// Compara hora atual com o horário do alarme e o dia da semana.
fn deve_disparar(alarm: &Alarm) -> bool {
    if !alarm.enabled {
        return false;
    }

    let agora        = Local::now();
    let hora_atual   = format!("{:02}:{:02}", agora.hour(), agora.minute());
    let dia_atual    = agora.weekday().num_days_from_sunday() as u8; // 0=Dom

    if alarm.time != hora_atual {
        return false;
    }

    // Array vazio = todos os dias
    if alarm.days.is_empty() {
        return true;
    }

    alarm.days.contains(&dia_atual)
}

// ═══════════════════════════════════════════════════════════
// THREAD PRINCIPAL DO SCHEDULER
// ═══════════════════════════════════════════════════════════

/// Inicia a thread de verificação de alarmes em background.
/// Deve ser chamada uma única vez no `main.rs` após o setup do Tauri.
///
/// # Parâmetros
/// - `app_handle` — Handle do Tauri para emitir eventos ao frontend
/// - `state`      — Estado compartilhado com a lista de alarmes
pub fn iniciar_scheduler(app_handle: AppHandle, state: Arc<AppState>) {
    std::thread::spawn(move || {
        log::info!("[scheduler] Thread de alarmes iniciada.");

        // Conjunto de alarmes que já dispararam neste minuto.
        // Evita disparar o mesmo alarme múltiplas vezes no mesmo minuto
        // caso o thread acorde mais de uma vez dentro do mesmo intervalo.
        let mut disparados: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut ultimo_minuto = String::new();

        loop {
            let agora         = Local::now();
            let minuto_atual  = format!("{:02}:{:02}", agora.hour(), agora.minute());

            // Limpa os alarmes disparados quando o minuto muda
            if minuto_atual != ultimo_minuto {
                disparados.clear();
                ultimo_minuto = minuto_atual.clone();
            }

            // Lê a lista de alarmes com lock
            let alarmes = match state.alarms.lock() {
                Ok(guard) => guard.clone(),
                Err(err)  => {
                    log::error!("[scheduler] Erro ao obter lock dos alarmes: {err}");
                    std::thread::sleep(Duration::from_secs(30));
                    continue;
                }
            };

            // Verifica cada alarme
            for alarm in &alarmes {
                // Pula se já disparou neste minuto
                if disparados.contains(&alarm.id) {
                    continue;
                }

                if deve_disparar(alarm) {
                    log::info!(
                        "[scheduler] Disparando alarme '{}' ({})",
                        alarm.label,
                        alarm.time
                    );

                    let payload = AlarmFiredPayload {
                        id:    alarm.id.clone(),
                        label: alarm.label.clone(),
                        time:  alarm.time.clone(),
                    };

                    // Emite evento para o frontend
                    if let Err(err) = app_handle.emit("alarm_fired", &payload) {
                        log::error!("[scheduler] Erro ao emitir evento: {err}");
                    }

                    // Marca como disparado neste minuto
                    disparados.insert(alarm.id.clone());
                }
            }

            // Aguarda 30 segundos antes da próxima verificação
            std::thread::sleep(Duration::from_secs(30));
        }
    });
}
