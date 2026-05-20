/**
 * Crea el objeto JSON para enviar un mensaje global.
 * @param {string} text Texto del mensaje.
 * @returns {{type:string,payload:{text:string},timestamp:string}} Mensaje listo para WebSocket.
 */
export function createGlobalMessage(text) {
    return {
        type: 'message',
        payload: { text },
        timestamp: new Date().toISOString()
    };
}
