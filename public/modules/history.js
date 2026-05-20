const clientHistory = [];
const MAX_CLIENT_HISTORY = 50;

/**
 * Guarda un mensaje en el historial local del cliente.
 * @param {object} message Mensaje a guardar.
 */
export function saveMessage(message) {
    clientHistory.push(message);
    const recentMessages = clientHistory.slice(-MAX_CLIENT_HISTORY);
    clientHistory.length = 0;
    clientHistory.push(...recentMessages);
}

/**
 * Obtiene una copia del historial local del cliente.
 * @returns {Array<object>} Historial reciente.
 */
export function getHistory() {
    return [...clientHistory];
}

/**
 * Renderiza el historial recibido desde el servidor con separador visual.
 * @param {Array<object>} messages Historial enviado por el servidor.
 * @param {(message:object) => void} renderMessage Función para pintar mensajes.
 */
export function renderHistory(messages, renderMessage) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return;
    }

    const separator = document.createElement('div');
    separator.className = 'history-separator';
    separator.textContent = '— Mensajes anteriores —';

    const messagesPanel = document.getElementById('messages');
    messagesPanel.appendChild(separator);

    messages.forEach((message) => {
        saveMessage(message);
        renderMessage({ ...message, historical: true, kind: 'global' });
    });
}
