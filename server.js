const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
    let filePath = "./public/index.html";

    if (req.url !== "/") {
        filePath = "./public" + req.url;
    }

    const ext = path.extname(filePath);

    let contentType = "text/html";

    switch (ext) {
        case ".css":
            contentType = "text/css";
            break;

        case ".js":
            contentType = "application/javascript";
            break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end("Archivo no encontrado");
        } else {
            res.writeHead(200, {
                "Content-Type": contentType
            });

            res.end(content, "utf-8");
        }
    });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {

    console.log("Cliente conectado");

    ws.send("Bienvenido al servidor WebSocket");

    ws.on("message", (message) => {

        console.log("Mensaje:", message.toString());

        // Enviar mensaje a todos los clientes
        wss.clients.forEach((client) => {

            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }

        });

    });

    ws.on("close", () => {
        console.log("Cliente desconectado");
    });

});

server.listen(3000, () => {
    console.log("Servidor en http://localhost:3000");
});
