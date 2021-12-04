import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import { download } from 'electron-dl';
import { Device } from './main/device';

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: any;

ipcMain.on('device-info', async (_) => {
  console.log('device-info');
  const device = new Device();
  try {
    await device.connect();
    const info = await device.getDeviceInfo();
    device.disconnect();
    _.sender.send('device-info-reply', null, info);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-info-reply', err, null);
  }
});

ipcMain.on('device-running-apps', async (_) => {
  console.log('device-running-apps');
  const device = new Device();
  try {
    await device.connect();
    const apps = await device.getRunningApps();
    device.disconnect();
    _.sender.send('device-running-apps-reply', null, apps);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-running-apps-reply', err, null);
  }
});

ipcMain.on('device-installed-apps', async (_) => {
  console.log('device-installed-apps');
  const device = new Device();
  try {
    await device.connect();
    const apps = await device.getInstalledApps();
    device.disconnect();
    _.sender.send('device-installed-apps-reply', null, apps);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-installed-apps-reply', err, null);
  }
});

ipcMain.on('device-install', async (_, url: string) => {
  console.log('device-install', url);
  const device = new Device();
  try {
    await device.connect();
    await device.installPackagedAppFromUrl(url, 'test');
    device.disconnect();
    _.sender.send('device-install-reply', null, null);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-install-reply', err, null);
  }
});

ipcMain.on('device-uninstall', async (_, appId: string) => {
  console.log('device-uninstall', appId);
  const device = new Device();
  try {
    await device.connect();
    await device.uninstallApp(appId);
    device.disconnect();
    _.sender.send('device-uninstall-reply', null);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-uninstall-reply', err, null);
  }
});

ipcMain.on('device-launch-app', async (_, appId: string) => {
  console.log('device-launch-app', appId);
  const device = new Device();
  try {
    await device.connect();
    await device.launchApp(appId);
    device.disconnect();
    _.sender.send('device-launch-app-reply', null);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-launch-app-reply', err, null);
  }
});

ipcMain.on('device-close-app', async (_, appId: string) => {
  console.log('device-close-app', appId);
  const device = new Device();
  try {
    await device.connect();
    await device.closeApp(appId);
    device.disconnect();
    _.sender.send('device-close-app-reply', null);
  } catch (err) {
    device.disconnect();
    _.sender.send('device-close-app-reply', err, null);
  }
});

ipcMain.on('open-url', async (_, url: string) => {
  console.log('open-url', url);
  try {
    await shell.openExternal(url);
    _.sender.send('open-url-reply', null);
  } catch (err) {
    _.sender.send('open-url-reply', err, null);
  }
});

ipcMain.on('download-url', async (_, url: string) => {
  console.log('download-url', url);
  try {
    const win = BrowserWindow.getFocusedWindow();
    await download(win, url, { saveAs: true });
    _.sender.send('download-url-reply', null);
  } catch (err) {
    _.sender.send('download-url-reply', err, null);
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

// const menuTemplate: any[] = [
//   {
//     label: 'Device',
//     submenu: [{ label: 'TODO' }],
//   },
// ];
// const isMac = process.platform === 'darwin';
// if (isMac) {
//   menuTemplate.unshift({
//     label: app.name,
//     submenu: [
//       { role: 'about' },
//       { type: 'separator' },
//       { role: 'services' },
//       { type: 'separator' },
//       { role: 'hide' },
//       { role: 'hideOthers' },
//       { role: 'unhide' },
//       { type: 'separator' },
//       { role: 'quit' },
//     ],
//   });
// }

const createWindow = (): void => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // console.log('details', details);

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: https://banana-hackers.gitlab.io; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
        ],
      },
    });
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 800,
    width: app.isPackaged ? 900 : 1400,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      // preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }

  // const menu = Menu.buildFromTemplate(menuTemplate);
  // Menu.setApplicationMenu(menu);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
