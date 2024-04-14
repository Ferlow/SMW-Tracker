const fs = require('fs');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const DeathTracker = require('./deathTracker.js');
const QUSB2SNESConnection = require('./2snesbridge.js');
const electron = require('electron');
const app = electron.app || electron.remote.app;


const serverApp = express();
const port = 3000;
let server;
let wss;
let snes;
let statTracker = new DeathTracker();
// const statsFilePath = path.join(__dirname, 'userdata', 'saveData.json');
const userDataPath = app.getPath('userData');
const statsFilePath = path.join(userDataPath, 'saveData.json');
// Test
let currentHackName;

// Function to save stats to a JSON file
function saveStats(hackName, statsData) {
    console.log('Saving stats:', statsFilePath)
    fs.readFile(statsFilePath, (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Error reading stats file:', err);
            return;
        }
        let stats = {};
        if (data) {
            stats = JSON.parse(data.toString() || '{}');
        }
        stats[hackName] = statsData;
        fs.writeFile(statsFilePath, JSON.stringify(stats, null, 2), err => {
            if (err) {
                console.error('Error writing stats to file:', err);
            } else {
                console.log('Stats saved successfully.');
            }
        });
    });
}

// Function to load stats from a JSON file
function loadStats(hackName, callback) {
    console.log('Loading stats:', statsFilePath)
    fs.readFile(statsFilePath, (err, data) => {
        if (err && err.code === 'ENOENT') {
            console.log('Stats file not found, initializing new stats file.');
            callback({});
            return;
        } else if (err) {
            console.error('Error reading stats file:', err);
            callback({});
            return;
        }
        const stats = JSON.parse(data.toString() || '{}');
        callback(stats[hackName] || {});
    });
}

// Start the WebSocket server
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

// Stop the WebSocket server
function stopWebSocketServer() {
    if (wss) {
        wss.clients.forEach(client => client.close());
        wss.close(() => {
            console.log('WebSocket Server stopped');
        });
        wss = null;
    }
}

// Broadcast to all clients
function broadcast(data) {
    if (!wss || !wss.clients) {
        console.error("WebSocket server is not initialized or clients are undefined.");
        return;
    }
    const jsonData = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(jsonData);
        }
    });
}

// Start the Express server
function startServer(data) {
    serverApp.use(express.static(path.join(__dirname, 'tracker', 'public')));
    serverApp.set('views', path.join(__dirname, 'tracker', 'views'));
    serverApp.set('view engine', 'ejs');

    serverApp.get('/', (req, res) => {
        const hackName = req.query.hackName || data.hackName;
        const author = req.query.author || data.author;

        currentHackName = hackName;

        loadStats(hackName, (statsData) => {
            res.render('tracker', { hackName, author, stats: statsData });
        });
    });

    server = serverApp.listen(port, () => {
        console.log(`Express webserver started on port ${port}`);
    });

    startWebSocketServer();
    snes = new QUSB2SNESConnection("ws://localhost:8080", {
        death: () => {
            statTracker.addDeath();
            saveStats(data.hackName, {
              deathCount: statTracker.getDeaths(),
              timer: statTracker.getElapsedTime(),
              exitCount: statTracker.getExits()
            });
            console.log('Player died');
            broadcast({ type: 'death', message: statTracker.getDeaths() });
        },
        timerStart: () => {
            console.log('Timer started');
            statTracker.startTimer();
            if (!global.timerBroadcastInterval) {
                global.timerBroadcastInterval = setInterval(() => {
                    broadcast({ type: 'timer', message: statTracker.getElapsedTime() });
                }, 1000);
            }
        },
        timerStop: () => {
            console.log('Timer stopped');
            saveStats(data.hackName, {
                deathCount: statTracker.getDeaths(),
                timer: statTracker.getElapsedTime(),
                exitCount: statTracker.getExits()
              });
            clearInterval(global.timerBroadcastInterval);
            global.timerBroadcastInterval = null;
            statTracker.stopTimer();
            broadcast({ type: 'timer', message: statTracker.getElapsedTime() });
        },
        exitUpdate: (exits) => {
            statTracker.setExits(exits);
            saveStats(data.hackName, {
                deathCount: statTracker.getDeaths(),
                timer: statTracker.getElapsedTime(),
                exitCount: statTracker.getExits()
              });
            broadcast({ type: 'exit', message: statTracker.getExits() });
        }
    });
    snes.connect();
}

// Stop the Express server
function stopServer() {
    saveStats(currentHackName, {
        deathCount: statTracker.getDeaths(),
        timer: statTracker.getElapsedTime(),
        exitCount: statTracker.getExits()
      });
    stopWebSocketServer();
    if (server) {
        server.close(() => {
            console.log('Express webserver stopped');
            server = null;
        });
    }
}

module.exports = { startServer, stopServer, broadcast };