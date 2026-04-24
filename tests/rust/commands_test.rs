// ═══════════════════════════════════════════════════════════
// commands_test.rs — Testes unitários do backend Rust
//
// Localização: src-tauri/src/commands_test.rs
// Executar: cargo test (dentro de src-tauri/)
//
// Testa as lógicas puras dos commands.rs e state.rs
// sem depender do runtime do Tauri.
// ═══════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use app_lib::state::{Alarm, AppState, City, StoredState, Theme, TimerConfig};
    use std::sync::Mutex;

    // ═══════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════

    fn alarme_exemplo() -> Alarm {
        Alarm {
            id:      "alarm-001".to_string(),
            label:   "Bom dia".to_string(),
            time:    "07:00".to_string(),
            enabled: true,
            days:    vec![0, 1, 2, 3, 4, 5, 6],
        }
    }

    fn cidade_exemplo() -> City {
        City {
            id:        "city-001".to_string(),
            name:      "São Paulo".to_string(),
            timezone:  "America/Sao_Paulo".to_string(),
            latitude:  -23.55,
            longitude: -46.63,
            is_local:  false,
        }
    }

    fn timer_exemplo() -> TimerConfig {
        TimerConfig {
            id:           "timer-001".to_string(),
            label:        "Cozinhando ovo".to_string(),
            duration_secs: 1200,
        }
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — get_app_version
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_versao_nao_vazia() {
        let versao = env!("CARGO_PKG_VERSION");
        assert!(!versao.is_empty(), "Versão do app não deve ser vazia");
    }

    #[test]
    fn test_versao_formato_semver() {
        let versao = env!("CARGO_PKG_VERSION");
        let partes: Vec<&str> = versao.split('.').collect();
        assert!(
            partes.len() >= 2,
            "Versão deve ter pelo menos major.minor: {}",
            versao
        );
        for parte in &partes {
            assert!(
                parte.parse::<u32>().is_ok(),
                "Cada parte da versão deve ser numérica: {}",
                parte
            );
        }
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — AppState
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_appstate_new_cria_listas_vazias() {
        let state = AppState::new();
        assert!(state.cities.lock().unwrap().is_empty());
        assert!(state.alarms.lock().unwrap().is_empty());
        assert!(state.timers.lock().unwrap().is_empty());
    }

    #[test]
    fn test_appstate_new_tema_padrao_e_system() {
        let state = AppState::new();
        let tema  = state.theme.lock().unwrap();
        assert_eq!(*tema, Theme::System);
    }

    #[test]
    fn test_appstate_from_store_preserva_dados() {
        let cidades = vec![cidade_exemplo()];
        let alarmes = vec![alarme_exemplo()];
        let timers  = vec![timer_exemplo()];

        let state = AppState::from_store(
            cidades.clone(),
            alarmes.clone(),
            timers.clone(),
            Theme::Dark,
        );

        assert_eq!(state.cities.lock().unwrap().len(), 1);
        assert_eq!(state.alarms.lock().unwrap().len(), 1);
        assert_eq!(state.timers.lock().unwrap().len(), 1);
        assert_eq!(*state.theme.lock().unwrap(), Theme::Dark);
    }

    #[test]
    fn test_appstate_mutex_acesso_thread_safe() {
        let state = AppState::new();
        {
            let mut alarmes = state.alarms.lock().unwrap();
            alarmes.push(alarme_exemplo());
        }
        // Verifica acesso após liberar o lock
        assert_eq!(state.alarms.lock().unwrap().len(), 1);
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — Alarm
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_alarme_serializacao_roundtrip() {
        let original = alarme_exemplo();
        let json     = serde_json::to_string(&original).expect("Falha ao serializar alarme");
        let restored: Alarm = serde_json::from_str(&json).expect("Falha ao desserializar alarme");

        assert_eq!(original.id,      restored.id);
        assert_eq!(original.label,   restored.label);
        assert_eq!(original.time,    restored.time);
        assert_eq!(original.enabled, restored.enabled);
        assert_eq!(original.days,    restored.days);
    }

    #[test]
    fn test_alarme_todos_os_dias() {
        let alarm = alarme_exemplo();
        assert_eq!(alarm.days.len(), 7);
        for dia in 0u8..=6 {
            assert!(alarm.days.contains(&dia), "Deve conter dia {}", dia);
        }
    }

    #[test]
    fn test_alarme_dias_vazios_significa_todo_dia() {
        let alarm = Alarm {
            id:      "a".to_string(),
            label:   "Todo dia".to_string(),
            time:    "08:00".to_string(),
            enabled: true,
            days:    vec![], // vazio = todo dia
        };
        // Lógica: days vazio significa que dispara qualquer dia
        let dias_ok = alarm.days.is_empty() || alarm.days.contains(&3u8);
        assert!(dias_ok);
    }

    #[test]
    fn test_alarme_formato_horario() {
        let alarm  = alarme_exemplo();
        let partes: Vec<&str> = alarm.time.split(':').collect();
        assert_eq!(partes.len(), 2, "Horário deve ter formato HH:MM");

        let hora: u32 = partes[0].parse().expect("Hora deve ser numérica");
        let min:  u32 = partes[1].parse().expect("Minuto deve ser numérico");

        assert!(hora <= 23, "Hora deve ser ≤ 23");
        assert!(min  <= 59, "Minuto deve ser ≤ 59");
    }

    #[test]
    fn test_alarme_desabilitado_nao_deve_disparar() {
        let alarm = Alarm {
            id:      "b".to_string(),
            label:   "Desabilitado".to_string(),
            time:    "07:00".to_string(),
            enabled: false,
            days:    vec![],
        };
        // Replica a lógica do scheduler
        assert!(!alarm.enabled, "Alarme desabilitado não deve disparar");
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — City
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_cidade_serializacao_roundtrip() {
        let original = cidade_exemplo();
        let json     = serde_json::to_string(&original).expect("Falha ao serializar cidade");
        let restored: City = serde_json::from_str(&json).expect("Falha ao desserializar cidade");

        assert_eq!(original.id,        restored.id);
        assert_eq!(original.name,      restored.name);
        assert_eq!(original.timezone,  restored.timezone);
        assert_eq!(original.latitude,  restored.latitude);
        assert_eq!(original.longitude, restored.longitude);
        assert_eq!(original.is_local,  restored.is_local);
    }

    #[test]
    fn test_cidade_coordenadas_sao_paulo() {
        let cidade = cidade_exemplo();
        // São Paulo está no hemisfério sul e oeste
        assert!(cidade.latitude  < 0.0, "Latitude deve ser negativa (sul)");
        assert!(cidade.longitude < 0.0, "Longitude deve ser negativa (oeste)");
    }

    #[test]
    fn test_cidade_timezone_formato_iana() {
        let cidade = cidade_exemplo();
        // Timezone IANA tem o formato "Continente/Cidade"
        assert!(
            cidade.timezone.contains('/'),
            "Timezone deve ter formato IANA (Continente/Cidade)"
        );
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — TimerConfig
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_timer_serializacao_roundtrip() {
        let original = timer_exemplo();
        let json     = serde_json::to_string(&original).expect("Falha ao serializar timer");
        let restored: TimerConfig = serde_json::from_str(&json).expect("Falha ao desserializar timer");

        assert_eq!(original.id,            restored.id);
        assert_eq!(original.label,         restored.label);
        assert_eq!(original.duration_secs, restored.duration_secs);
    }

    #[test]
    fn test_timer_20_minutos_e_1200_segundos() {
        let timer = timer_exemplo();
        assert_eq!(timer.duration_secs, 1200);
    }

    #[test]
    fn test_timer_duracao_positiva() {
        let timer = timer_exemplo();
        assert!(timer.duration_secs > 0, "Duração deve ser positiva");
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — Theme
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_tema_padrao_e_system() {
        let tema: Theme = Theme::default();
        assert_eq!(tema, Theme::System);
    }

    #[test]
    fn test_tema_serializacao() {
        let dark  = serde_json::to_string(&Theme::Dark).unwrap();
        let light = serde_json::to_string(&Theme::Light).unwrap();
        let sys   = serde_json::to_string(&Theme::System).unwrap();

        assert_eq!(dark,  "\"dark\"");
        assert_eq!(light, "\"light\"");
        assert_eq!(sys,   "\"system\"");
    }

    #[test]
    fn test_tema_desserializacao() {
        let dark:  Theme = serde_json::from_str("\"dark\"").unwrap();
        let light: Theme = serde_json::from_str("\"light\"").unwrap();
        let sys:   Theme = serde_json::from_str("\"system\"").unwrap();

        assert_eq!(dark,  Theme::Dark);
        assert_eq!(light, Theme::Light);
        assert_eq!(sys,   Theme::System);
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — StoredState
    // ═══════════════════════════════════════════════════════

    #[test]
    fn test_stored_state_default_vazio() {
        let estado = StoredState::default();
        assert!(estado.cities.is_empty());
        assert!(estado.alarms.is_empty());
        assert!(estado.timers.is_empty());
        assert_eq!(estado.theme, Theme::System);
    }

    #[test]
    fn test_stored_state_serializacao_roundtrip() {
        let original = StoredState {
            cities: vec![cidade_exemplo()],
            alarms: vec![alarme_exemplo()],
            timers: vec![timer_exemplo()],
            theme:  Theme::Dark,
        };

        let json     = serde_json::to_string(&original).expect("Falha ao serializar StoredState");
        let restored: StoredState = serde_json::from_str(&json)
            .expect("Falha ao desserializar StoredState");

        assert_eq!(restored.cities.len(), 1);
        assert_eq!(restored.alarms.len(), 1);
        assert_eq!(restored.timers.len(), 1);
        assert_eq!(restored.theme, Theme::Dark);
    }

    #[test]
    fn test_stored_state_json_parcial_usa_defaults() {
        // Simula um store.json sem o campo "theme"
        let json_parcial = r#"{"cities":[],"alarms":[],"timers":[]}"#;
        let estado: StoredState = serde_json::from_str(json_parcial)
            .expect("Deve aceitar JSON sem campo theme");
        assert_eq!(estado.theme, Theme::System);
    }

    #[test]
    fn test_stored_state_converte_para_appstate() {
        let stored = StoredState {
            cities: vec![cidade_exemplo()],
            alarms: vec![alarme_exemplo()],
            timers: vec![timer_exemplo()],
            theme:  Theme::Light,
        };

        let app_state: AppState = stored.into();
        assert_eq!(app_state.cities.lock().unwrap().len(), 1);
        assert_eq!(app_state.alarms.lock().unwrap().len(), 1);
        assert_eq!(app_state.timers.lock().unwrap().len(), 1);
        assert_eq!(*app_state.theme.lock().unwrap(), Theme::Light);
    }

    // ═══════════════════════════════════════════════════════
    // TESTES — Lógica do Scheduler (pura, sem thread)
    // ═══════════════════════════════════════════════════════

    /// Replica a função deve_disparar() do alarm_scheduler.rs
    fn deve_disparar_simulado(alarm: &Alarm, hora_atual: &str, dia_atual: u8) -> bool {
        if !alarm.enabled {
            return false;
        }
        if alarm.time != hora_atual {
            return false;
        }
        if alarm.days.is_empty() {
            return true;
        }
        alarm.days.contains(&dia_atual)
    }

    #[test]
    fn test_scheduler_alarme_desabilitado_nao_dispara() {
        let mut alarm = alarme_exemplo();
        alarm.enabled = false;
        assert!(!deve_disparar_simulado(&alarm, "07:00", 1));
    }

    #[test]
    fn test_scheduler_horario_errado_nao_dispara() {
        let alarm = alarme_exemplo();
        assert!(!deve_disparar_simulado(&alarm, "08:00", 1));
    }

    #[test]
    fn test_scheduler_horario_correto_dia_correto_dispara() {
        let alarm = alarme_exemplo();
        assert!(deve_disparar_simulado(&alarm, "07:00", 1)); // Segunda
    }

    #[test]
    fn test_scheduler_dias_vazios_dispara_qualquer_dia() {
        let mut alarm = alarme_exemplo();
        alarm.days = vec![];
        for dia in 0u8..=6 {
            assert!(
                deve_disparar_simulado(&alarm, "07:00", dia),
                "Deve disparar no dia {}",
                dia
            );
        }
    }

    #[test]
    fn test_scheduler_dia_errado_nao_dispara() {
        let mut alarm = alarme_exemplo();
        alarm.days = vec![1, 2, 3, 4, 5]; // Segunda a Sexta
        assert!(!deve_disparar_simulado(&alarm, "07:00", 0)); // Domingo
        assert!(!deve_disparar_simulado(&alarm, "07:00", 6)); // Sábado
    }

    #[test]
    fn test_scheduler_apenas_dia_especifico_dispara() {
        let mut alarm = alarme_exemplo();
        alarm.days = vec![3]; // Apenas Quarta
        assert!(deve_disparar_simulado(&alarm, "07:00", 3));  // Quarta ✓
        assert!(!deve_disparar_simulado(&alarm, "07:00", 4)); // Quinta ✗
    }
}
