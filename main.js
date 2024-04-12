const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const { setupTitlebar, attachTitlebarToWindow } = require('custom-electron-titlebar/main');
const express = require('express');
const path = require('path');
const QUSB2SNESConnection = require('./2snesbridge.js');


// ugly hack to remove menu
const menu = new Menu()
Menu.setApplicationMenu(menu)

// Tray
let tray = null;

// Express
const serverApp = express();
let server = null; // Express server instance
const port = 3000;

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
        console.log('Player died');
        // Additional logic for handling death
    },
    timerStart: () => {
        console.log('Timer started');
        // Additional logic for handling timer start
    },
    exitUpdate: (exits) => {
        console.log(`Number of exits updated to ${exits}`);
        // Additional logic for handling exits update
    }
};

// Start the Express server
function startServer() {
    server = serverApp.listen(port, () => {
        console.log(`Server started on port ${port}`);
        mainWindow.webContents.send('server-status', true); // Notify renderer the server has started
    });
}

// Stop the Express server
function stopServer() {
    if (server) {
        server.close(() => {
            console.log(`Server stopped`);
            if (mainWindow) {
                mainWindow.webContents.send('server-status', false); // Notify renderer the server has stopped
            }
        });
        server = null;
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
    stopServer();
});