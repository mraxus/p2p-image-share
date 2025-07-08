const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const peers = new Map(); // Map client ID -> WebSocket

wss.on('connection', (ws) => {
    let id = Math.random().toString(36).substr(2, 9);
    peers.set(id, ws);
    ws.send(JSON.stringify({ type: 'init', id }));

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        const target = peers.get(data.to);
        if (target) target.send(JSON.stringify({ ...data, from: id }));
    });

    ws.on('close', () => {
        peers.delete(id);
    });
});

app.use(express.static('public'));
server.listen(3000, () => console.log('Server running on http://localhost:3000'));
