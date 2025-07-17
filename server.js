const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map(); // id => ws

app.use(express.static(path.join(__dirname, 'public')));

function broadcastClientList() {
    const clientList = [...clients.keys()];
    const message = JSON.stringify({ type: 'clients', clients: clientList });
    for (const ws of clients.values()) {
        if (ws.readyState === ws.OPEN) {
            ws.send(message);
        }
    }
}

wss.on('connection', (ws) => {
    const id = uuidv4();
    clients.set(id, ws);

    // Send the new client its own ID
    ws.send(JSON.stringify({ type: 'init', id }));

    // Broadcast updated list of clients to everyone
    broadcastClientList();

    ws.on('message', (message) => {
        let msg;
        try {
            msg = JSON.parse(message);
        } catch (err) {
            return;
        }

        const recipient = clients.get(msg.to);
        if (recipient && recipient.readyState === ws.OPEN) {
            msg.from = id;
            recipient.send(JSON.stringify(msg));
        }
    });

    ws.on('close', () => {
        clients.delete(id);
        broadcastClientList();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
