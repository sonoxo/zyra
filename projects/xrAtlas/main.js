const { app, BrowserWindow, shell } = require('electron');
const os = require('node:os');

const TARGET = process.env.XRATLAS_TARGET_URL || 'https://nukesimulation.com/';
const targetUrl = new URL(TARGET);
const DEBUG = process.env.XRATLAS_DEBUG === '1';

// Present the remote application with a normal Chromium-on-macOS user agent.
// Some WebGL / Maps stacks take different paths when they detect Electron.
const CHROME_VERSION = process.versions.chrome || '140.0.0.0';
const CHROME_UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`;
app.userAgentFallback = CHROME_UA;

// Keep Chromium on the accelerated WebGL path on Apple Silicon.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');

// Optional compatibility escape hatch. Leave off by default because Chromium
// normally selects the best ANGLE backend automatically on current macOS.
if (process.env.XRATLAS_FORCE_METAL === '1' && process.platform === 'darwin') {
  app.commandLine.appendSwitch('use-angle', 'metal');
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

function interestingHost(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host.includes('google') || host.includes('worldpop') || host.includes('nukesimulation');
  } catch (_) {
    return false;
  }
}

function installNetworkDiagnostics(ses) {
  if (ses.__xrAtlasDiagnosticsInstalled) return;
  ses.__xrAtlasDiagnosticsInstalled = true;

  ses.webRequest.onErrorOccurred({ urls: ['<all_urls>'] }, (details) => {
    if (!interestingHost(details.url)) return;
    console.error(`[xrAtlas/net] ${details.error} ${details.method} ${details.url}`);
  });

  ses.webRequest.onCompleted({ urls: ['<all_urls>'] }, (details) => {
    if (!interestingHost(details.url) || details.statusCode < 400) return;
    console.error(`[xrAtlas/http] ${details.statusCode} ${details.method} ${details.url}`);
  });
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
      webgl: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  win.removeMenu();
  win.webContents.setUserAgent(CHROME_UA);
  installNetworkDiagnostics(win.webContents.session);

  // F12 or Cmd+Option+I opens Chromium DevTools so failed tile requests can be
  // inspected without changing the production UI.
  win.webContents.on('before-input-event', (event, input) => {
    const devtoolsShortcut = input.key === 'F12' ||
      (input.key.toLowerCase() === 'i' && input.meta && input.alt);
    if (devtoolsShortcut) {
      event.preventDefault();
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

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

  win.webContents.on('console-message', (_event, ...args) => {
    let level;
    let message;
    let line;
    let sourceId;

    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      ({ level, message, lineNumber: line, sourceId } = args[0]);
    } else {
      [level, message, line, sourceId] = args;
    }

    if (!message || !/(webgl|three|tile|google|worldpop|error|fail|exception)/i.test(message)) return;
    console.error(`[xrAtlas/renderer:${level}] ${message} (${sourceId || 'unknown'}:${line || 0})`);
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(XRATLAS_BRANDING_SCRIPT, true).catch((error) => {
      console.error(`[xrAtlas] branding injection failed: ${error.message}`);
    });

    win.webContents.executeJavaScript(`({
      ua: navigator.userAgent,
      webgl: !!document.createElement('canvas').getContext('webgl2')
    })`, true).then((info) => {
      console.log(`[xrAtlas] renderer ua=${info.ua}`);
      console.log(`[xrAtlas] WebGL2=${info.webgl ? 'available' : 'unavailable'}`);
    }).catch(() => {});
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`[xrAtlas] load failed: ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  win.once('ready-to-show', () => {
    win.show();
    if (process.env.XRATLAS_FULLSCREEN === '1') win.setFullScreen(true);
    if (DEBUG) win.webContents.openDevTools({ mode: 'detach' });
  });

  // setUserAgent() above is intentional; do not pass Electron's default UA here.
  win.loadURL(TARGET);
}

app.whenReady().then(async () => {
  console.log(`[xrAtlas] platform=${process.platform} arch=${process.arch}`);
  console.log(`[xrAtlas] cpu=${os.cpus()[0]?.model || 'unknown'}`);
  console.log(`[xrAtlas] target=${targetUrl.origin}`);
  console.log(`[xrAtlas] Chromium=${CHROME_VERSION}`);

  try {
    const gpu = await app.getGPUInfo('basic');
    console.log(`[xrAtlas] gpu=${gpu.gpuDevice?.[0]?.deviceString || 'available'}`);
  } catch (_) {
    console.log('[xrAtlas] gpu=unavailable');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
