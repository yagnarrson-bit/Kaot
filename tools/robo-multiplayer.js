// robô multiplayer: dois jogadores no servidor local
const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.argv[2]||'http://localhost:3003/';const errs=[],notes=[];
(async()=>{const b=await chromium.launch({channel:'msedge',args:['--headless=new']});
const open=async nm=>{const ctx=await b.newContext({viewport:{width:1000,height:640}});const p=await ctx.newPage();p.nm=nm;
  p.on('pageerror',e=>errs.push(nm+' [pageerror] '+e.message+' @ '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error')errs.push(nm+' [console] '+m.text().slice(0,160))});
  await p.goto(URL);await sleep(800);await p.click('#introSkip');await sleep(400);await p.fill('#nick',nm);await p.waitForFunction(()=>!document.getElementById('mpPublic').disabled,null,{timeout:20000});return p};
const E=async(p,label,code)=>{try{const r=await p.evaluate(c=>{try{return {ok:1,v:__k.ev(c)}}catch(e){return {ok:0,e:e.message+' | '+(e.stack||'').split('\n')[1]}}},code);if(!r.ok)errs.push(p.nm+' ['+label+'] '+r.e);return r.v}catch(e){errs.push(p.nm+' ['+label+'] '+e.message.slice(0,150))}};
const skip=async p=>{for(let i=0;i<40&&await E(p,'cut','CUT.on');i++){await p.keyboard.press('Escape');await sleep(250)}};
const A=await open('Ana');
// Ana joga uma partida solo antes (caso do bug antigo do mapa)
await A.click('#go');await sleep(800);await skip(A);await sleep(800);await A.keyboard.press('Escape');await sleep(300);await A.click('#pMenu');await sleep(400);
await A.click('#mpPublic');await A.waitForFunction(()=>__k.ev('NET.on'),null,{timeout:20000});await skip(A);
const B=await open('Beto');await B.click('#mpPublic');await B.waitForFunction(()=>__k.ev('NET.on'),null,{timeout:20000});await skip(B);await sleep(2500);
for(const p of [A,B])await E(p,'god','P.inv=1e9;1');
const same=await E(A,'m','GSEED+"|"+buildings.map(b=>b.ty).join()')===await E(B,'m','GSEED+"|"+buildings.map(b=>b.ty).join()');notes.push('mesmo mapa: '+same);
notes.push('anfitrião: Ana '+await E(A,'h','NET.host')+' / Beto '+await E(B,'h','NET.host'));
notes.push('cada um vê o outro: '+await E(A,'r','RP.size')+' / '+await E(B,'r','RP.size'));
// juntar os dois
await E(B,'tp','const r=[...RP.values()][0];P.x=r.tx+40;P.y=r.ty;1');await sleep(1500);
notes.push('Beto vê Ana perto: '+await E(B,'d','Math.round(Math.hypot([...RP.values()][0].x-P.x,[...RP.values()][0].y-P.y))'));
// chat
await A.keyboard.press('Enter');await sleep(200);await A.keyboard.type('oi beto');await A.keyboard.press('Enter');await sleep(1500);
notes.push('chat chegou: '+(await B.textContent('#chatLog')).includes('oi beto'));
// mortes sincronizadas
const zid=await E(A,'kill','const z=OUT.Z.filter(z=>z.hp>0).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];P.weapons.push("pistola");P.cur=P.weapons.indexOf("pistola");damageEnemy(z,1e6,0,0);z.id');
await sleep(2500);notes.push('zumbi morto por Ana morreu para Beto: '+await E(B,'k',`(ZL[${zid}]||{}).dead`));
// largar item e o outro pegar
await E(A,'drop','P.items.kit=(P.items.kit||0)+2;dropItem("kit");GI.list?GI.list.length:groundList().length');await sleep(2000);
notes.push('Beto vê itens no chão: '+await E(B,'gi','groundList().length'));
// os dois entram no hospital
const h=await E(A,'h','buildings.findIndex(b=>b.ty==="hospital")');
for(const p of [A,B]){await E(p,'ent',`enter(buildings[${h}]);1`);await sleep(300)}await sleep(2500);
notes.push('no hospital: Ana vê Beto na mesma sala '+await E(A,'s','sharers().length')+' / Beto vê Ana '+await E(B,'s','sharers().length'));
notes.push('zumbis do hospital iguais: '+(await E(A,'z','SC.Z.filter(z=>z.hp>0).length')+' / '+await E(B,'z','SC.Z.filter(z=>z.hp>0).length')));
await E(A,'zk','for(const z of SC.Z)damageEnemy(z,1e6,0,0);1');await sleep(2500);notes.push('Ana matou os do hospital, Beto ainda vê vivos: '+await E(B,'z','SC.Z.filter(z=>z.hp>0).length'));
// Beto sai, Ana continua dentro: zumbis não podem renascer
await E(B,'out','exitB();1');await sleep(2500);await E(B,'in',`enter(buildings[${h}]);1`);await sleep(2500);notes.push('Beto voltou ao hospital, vivos: '+await E(B,'z','SC.Z.filter(z=>z.hp>0).length'));
for(const p of [A,B])await E(p,'out','if(SC!==OUT)exitB();1');await sleep(800);
// relógio do dia
await E(A,'gt','GT=DAY_LEN*.8;1');await sleep(2500);notes.push('relógio: Ana '+Math.round(await E(A,'g','GT'))+' / Beto '+Math.round(await E(B,'g','GT')));
// cavalo e skin visíveis
await E(A,'h','horse={x:P.x+40,y:P.y,face:1,anim:0,saddled:true,name:"T"};mount();1');await sleep(1500);notes.push('Beto vê Ana montada: '+await E(B,'r','[...RP.values()][0].ride'));await E(A,'d','dismount();1');
// morte e renascer no multiplayer
await E(B,'die','P.inv=0;hurtPlayer(9999,P.x,P.y,true);state');await sleep(1200);notes.push('Beto morto: '+await E(B,'s','state')+' | Ana vê Beto abatido: '+await E(A,'d','[...RP.values()][0].dead'));
await B.click('#again');await sleep(1500);await skip(B);notes.push('Beto renasceu: '+await E(B,'s','state+" hp "+Math.round(P.hp)'));
// Beto sai e Ana continua
await E(B,'leave','toMenu?0:0');await B.keyboard.press('Escape');await sleep(300);await B.click('#pMenu');await sleep(2500);
notes.push('Ana vê jogadores depois de Beto sair: '+await E(A,'r','RP.size')+' | Ana anfitriã: '+await E(A,'h','NET.host'));
// Beto entra de novo
await B.click('#mpPublic');await B.waitForFunction(()=>__k.ev('NET.on'),null,{timeout:20000});await skip(B);await sleep(2500);
notes.push('Beto voltou, mesmo mapa: '+(await E(A,'m','GSEED')===await E(B,'m','GSEED'))+' | zumbi morto antes continua morto: '+await E(B,'k',`(ZL[${zid}]||{}).dead`));
// Ana (anfitriã) sai: Beto vira anfitrião
await A.keyboard.press('Escape');await sleep(300);await A.click('#pMenu');await sleep(3000);notes.push('Beto virou anfitrião: '+await E(B,'h','NET.host'));
await B.screenshot({path:'shots/botmp_B.png'});
console.log('=== OBSERVAÇÕES ===\n'+notes.join('\n'));console.log('=== ERROS ('+errs.length+') ===\n'+[...new Set(errs)].join('\n'));await b.close()})().catch(e=>{console.log('FALHA:',e.message.slice(0,300));console.log(notes.join('\n'));console.log([...new Set(errs)].join('\n'));process.exit(1)});
