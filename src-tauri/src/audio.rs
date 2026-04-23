// ═══════════════════════════════════════════════════════════
// audio.rs — Reprodução de sons do app
//
// Usa a crate `rodio` para tocar arquivos de áudio
// quando um timer termina ou um alarme dispara.
// Os sons ficam em src-tauri/sounds/ e são embutidos
// no binário via include_bytes!() para distribuição.
// ═══════════════════════════════════════════════════════════

#![allow(dead_code)]
use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::time::Duration;

// ═══════════════════════════════════════════════════════════
// SONS EMBUTIDOS NO BINÁRIO
// Os arquivos .mp3 são embutidos em tempo de compilação.
// Coloque os arquivos em src-tauri/sounds/
// ═══════════════════════════════════════════════════════════
static SOM_TIMER: &[u8] = include_bytes!("../sounds/timer-end.mp3");
static SOM_ALARME: &[u8] = include_bytes!("../sounds/alarm.mp3");

// ═══════════════════════════════════════════════════════════
// TIPOS DE SOM
// ═══════════════════════════════════════════════════════════
pub enum TipoSom {
    Timer,
    Alarme,
}

// ═══════════════════════════════════════════════════════════
// REPRODUÇÃO
// ═══════════════════════════════════════════════════════════

/// Toca um som em uma thread separada para não bloquear.
/// O som é tocado uma única vez e a thread encerra ao terminar.
///
/// # Parâmetros
/// - `tipo` — `TipoSom::Timer` ou `TipoSom::Alarme`
///
/// # Exemplo
/// ```rust
/// audio::tocar(audio::TipoSom::Timer);
/// ```
pub fn tocar(tipo: TipoSom) {
    let bytes: &'static [u8] = match tipo {
        TipoSom::Timer  => SOM_TIMER,
        TipoSom::Alarme => SOM_ALARME,
    };

    std::thread::spawn(move || {
        let (_stream, stream_handle) = match OutputStream::try_default() {
            Ok(pair) => pair,
            Err(err) => {
                log::warn!("[audio] Dispositivo de áudio não disponível: {err}");
                return;
            }
        };

        let sink = match Sink::try_new(&stream_handle) {
            Ok(s)    => s,
            Err(err) => {
                log::warn!("[audio] Não foi possível criar sink de áudio: {err}");
                return;
            }
        };

        let cursor = Cursor::new(bytes);
        let source = match Decoder::new(cursor) {
            Ok(s)    => s,
            Err(err) => {
                log::warn!("[audio] Erro ao decodificar áudio: {err}");
                return;
            }
        };

        sink.append(source);

        // Toca por no máximo 5 segundos depois para automaticamente
        std::thread::sleep(Duration::from_secs(45));
        sink.stop();

        log::info!("[audio] Som reproduzido e parado.");
    });
}

/// Toca o som de fim de temporizador.
pub fn tocar_timer() {
    tocar(TipoSom::Timer);
}

/// Toca o som de alarme.
pub fn tocar_alarme() {
    tocar(TipoSom::Alarme);
}
