const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

// Log file in userData folder so users can send it to us
const userDataDir = app.getPath('userData');
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}
const logPath = path.join(userDataDir, 'app.log');

function logToFile(line) {
  try {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
  } catch (_) {}
}

function startBackendServer() {
  if (isDev) {
    // In dev mode, server is started by `npm run dev` via concurrently
    return;
  }

  logToFile('Starting backend server...');

  // In production, fork the backend server as a child process
  const serverPath = path.join(__dirname, 'server.js');
  serverProcess = fork(serverPath, [], {
    silent: true, // capture stdout/stderr
    env: {
      ...process.env,
      NODE_ENV: 'production',
      USER_DATA_PATH: app.getPath('userData'),
      RESOURCES_PATH: process.resourcesPath,
    },
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      const txt = data.toString();
      console.log('[server]', txt);
      logToFile('[server] ' + txt.trim());
    });
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      const txt = data.toString();
      console.error('[server-err]', txt);
      logToFile('[server-err] ' + txt.trim());
    });
  }

  serverProcess.on('error', (err) => {
    console.error('Backend server error:', err);
    logToFile('[server-fatal] ' + err.stack);
  });

  serverProcess.on('exit', (code, signal) => {
    logToFile(`[server-exit] code=${code} signal=${signal}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in both dev and prod for now (debugging packaged app)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const { shell } = require('electron');
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Log Folder',
          click: () => shell.openPath(userDataDir),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('ready', () => {
  startBackendServer();
  // Give backend a moment to start before loading the window
  setTimeout(createWindow, isDev ? 0 : 1500);
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
