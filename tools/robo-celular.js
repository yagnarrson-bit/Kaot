const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.argv[2]||'http://localhost:8766/';const errs=[],notes=[];
(async()=>{const b=await chromium.launch({channel:'msedge',args:['--headless=new']});
for(const [nm,w,h] of [['deitado',844,390],['empe',390,844],['tablet',1024,768],['celpequeno',667,375]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push(nm+' '+e.message));
  const E=c=>p.evaluate(c=>__k.ev(c),c).catch(e=>{errs.push(nm+' eval '+e.message.slice(0,120))});
  await p.goto(URL);await sleep(800);await p.tap('#introSkip');await sleep(500);
  // menu cabe na tela? botão principal alcançável
  await p.screenshot({path:`shots/mob_${nm}_menu.png`});
  await p.tap('#go');await sleep(700);for(let i=0;i<40&&await E('CUT.on');i++){await p.tap('#cutSkip').catch(()=>{});await sleep(300)}
  await E('P.inv=1e9;1');await sleep(800);
  // botões: dentro da tela e sem se sobrepor
  const r=await p.evaluate(()=>[...document.querySelectorAll('.tb, #mini, #slots .slot, #bagBtn, #mpHud')].filter(e=>e.offsetParent).map(e=>{const q=e.getBoundingClientRect();return{id:e.id||e.dataset.b||e.className,x:q.x,y:q.y,w:q.width,h:q.height}}));
  const out=r.filter(q=>q.x<0||q.y<0||q.x+q.w>innerWidthOf()||q.y+q.h>innerHeightOf());function innerWidthOf(){return w}function innerHeightOf(){return h}
  if(out.length)errs.push(nm+' fora da tela: '+out.map(q=>q.id).join(','));
  const ov=[];for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],c=r[j];const ix=Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x),iy=Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y);if(ix>4&&iy>4)ov.push(a.id+' x '+c.id)}
  if(ov.length)errs.push(nm+' botões sobrepostos: '+ov.join('; '));
  notes.push(nm+': '+r.length+' botões visíveis');
  // joystick
  const cv=await p.$('canvas');const bb=await cv.boundingBox();const x0=bb.x+w*.2,y0=bb.y+h*.7;
  const cdp=await ctx.newCDPSession(p);const touch=async(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
  const before=await E('Math.round(P.x)');await touch('touchStart',[{x:x0,y:y0,id:1}]);for(let i=1;i<=10;i++){await touch('touchMove',[{x:x0+i*6,y:y0,id:1}]);await sleep(40)}await sleep(700);await touch('touchEnd',[]);
  notes.push(nm+' joystick andou: '+((await E('Math.round(P.x)'))-before)+'px');
  // todos os botões de ação
  for(const k of await p.$$eval('.tb',els=>els.filter(e=>e.offsetParent).map(e=>e.dataset.b))){await p.tap(`.tb[data-b="${k}"]`).catch(e=>errs.push(nm+' toque '+k+': '+e.message.slice(0,60)));await sleep(250);
    if(await E('state')==='map'){await p.tap('#mapClose').catch(()=>{});await sleep(200)}if(await E('invOpen')){await p.screenshot({path:`shots/mob_${nm}_inv.png`});await p.tap('.tb[data-b="inv"]').catch(()=>{});await E('if(invOpen)toggleInv();1');await sleep(200)}
    if(await E('state')==='pause'){await p.screenshot({path:`shots/mob_${nm}_pausa.png`});await E('togglePause();1');await sleep(200)}if(await E('!!P.drv'))await E('exitCar(true);1')}
  await p.screenshot({path:`shots/mob_${nm}_jogo.png`});await ctx.close()}
console.log(notes.join('\n'));console.log('=== ERROS ('+errs.length+') ===\n'+[...new Set(errs)].join('\n'));await b.close()})();
