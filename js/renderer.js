window.GameRenderer = (() => {
  'use strict';
  const W=384,H=576;
  const buffer=document.createElement('canvas');buffer.width=W;buffer.height=H;
  const g=buffer.getContext('2d',{alpha:false});
  const dark=document.createElement('canvas');dark.width=W;dark.height=H;
  const dg=dark.getContext('2d');
  let canvas,ctx,lastWidth=0,lastHeight=0,needsResize=true,resizeObserver;
  const previews=new WeakMap();
  function init(target){
    canvas=target;ctx=canvas.getContext('2d',{alpha:false});needsResize=true;
    if(resizeObserver)resizeObserver.disconnect();
    if(window.ResizeObserver){resizeObserver=new ResizeObserver(()=>{needsResize=true;});resizeObserver.observe(canvas);}
    resize();
  }
  window.addEventListener('resize',()=>{needsResize=true;});
  function resize(){
    if(!canvas||!needsResize)return;needsResize=false;
    const bounds=canvas.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1);
    const width=Math.max(W,Math.round((bounds.width||W)*dpr));
    const height=Math.max(H,Math.round((bounds.height||H)*dpr));
    if(width!==lastWidth||height!==lastHeight){canvas.width=width;canvas.height=height;lastWidth=width;lastHeight=height;}
    ctx.imageSmoothingEnabled=false;
  }
  function rectangle(x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function sparkle(x,y,color,size=2){rectangle(x-size,y,size*3,size,color);rectangle(x,y-size,size,size*3,color);}
  function lightRing(x,y,r,color,progress){
    g.fillStyle=color;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;g.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),progress>0.5?2:3,progress>0.5?2:3);}
  }
  function drawItems(items,time,reduced){
    for(const item of items||[]){
      const key=item.key||item.type||'heart',x=Math.round(item.x),y=Math.round(item.y);
      if(y<-50||y>H+35)continue;
      const bob=reduced?0:Math.round(Math.sin((item.age||0)*4+item.x)*1);
      const special=['golden','ring','shield','magnet','jackpot','gift'].includes(key);
      if(special){
        g.globalAlpha=.25;lightRing(x,y+bob,20+(reduced?0:Math.sin(time*3+item.x)*2),key==='golden'||key==='jackpot'?'#fff0b8':'#f8ecda',.8);g.globalAlpha=1;
      }
      PixelSprites.draw(g,key,x,y+bob,32,Math.floor((time+(item.age||0))*4));
      if(item.family==='bad'||item.family==='negative'){
        // A consistent danger pip is readable even when a sprite is unfamiliar.
        rectangle(x+11,y-15,5,5,'#743e59');rectangle(x+13,y-14,1,2,'#ffcea5');rectangle(x+13,y-11,1,1,'#ffcea5');
      }
    }
  }
  function drawParticles(particles,reduced){
    for(const p of particles||[]){
      const progress=p.maxLife?Math.max(0,Math.min(1,p.life/p.maxLife)):Math.max(0,Math.min(1,p.life||1));
      if(progress<=0)continue;g.globalAlpha=progress;
      const size=Math.max(1,Math.round(p.size||3));
      if(p.shape==='heart')PixelSprites.draw(g,'heart',p.x,p.y,16,0);
      else if(p.shape==='spark'||p.star)sparkle(p.x,p.y,p.color||'#fff0c7',Math.min(2,size));
      else rectangle(p.x,p.y,size,size,p.color||'#fff0c7');
    }
    g.globalAlpha=1;
  }
  function drawFloating(texts){
    g.textAlign='center';g.textBaseline='middle';
    for(const f of texts||[]){
      const alpha=f.maxLife?Math.min(1,f.life/f.maxLife*2):Math.min(1,f.life||1);g.globalAlpha=Math.max(0,alpha);
      g.font='bold 11px "Trebuchet MS", sans-serif';g.lineWidth=3;g.strokeStyle='#3f344c';
      g.strokeText(f.text,Math.round(f.x),Math.round(f.y));g.fillStyle=f.color||'#fff2c9';g.fillText(f.text,Math.round(f.x),Math.round(f.y));
    }
    g.globalAlpha=1;
  }
  function drawBlackout(player,time,reduced){
    dg.clearRect(0,0,W,H);dg.globalCompositeOperation='source-over';dg.fillStyle='rgba(22,22,43,.94)';dg.fillRect(0,0,W,H);
    dg.globalCompositeOperation='destination-out';
    const px=Math.round(player.x),py=Math.round(player.y-10),pulse=reduced?0:Math.sin(time*2)*2;
    // A generous spotlight reveals enough falling trajectory to keep the challenge fair.
    for(let i=0;i<4;i++){
      const radius=117-i*12+pulse;dg.fillStyle=`rgba(0,0,0,${.18+i*.2})`;
      for(let y=-Math.ceil(radius);y<radius;y+=6){const half=Math.floor(Math.sqrt(radius*radius-y*y)/6)*6;
        dg.fillRect(px-half,py+y,half*2,6);
      }
    }
    dg.globalCompositeOperation='source-over';g.drawImage(dark,0,0);
  }
  function drawEvent(event,time,player,reduced){
    if(!event)return;
    const key=event.key;
    if(key==='blackout'){drawBlackout(player,time,reduced);return;}
    if(key==='freeze'){
      rectangle(0,0,W,H,'rgba(150,209,231,.10)');
      for(let i=0;i<12;i++){const x=i*37%W,y=i*71%H;sparkle(x,y,'#c9eef0',2);}
      rectangle(0,0,3,H,'rgba(207,242,246,.55)');rectangle(W-3,0,3,H,'rgba(207,242,246,.55)');
    }
    if(key==='storm'){
      rectangle(0,0,W,H,'rgba(67,65,94,.13)');
      for(let i=0;i<40;i++){const x=(i*37+time*25)%W,y=(i*83+(reduced?0:time*220))%H;rectangle(x,y,1,6,'rgba(222,228,234,.45)');}
    }
    if(key==='love'||key==='jackpot'){
      for(let i=0;i<7;i++){const x=i%2?10:364,y=(i*89+(reduced?0:time*22))%H;g.globalAlpha=.6;PixelSprites.draw(g,key==='jackpot'?'golden':'heart',x,y,16,0);g.globalAlpha=1;}
    }
    if(key==='magnet'){
      const t=reduced?0:time;
      for(let j=0;j<2;j++){g.globalAlpha=.45;lightRing(player.x,player.y-10,42+(t*28+j*20)%40,'#ffe8bb',.8);}g.globalAlpha=1;
    }
  }
  function drawCelebration(time,reduced){
    const colors=['#f5a9b5','#f4d37c','#b5d8c0','#bdb0d6','#f7ebcb'];
    for(let i=0;i<55;i++){
      const x=(i*47+(reduced?0:Math.sin(time+i)*9))%W,y=(i*83+(reduced?0:time*(12+i%17)))%H;
      rectangle(x,y,i%3?2:4,i%3?4:2,colors[i%5]);
    }
  }
  function draw(view={}){
    if(!ctx)return;resize();g.imageSmoothingEnabled=false;
    const time=view.time||0,reduced=!!view.reducedMotion;
    const season=typeof view.season==='object'?view.season.key:view.season||'spring';
    const player=view.player||{x:192,y:508};
    g.save();
    if(view.shake&&!reduced){const power=typeof view.shake==='number'?Math.min(4,view.shake):2;g.translate(Math.round(Math.sin(time*71)*power),Math.round(Math.cos(time*53)*power*.6));}
    // Overscan color prevents shaken edges from revealing the previous frame.
    g.fillStyle='#a7bec5';g.fillRect(-8,-8,W+16,H+16);
    PixelSeasons.draw(g,season,time,{playerX:player.x,reducedMotion:reduced});
    if(view.previousSeason&&view.transition>0){
      const prev=typeof view.previousSeason==='object'?view.previousSeason.key:view.previousSeason;
      g.globalAlpha=Math.max(0,Math.min(1,view.transition));PixelSeasons.draw(g,prev,time,{playerX:player.x,reducedMotion:reduced});g.globalAlpha=1;
    }
    if(view.boss){
      PixelSprites.drawBoss(g,view.boss,time,reduced);
      const hp=Math.max(0,Math.min(1,view.boss.hp/Math.max(1,view.boss.maxHp)));
      rectangle(117,236,150,7,'#493951');rectangle(119,238,146,3,'#746075');rectangle(119,238,Math.floor(146*hp),3,view.boss.phase===3?'#e8bc90':'#d18a99');
      if(view.boss.telegraph&&view.boss.attackLanes){
        for(const lane of view.boss.attackLanes){rectangle(lane-25,270,50,198,'rgba(196,103,98,.09)');for(let y=283;y<465;y+=22)rectangle(lane-1,y,2,9,'rgba(246,204,153,.35)');}
      }
    }
    drawItems(view.items,time,reduced);
    if(view.ghost)PixelSprites.drawGhost(g,view.ghost.x,view.ghost.y,reduced?0:time,view.ghost.hearts||0);
    PixelSprites.drawCouple(g,player.x,player.y,{...player,time,reducedMotion:reduced,ghost:!!view.ghost,boss:!!view.boss,reaction:view.celebrate?'hug':player.reaction});
    drawParticles(view.particles,reduced);PixelSeasons.draw(g,season,time,{playerX:player.x,reducedMotion:reduced,foreground:true});
    drawEvent(view.event,time,player,reduced);drawFloating(view.floatingTexts);
    if(view.celebrate)drawCelebration(time,reduced);
    g.restore();
    ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
  }
  function renderPreview(target,season='spring'){
    if(!target)return;
    // The menu may request this every frame. Repaint only after layout/art changes.
    const stamp=`${target.clientWidth}:${target.clientHeight}:${season}:${window.devicePixelRatio||1}`;
    if(previews.get(target)===stamp)return;
    previews.set(target,stamp);const bounds=target.getBoundingClientRect();
    const width=Math.max(1,Math.round(bounds.width||384)),height=Math.max(1,Math.round(bounds.height||240));
    const dpr=Math.min(2,window.devicePixelRatio||1);target.width=Math.round(width*dpr);target.height=Math.round(height*dpr);
    const preview=document.createElement('canvas');preview.width=W;preview.height=H;const p=preview.getContext('2d');
    PixelSeasons.draw(p,season,7,{playerX:192,reducedMotion:true});
    PixelSeasons.draw(p,season,7,{reducedMotion:true,foreground:true});
    const output=target.getContext('2d');output.imageSmoothingEnabled=false;
    if(width/height>1.1){
      // Compose a separate landscape crop, so mobile hero art never squashes the sprites.
      const cropH=Math.min(H,Math.round(W*height/width));
      output.drawImage(preview,0,Math.max(0,345-cropH/2),W,cropH,0,0,target.width,target.height);
      output.save();const scale=target.width/W;output.scale(scale,scale);
      PixelSprites.drawCouple(output,192,cropH-37,{time:2,reaction:'hug',reducedMotion:true});
      PixelSprites.draw(output,'golden',137,cropH-80,32,1);PixelSprites.draw(output,'heart',246,cropH-92,32,1);
      output.restore();
    }else{
      PixelSprites.drawCouple(p,192,508,{time:2,reaction:'hug',reducedMotion:true});
      PixelSprites.draw(p,'heart',152,390,32,1);PixelSprites.draw(p,'golden',250,339,32,1);PixelSprites.draw(p,'lock',92,298,32,1);
      output.drawImage(preview,0,0,target.width,target.height);
    }
  }
  function renderIcon(target,size=512){
    target.width=size;target.height=size;
    const icon=document.createElement('canvas');icon.width=96;icon.height=96;const p=icon.getContext('2d');
    p.imageSmoothingEnabled=false;
    p.fillStyle='#33364f';p.fillRect(0,0,96,96);
    p.fillStyle='#38465a';p.fillRect(8,8,80,80);
    p.fillStyle='#466369';p.fillRect(14,14,68,68);
    p.fillStyle='#608779';p.fillRect(18,48,60,34);
    p.fillStyle='#a6b58d';p.fillRect(18,76,60,6);
    p.fillStyle='#e3cda6';p.fillRect(18,18,2,8);p.fillRect(18,18,8,2);p.fillRect(76,18,2,8);p.fillRect(70,18,8,2);
    p.fillRect(18,70,2,8);p.fillRect(18,76,8,2);p.fillRect(76,70,2,8);p.fillRect(70,76,8,2);
    PixelSprites.draw(p,'heart',48,27,32,0);
    p.save();p.translate(48,59);p.scale(.75,.75);PixelSprites.drawCouple(p,0,0,{time:1,reaction:'hug',hideReactionHeart:true,reducedMotion:true});p.restore();
    const out=target.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(icon,0,0,size,size);
  }
  return{init,draw,renderPreview,renderIcon,width:W,height:H};
})();
