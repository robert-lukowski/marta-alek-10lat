/* Original layered pixel landscapes, painted once and animated with small overlays. */
window.PixelSeasons = (() => {
  'use strict';
  const W=384,H=576,cache=new Map();
  const list=[
    {key:'spring',name:'Wiosna',subtitle:'Serca na molo',color:'#a7d4bd'},
    {key:'summer',name:'Lato',subtitle:'Jeszcze jeden zachód',color:'#efb07c'},
    {key:'autumn',name:'Jesień',subtitle:'Ręka w rękę',color:'#d99c72'},
    {key:'winter',name:'Zima',subtitle:'Razem jest cieplej',color:'#b3c9df'}
  ];
  const rand=(seed)=>{let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};};
  function box(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function shape(g,points,color){g.fillStyle=color;g.beginPath();g.moveTo(...points[0]);points.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.fill();}
  function sky(g,colors,end=300){
    const rgb=colors.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
    // A restrained stepped palette avoids large flat bands while retaining pixel texture.
    for(let y=0;y<end;y+=12){
      const mix=y/end*(rgb.length-1),a=Math.floor(mix),b=Math.min(a+1,rgb.length-1),t=mix-a;
      const shade=rgb[a].map((v,i)=>Math.round(v+(rgb[b][i]-v)*t));
      box(g,0,y,W,Math.min(12,end-y),`rgb(${shade.join(',')})`);
    }
  }
  function cloud(g,x,y,scale=1,color='#fff1da'){
    [[0,8,45,8],[7,3,31,14],[14,0,17,17],[38,10,14,6]].forEach(p=>box(g,x+p[0]*scale,y+p[1]*scale,p[2]*scale,p[3]*scale,color));
  }
  function bush(g,x,y,size,colors,seed=5){
    const r=rand(seed),unit=Math.max(3,Math.round(size/9));
    for(let row=0;row<7;row++)for(let col=0;col<10;col++){
      const dx=(col-4.5)/4.8,dy=(row-3.4)/3.7;
      if(dx*dx+dy*dy<1+r()*.15){
        const shade=row>4?0:row<2?2:1;
        box(g,x+col*unit,y+row*unit,unit+1,unit+1,colors[Math.max(0,Math.min(colors.length-1,shade+(r()>.8?1:0)))]);
      }
    }
    for(let i=0;i<size*.9;i++){
      let xx=r()*size,yy=r()*size*.67;
      if(((xx-size/2)/(size*.46))**2+((yy-size*.35)/(size*.3))**2<1)
        box(g,x+xx,y+yy,2+r()*3,2,colors[Math.floor(r()*colors.length)]);
    }
  }
  function tree(g,x,y,size,colors,seed=1){
    const trunk=size*.11;
    box(g,x+size*.45,y+size*.5,trunk,size*.8,'#674650');box(g,x+size*.49,y+size*.55,trunk*.4,size*.72,'#946656');
    shape(g,[[x+size*.49,y+size*.95],[x+size*.23,y+size*.55],[x+size*.32,y+size*.59],[x+size*.53,y+size*.85]],'#674650');
    shape(g,[[x+size*.53,y+size*.88],[x+size*.79,y+size*.45],[x+size*.81,y+size*.57],[x+size*.53,y+size*1.01]],'#674650');
    bush(g,x-size*.1,y+size*.22,size*.8,colors,seed);
    bush(g,x+size*.24,y+size*.23,size*.85,colors,seed+10);
    bush(g,x+size*.04,y-size*.03,size*.9,colors,seed+20);
  }
  function flower(g,x,y,color,small=false){
    box(g,x,y+2,1,small?4:7,'#528869');if(!small)box(g,x+1,y+5,3,2,'#75a67b');
    box(g,x-2,y,5,2,color);box(g,x-1,y-1,3,4,color);box(g,x,y,1,1,'#ffe2a2');
  }
  function lamps(g,x,y,night=false){
    const metal=night?'#3b3a61':'#526073';
    box(g,x-2,y+14,4,72,metal);box(g,x-6,y+84,12,3,metal);
    box(g,x-8,y+1,16,3,metal);box(g,x-6,y-2,12,4,metal);box(g,x-2,y-5,4,3,metal);
    box(g,x-7,y+4,14,13,metal);box(g,x-5,y+4,10,10,night?'#ffe0a0':'#e3dcc0');
    box(g,x-1,y+4,2,11,metal);box(g,x-7,y+16,14,3,metal);
    if(night){box(g,x-12,y-1,24,22,'rgba(255,205,141,.06)');box(g,x-18,y-6,36,33,'rgba(255,205,141,.035)');}
  }
  function pier(g){
    shape(g,[[122,379],[260,379],[384,491],[384,576],[0,576],[0,491]],'#916b65');
    shape(g,[[126,379],[256,379],[374,491],[374,576],[10,576],[10,491]],'#c3987b');
    shape(g,[[132,379],[250,379],[361,491],[361,576],[23,576],[23,491]],'#deb18a');
    for(let y=382,step=4;y<576;y+=step,step+=.65){
      const left=Math.max(10,126-(y-379)*1.05),right=Math.min(374,258+(y-379)*1.05);
      box(g,left,y,right-left,1,'#a67966');box(g,left,y+1,right-left,1,'#e3bd96');
      if(y>410){box(g,105,y+3,17,1,'#c49678');box(g,231,y+6,26,1,'#c49678');}
    }
    // Posts recede towards the vanishing point; handrail uses pixel-stepped segments.
    for(let side of [-1,1]){
      for(let i=0;i<5;i++){
        const y=379+i*i*6,x=192+side*(69+i*i*5.5),ht=17+i*6;
        box(g,x-3,y-ht,7+i,ht+6,'#6d5960');box(g,x-2,y-ht,3,ht+4,'#b58a73');box(g,x-4,y-ht-3,9+i,3,'#edc69a');
      }
      shape(g,[[192+side*69,363],[192+side*173,430],[192+side*173,435],[192+side*69,367]],'#7e6061');
      shape(g,[[192+side*69,361],[192+side*173,428],[192+side*173,431],[192+side*69,364]],'#e8bc8e');
    }
  }
  function spring(g){
    sky(g,['#9bbfd3','#accbd9','#bdd9de','#d3e4df','#e8e9d6'],256);
    shape(g,[[0,223],[24,220],[49,207],[70,209],[88,199],[113,208],[135,199],[171,218],[204,211],[235,219],[264,204],[292,211],[322,203],[354,217],[384,213],[384,271],[0,271]],'#a4c7be');
    shape(g,[[0,239],[39,231],[64,237],[90,225],[124,231],[160,242],[211,234],[239,245],[281,229],[326,232],[384,224],[384,275],[0,275]],'#81aaa9');
    box(g,0,255,W,248,'#8dc1c2');box(g,0,270,W,12,'#9ecfcd');box(g,0,284,W,38,'#83b9bf');box(g,0,322,W,89,'#76afb9');box(g,0,411,W,102,'#699ba9');
    const r=rand(29);for(let i=0;i<110;i++)box(g,r()*W,267+r()*225,4+r()*23,1,i%3?'#a2cecb':'#c2ddd4');
    // Distant sailboat and lighthouse.
    box(g,286,229,8,27,'#eee1c5');box(g,284,225,12,5,'#9b7978');box(g,287,234,6,3,'#a66f69');box(g,289,240,2,5,'#597987');
    shape(g,[[280,225],[290,216],[299,225]],'#7c6874');
    box(g,70,280,18,3,'#7c8294');box(g,78,259,1,21,'#a18e86');shape(g,[[77,260],[66,276],[77,276]],'#f0e6cc');shape(g,[[80,265],[87,277],[80,277]],'#d7dece');
    pier(g);
    tree(g,-66,240,111,['#62896e','#82a57b','#a7bf8b','#c8d3a1'],31);
    tree(g,332,250,95,['#688b7b','#81a18c','#a9bca1','#cfceb0'],43);
    bush(g,-37,415,92,['#52736b','#759778','#9ab18a','#b8c69b'],61);
    bush(g,319,431,94,['#52736b','#759778','#9ab18a','#b8c69b'],62);
    for(let i=0;i<35;i++){let x=i%2?r()*41:343+r()*41,y=447+r()*120;flower(g,x,y,['#f0acba','#f5d4c8','#c6b7d4'][i%3],i%3===0);}
    lamps(g,64,396);lamps(g,318,396);
    box(g,12,516,24,28,'#94716e');box(g,9,512,30,6,'#bf8d7b');box(g,15,519,3,22,'#b58b7c');
    for(let i=0;i<10;i++)flower(g,14+r()*23,502+r()*13,['#f4a8b9','#e989a7','#ffe0bf'][i%3]);
    box(g,352,516,22,28,'#94716e');box(g,348,512,29,6,'#bf8d7b');
    for(let i=0;i<10;i++)flower(g,350+r()*24,501+r()*14,['#f4a8b9','#e989a7','#ffe0bf'][i%3]);
  }
  function palm(g,x,y,flip=1){
    shape(g,[[x,y+155],[x+10,y+155],[x+18*flip,y+45],[x+26*flip,y],[x+19*flip,y],[x+10*flip,y+45]],'#715d68');
    for(let i=0;i<13;i++)box(g,x+12*flip-i*.7,y+24+i*10,8,3,'#ac7c71');
    const top=x+22*flip;
    for(const [dx,dy] of [[-73,24],[-62,-9],[-36,-32],[33,-30],[60,-4],[71,29]]){
      shape(g,[[top,y],[top+dx*.42,y+dy-12],[top+dx*.75,y+dy-6],[top+dx,y+dy+4],[top+dx*.75,y+dy+1],[top+dx*.4,y+dy+6],[top,y+8]],'#456e68');
      shape(g,[[top,y],[top+dx*.42,y+dy-8],[top+dx*.84,y+dy],[top+dx*.4,y+dy-1]],'#6e9580');
      for(let i=2;i<8;i++){
        const xx=top+dx*i/9,yy=y+dy*i/9;
        shape(g,[[xx,yy-2],[xx+5,yy+4],[xx+4,yy+11],[xx-2,yy+3]],'#527d6e');
      }
    }
    box(g,top-7,y+2,8,10,'#b18a6a');box(g,top+2,y+4,8,9,'#927263');
  }
  function summer(g){
    sky(g,['#958ba9','#b09bae','#c5a5ad','#d9b1ab','#eac0a9','#f0d3b4'],279);
    // Pixel-stepped, hazy sunset.
    box(g,251,158,58,48,'#f8dbac');box(g,257,150,46,64,'#f8dbac');box(g,265,145,30,74,'#f8dbac');
    box(g,248,186,64,3,'#edc3a4');box(g,251,199,58,3,'#edc3a4');box(g,260,210,40,3,'#edc3a4');
    shape(g,[[0,265],[32,258],[67,261],[97,245],[115,247],[151,264],[190,269],[384,268],[384,290],[0,290]],'#ad9baa');
    box(g,0,280,384,190,'#809da9');box(g,0,281,384,5,'#d9c8ba');box(g,0,302,384,32,'#7d9caa');box(g,0,334,384,75,'#739ca8');box(g,0,409,384,65,'#86b3b8');
    const r=rand(53);for(let i=0;i<90;i++){const y=286+r()*174,x=r()*W;box(g,x,y,3+r()*24,1,i%4?'#b6c8c3':'#dfd8c3');}
    for(let i=0;i<35;i++){const y=286+r()*126;box(g,263-r()*((y-240)/5),y,10+r()*30,2,'#dfc7ad');}
    shape(g,[[0,457],[42,461],[94,448],[141,452],[196,444],[248,452],[303,446],[343,454],[384,451],[384,576],[0,576]],'#ddc3a3');
    shape(g,[[0,468],[42,471],[94,459],[141,463],[196,455],[248,462],[303,458],[343,464],[384,460],[384,576],[0,576]],'#f0d5ad');
    for(let i=0;i<160;i++)box(g,r()*384,472+r()*104,i%3===0?3:1,1,i%2?'#d9ba98':'#f9e0ba');
    palm(g,6,294,1);palm(g,374,304,-1);
    bush(g,-34,443,88,['#6b8075','#869684','#a4ad8e','#c8c09e'],13);
    bush(g,343,451,72,['#6b8075','#869684','#a4ad8e','#c8c09e'],17);
    // Beach blanket, shells and two abandoned sandals.
    box(g,18,531,44,25,'#c8848b');box(g,19,535,42,3,'#edb4a8');box(g,19,546,42,3,'#edb4a8');box(g,22,530,3,28,'#e3a39c');
    box(g,333,520,6,10,'#a4817d');box(g,343,524,6,10,'#a4817d');box(g,334,521,3,3,'#f1c39d');box(g,344,525,3,3,'#f1c39d');
    for(const [x,y]of[[72,551],[296,509],[24,486],[326,564]]){box(g,x,y,6,3,'#c7928c');box(g,x+1,y-2,4,2,'#f4bca7');box(g,x+2,y-3,2,2,'#ffddbd');}
  }
  function bench(g,x,y){
    box(g,x,y,41,4,'#9f705b');box(g,x,y+6,41,4,'#ba8b68');box(g,x,y+12,41,5,'#805b53');
    box(g,x-2,y+19,45,4,'#b88a67');box(g,x+4,y+22,3,12,'#5b5359');box(g,x+34,y+22,3,12,'#5b5359');
    box(g,x+4,y-2,3,20,'#64545a');box(g,x+34,y-2,3,20,'#64545a');
  }
  function autumn(g){
    sky(g,['#aaa9ad','#bdb5b2','#ccc1b3','#ded0b7','#ebdbb8'],306);
    shape(g,[[0,270],[56,254],[103,260],[145,245],[193,254],[244,246],[282,263],[328,255],[384,274],[384,380],[0,380]],'#b5b49b');
    const r=rand(97);for(let i=0;i<17;i++)tree(g,i*28-25,247+r()*16,38+r()*10,['#aaa28c','#b9af91','#ccbb95','#ddc79c'],i+3);
    box(g,0,330,W,246,'#a8a080');box(g,0,365,W,211,'#b1a17a');
    shape(g,[[173,331],[212,331],[277,406],[373,576],[4,576],[107,406]],'#cbb393');
    shape(g,[[178,331],[207,331],[264,406],[354,576],[24,576],[121,406]],'#dec3a0');
    for(let i=0;i<100;i++){let y=340+r()*236,x=192+(r()-.5)*(y-316)*1.3;box(g,x,y,2+r()*6,1,'#c5ac8b');}
    tree(g,-62,184,136,['#a4665a','#be805c','#d49c66','#e2b777'],70);
    tree(g,280,169,152,['#a85f57','#c77a58','#db9b60','#ebbb79'],80);
    tree(g,-42,332,95,['#926956','#ae8059','#cfaa70','#e7c08b'],90);
    tree(g,321,334,97,['#8f6156','#af785a','#ce9966','#e2b880'],95);
    bench(g,30,447);bench(g,315,447);lamps(g,84,359);lamps(g,299,359);
    for(let i=0;i<120;i++){const x=r()*W,y=409+r()*167;if(x<65||x>320||r()>.8)box(g,x,y,2+r()*4,2,['#b47a55','#d09a5f','#a46a56','#e9bd7b'][i%4]);}
    bush(g,-27,510,76,['#937455','#b58e61','#d4ab72','#e1bd89'],27);bush(g,337,522,81,['#937455','#b58e61','#d4ab72','#e1bd89'],28);
  }
  function pine(g,x,y,s){
    box(g,x+s*.43,y+s*.4,s*.13,s*.9,'#776b82');
    for(let i=0;i<4;i++){
      const yy=y+i*s*.2,half=s*(.19+i*.08),cx=x+s*.5;
      shape(g,[[cx,yy],[cx+half,yy+s*.47],[cx-half,yy+s*.47]],'#607c92');
      shape(g,[[cx,yy],[cx+half*.82,yy+s*.36],[cx+half*.25,yy+s*.33],[cx,yy+s*.38],[cx-half*.82,yy+s*.36]],'#d5e0e3');
      box(g,cx-half*.7,yy+s*.34,half*1.4,3,'#b7ccd8');
    }
  }
  function house(g,x,y,w,h,color){
    box(g,x,y,w,h,'#504b70');box(g,x+3,y+3,w-6,h-3,color);
    shape(g,[[x-6,y],[x+w/2,y-h*.55],[x+w+6,y]],'#554963');
    shape(g,[[x-8,y-2],[x+w/2,y-h*.55-4],[x+w+8,y-2],[x+w+2,y+3],[x+w/2,y-h*.55+3],[x-2,y+3]],'#dbe6e4');
    box(g,x+w*.7,y-h*.4,8,14,'#73627b');box(g,x+w*.7-2,y-h*.4-2,12,3,'#cddde0');
    for(let i=0;i<2;i++){
      const xx=x+10+i*(w-30);box(g,xx,y+13,13,17,'#594c6b');box(g,xx+2,y+15,9,12,'#e7b881');box(g,xx+3,y+16,3,10,'#ffdeb0');box(g,xx+6,y+14,2,14,'#85717a');box(g,xx+1,y+21,11,2,'#85717a');
      box(g,xx-2,y+30,17,3,'#cad9df');
    }
    box(g,x+w*.5-7,y+h-25,14,25,'#5a506d');box(g,x+w*.5-5,y+h-23,10,23,'#8a7a90');box(g,x+w*.5+2,y+h-12,2,2,'#ecc39a');
    for(let yy=y+36;yy<y+h-3;yy+=7)box(g,x+3,yy,w-6,1,'rgba(59,58,89,.15)');
    box(g,x-3,y+h,w+6,4,'#dbe6e4');
  }
  function winter(g){
    sky(g,['#626687','#757b9a','#8b95ae','#a5b4c5','#bccbd4'],356);
    box(g,279,92,30,34,'#eee4cb');box(g,274,97,40,24,'#eee4cb');box(g,282,98,6,4,'#d9d7cb');box(g,296,113,6,3,'#d9d7cb');
    shape(g,[[0,299],[54,282],[111,300],[157,279],[204,297],[247,283],[309,301],[350,278],[384,294],[384,385],[0,385]],'#aabfcd');
    for(let i=0;i<11;i++)pine(g,i*42-23,278+(i%3)*8,41);
    box(g,0,359,384,217,'#c9d8df');
    shape(g,[[0,407],[47,398],[94,410],[153,402],[211,416],[270,401],[333,408],[384,398],[384,576],[0,576]],'#dbe6e7');
    house(g,17,327,67,61,'#99899b');house(g,297,324,70,66,'#8f91aa');house(g,109,319,46,43,'#abb0bb');
    box(g,160,365,91,3,'#c2d2dd');
    shape(g,[[169,391],[222,391],[281,472],[332,576],[45,576],[106,472]],'#b6ccdb');
    shape(g,[[178,393],[213,393],[266,472],[307,576],[68,576],[121,472]],'#bfd5df');
    for(let i=0;i<22;i++){let y=407+i*7;box(g,178-(y-407)*.4,y,8+(i%4)*7,1,'#e5eded');box(g,216+(y-407)*.3,y+3,13,1,'#d7e6e9');}
    pine(g,-27,335,101);pine(g,322,361,101);
    lamps(g,74,402,true);lamps(g,307,402,true);
    // Cozy overhead festoon lights, suspended well above the playable floor.
    const lightColors=['#f8c794','#e7b0b2','#b7d5c2','#e4d1a8'];
    for(let i=0;i<38;i++)box(g,i*11,300+Math.sin(i/37*Math.PI)*18,12,1,'#72758c');
    for(let i=0;i<18;i++){const xx=6+i*22,yy=301+Math.sin(i/17*Math.PI)*18;box(g,xx,yy,1,5,'#72758c');box(g,xx-2,yy+5,5,6,lightColors[i%4]);box(g,xx-1,yy+6,2,2,'#fff1d5');}
    const r=rand(71);for(let i=0;i<95;i++)box(g,r()*W,423+r()*153,2+r()*3,1,i%2?'#c3d3de':'#f3f2e9');
    // Tiny snowperson in scarf.
    box(g,28,496,17,20,'#b1c7d5');box(g,25,501,23,13,'#f0eee4');box(g,29,486,15,15,'#eeeade');box(g,31,482,11,5,'#55536e');box(g,27,486,19,3,'#55536e');
    box(g,31,492,2,2,'#55536e');box(g,39,492,2,2,'#55536e');box(g,36,495,6,2,'#da9a6b');box(g,28,500,19,3,'#b47686');box(g,40,502,4,9,'#b47686');
  }
  const painters={spring,summer,autumn,winter};
  function scene(key){if(!cache.has(key)){const c=document.createElement('canvas');c.width=W;c.height=H;painters[key](c.getContext('2d'));cache.set(key,c);}return cache.get(key);}
  function forLevel(index){return list[Math.min(3,Math.floor(Math.max(0,index)/5))];}
  function draw(g,key,time,options={}){
    if(!painters[key])key='spring';const t=options.reducedMotion?0:time||0;
    if(!options.foreground){
      g.drawImage(scene(key),0,0);
      if(key==='spring'||key==='summer'){
        const color=key==='spring'?'rgba(251,246,221,.7)':'rgba(249,220,184,.56)';
        for(let i=0;i<16;i++){const x=((i*59+t*(2+i%3))%440)-35,y=80+(i*43)%160;
          if(i<4)cloud(g,x+((options.playerX||192)-192)*-.035,y,.7+(i%2)*.2,color);
        }
        g.globalAlpha=.55;
        for(let i=0;i<28;i++){const x=(i*47+t*(3+i%4))%400,y=287+(i*19)%151;box(g,x,y,5+(i%5)*3,1,i%2?'#d9e3d2':'#c2d8d0');}
        g.globalAlpha=1;
      }
      if(key==='winter'){
        for(let i=0;i<19;i++){g.globalAlpha=.3+(options.reducedMotion ? .3 : (Math.sin(t*.8+i)+1)*.2);box(g,18+(i*61)%350,37+(i*43)%215,1+(i%2),1,'#fff0d3');}g.globalAlpha=1;
        for(let i=0;i<4;i++)box(g,63+i*3+Math.sin(t*.5+i)*2,286-i*8-(t*2%8),5+i*3,5,'rgba(218,221,225,.18)');
      }
      if(key==='autumn'){
        box(g,-30+Math.sin(t*.09)*26,313,355,7,'rgba(242,225,199,.12)');
        box(g,72+Math.sin(t*.12)*24,340,350,5,'rgba(242,225,199,.1)');
      }
      return;
    }
    // Sparse foreground animation leaves the middle of the playfield readable.
    const amount=key==='winter'?35:key==='autumn'?14:key==='spring'?12:6;
    for(let i=0;i<amount;i++){
      const speed=key==='winter'?9:key==='summer'?4:11;
      const y=(i*71+t*(speed+i%5))%600-12;
      const x=(i*97+Math.sin(t*.6+i)*13+t*(key==='autumn'?8:2))%412-14;
      if(key==='winter') {box(g,x,y,i%4===0?3:2,2,i%3?'#f5f0e6':'#dce7e9');if(i%6===0)box(g,x+1,y-1,1,4,'#f5f0e6');}
      else if(key==='spring'){box(g,x,y,3,2,i%3?'#f3b9c6':'#fce0d1');box(g,x+1,y+2,2,1,'#df9fb2');}
      else if(key==='autumn'){box(g,x,y,4,2,i%2?'#d28c5b':'#b97059');box(g,x+1,y-1,3,4,i%2?'#e1ac6c':'#ce8c60');box(g,x+2,y+3,1,2,'#8d6c58');}
      else {g.globalAlpha=.45;box(g,x,y,1,1,'#fff1c7');g.globalAlpha=1;}
    }
  }
  return{list,forLevel,draw};
})();
