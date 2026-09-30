// Document Picture-in-Picture: pop the mini bar out into an always-on-top window,
// the closest a web page gets to living on the OS taskbar (Chrome/Edge 116+).

export const pipSupported = () => 'documentPictureInPicture' in window;

export async function openPip(stage, { width, height, onClose }) {
  const win = await window.documentPictureInPicture.requestWindow({ width, height });
  for (const link of document.querySelectorAll('link[rel="stylesheet"], link[href*="fonts.googleapis"]')) {
    const l = win.document.createElement('link');
    l.rel = 'stylesheet';
    l.href = link.href;
    win.document.head.appendChild(l);
  }
  win.document.title = 'Sếp Roi';
  win.document.body.className = 'pip mode-mini';
  win.document.body.appendChild(stage);
  win.addEventListener('pagehide', () => onClose(win), { once: true });
  return win;
}
