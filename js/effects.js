window.GameEffects = (() => {
  let finalTimer = 0;
  function confetti(isFinal = false) {
    if (GameUI.isReducedMotion?.()) return;
    const colors = ['#ed8099', '#e8c586', '#a1c9cb', '#8cbaa5', '#f2e0c9'];
    const count = isFinal ? 70 : 28;
    for (let i = 0; i < count; i++) {
      const element = document.createElement('i');
      element.className = 'confetti';
      element.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % colors.length]};width:6px;height:6px;animation-delay:${Math.random() * .6}s;animation-duration:${1.8 + Math.random()}s`;
      document.body.appendChild(element);
      setTimeout(() => element.remove(), 3600);
    }
  }
  function finalCelebration() {
    clearTimeout(finalTimer);
    confetti(true);
    finalTimer = setTimeout(() => confetti(false), 600);
  }
  return { confetti, finalCelebration };
})();
