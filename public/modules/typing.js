const TYPING_DEBOUNCE_MS = 1500;
let typingTimeout = null;
let currentlyTyping = false;

/**
 * Configura el evento keyup para enviar estado escribiendo con debounce.
 * @param {object} options Opciones del indicador.
 * @param {HTMLInputElement} options.input Campo de texto.
 * @param {(isTyping:boolean) => void} options.sendTyping Función para avisar al servidor.
 */
export function setupTypingEvents({ input, sendTyping }) {
    input.addEventListener('keyup', () => {
        if (!currentlyTyping) {
            currentlyTyping = true;
            sendTyping(true);
        }

        window.clearTimeout(typingTimeout);
        typingTimeout = window.setTimeout(() => {
            currentlyTyping = false;
            sendTyping(false);
        }, TYPING_DEBOUNCE_MS);
    });
}

/**
 * Muestra u oculta el indicador de usuarios escribiendo.
 * @param {HTMLElement} indicator Contenedor del indicador.
 * @param {{fromId?:string,nickname?:string,isTyping?:boolean}} payload Datos recibidos.
 * @param {string|null} selfId ID del usuario actual.
 */
export function handleTypingStatus(indicator, payload, selfId) {
    if (!payload || payload.fromId === selfId) {
        return;
    }

    if (payload.isTyping) {
        indicator.textContent = `📝 ${payload.nickname} está escribiendo...`;
        return;
    }

    clearTypingIndicator(indicator);
}

/**
 * Limpia el indicador visible de escritura.
 * @param {HTMLElement} indicator Contenedor del indicador.
 */
export function clearTypingIndicator(indicator) {
    indicator.textContent = '';
}

/**
 * Detiene el temporizador de escritura y notifica estado inactivo.
 * @param {(isTyping:boolean) => void} sendTyping Función para avisar al servidor.
 */
export function stopTyping(sendTyping) {
    window.clearTimeout(typingTimeout);
    currentlyTyping = false;
    sendTyping(false);
}
