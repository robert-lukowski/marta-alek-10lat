/* Original, hand-pixelled artwork. The atlas is generated once, never per frame. */
window.PixelSprites = (() => {
  'use strict';
  const ink = '#28243d';
  const palette = {
    o:ink, d:'#7e315d', r:'#da487d', p:'#ff76a7', l:'#ffacc5', w:'#fff4e6',
    a:'#9a5b32', g:'#e5a63c', y:'#ffda70', c:'#fff2b0', b:'#326a8c',
    t:'#4cb6b4', s:'#96e1d0', n:'#465274', u:'#7783b2', v:'#ada8db',
    k:'#b4644e', f:'#e7ac87', h:'#ffd4a5', e:'#22243c', z:'#dce7f0'
  };
  const designs = {
    heart:[
      '................','..oooo...oooo...','.odrrdo.odrrdo..','odrplrrordrrrdo.',
      'orplllprrrprrdo.','orplwlpprrprrdo.','orpllpprrrprrdo.','odpppprrrprrdo..',
      '.odppprrprrdo...','..odppprrrdo....','...odpprrdo.....','....odrrdo......',
      '.....oddo.......','......oo........','................','................'
    ],
    golden:[
      '................','..oooo...oooo...','.oaggao.oaggao..','oagcyggogggaao..',
      'ogcwwcygyyggao..','ogywwcyyyygaao..','ogyyyyyyyygaao..','oagyyyyyygaao...',
      '.oagyyyyggao....','..oagyyggao.....','...oagggao......','....oagao.......',
      '.....oao........','......o.........','................','................'
    ],
    lock:[
      '.....oooooo.....','....oayyyyao....','...oayoooo yao...'.replace(' ',''),'...oyoo..ooyo...',
      '...oyoo..ooyo...','..ooaooooooaoo..','.oayyyyyyyyyyao.','.oyccyyyyyyyygo.',
      '.oyccyyyoyyyygo.','.oyyyyyoooyyygo.','.oyyyyyoooyyygo.','.oyyyyyyoyyyygo.',
      '.oagyyyyyyyygao.','..oaggggggggao..','...oooooooooo...','................'
    ],
    star:[
      '.......oo.......','......ogyo......','......ogco......','.....ogccyo.....',
      '.ooooogccyooooo.','ogyyyyyccyyyyygo','.ogcwwccccygao..','..ogccccccygo...',
      '...ogccccygo....','...ogcyycygo....','..ogcygooycgo...','..ogyo....oygo..',
      '..ooo......ooo..','................','................','................'
    ],
    ring:[
      '......oooo......','.....obssbo.....','....obwzzsbo....','.....obzzbo.....',
      '......obbo......','....oooggooo....','...ogccyyyggo...','..ogcooooooygo..',
      '..ocyo....oygo..','..ocgo....oggo..','..oygo....ogao..','..oggo....ogao..',
      '...ogyoooogao...','....ogggggao....','.....oooooo.....','................'
    ],
    camera:[
      '................','.....oooooo.....','....onvvvvno....','..oooooooooooo..',
      '.onuvvvvvvvvuno.','.ovwwvvnnvvvuuo.','.ovwwvnbb nvvuo.'.replace(' ',''),'.ovvvnbssbnvuuo.',
      '.ovvnbwsstbnvuo.','.ouunbstttbnuuo.','.ouunbbttbbnuuo.','.onuunbbbbnuuno.',
      '..onnnunnunnno..','...oooooooooo...','................','................'
    ],
    magnet:[
      '................','..oooo....oooo..','.obzzbo..obzzbo.','.obzzbo..obzzbo.',
      '.obbbbo..obbbbo.','.odrrdo..odrrdo.','.orppro..orppro.','.orppro..orppro.',
      '.orppro..orppro.','.odrpro..orprdo.','..odrproorprdo..','...odrpppprdo...',
      '....odrrrrdo....','.....oooooo.....','................','................'
    ],
    shield:[
      '.......oo.......','.....oobb oo.....'.replace(' ',''),'...oobsttsboo...','.oobstswsttsboo.',
      '.obtswwwwsttsbo.','.obtswwwwsttsbo.','.obttsw wstttsbo.'.replace(' ',''),'.obttsw wstttsbo.'.replace(' ',''),
      '..obtswwwstsbo..','..obttswsttsbo..','...obttsttsbo...','....obtttsbo....',
      '.....obtsbo.....','......obbo......','.......oo.......','................'
    ],
    clock:[
      '......oooo......','......oyyo......','....oobbbboo....','...obzzwwzzbo...',
      '..obzwwoowzzbo..','.obzwwwoowwzzbo.','.ozwwwwoowwwzzo.','.ozwwwwoooowzzo.',
      '.ozwwwwwoowwzzo.','.obzwwwwwwwzzbo.','..obzzwwwwzzbo..','...obzzzzzzbo...',
      '....oobbbboo....','......oooo......','................','................'
    ],
    gift:[
      '...oooo..oooo...','..ogccgoogccgo..','..ogcygoogcygo..','...ogyyyyygo....',
      '.oooooyyyoooooo.','odrrrgyyygrrrrdo','orpppgyyygppprro','ooooooyyyooooooo',
      '.orppgyyygprrro.','.orplgycygprrro.','.orplgycygprrro.','.orppgyyygprrro.',
      '.odrrgyyygrrrdo.','..oooooooooooo..','................','................'
    ],
    jackpot:[
      '...o........o...','..oyoo.oo.ooyo..','..oycyoyyoycyo..','..oyccyyyyccyo..',
      '...ogyyyyyygo...','...oggggggggo...','..oooaaaaaaooo..','.oayccyyyyyygao.',
      '.oyccoo y oyygo..'.replace(/ /g,''),'.oycyogyyogyygo.','.oyyyoyyyoyyygo.','.oayyyyyyyyygao.',
      '..oaaggggggaao..','...oooooooooo...','................','................'
    ],
    broken:[
      '................','..oooo...oooo...','.oddddo.odd ddo..'.replace(' ',''),'odrprdo.odrrrdo.',
      'orplprdo.odrrdo.','orppprdo.odrrdo.','orppdo..odrrrdo.','odrdo..odrrrdo..',
      '.odo..odrrrdo...','..oo.odrrrdo....','....odrrrdo.....','....odrrdo......',
      '.....oddo.......','......oo........','................','................'
    ],
    drama:[
      '..........y.....','........cyyc....','.........ya.....','........oa......',
      '......oonoo.....','....oonunnnoo...','...onuvunnnnno..','..onuvvunnnnnno.',
      '..ouvwwunnnnnno.','..ouuvunnnnnnno.','..onuuunnnnnndo.','...onnnnnnnndo..',
      '....onndddddo...','.....ooooooo....','................','................'
    ],
    bill:[
      '...oooooooooo...','...ozwwwwwwzo...','...ozwwwwwwzo...','...ozooowwwzo...',
      '...ozwwwwwwzo...','...oznnnnnwzo...','...ozwwwwwwzo...','...oznnnnwwzo...',
      '...ozwwwwwwzo...','...ozwrrrrwzo...','...ozwrwwrwzo...','...ozwrrrrwzo...',
      '...ozwwwwwwzo...','...ozowooowzo...','....o.o..o.o....','................'
    ],
    alarm:[
      '..oooo....oooo..','.odrrdo..odrrdo.','.orrdooooddrro..','..oodrrrrrdoo...',
      '...orzzzzzzro...','..orzwwooowzro..','.orzwwwoowwwzro.','.orzwwwoowwwzro.',
      '.orzwwwooowwzro.','.orzwwwwwwwwzro.','..orzwwwwwwzro..','...orzzzzzzro...',
      '..oodrrrrrrdoo..','..oaooooooooao..','..oo........oo..','................'
    ],
    storm:[
      '.....oooooo.....','....ouuvvvno....','..oouuvvvvvnoo..','.ouuvvvvvvvvuno.',
      'ouvvvvvvvvvvuuno','ouuuvuvvvvvuuuno','.onnnnnnnnnnnno.','..oooooooooooo..',
      '......oyygo.....','.....oyygo......','....oyyyyo......','......oyyo......',
      '.....oyyo.......','.....oyo........','.....oo.........','................'
    ],
    laundry:[
      '.....oooooo.....','....ovvvvvvo....','..oovwwvvvvoo...','.otsssvvvvvvto..',
      '.otswssvvvttsto.','oootsssvoootttoo','oaygggggggggggao','ogcyyyyyyyyyyygo',
      '.ogoooyoooyyogo.','.ogyoyoyoyoyygo.','.ogyoooyoooyygo.','.ogyoyoyoyoyygo.',
      '..oggggggggggo..','...oooooooooo...','................','................'
    ],
    fake:[
      '................','..oooo...oooo...','.onvvno.onvvno..','onvwwvvonvvvuno.',
      'ovwwwwvvvvvvuno.','ovwvovvvvvovuno.','ovvvovvvvvovuno.','onvvvvvvvvvuno..',
      '.onvvvoovvuno...','..onvovvouno....','...onvvvuno.....','....onvuno......',
      '.....onno.......','......oo........','................','................'
    ],
    ghost:[
      '.....oooooo.....','...oozzzzzzoo...','..ozwwwwwwwzzo..','.ozwwwwwwwwwzzo.',
      '.ozwwwowowwwwzo.','ozwwwwoooowwwwzo','ozwwwwowowwwwwzo','ozwwwppwwppwwwzo',
      'ozwwwwwowwwwwwzo','ozwwwwwoowwwwwzo','ozwwwwwwwwwwwwzo','.ozwwwwwwwwwwzo.',
      '.ozwzzzzzzzzwzo.','.ozozzoozzozzo..','..o.oo..oo.oo...','................'
    ],
    hazard:[
      '.......oo.......','......obbo......','.....obssbo.....','.....obszbo.....',
      '....obzszsbo....','...obzzszssbo...','...obzzszssbo...','..obzzwszsssbo..',
      '..obzwwszsssbo..','.obzzwzszssstbo.','.obzzzzszssttbo.','obzzzzzszsttttbo',
      'obssssssssstttbo','.obbbbbbbbbbbbo.','..oooooooooooo..','................'
    ]
  };

  const cache = new Map();
  function canvas(w,h) { const c=document.createElement('canvas');c.width=w;c.height=h;return c; }
  function pixelGrid(rows,colors=palette) {
    const c=canvas(Math.max(...rows.map(r=>r.length)),rows.length),g=c.getContext('2d');
    rows.forEach((row,y)=>{[...row].forEach((v,x)=>{if(colors[v]){g.fillStyle=colors[v];g.fillRect(x,y,1,1);}});});
    return c;
  }
  function sprite(key) {
    if(!cache.has(key)) cache.set(key,pixelGrid(designs[key]||designs.heart));
    return cache.get(key);
  }
  function draw(ctx,key,x,y,size=32,frame=0) {
    const art=sprite(key); ctx.imageSmoothingEnabled=false;
    const s=Math.max(1,Math.round(size/16)),w=art.width*s,h=art.height*s;
    ctx.drawImage(art,Math.round(x-w/2),Math.round(y-h/2),w,h);
    if((key==='golden'||key==='star'||key==='jackpot'||key==='ring')&&frame%4<2){
      ctx.fillStyle='#fff4cf';const sx=Math.round(x+w*.39),sy=Math.round(y-h*.29);
      ctx.fillRect(sx-2,sy,6,2);ctx.fillRect(sx,sy-2,2,6);
    }
  }

  // Twenty-pixel-wide characters share a readable outline, but not a silhouette.
  const characterPalette={o:ink,h:'#593c44',a:'#895046',b:'#bc7355',c:'#edab75',
    f:'#efb08d',l:'#ffcf9b',w:'#fff4dc',e:'#2d2b45',r:'#cc6177',p:'#ec7fa3',
    q:'#ffacc0',s:'#8b456b',t:'#398994',u:'#64b5b1',v:'#aad8c1',
    n:'#34405d',d:'#526384',g:'#7587a0',y:'#eac879'};
  const marta=[
    '.......oooooo.......','.....oohhhhaaoo.....','....ohhhaaabbbao....',
    '...ohhaaabbbccbao...','...ohaabbbcccbbao...','..ohhaabbbaabbbao...',
    '..ohhaafflllllbao...','..ohhafflllllllao...','..ohhaffelllellao...',
    '..ohhaffelllellao...','..ohhaffrlllrllao...','..ohhaffllwlllfao...',
    '..ohhaaofflllloao...','..ohhaaoofffooaao...','...ohaosqqqqqsoao...',
    '....oosqpppppqsoo...','...ofosqppwppqsofo..','...ofospppwpppsofo..',
    '...ofospppwpppsofo..','...offospppppsoffo..','....oospppppppsoo...',
    '.....ospppppppso....','.....ospppppppso....','.....ossssssssso....',
    '......oflooflo......','......oflooflo......','......oflooflo......',
    '.....ooddoo ddoo....'.replace(' ',''),'.....oooo..oooo.....'
  ];
  const alek=[
    '......ooooooo.......','.....ohhhhhhhoo.....','....ohhaaahhaaho....',
    '....ohhaaaahhaaho...','....ohhaaaffffho....','....ohhaffllllfo....',
    '....ohhffllllllfo...','....ohffelllellfo...','....offfelllellfo...',
    '....offfllfllllfo...','.....offhllllhfo....','.....offhhwwhhho....',
    '......ohhhhh hho.....'.replace(' ',''),'......oohhhhhoo.....','.....ootvvwvttoo....',
    '....ootuuvwvuttuoo..','...ofotuuvwvuttuofo.','...ofotuutwtuutuofo.',
    '...ofotuutwtuutuofo.','...offottutttttoffo.','....ooottutttttoo...',
    '......ottttttto.....','......onnnnnnno.....','......ondondno......',
    '......ondondno......','......ondondno......','......ondondno......',
    '.....oonnoonnno.....','.....oooo.ooooo.....'
  ];
  function person(kind,frame,reaction) {
    const id=`${kind}-${frame}-${reaction}`;if(cache.has(id)) return cache.get(id);
    const c=canvas(24,32),g=c.getContext('2d'),rows=kind==='marta'?marta:alek;
    g.drawImage(pixelGrid(rows,characterPalette),2,1);
    const rr=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    // A clean two-frame walk redraws only the legs, leaving the detailed silhouette intact.
    if(frame===1||frame===2){
      g.clearRect(5,25,17,7);let leg=kind==='marta'?'#efb08d':'#526384';
      rr(8,25,4,3,ink);rr(9,25,2,2,leg);rr(14,25,4,3,ink);rr(15,25,2,2,leg);
      const a=frame===1?-2:2,b=-a;
      rr(8+a,27,4,3,ink);rr(9+a,27,2,2,leg);rr(7+a,30,5,1,ink);
      rr(14+b,27,4,2,ink);rr(15+b,27,2,1,leg);rr(14+b,29,5,2,ink);
    }
    const ey=kind==='marta'?9:8;
    if(reaction==='scared'||reaction==='hit') {
      rr(kind==='marta'?10:9,ey,3,3,'#fff4dc');rr(kind==='marta'?14:13,ey,3,3,'#fff4dc');
      rr(kind==='marta'?11:10,ey+1,1,2,ink);rr(kind==='marta'?15:14,ey+1,1,2,ink);
      rr(13,ey+4,2,2,ink);
      rr(21,4,1,4,'#96e1d0');rr(20,8,3,2,'#96e1d0');
    } else if(reaction==='collect'||reaction==='hug') {
      rr(kind==='marta'?10:9,ey,3,2,characterPalette.l);rr(kind==='marta'?14:13,ey,3,2,characterPalette.l);
      rr(kind==='marta'?10:9,ey,3,1,ink);rr(kind==='marta'?14:13,ey,3,1,ink);
      rr(12,ey+4,3,1,'#fff4dc');
    } else if(reaction==='blink') {
      rr(kind==='marta'?10:9,ey,3,2,characterPalette.l);rr(kind==='marta'?14:13,ey,3,2,characterPalette.l);
      rr(kind==='marta'?10:9,ey+1,3,1,ink);rr(kind==='marta'?14:13,ey+1,3,1,ink);
    }
    if(reaction==='hug'){
      rr(kind==='marta'?17:2,17,6,3,characterPalette.f);
      rr(kind==='marta'?17:2,20,6,1,ink);
    }
    cache.set(id,c);return c;
  }
  function drawCouple(ctx,x,y,options={}) {
    const t=options.time||0,moving=Math.abs(options.velocity||0)>12;
    const frame=options.reducedMotion?0:moving?1+Math.floor(t*9)%2:0;
    let reaction=typeof options.reaction==='object'?options.reaction.type:options.reaction;
    if(options.ghost&&!reaction) reaction='scared';
    if(!reaction&&Math.floor(t*3)%17===0) reaction='blink';
    const hug=reaction==='hug'||reaction==='celebrate';if(hug) reaction='hug';
    const bob=options.reducedMotion?0:moving?(Math.floor(t*9)%2):Math.floor(t*1.8)%2;
    const separation=hug?11:17;
    ctx.fillStyle='rgba(26,31,55,.24)';ctx.fillRect(Math.round(x-32),Math.round(y+27),64,5);
    ctx.fillRect(Math.round(x-25),Math.round(y+32),50,2);
    if(options.shield){
      ctx.strokeStyle='#a6f5d9';ctx.lineWidth=2;ctx.setLineDash([5,4]);
      ctx.strokeRect(Math.round(x-40),Math.round(y-41),80,77);ctx.setLineDash([]);
      ctx.fillStyle='rgba(117,220,202,.08)';ctx.fillRect(Math.round(x-38),Math.round(y-39),76,73);
    }
    const ma=person('marta',frame,reaction||'idle'),al=person('alek',frame,reaction||'idle');
    ctx.drawImage(al,Math.round(x+separation-24),Math.round(y-33-bob),48,64);
    ctx.drawImage(ma,Math.round(x-separation-24),Math.round(y-32-bob),48,64);
    // Their hands meet in the middle, including while running.
    ctx.fillStyle='#ffd4a5';ctx.fillRect(Math.round(x-5),Math.round(y+4-bob),10,4);
    if((hug||reaction==='collect')&&!options.hideReactionHeart) draw(ctx,'heart',x,y-49-(options.reducedMotion?0:Math.sin(t*5)*2),16,0);
    if(options.ring) { draw(ctx,'ring',x+34,y-33,16,Math.floor(t*4)); }
  }

  function drawGhost(ctx,x,y,time,hearts=0) {
    const bob=Math.round(Math.sin(time*3)*3);ctx.save();ctx.globalAlpha=.9;
    draw(ctx,'ghost',x,y+bob,48,0);ctx.restore();
    for(let i=0;i<3;i++){ctx.globalAlpha=i<hearts?1:.25;draw(ctx,'golden',x-16+i*16,y-31+bob,16,Math.floor(time*4));}ctx.globalAlpha=1;
  }
  const bossCache=new Map();
  function bossSprite(phase) {
    if(bossCache.has(phase))return bossCache.get(phase);
    const c=canvas(116,76),g=c.getContext('2d');
    const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    // A grumpy washing-machine golem with a chimney of bills, clock shoulder and sock arm.
    r(19,27,79,42,ink);r(16,31,85,32,ink);r(21,24,75,44,ink);
    r(23,27,70,36,phase===3?'#7e567e':'#626783');r(23,27,70,7,'#9494af');
    r(25,29,65,3,'#b9afc4');r(24,36,67,25,phase===3?'#9b688b':'#7c7d98');
    r(27,38,58,21,'#a2a0b5');r(28,39,56,3,'#b7b2c4');
    r(36,42,39,23,ink);r(40,39,31,29,ink);r(39,43,33,21,'#45506c');
    r(43,42,25,24,'#849cb0');r(45,44,21,20,'#405876');r(46,46,20,3,'#597c9a');
    r(47,49,16,13,'#546783');r(49,50,5,4,'#a9bfd0');r(57,57,6,4,'#7b94ae');
    r(27,31,7,4,'#b6ead4');r(77,29,9,6,'#28243d');r(79,30,5,3,'#ffda70');
    r(35,31,5,3,'#566078');r(43,31,5,3,'#566078');
    r(23,64,18,5,ink);r(75,64,18,5,ink);r(21,69,23,5,ink);r(73,69,23,5,ink);
    r(24,69,17,2,'#9d82a6');r(76,69,17,2,'#9d82a6');
    r(9,36,15,12,ink);r(5,43,16,15,ink);r(8,44,11,11,'#7c7d98');
    r(3,54,19,9,ink);r(5,56,14,4,'#b4a3ba');
    r(94,36,13,13,ink);r(99,43,12,15,ink);r(100,45,8,10,'#7c7d98');
    r(98,55,15,9,ink);r(100,57,11,4,'#b4a3ba');
    // Sock crown and paper wings read as absurd domestic clutter.
    r(31,15,14,12,ink);r(33,16,9,9,'#e8abb5');r(32,16,10,3,'#fff4dc');
    r(43,11,16,15,ink);r(45,12,12,12,'#dce7f0');r(46,15,9,2,'#8e92ac');r(46,19,7,2,'#8e92ac');
    r(57,16,15,10,ink);r(59,17,11,8,'#96c7b7');
    r(62,10,13,9,ink);r(64,11,9,7,'#96c7b7');
    draw(g,'alarm',81,19,24,0);draw(g,'bill',17,25,24,0);
    if(phase>=2){draw(g,'bill',4,18,16,0);draw(g,'bill',103,19,16,0);}
    if(phase===3){draw(g,'broken',57,51,24,0);}else{
      r(45,48,7,3,'#ffdb8a');r(60,48,7,3,'#ffdb8a');
      r(44,46,8,2,ink);r(60,46,8,2,ink);r(49,57,14,2,ink);r(53,55,6,2,ink);
    }
    bossCache.set(phase,c);return c;
  }
  function drawBoss(ctx,boss,time,reducedMotion=false) {
    const phase=boss.phase||1,bob=reducedMotion?0:Math.round(Math.sin(time*2)*3),x=192,y=78+bob;
    ctx.fillStyle='rgba(38,32,58,.13)';ctx.fillRect(82,y+113,220,8);
    ctx.drawImage(bossSprite(phase),x-116,y,232,152);
    if(boss.telegraph){
      const attackX=boss.attackX??192,alpha=.12+Math.sin(time*6)*.04;
      ctx.fillStyle=`rgba(255,160,107,${alpha})`;ctx.fillRect(Math.round(attackX-29),y+148,58,365-y);
      ctx.fillStyle='#ffe2a3';for(let i=0;i<6;i++)ctx.fillRect(Math.round(attackX-22+i*8),454,4,3);
    }
  }
  return {draw,drawCouple,drawGhost,drawBoss,sprite,keys:Object.keys(designs)};
})();
