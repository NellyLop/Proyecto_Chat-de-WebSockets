/**
 * Valida un nickname de acuerdo con las reglas del proyecto.
 * @param {string} value Nickname original.
 * @returns {{valid:boolean,nickname:string,error:string}} Resultado de validación.
 */
export function validateNickname(value) {
    const nickname = String(value || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 20);

    if (!nickname) {
        return { valid: false, nickname: '', error: 'El nickname no puede estar vacío.' };
    }

    return { valid: true, nickname, error: '' };
}
