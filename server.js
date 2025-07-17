const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map(); // id => { ws, role, alias }

app.use(express.static(path.join(__dirname, 'public')));

function broadcastReceiversList() {
    const receivers = [...clients.entries()]
        .filter(([, client]) => client.role === 'receiver')
        .map(([id, client]) => ({
            id,
            alias: client.alias || id
        }));

    const message = JSON.stringify({ type: 'receivers', receivers });

    for (const { ws, role } of clients.values()) {
        if (role === 'sender' && ws.readyState === ws.OPEN) {
            ws.send(message);
        }
    }
}

wss.on('connection', (ws) => {
    const id = uuidv4();
    const clientData = { ws, role: null, alias: null };
    clients.set(id, clientData);

    ws.send(JSON.stringify({ type: 'init', id }));

    ws.on('message', (message) => {
        let msg;
        try {
            msg = JSON.parse(message);
        } catch (err) {
            return;
        }

        // Handle role or alias setting
        if (msg.type === 'setRole') {
            clientData.role = msg.role;
            broadcastReceiversList();
            return;
        }

        if (msg.type === 'setAlias') {
            clientData.alias = msg.alias;
            broadcastReceiversList();
            return;
        }

        // Forward signaling messages
        const recipient = clients.get(msg.to);
        if (recipient && recipient.ws.readyState === ws.OPEN) {
            msg.from = id;
            recipient.ws.send(JSON.stringify(msg));
        }
    });

    ws.on('close', () => {
        clients.delete(id);
        broadcastReceiversList();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
