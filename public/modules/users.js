/**
 * Obtiene iniciales cortas para mostrar un avatar textual.
 * @param {string} nickname Nombre visible del usuario.
 * @returns {string} Iniciales del usuario.
 */
function getInitials(nickname) {
    return String(nickname || 'U')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'U';
}

/**
 * Renderiza la lista de usuarios conectados en tiempo real.
 * @param {object} options Opciones de renderizado.
 * @param {HTMLElement} options.container Contenedor <ul> de usuarios.
 * @param {Array<{id:string,nickname:string}>} options.users Usuarios conectados.
 * @param {string|null} options.selfId ID del usuario actual.
 * @param {string|null} options.selectedUserId ID seleccionado para chat privado.
 * @param {(user:{id:string,nickname:string}) => void} options.onSelect Callback al seleccionar usuario.
 */
export function renderUserList({ container, users, selfId, selectedUserId, onSelect }) {
    container.innerHTML = '';

    if (!users.length) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'system-message';
        emptyItem.textContent = 'No hay usuarios para mostrar.';
        container.appendChild(emptyItem);
        return;
    }

    users.forEach((user) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        const isSelf = user.id === selfId;
        const isActive = user.id === selectedUserId;

        button.type = 'button';
        button.className = [
            'user-item',
            isSelf ? 'user-item-self' : '',
            isActive ? 'user-item-active' : ''
        ].filter(Boolean).join(' ');

        button.disabled = isSelf;
        button.dataset.userId = user.id;

        const avatar = document.createElement('span');
        avatar.className = 'user-avatar-mini';
        avatar.textContent = getInitials(user.nickname);

        const textWrapper = document.createElement('span');
        textWrapper.className = 'user-text';

        const name = document.createElement('strong');
        name.textContent = `${user.nickname}${isSelf ? ' (Tú)' : ''}`;

        const status = document.createElement('small');
        status.textContent = isSelf ? 'Tu sesión activa' : 'En línea · clic para privado';

        textWrapper.append(name, status);
        button.append(avatar, textWrapper);

        if (!isSelf) {
            button.addEventListener('click', () => selectUser(user, onSelect));
        }

        item.appendChild(button);
        container.appendChild(item);
    });
}

/**
 * Ejecuta la selección de un usuario para iniciar chat privado.
 * @param {{id:string,nickname:string}} user Usuario seleccionado.
 * @param {(user:{id:string,nickname:string}) => void} onSelect Callback externo.
 */
export function selectUser(user, onSelect) {
    if (typeof onSelect === 'function') {
        onSelect(user);
    }
}
