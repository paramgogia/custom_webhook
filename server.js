const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to parse different types of incoming webhook bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Serve the frontend HTML
app.use(express.static(path.join(__dirname, 'public')));

// 1. Endpoint to generate a new unique webhook URL
app.get('/api/new', (req, res) => {
    const id = crypto.randomUUID();
    const url = `${req.protocol}://${req.get('host')}/w/${id}`;
    res.json({ id, url });
});

// 2. The Catch-All Webhook Receiver
app.all('/w/:id', (req, res) => {
    const hookId = req.params.id;

    // Package the incoming request data
    const payload = {
        id: crypto.randomUUID(),
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body,
        timestamp: new Date().toISOString()
    };

    // Push the payload in real-time to anyone looking at this specific webhook ID
    io.to(hookId).emit('webhook_received', payload);

    // Tell the sender we got it successfully
    res.status(200).send('Webhook Received!');
});

// 3. WebSocket connections for real-time updates
io.on('connection', (socket) => {
    // When a frontend connects, it tells the server which Webhook ID it wants to monitor
    socket.on('join_room', (hookId) => {
        socket.join(hookId);
        console.log(`Browser connected to monitor webhook: ${hookId}`);
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`✅ Webhook Server running! Open http://localhost:${PORT} in your browser.`);
});