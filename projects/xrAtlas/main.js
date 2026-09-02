const { app, BrowserWindow, shell } = require('electron');
const os = require('node:os');

const TARGET = process.env.XRATLAS_TARGET_URL || 'https://nukesimulation.com/';
const targetUrl = new URL(TARGET);

// Apple Silicon / M2 friendly Chromium settings. Electron installs natively
// under arm64 Node; these switches keep WebGL/Three.js rendering GPU-backed.
if (process.arch === 'arm64' && process.platform === 'darwin') {
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');
}

app.setName('xrAtlas');

const XRATLAS_BRANDING_SCRIPT = String.raw`(() => {
  const FROM = 'NukeSimulation.com';
  const TO = 'xrAtlas';

  function replaceTextNode(node) {
    if (!node || !node.nodeValue || !node.nodeValue.includes(FROM)) return;
    node.nodeValue = node.nodeValue.split(FROM).join(TO);
  }

  function replaceAttributes(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of ['title', 'aria-label', 'alt']) {
      const value = el.getAttribute(attr);
      if (value && value.includes(FROM)) {
        el.setAttribute(attr, value.split(FROM).join(TO));
      }
    }
  }

  function applyBranding(root = document.documentElement) {
    if (!root) return;

    if (document.title !== TO) document.title = TO;

    if (root.nodeType === Node.TEXT_NODE) {
      replaceTextNode(root);
      return;
    }

    replaceAttributes(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) replaceTextNode(node);

    if (root.querySelectorAll) {
      root.querySelectorAll('[title], [aria-label], [alt]').forEach(replaceAttributes);
    }
  }

  applyBranding();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        replaceTextNode(record.target);
        continue;
      }
      if (record.type === 'attributes') {
        replaceAttributes(record.target);
        continue;
      }
      for (const added of record.addedNodes) applyBranding(added);
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label', 'alt']
  });
})();`;

function isAllowedRemote(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === targetUrl.hostname || parsed.hostname.endsWith(`.${targetUrl.hostname}`);
  } catch (_) {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1512,
    height: 982,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'xrAtlas',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#050505',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  win.removeMenu();

  // Keep remote content isolated from Node. Same-target navigation remains
  // inside xrAtlas; unrelated external links open in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedRemote(url)) {
      win.loadURL(url);
      return { action: 'deny' };
    }
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedRemote(url)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  win.webContents.on('did-finish-load', () => {
    // xrAtlas owns the desktop-shell branding. The upstream application is
    // still loaded live and remains attributed in this project's README.
    win.webContents.executeJavaScript(XRATLAS_BRANDING_SCRIPT, true).catch((error) => {
      console.error(`[xrAtlas] branding injection failed: ${error.message}`);
    });
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`[xrAtlas] load failed: ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  win.once('ready-to-show', () => {
    win.show();
    if (process.env.XRATLAS_FULLSCREEN === '1') win.setFullScreen(true);
  });

  win.loadURL(TARGET, { userAgent: win.webContents.getUserAgent() });
}

app.whenReady().then(() => {
  console.log(`[xrAtlas] platform=${process.platform} arch=${process.arch}`);
  console.log(`[xrAtlas] cpu=${os.cpus()[0]?.model || 'unknown'}`);
  console.log(`[xrAtlas] target=${targetUrl.origin}`);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
