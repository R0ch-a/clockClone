// ═══════════════════════════════════════════════════════════
// audio.rs — Reprodução de sons do app
// ═══════════════════════════════════════════════════════════

#![allow(dead_code)]
use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

static SOM_TIMER: &[u8]  = include_bytes!("../sounds/timer-end.mp3");
static SOM_ALARME: &[u8] = include_bytes!("../sounds/alarm.mp3");

// Flag global para sinalizar parada
static PARAR_SOM: AtomicBool = AtomicBool::new(false);

pub enum TipoSom {
    Timer,
    Alarme,
}

pub fn tocar(tipo: TipoSom) {
    // Reseta a flag antes de tocar
    PARAR_SOM.store(false, Ordering::SeqCst);

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

        // Verifica a cada 100ms se deve parar (máximo 45s)
        let mut elapsed = 0u64;
        while !sink.empty() && elapsed < 45_000 {
            if PARAR_SOM.load(Ordering::SeqCst) {
                sink.stop();
                log::info!("[audio] Som parado manualmente.");
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
            elapsed += 100;
        }

        sink.stop();
        log::info!("[audio] Som reproduzido e parado.");
    });
}

/// Para o som que estiver tocando.
pub fn parar() {
    PARAR_SOM.store(true, Ordering::SeqCst);
}

pub fn tocar_timer() {
    tocar(TipoSom::Timer);
}

pub fn tocar_alarme() {
    tocar(TipoSom::Alarme);
}