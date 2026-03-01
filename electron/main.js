const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { getLicenseStatus, activate, incrementUsage } = require('./licensing');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "DICE Analyzer",
    autoHideMenuBar: true
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Using the registered 'app' protocol to load files
    mainWindow.loadURL('app://./index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const isDev = process.env.NODE_ENV === 'development';

  let pythonExe;
  let args;

  if (isDev) {
    pythonExe = 'python';
    args = [path.join(__dirname, '../server/api/index.py')];
  } else {
    // Path to the bundled executable
    pythonExe = path.join(process.resourcesPath, 'backend', 'dice_backend.exe');
    args = [];
  }

  console.log(`Starting backend with ${pythonExe} ${args.join(' ')}`);

  backendProcess = spawn(pythonExe, args, {
    env: { ...process.env, PORT: '8000' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  // Register custom protocol to handle Next.js absolute paths correctly
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://./', '');
    const isAsset = url.startsWith('_next/');
    const filePath = isAsset
      ? path.join(__dirname, '../client/out', url)
      : path.join(__dirname, '../client/out', url || 'index.html');

    callback({ path: filePath });
  });

  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-license-status', () => {
  return getLicenseStatus();
});

ipcMain.handle('activate', (event, key) => {
  return activate(key);
});

ipcMain.handle('increment-usage', () => {
  return incrementUsage();
});
