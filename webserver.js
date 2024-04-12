const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const DeathTracker = require('./deathTracker.js');
const QUSB2SNESConnection = require('./2snesbridge.js');

let statTracker = new DeathTracker();

// --- WebSocket server
let wss;

function startWebSocketServer() {
    wss = new WebSocket.Server({ server });
    console.log('WebSocket server started on port 3000');

    wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
        });

        ws.send('WebSocket connection established');
    });
}

function stopWebSocketServer() {
    if (wss) {
        // Close all active WebSocket connections
        wss.clients.forEach(function each(client) {
            client.close();
        });

        // Close the WebSocket server
        wss.close(() => {
            console.log('WebSocket Server stopped');
        });
        wss = null; // Clear the WebSocket server reference
    }
}

// Broadcast to all clients
function broadcast(data) {
    if (!wss || !wss.clients) {
        console.error("WebSocket server is not initialized or clients are undefined.");
        return;
    }
    const jsonData = JSON.stringify(data); // Convert data to JSON string
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(jsonData); // Send JSON-formatted string
        }
    });
}


// --- Express webserver
const serverApp = express();
const port = 3000;
let server;

// Static files
serverApp.use(express.static(path.join(__dirname, 'tracker', 'public')));

// EJS
serverApp.set('views', path.join(__dirname, 'tracker', 'views'));
serverApp.set('view engine', 'ejs');

// Start the Express server
function startServer(data) {
    serverApp.get('/', (req, res) => {
        res.render('tracker', { hackName: data.hackName, author: data.author });
    });
    server = serverApp.listen(port, () => {
        console.log(`Express webserver started on port ${port}`);
    });

    startWebSocketServer();
    snes.connect();
}

function stopServer() {
    stopWebSocketServer();
    if (server) {
        server.close(() => {
            console.log('Express webserver stopped');
            server = null;
        });
    }
}

// Callbacks for QUSB2SNESConnection events
const eventCallbacks = {
    death: () => {
        statTracker.addDeath();
        console.log('Player died');
        broadcast({ type: 'death', message: statTracker.getDeaths() });
    },
    timerStart: () => {
        console.log('Timer started');
        statTracker.startTimer();
        if (!global.timerBroadcastInterval) {
            global.timerBroadcastInterval = setInterval(() => {
                broadcast({ type: 'timer', message: statTracker.getElapsedTime() });
            }, 1000); // Broadcast every second
        }
    },
    timerStop: () => {
        console.log('Timer stopped');
        clearInterval(global.timerBroadcastInterval);
        global.timerBroadcastInterval = null;
        statTracker.stopTimer();
        broadcast({ type: 'timer', message: statTracker.getElapsedTime() });
    },
    exitUpdate: (exits) => {
        statTracker.setExits(exits);
        broadcast({ type: 'exit', message: statTracker.getExits() });
    }
};

snes = new QUSB2SNESConnection("ws://localhost:8080", eventCallbacks);

module.exports = { startServer, stopServer, broadcast };