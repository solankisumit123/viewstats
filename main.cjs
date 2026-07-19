const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

const isDev = !app.isPackaged;

let serverProcess = null;
let mainWindow = null;

// ─── Auto Updater Setup ───────────────────────────────────────────────
let autoUpdater = null;
if (!isDev) {
  try {
    const { autoUpdater: updater } = require('electron-updater');
    autoUpdater = updater;

    // Disable logger (avoids "this._logger.info is not a function" error)
    autoUpdater.logger = null;
    autoUpdater.autoDownload = false; // We'll ask user first
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;

    // ── Update Available: Send IPC to React Renderer ──
    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info?.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    // ── No Update ──
    autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] App is up to date.');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available', info);
      }
    });

    // ── Download Progress ──
    autoUpdater.on('download-progress', (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(progress.percent / 100);
        mainWindow.setTitle(`ViewStats — Downloading update… ${Math.round(progress.percent)}%`);
        mainWindow.webContents.send('download-progress', {
          percent: Math.round(progress.percent),
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        });
      }
    });

    // ── Downloaded: Send IPC to React Renderer ──
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info?.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(-1);
        mainWindow.setTitle('ViewStats Desktop');
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    // ── Error Handling ──
    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err?.message || err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', err?.message || 'Update failed');
      }
    });

  } catch (e) {
    console.error('[AutoUpdater] Failed to load electron-updater:', e?.message);
  }
}

// IPC Handlers for React Frontend
ipcMain.handle('check-for-updates', () => {
  if (autoUpdater) {
    autoUpdater.checkForUpdates().catch(err => console.error('[AutoUpdater] Check error:', err?.message));
  }
});

ipcMain.handle('download-update', () => {
  if (autoUpdater) {
    return autoUpdater.downloadUpdate().catch(err => console.error('[AutoUpdater] Download error:', err?.message));
  }
});

ipcMain.handle('quit-and-install', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
  }
});

// Start the Express backend server
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  const logPath = path.join(__dirname, 'server-error.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  // Pass ELECTRON=true to force server.js to use AppData write permissions
  serverProcess = fork(serverPath, [], {
    silent: true,
    env: {
      ...process.env,
      PORT: '3001',
      ELECTRON: 'true',
      NODE_ENV: isDev ? 'development' : 'production'
    }
  });

  serverProcess.stdout.on('data', (data) => {
    const msg = `[Server STDOUT] ${data.toString()}`;
    console.log(msg);
    logStream.write(msg + '\n');
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = `[Server STDERR] ${data.toString()}`;
    console.error(msg);
    logStream.write(msg + '\n');
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Express backend:', err);
    logStream.write(`Failed to start Express backend: ${err.stack || err}\n`);
  });

  serverProcess.on('exit', (code, signal) => {
    const msg = `[Server Exit] code=${code} signal=${signal}`;
    console.log(msg);
    logStream.write(msg + '\n');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // Enable hardware acceleration for smoother video playback
      backgroundThrottling: false,
    },
    title: 'ViewStats Desktop',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build/icon.png'),
    // Smooth rendering
    backgroundColor: '#0f0f11',
    show: false, // don't show until ready to avoid white flash
  });

  // Open external links in user's default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Show window only when fully ready (prevents white flash on startup)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates after window is visible (5s delay to let server & app fully settle)
    if (!isDev && autoUpdater) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          console.error('[AutoUpdater] Check failed:', err?.message);
        });
      }, 5000);
    }
  });

  // If developing, load Vite dev server. Otherwise, load from local Express server
  const startUrl = isDev
    ? 'http://localhost:5173'
    : 'http://localhost:3001';

  // Wait a small buffer for Express server to start in production
  if (isDev) {
    mainWindow.loadURL(startUrl);
  } else {
    setTimeout(() => {
      mainWindow.loadURL(startUrl).catch((err) => {
        console.error('Failed to load page, retrying...', err);
        mainWindow.loadURL(startUrl);
      });
    }, 1500);
  }
}

// Enforce Single Instance Lock for proper desktop app behavior
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startServer();
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
