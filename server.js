const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_HISTORY = 50;
const MAX_NICKNAME_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 300;

const users = new Map();
let history = [];
const groups = new Map();

const server = http.createServer(handleHttpRequest);
const wss = new WebSocket.Server({ server });

/**
 * Atiende peticiones HTTP y sirve archivos estáticos desde public/.
 * @param {http.IncomingMessage} req Petición del navegador.
 * @param {http.ServerResponse} res Respuesta HTTP.
 */
function handleHttpRequest(req, res) {
    const requestedPath = req.url === '/' ? '/index.html' : req.url;
    const safePath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Acceso denegado');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('Archivo no encontrado');
            return;
        }

        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        res.end(content, 'utf-8');
    });
}

/**
 * Devuelve el tipo MIME de acuerdo con la extensión del archivo.
 * @param {string} filePath Ruta del archivo.
 * @returns {string} Tipo de contenido HTTP.
 */
function getContentType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.mp3': 'audio/mpeg'
    };

    return types[extension] || 'application/octet-stream';
}

/**
 * Registra eventos con timestamp legible.
 * @param {string} event Texto del evento.
 */
function logEvent(event) {
    const time = new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date());
    console.log(`[${time}] ${event}`);
}

/**
 * Elimina etiquetas HTML y recorta un valor de texto.
 * @param {string} value Texto original.
 * @param {number} maxLength Longitud máxima.
 * @returns {string} Texto sanitizado.
 */
function sanitizeText(value, maxLength) {
    return String(value || '')
        .replace(/<[^>]*>?/gm, '')
        .trim()
        .slice(0, maxLength);
}

/**
 * Envía datos JSON a un socket si se encuentra abierto.
 * @param {WebSocket} ws Cliente WebSocket.
 * @param {object} data Mensaje a enviar.
 */
