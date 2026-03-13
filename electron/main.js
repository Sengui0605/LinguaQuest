const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const SAVE_FILE = path.join(app.getPath('userData'), 'linguaquest_save.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 480,
        height: 800,
        minWidth: 380,
        minHeight: 600,
        resizable: true,
        icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0d1117',
        titleBarStyle: 'default',
        title: 'LinguaQuest'
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC handlers for per-user file-based save/load
ipcMain.handle('save-progress', (event, data) => {
    try {
        fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (e) {
        console.error('Error saving progress:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('load-progress', () => {
    try {
        if (fs.existsSync(SAVE_FILE)) {
            const raw = fs.readFileSync(SAVE_FILE, 'utf-8');
            return { success: true, data: JSON.parse(raw) };
        }
        return { success: true, data: null };
    } catch (e) {
        console.error('Error loading progress:', e);
        return { success: false, data: null, error: e.message };
    }
});

ipcMain.handle('delete-progress', () => {
    try {
        if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-save-path', () => {
    return SAVE_FILE;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
