const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const path = require('path');
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
            mainWindow.webContents.send('server-status', false); // Notify renderer the server has stopped
        });
        server = null;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({ // Assign to mainWindow directly
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });

    // Load the GUI HTML file
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'gui.html'));

    // Nullify mainWindow when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Whenapp is ready, open the window
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
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
