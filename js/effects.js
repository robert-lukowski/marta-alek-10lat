window.GameEffects = (() => {
  function rand(a, b) { return a + Math.random() * (b - a); }

  function addHeartParticles(list, x, y, amount=7, colorA='#ff6fae', colorB='#ffd47a') {
    for (let i = 0; i < amount; i++) {
      list.push({ x, y, vx: rand(-34, 34), vy: rand(-134, -60), life: rand(.45, .9), age: 0, size: rand(10, 18), hue: i % 2 ? colorA : colorB });
    }
  }
  function addFloatingText(list, text, x, y, color='#fff7e8', size=20) {
    list.push({ text, x, y, color, size, age:0, life:.85, vy:-52 });
  }
  function update(popParticles, floatingTexts, dt) {
    for (const p of popParticles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; }
    for (const f of floatingTexts) { f.age += dt; f.y += f.vy * dt; }
    return {
      popParticles: popParticles.filter(p => p.age < p.life),
      floatingTexts: floatingTexts.filter(f => f.age < f.life)
    };
  }
  function draw(ctx, popParticles, floatingTexts) {
    for (const p of popParticles) {
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = alpha; ctx.font = `${p.size}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = p.hue; ctx.fillText('❤', 0, 0); ctx.restore();
    }
    for (const f of floatingTexts) {
      const alpha = Math.max(0, 1 - f.age / f.life);
      ctx.save(); ctx.globalAlpha = alpha; ctx.font = `900 ${f.size}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,7,14,.45)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); ctx.restore();
    }
  }
  function confetti(isFinal=false) {
    const colors = ['#ff6fae','#ffd47a','#79e0ff','#77df9a','#ff4f66','#ffffff'];
    const pieces = isFinal ? 190 : 82;
    for(let i=0;i<pieces;i++) {
      const d = document.createElement('div');
      d.className='confetti';
      d.style.left = Math.random()*100+'vw';
      d.style.background = colors[i%colors.length];
      d.style.width = (isFinal ? rand(8, 15) : rand(8, 11)) + 'px';
      d.style.height = (isFinal ? rand(12, 24) : rand(12, 16)) + 'px';
      d.style.animationDuration = (isFinal ? rand(1.8, 3.6) : rand(1.5, 2.4)) + 's';
      d.style.animationDelay = Math.random()*.55+'s';
      d.style.transform = `rotate(${Math.random()*360}deg)`;
      d.style.opacity = String(rand(.72, 1));
      document.body.appendChild(d);
      setTimeout(()=>d.remove(),4200);
    }
  }
  function finalCelebration() {
    confetti(true);
    setTimeout(() => confetti(false), 650);
  }
  return { addHeartParticles, addFloatingText, update, draw, confetti, finalCelebration };
})();
