const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
    const id = uuidv4();
    clients.set(id, ws);

    ws.send(JSON.stringify({ type: 'init', id }));

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
    });
});

// ✅ Bind to all interfaces
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
