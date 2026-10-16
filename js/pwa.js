window.GamePWA = (() => {
  let installPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateInstallUi() {
    const button = document.getElementById('installBtn');
    if (!button) return;
    button.hidden = isStandalone();
  }

  function showInstallHelp() {
    const overlay = document.getElementById('installOverlay');
    const steps = document.getElementById('installSteps');
    const nativeButton = document.getElementById('nativeInstallBtn');
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (installPrompt) {
      steps.innerHTML = '<li>Kliknij „Zainstaluj teraz”.</li><li>Potwierdź instalację w oknie przeglądarki.</li>';
      nativeButton.hidden = false;
    } else if (isiOS) {
      steps.innerHTML = '<li>Dotknij przycisku Udostępnij <b>□↑</b> w Safari.</li><li>Wybierz „Do ekranu początkowego”, a potem „Dodaj”.</li>';
      nativeButton.hidden = true;
    } else {
      steps.innerHTML = '<li>Otwórz menu przeglądarki.</li><li>Wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</li>';
      nativeButton.hidden = true;
    }
    overlay.classList.add('show');
  }

  async function install() {
    if (!installPrompt) return showInstallHelp();
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.getElementById('installOverlay').classList.remove('show');
    updateInstallUi();
  }

  function updateOnlineStatus() {
    const toast = document.getElementById('offlineToast');
    if (!toast) return;
    toast.classList.toggle('show', !navigator.onLine);
  }

  function init() {
    const installButton = document.getElementById('installBtn');
    const nativeButton = document.getElementById('nativeInstallBtn');
    const closeButton = document.getElementById('closeInstallBtn');
    installButton?.addEventListener('click', showInstallHelp);
    nativeButton?.addEventListener('click', install);
    closeButton?.addEventListener('click', () => document.getElementById('installOverlay').classList.remove('show'));
    document.getElementById('installOverlay')?.addEventListener('click', event => {
      if (event.target.id === 'installOverlay') event.currentTarget.classList.remove('show');
    });
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      updateInstallUi();
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      updateInstallUi();
    });
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateInstallUi();
    updateOnlineStatus();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('PWA: rejestracja offline nie powiodła się', error));
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init, install, isStandalone };
})();
