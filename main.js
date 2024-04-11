const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron')
const express = require('express');
const path = require('path');

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

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 350,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });

    // Load the GUI HTML file
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'gui.html'));

    mainWindow.setMenuBarVisibility(false);

    // Create the Tray instance
    tray = new Tray('build/icons/icon.png') // Update this path to your icon file
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
}

// When app is ready, open the window
app.whenReady().then(createWindow);

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