const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const { setupTitlebar, attachTitlebarToWindow } = require('custom-electron-titlebar/main');
const express = require('express');
const path = require('path');
const QUSB2SNESConnection = require('./2snesbridge.js');
const WebSocket = require('ws');
const DeathTracker = require('./deathTracker.js');


// ugly hack to remove menu
const menu = new Menu()
Menu.setApplicationMenu(menu)

// Tray
let tray = null;

// Express
const serverApp = express();
let server = null; // Express server instance
const port = 3000;

// WSS 
let wss;  // WebSocket Server instance

// Rom hacks
let hackName = "Default Hack Name";
let author = "Default Author";

let mainWindow; // Define mainWindow at the top level

// Static files
serverApp.use(express.static(path.join(__dirname, 'tracker', 'public')));

// EJS
serverApp.set('views', path.join(__dirname, 'tracker', 'views'));
serverApp.set('view engine', 'ejs');

serverApp.get('/', (req, res) => {
    res.render('tracker', { hackName: hackName, author: author });
});

// Callbacks for QUSB2SNESConnection events
const eventCallbacks = {
    death: () => {
        deathsTracking.addDeath();
        console.log('Player died');
        broadcast({ type: 'death', message: deathsTracking.getDeaths() });
    },
    timerStart: () => {
        console.log('Timer started');
        deathsTracking.startTimer();
        if (!global.timerBroadcastInterval) {
            global.timerBroadcastInterval = setInterval(() => {
                broadcast({ type: 'timer', message: deathsTracking.getElapsedTime() });
            }, 1000); // Broadcast every second
        }
    },
    timerStop: () => {
        console.log('Timer stopped');
        clearInterval(global.timerBroadcastInterval);
        global.timerBroadcastInterval = null;
        deathsTracking.stopTimer();
        broadcast({ type: 'timer', message: deathsTracking.getElapsedTime() });
    },
    exitUpdate: (exits) => {
        deathsTracking.setExits(exits);
        broadcast({ type: 'exit', message: deathsTracking.getExits() });
    }
};

// Start the Express server
function startServer() {
    server = serverApp.listen(port, () => {
        console.log(`Server started on port ${port}`);
        mainWindow.webContents.send('server-status', true); // Notify renderer the server has started
        startWebSocketServer();
    });
}

// Stop the Express server
function stopServer() {
    if (server) {
        stopWebSocketServer();
        server.close(() => {
            console.log(`Server stopped`);
            if (mainWindow) {
                mainWindow.webContents.send('server-status', false); // Notify renderer the server has stopped
            }
            server = null;
            
        });
        server = null;
    }
}

function startWebSocketServer() {
    wss = new WebSocket.Server({ server });
    wss.on('connection', function connection(ws) {
        const testMessage = JSON.stringify({ type: 'test', message: 'Hello, world!' });
        ws.send(testMessage); // Send test message on new connection
        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
            ws.send('Echo from server: ' + message);
        });
        ws.send('WebSocket connection established');
    });
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


function stopWebSocketServer() {
    broadcast({ type: 'timer', message: 'stopped' });
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

setupTitlebar();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 350,
        titleBarStyle: 'hidden',
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            sandbox: false
        }
    });

    // Load the GUI HTML file
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'gui.html'));

    mainWindow.setMenuBarVisibility(false);

    // Create the Tray instance
    const iconPath = path.join(__dirname, 'build', 'icons', 'icon.png');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open', click: function () {
                mainWindow.show()
            }
        },
        {
            label: 'Quit', click: function () {
                app.quit()
            }
        }
    ])
    tray.setToolTip('Your App Name')
    tray.setContextMenu(contextMenu)

    // Minimize mainWindow to the system tray
    mainWindow.on('minimize', function (event) {
        event.preventDefault()
        mainWindow.hide()
    })

    // Show the mainWindow when the tray icon is clicked
    tray.on('click', function () {
        mainWindow.show()
    })

    // Nullify mainWindow when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    attachTitlebarToWindow(mainWindow);
}

let qusbConnection = new QUSB2SNESConnection('ws://localhost:8080', eventCallbacks);
let deathsTracking = new DeathTracker();

// When app is ready, open the window
app.whenReady().then(() => {
    createWindow();
    qusbConnection.connect();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
});

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
});

ipcMain.on('start-server', (event, data) => {
    hackName = data.hackName;
    author = data.author;
    startServer();
});

ipcMain.on('stop-server', () => {
    stopServer();
});

// Ensure the server is stopped when the app is about to quit
app.on('will-quit', () => {
    if (global.timerBroadcastInterval) {
        clearInterval(global.timerBroadcastInterval);
    }
    deathsTracking.stopTimer();
    stopServer();
});