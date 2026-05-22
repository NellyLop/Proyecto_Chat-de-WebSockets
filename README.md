# WebSocket Real-Time Chat

Aplicación de chat en tiempo real desarrollada con **Node.js**, **WebSockets**, **HTML5**, **CSS3** y **JavaScript Vanilla**.

## Integrantes

- Mane Isabela Velasco Naranjo — DevOps & Backend Lead
- Heriberto Gómez Bolaina — Frontend Architect
- Nélida López Cruz — Real-Time Specialist
- Alondra Galvan German — UI/UX & Multimedia
- Abril Azeneth Quintas Rojas — Data & State Manager

## Objetivo

Desarrollar una aplicación de chat en tiempo real utilizando WebSockets para permitir comunicación bidireccional y persistente entre clientes y servidor.

## Tecnologías utilizadas

- Node.js
- Librería `ws`
- HTML5 semántico
- CSS3 con variables y responsive design
- JavaScript Vanilla con módulos ES

## Estructura del proyecto

```text
chat-de-WebSockets/
├── server.js
├── package.json
├── .gitignore
├── README.md
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── modules/
    │   ├── globalChat.js
    │   ├── login.js
    │   ├── users.js
    │   ├── private.js
    │   ├── history.js
    │   └── typing.js
    ├── emoji/
    │   └── picker.js
    └── sounds/
```

## Complementos implementados

| Complemento | Descripción | Archivos principales |
|---|---|---|
| Login con nickname | Modal inicial que valida nickname antes de conectar al WebSocket. | `index.html`, `app.js` |
| Lista de usuarios conectados | Sidebar actualizado en tiempo real con usuarios activos. | `users.js`, `app.js` |
| Mensajes privados | Selección de usuario y envío privado sólo al destinatario. | `private.js`, `server.js` |
| Historial de mensajes | El servidor guarda los últimos 50 mensajes globales en RAM y los envía al nuevo usuario. | `history.js`, `server.js` |
| Indicador escribiendo | Evento `typing` con debounce de 1.5 segundos. | `typing.js`, `app.js` |
| Modo oscuro/claro | Toggle visual con preferencia guardada en `localStorage`. | `style.css`, `app.js` |
| Emoji picker | Selector básico de emojis sin librerías externas. | `picker.js` |
| Responsive | Adaptación móvil con panel lateral colapsable. | `style.css`, `index.html` |
| Navegación por secciones | Barra izquierda con Foro Global, Privados y Comunidades; cada sección carga su propia lista. | `index.html`, `app.js` |
| Buscador por sección | Campo tipo WhatsApp para filtrar usuarios, privados o grupos según la sección activa. | `index.html`, `app.js` |
| Búsqueda en conversación | Botón 🔍 para buscar texto en el historial visible y resaltar coincidencias. | `app.js`, `style.css` |
| Eliminar conversación local | Menú ⋮ del chat con confirmación para limpiar el historial del lado del cliente. | `app.js` |
| Comunidades / grupos | Crear grupo desde ⋮, seleccionar usuarios activos y enviar mensajes sólo a miembros. | `server.js`, `app.js` |

## Instrucciones de instalación y ejecución

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar el servidor:

```bash
npm start
```

3. Abrir en el navegador:

```text
http://localhost:3000
```

## Pruebas recomendadas

- Abrir 2 o 3 pestañas en `http://localhost:3000`.
- Ingresar un nickname diferente en cada pestaña.
- Enviar un mensaje global y verificar que llegue a todos.
- Seleccionar un usuario del panel lateral y enviar un mensaje privado.
- Abrir una nueva pestaña y verificar que se cargue el historial.
- Escribir sin enviar y verificar el indicador “está escribiendo...” en otra pestaña.
- Activar modo oscuro y recargar para comprobar persistencia.
- Probar vista móvil con DevTools en ancho menor a 768 px.

## Protocolo WebSocket

Todos los mensajes se envían como JSON con la estructura base:

```json
{
  "type": "message",
  "payload": {
    "text": "Hola"
  },
  "timestamp": "2026-05-19T10:30:00.000Z"
}
```

Tipos principales utilizados:

- `join`
- `message`
- `private`
- `typing`
- `broadcast`
- `private_msg`
- `user_list`
- `history`
- `typing_status`
- `system`
- `create_group`
- `group_list`
- `group_message`
- `group_msg`

## Licencia

Este proyecto está bajo la Licencia MIT.

## Rediseño de interfaz tipo Discord / WhatsApp

El frontend se reorganizó siguiendo el wireframe del equipo:

- Barra lateral izquierda de navegación rápida.
- Sidebar de conversaciones con buscador y lista de usuarios conectados.
- Área central para mensajes globales o privados.
- Panel derecho con información del canal o usuario seleccionado.
- Login inicial por nickname antes de abrir la conexión WebSocket.
- Tema oscuro por defecto con cambio a tema claro desde el botón de la barra lateral.
- Diseño responsive: en móvil el panel de usuarios se abre con botón hamburguesa.

Los IDs principales de la interfaz se conservaron para mantener la integración con `app.js` y los módulos frontend.


## Requerimientos adicionales de layout implementados

- `REQ-NAV-01` a `REQ-NAV-04`: navegación lateral por Foro Global, Privados y Comunidades.
- `REQ-LIST-01` a `REQ-LIST-05`: buscador tipo WhatsApp, menú ⋮ para crear grupos y listas separadas por sección.
- `REQ-CHAT-01` a `REQ-CHAT-04`: área vacía sin conversación seleccionada, búsqueda interna y eliminación local de conversación.
- `REQ-FORO-01` a `REQ-FORO-03`: foro global abierto, usuarios activos e historial de últimos 50 mensajes.
- `REQ-COM-01` a `REQ-COM-03`: creación de comunidades con miembros activos y mensajes visibles sólo para sus miembros.


## Nota de versión para Frontend Architect

Esta versión conserva la lógica funcional de navegación por secciones, privados, comunidades, búsqueda en conversación y eliminación local de historial, pero recupera el diseño visual tipo Discord/WhatsApp: barra lateral de iconos, lista de chats compacta, avatares circulares con estado y panel derecho tipo perfil.