function sendJson(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

/**
 * Envía un mensaje a todos los clientes conectados.
 * @param {object} data Mensaje JSON.
 * @param {WebSocket|null} excludeWs Cliente a excluir opcionalmente.
 */
function broadcast(data, excludeWs = null) {
    wss.clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

/**
 * Obtiene la lista pública de usuarios conectados.
 * @returns {Array<{id:string,nickname:string}>} Usuarios activos.
 */
function getUserList() {
    return Array.from(users.values())
        .filter((user) => Boolean(user.nickname))
        .map((user) => ({ id: user.id, nickname: user.nickname }));
}


/**
 * Obtiene datos públicos de un usuario por ID.
 * @param {string} userId ID público del usuario.
 * @returns {{id:string,nickname:string}|null} Usuario encontrado.
 */
function getUserById(userId) {
    return getUserList().find((user) => user.id === userId) || null;
}

/**
 * Devuelve los grupos a los que pertenece un usuario.
 * @param {string} userId ID público del usuario.
 * @returns {Array<object>} Lista de grupos visibles para el usuario.
 */
function getGroupsForUser(userId) {
    return Array.from(groups.values())
        .filter((group) => group.memberIds.has(userId))
        .map((group) => ({
            id: group.id,
            name: group.name,
            members: Array.from(group.memberIds).map(getUserById).filter(Boolean),
            history: group.history
        }));
}

/**
 * Envía la lista de grupos actualizada a todos los miembros conectados.
 */
function broadcastGroupLists() {
    users.forEach((user, client) => {
        if (!user.nickname) {
            return;
        }

        sendJson(client, {
            type: 'group_list',
            payload: { groups: getGroupsForUser(user.id) },
            timestamp: new Date().toISOString()
        });
    });
}

/**
 * Emite la lista actualizada de usuarios a todos los clientes.
 */
function broadcastUserList() {
    broadcast({
        type: 'user_list',
        payload: { users: getUserList() },
        timestamp: new Date().toISOString()
    });
}

/**
 * Guarda un mensaje global en RAM, limitando a los últimos 50.
 * @param {object} message Mensaje global.
 */
function saveHistory(message) {
    history.push(message);
    history = history.slice(-MAX_HISTORY);
}

/**
 * Busca un WebSocket por el ID público asignado al usuario.
 * @param {string} targetId ID destinatario.
 * @returns {WebSocket|null} Socket encontrado o null.
 */
function findClientByUserId(targetId) {
    for (const [client, user] of users.entries()) {
        if (user.id === targetId) {
            return client;
        }
    }

    return null;
}

/**
 * Procesa el registro inicial del usuario.
 * @param {WebSocket} ws Cliente conectado.
 * @param {{nickname:string}} payload Datos del usuario.
 */
function handleJoin(ws, payload) {
    const nickname = sanitizeText(payload.nickname, MAX_NICKNAME_LENGTH);

    if (!nickname) {
        sendJson(ws, { type: 'error', payload: { text: 'Nickname inválido.' }, timestamp: new Date().toISOString() });
        return;
    }

    const user = users.get(ws);
    user.nickname = nickname;

    sendJson(ws, {
        type: 'join_success',
        payload: { id: user.id, nickname },
        timestamp: new Date().toISOString()
    });

    sendJson(ws, {
        type: 'history',
        payload: { messages: history },
        timestamp: new Date().toISOString()
    });

    sendJson(ws, {
        type: 'group_list',
        payload: { groups: getGroupsForUser(user.id) },
        timestamp: new Date().toISOString()
    });

    broadcast({
        type: 'system',
        payload: { text: `${nickname} se ha conectado 🟢` },
        timestamp: new Date().toISOString()
    });
    broadcastUserList();
    logEvent(`${nickname} conectado`);
}

/**
 * Procesa un mensaje global y lo reenvía a todos.
 * @param {WebSocket} ws Cliente emisor.
 * @param {{text:string}} payload Datos del mensaje.
 * @param {string} timestamp Fecha enviada por cliente.
 */
function handleMessage(ws, payload, timestamp) {
    const user = users.get(ws);
    const text = sanitizeText(payload.text, MAX_MESSAGE_LENGTH);

    if (!user?.nickname || !text) {
        return;
    }

    const message = {
        id: randomUUID(),
        fromId: user.id,
        from: user.nickname,
        text,
        timestamp: timestamp || new Date().toISOString()
    };

    saveHistory(message);
    broadcast({
        type: 'broadcast',
        payload: message,
        timestamp: message.timestamp
    });
}

/**
 * Envía un mensaje privado sólo al destinatario indicado.
 * @param {WebSocket} ws Cliente emisor.
 * @param {{targetId:string,text:string}} payload Datos privados.
 * @param {string} timestamp Fecha enviada por cliente.
 */
function handlePrivate(ws, payload, timestamp) {
    const sender = users.get(ws);
    const targetClient = findClientByUserId(payload.targetId);
    const text = sanitizeText(payload.text, MAX_MESSAGE_LENGTH);

    if (!sender?.nickname || !payload.targetId || payload.targetId === sender.id || !text) {
        sendJson(ws, { type: 'private_error', payload: { text: 'Mensaje privado inválido.' }, timestamp: new Date().toISOString() });
        return;
    }

    if (!targetClient) {
        sendJson(ws, { type: 'private_error', payload: { text: 'El destinatario ya no está conectado.' }, timestamp: new Date().toISOString() });
        return;
    }

    sendJson(targetClient, {
        type: 'private_msg',
        payload: {
            fromId: sender.id,
            from: sender.nickname,
            text
        },
        timestamp: timestamp || new Date().toISOString()
    });
}


/**
 * Crea un grupo/comunidad con miembros activos.
 * @param {WebSocket} ws Cliente creador.
 * @param {{name:string,memberIds:string[]}} payload Datos del grupo.
 */
function handleCreateGroup(ws, payload) {
    const creator = users.get(ws);
    const name = sanitizeText(payload.name, 40);
    const selectedMemberIds = Array.isArray(payload.memberIds) ? payload.memberIds : [];

    if (!creator?.nickname || !name) {
        sendJson(ws, { type: 'group_error', payload: { text: 'Nombre de grupo inválido.' }, timestamp: new Date().toISOString() });
        return;
    }

    const activeIds = new Set(getUserList().map((user) => user.id));
    const memberIds = new Set([creator.id]);

    selectedMemberIds.forEach((memberId) => {
        if (activeIds.has(memberId) && memberId !== creator.id) {
            memberIds.add(memberId);
        }
    });

    if (memberIds.size < 2) {
        sendJson(ws, { type: 'group_error', payload: { text: 'Selecciona al menos un participante activo.' }, timestamp: new Date().toISOString() });
        return;
    }

    const group = {
        id: randomUUID(),
        name,
        createdBy: creator.id,
        createdAt: new Date().toISOString(),
        memberIds,
        history: []
    };

    groups.set(group.id, group);
    broadcastGroupLists();
    logEvent(`${creator.nickname} creó el grupo ${name}`);
}

const inviteTokens = new Map(); // token → groupId

/**
 * Agrega nuevos miembros a un grupo existente.
 * @param {WebSocket} ws Cliente que solicita la acción.
 * @param {{groupId:string, memberIds:string[]}} payload Datos de la solicitud.
 */
function handleAddGroupMembers(ws, payload) {
    const requester = users.get(ws);
    const group = groups.get(payload.groupId);
    const selectedIds = Array.isArray(payload.memberIds) ? payload.memberIds : [];

    if (!requester?.nickname || !group) {
        sendJson(ws, { type: 'group_error', payload: { text: 'Grupo no encontrado.' }, timestamp: new Date().toISOString() });
        return;
    }

    if (!group.memberIds.has(requester.id)) {
        sendJson(ws, { type: 'group_error', payload: { text: 'No eres miembro de este grupo.' }, timestamp: new Date().toISOString() });
        return;
    }

    const activeIds = new Set(getUserList().map((u) => u.id));
    let added = 0;

    selectedIds.forEach((id) => {
        if (activeIds.has(id) && !group.memberIds.has(id)) {
            group.memberIds.add(id);
            added++;
        }
    });

    if (added === 0) {
        sendJson(ws, { type: 'group_error', payload: { text: 'No se agregaron nuevos miembros.' }, timestamp: new Date().toISOString() });
        return;
    }

    broadcastGroupLists();
    logEvent(`${requester.nickname} agregó ${added} miembro(s) al grupo ${group.name}`);
}

/**
 * Genera un token de invitación para un grupo.
 * @param {WebSocket} ws Cliente que solicita.
 * @param {{groupId:string}} payload Datos.
 */
function handleGenerateInvite(ws, payload) {
    const requester = users.get(ws);
    const group = groups.get(payload.groupId);

    if (!requester?.nickname || !group || !group.memberIds.has(requester.id)) {
        sendJson(ws, { type: 'group_error', payload: { text: 'No puedes generar una invitación para este grupo.' }, timestamp: new Date().toISOString() });
        return;
    }

    const token = randomUUID().replace(/-/g, '').slice(0, 12);
    inviteTokens.set(token, group.id);

    setTimeout(() => inviteTokens.delete(token), 24 * 60 * 60 * 1000);

    sendJson(ws, {
        type: 'invite_link',
        payload: { token, groupId: group.id, groupName: group.name },
        timestamp: new Date().toISOString()
    });

    logEvent(`${requester.nickname} generó invitación para ${group.name}`);
}

/**
 * Une a un usuario a un grupo mediante un token de invitación.
 * @param {WebSocket} ws Cliente que se une.
 * @param {{token:string}} payload Datos del token.
 */
function handleJoinByInvite(ws, payload) {
    const requester = users.get(ws);
    const groupId = inviteTokens.get(payload.token);

    if (!requester?.nickname || !groupId) {
        sendJson(ws, { type: 'group_error', payload: { text: 'El enlace de invitación no es válido o expiró.' }, timestamp: new Date().toISOString() });
        return;
    }

    const group = groups.get(groupId);
    if (!group) {
        sendJson(ws, { type: 'group_error', payload: { text: 'El grupo ya no existe.' }, timestamp: new Date().toISOString() });
        return;
    }

    if (group.memberIds.has(requester.id)) {
        sendJson(ws, { type: 'group_error', payload: { text: 'Ya eres miembro de este grupo.' }, timestamp: new Date().toISOString() });
        return;
    }

    group.memberIds.add(requester.id);
    broadcastGroupLists();
    logEvent(`${requester.nickname} se unió a ${group.name} por invitación`);
}


/**
 * Envía un mensaje de grupo sólo a los miembros de la comunidad.
 * @param {WebSocket} ws Cliente emisor.
 * @param {{groupId:string,text:string}} payload Datos del mensaje.
 * @param {string} timestamp Fecha enviada por el cliente.
 */
function handleGroupMessage(ws, payload, timestamp) {
    const sender = users.get(ws);
    const group = groups.get(payload.groupId);
    const text = sanitizeText(payload.text, MAX_MESSAGE_LENGTH);

    if (!sender?.nickname || !group || !group.memberIds.has(sender.id) || !text) {
        sendJson(ws, { type: 'group_error', payload: { text: 'Mensaje de grupo inválido.' }, timestamp: new Date().toISOString() });
        return;
    }

    const message = {
        id: randomUUID(),
        groupId: group.id,
        groupName: group.name,
        fromId: sender.id,
        from: sender.nickname,
        text,
        timestamp: timestamp || new Date().toISOString()
    };

    group.history.push(message);
    group.history = group.history.slice(-MAX_HISTORY);

    users.forEach((user, client) => {
        if (group.memberIds.has(user.id)) {
            sendJson(client, {
                type: 'group_msg',
                payload: message,
                timestamp: message.timestamp
            });
        }
    });

    broadcastGroupLists();
}

/**
 * Reenvía el indicador de escritura a todos menos al usuario emisor.
 * @param {WebSocket} ws Cliente emisor.
 * @param {{isTyping:boolean}} payload Estado de escritura.
 */
function handleTyping(ws, payload) {
    const user = users.get(ws);

    if (!user?.nickname) {
        return;
    }

    broadcast({
        type: 'typing_status',
        payload: {
            fromId: user.id,
            nickname: user.nickname,
            isTyping: Boolean(payload.isTyping)
        },
        timestamp: new Date().toISOString()
    }, ws);
}

/**
 * Enruta mensajes JSON del cliente según el campo type.
 * @param {WebSocket} ws Cliente emisor.
 * @param {Buffer} rawMessage Mensaje recibido.
 */
function handleSocketMessage(ws, rawMessage) {
    let data;

    try {
        data = JSON.parse(rawMessage.toString());
    } catch (error) {
        sendJson(ws, { type: 'error', payload: { text: 'El mensaje debe ser JSON válido.' }, timestamp: new Date().toISOString() });
        return;
    }

    const { type, payload = {}, timestamp } = data;

    switch (type) {
        case 'join':
            handleJoin(ws, payload);
            break;
        case 'message':
            handleMessage(ws, payload, timestamp);
            break;
        case 'private':
            handlePrivate(ws, payload, timestamp);
            break;
        case 'typing':
            handleTyping(ws, payload);
            break;
        case 'create_group':
            handleCreateGroup(ws, payload);
            break;
        case 'group_message':
            handleGroupMessage(ws, payload, timestamp);
            break;
        case 'add_group_members':
            handleAddGroupMembers(ws, payload);
            break;
        case 'join_by_invite':
            handleJoinByInvite(ws, payload);
            break;
        case 'generate_invite':
            handleGenerateInvite(ws, payload);
            break;
        default:
            sendJson(ws, { type: 'error', payload: { text: 'Tipo de mensaje no reconocido.' }, timestamp: new Date().toISOString() });
    }
}

wss.on('connection', (ws) => {
    users.set(ws, { id: randomUUID(), nickname: null });
    logEvent('Cliente WebSocket conectado');

    ws.on('message', (message) => handleSocketMessage(ws, message));

    ws.on('close', () => {
        const user = users.get(ws);
        users.delete(ws);

        if (user?.nickname) {
            broadcast({
                type: 'system',
                payload: { text: `${user.nickname} se ha desconectado 🔴` },
                timestamp: new Date().toISOString()
            });
            broadcastUserList();
            broadcastGroupLists();
            logEvent(`${user.nickname} desconectado`);
        }
    });
});

server.listen(PORT, () => {
    logEvent(`Servidor en http://localhost:${PORT}`);
});
