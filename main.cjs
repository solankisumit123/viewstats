const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

const isDev = !app.isPackaged;

let serverProcess = null;
let mainWindow = null;

// ─── Auto Updater Setup ───────────────────────────────────────────────
let autoUpdater = null;
if (!isDev) {
  try {
    const { autoUpdater: updater, NsisUpdater } = require('electron-updater');
    autoUpdater = updater;

    // Set up logging for debugging update issues
    autoUpdater.logger = require('electron').app; // simple fallback
    autoUpdater.autoDownload = false; // We'll ask user first
    autoUpdater.autoInstallOnAppQuit = true;

    // ── Update Available: ask user ──
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '🚀 New Update Available!',
        message: `ViewStats v${info.version} is ready to download.`,
        detail: `You are on v${app.getVersion()}. The new version includes improvements and bug fixes.\n\nWould you like to download and install it now?`,
        buttons: ['Download Update', 'Later'],
        defaultId: 0,
        cancelId: 1,
        icon: path.join(__dirname, 'build/icon.png')
      }).then(({ response }) => {
        if (response === 0) {
          // Show downloading progress notification
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Downloading Update…',
            message: 'Update is being downloaded in the background.',
            detail: 'The app will notify you when it\'s ready to install. You can continue using the app normally.',
            buttons: ['OK'],
            defaultId: 0
          });
          autoUpdater.downloadUpdate();
        }
      });
    });

    // ── No Update: silently ignore ──
    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] App is up to date.');
    });

    // ── Download Progress ──
    autoUpdater.on('download-progress', (progress) => {
      if (mainWindow) {
        mainWindow.setProgressBar(progress.percent / 100);
        mainWindow.setTitle(`ViewStats — Downloading update… ${Math.round(progress.percent)}%`);
      }
    });

    // ── Downloaded: ask to restart ──
    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow) {
        mainWindow.setProgressBar(-1); // clear progress bar
        mainWindow.setTitle('ViewStats Desktop');
      }
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '✅ Update Ready to Install!',
        message: `ViewStats v${info.version} has been downloaded.`,
        detail: 'Restart the app now to apply the update, or do it later when you close the app.',
        buttons: ['Restart & Install Now', 'Install on Next Launch'],
        defaultId: 0,
        cancelId: 1,
        icon: path.join(__dirname, 'build/icon.png')
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
    });

    // ── Error Handling ──
    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err?.message || err);
    });

  } catch (e) {
    console.error('[AutoUpdater] Failed to load electron-updater:', e?.message);
  }
}

// Start the Express backend server
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  // Pass ELECTRON=true to force server.js to use AppData write permissions
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: '3001',
      ELECTRON: 'true',
      NODE_ENV: isDev ? 'development' : 'production'
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Express backend:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Enable hardware acceleration for smoother video playback
      backgroundThrottling: false,
    },
    title: 'ViewStats Desktop',
    autoHideMenuBar: !isDev,
    icon: path.join(__dirname, 'build/icon.png'),
    // Smooth rendering
    backgroundColor: '#0f0f11',
    show: false, // don't show until ready to avoid white flash
  });

  // Show window only when fully ready (prevents white flash on startup)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates after window is visible (2s delay to let app settle)
    if (!isDev && autoUpdater) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          console.error('[AutoUpdater] Check failed:', err?.message);
        });
      }, 2000);
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

app.whenReady().then(() => {
  startServer();
  createWindow();
});

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
