/**
 * @module notify
 * @description REQ-D-08 — Sonido de notificación al recibir mensaje.
 * Genera un tono breve (~0.3s) usando Web Audio API.
 * No requiere ningún archivo .mp3 externo.
 *
 * Uso:
 *   import { playNotify, initNotify } from './sounds/notify.js';
 *
 *   // Llamar initNotify() una sola vez tras un gesto del usuario
 *   // (por ejemplo, en el clic del botón "Entrar al Chat").
 *   initNotify();
 *
 *   // Llamar playNotify() cada vez que se recibe un mensaje ajeno.
 *   playNotify();
 */

/** @type {AudioContext|null} Contexto de audio compartido. */
let audioCtx = null;

/**
 * Inicializa el AudioContext.
 * Debe llamarse dentro de un manejador de evento de usuario para cumplir
 * con la política de autoplay de los navegadores modernos.
 * Es seguro llamarla varias veces: solo crea el contexto una vez.
 * @returns {void}
 */
export function initNotify() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

/**
 * Reproduce un tono de notificación breve (~0.3 s).
 * Si el contexto aún no está listo, lo crea en ese momento.
 * @returns {void}
 */
export function playNotify() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Reanudar si el navegador suspendió el contexto automáticamente.
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // ── Oscilador principal (tono dulce de notificación) ──────────────
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);           // La5 → primer golpe
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12); // sube suave

    // ── Envolvente de amplitud ────────────────────────────────────────
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);   // attack
    gain.gain.setValueAtTime(0.18, now + 0.18);            // sustain breve
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30); // decay/release

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.31);
}
