window.GameHaptics = (() => {
  const key = GameConfig.keys.haptics;
  let enabled = (localStorage.getItem(key) || '1') !== '0';

  function supported() {
    return typeof navigator.vibrate === 'function';
  }

  function pulse(pattern) {
    if (!enabled || !supported()) return false;
    return navigator.vibrate(pattern);
  }

  function setEnabled(value) {
    enabled = !!value;
    localStorage.setItem(key, enabled ? '1' : '0');
    if (!enabled && supported()) navigator.vibrate(0);
    return enabled;
  }

  function toggle() { return setEnabled(!enabled); }
  function isEnabled() { return enabled; }

  return {
    supported,
    pulse,
    setEnabled,
    toggle,
    isEnabled,
    light: () => pulse(12),
    good: () => pulse(18),
    power: () => pulse([24, 34, 28]),
    bad: () => pulse(75),
    warning: () => pulse([35, 45, 35]),
    fail: () => pulse([110, 70, 130]),
    success: () => pulse([25, 45, 25, 45, 70]),
    final: () => pulse([40, 45, 70, 55, 120])
  };
})();
