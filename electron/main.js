const { app, BrowserWindow, ipcMain, protocol, net, clipboard, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { getLicenseStatus, activate, incrementUsage } = require('./licensing');

let mainWindow;
let backendProcess;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      devTools: isDev, // Disable DevTools in production
    },
    title: "DICE Analyzer",
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../client/public/icon.png') // Setting the icon
  });

  // Remove default menu to block DevTools shortcuts
  if (!isDev) {
    Menu.setApplicationMenu(null);
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

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
  const logFile = path.join(app.getPath('userData'), 'backend.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  let pythonExe;
  let args;

  if (isDev) {
    pythonExe = 'python';
    args = [path.join(__dirname, '../server/api/index.py')];
  } else {
    // Path to the bundled executable
    pythonExe = path.join(process.resourcesPath, 'backend', 'dice_backend.exe');
    args = [];

    if (!fs.existsSync(pythonExe)) {
      console.error(`Backend executable not found at: ${pythonExe}`);
      logStream.write(`[${new Date().toISOString()}] Backend executable not found at: ${pythonExe}\n`);
      return;
    }
  }

  console.log(`Starting backend with ${pythonExe} ${args.join(' ')}`);
  logStream.write(`[${new Date().toISOString()}] Starting backend: ${pythonExe} ${args.join(' ')}\n`);

  // Wrap path in quotes to handle spaces correctly
  const command = isDev ? pythonExe : `"${pythonExe}"`;

  backendProcess = spawn(command, args, {
    env: { ...process.env, PORT: '8000' },
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
    logStream.write(`[${new Date().toISOString()}] STDOUT: ${data}\n`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
    logStream.write(`[${new Date().toISOString()}] STDERR: ${data}\n`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    logStream.write(`[${new Date().toISOString()}] Backend process exited with code ${code}\n`);
  });

  backendProcess.on('error', (err) => {
    console.error(`Failed to start backend process: ${err}`);
    logStream.write(`[${new Date().toISOString()}] ERROR: ${err}\n`);
  });
}

app.whenReady().then(() => {
  // Register custom protocol to handle Next.js absolute paths correctly
  // Using the modern protocol.handle API for Electron 30+
  protocol.handle('app', (request) => {
    let url = request.url.replace('app://./', '');
    if (url === '' || url === '/') url = 'index.html';

    const isAsset = url.startsWith('_next/');
    let filePath = isAsset
      ? path.join(__dirname, '../client/out', url)
      : path.join(__dirname, '../client/out', url.endsWith('/') ? url + 'index.html' : url);

    // Add .html extension if it's a page and doesn't have it
    if (!isAsset && !filePath.includes('.') && fs.existsSync(filePath + '.html')) {
        filePath += '.html';
    }

    // Convert the file path to a file:// URL for net.fetch
    const fileUrl = `file://${filePath}`;
    return net.fetch(fileUrl);
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

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});
