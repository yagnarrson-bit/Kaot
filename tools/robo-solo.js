// robô de testes: passa por todos os sistemas e registra erros
const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.argv[2]||'http://localhost:8766/';
const errs=[],notes=[];
(async()=>{const b=await chromium.launch({channel:'msedge',args:['--headless=new','--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1100,height:680}});let p=await ctx.newPage();
const hook=pg=>{pg.on('pageerror',e=>errs.push('[pageerror] '+e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));pg.on('console',m=>{if(m.type()==='error')errs.push('[console] '+m.text().slice(0,200))})};hook(p);
const E=async(label,code)=>{try{return await p.evaluate(c=>{try{return {ok:1,v:__k.ev(c)}}catch(e){return {ok:0,e:e.message+' | '+(e.stack||'').split('\n')[1]}}},code).then(r=>{if(!r.ok)errs.push('['+label+'] '+r.e);return r.v})}catch(e){errs.push('['+label+'] evaluate: '+e.message.slice(0,200))}};
const step=async(label,code,wait=300)=>{const v=await E(label,code);await sleep(wait);return v};
const skipCut=async()=>{for(let i=0;i<40&&await E('cut','CUT.on');i++){await p.keyboard.press('Escape');await sleep(250)}};
const startGame=async(diff,mode)=>{await E('menu',`diffSel='${diff}';modeSel='${mode}';syncMenuSel();1`);await p.click('#go');await sleep(200);if(await E('st','state')==='menu'){await p.click('#go');}await sleep(700);await skipCut();await E('god','P.inv=1e9;P.hp=100;1')};
const god=()=>E('god','if(P){P.inv=1e9;P.hp=100;P.fo=100;P.se=100}1');

await p.goto(URL);await sleep(900);await p.click('#introSkip');await sleep(600);

// 1) todas as dificuldades e modos
for(const d of ['facil','medio','dificil'])for(const m of ['missao','livre']){await startGame(d,m);await sleep(1200);
  const st=await E('st',`({st:state,z:ZL.length,G:genStr().length,B:buildings.length})`);notes.push(`${d}/${m}: ${JSON.stringify(st)}`);
  if(st&&st.G>=1024)errs.push(`G com ${st.G} caracteres em ${d}/${m} (limite 1024)`);
  await p.keyboard.press('Escape');await sleep(300);await p.click('#pMenu');await sleep(400)}
await startGame('medio','missao');

// 2) movimento, pulo, esquiva, agachar, correr
await p.keyboard.down('d');await p.keyboard.down('Shift');await sleep(800);await p.keyboard.up('Shift');await p.keyboard.press('Space');await sleep(300);await p.keyboard.press('q');await sleep(300);await p.keyboard.press('c');await sleep(300);await p.keyboard.press('c');await p.keyboard.up('d');

// 3) todas as armas: atirar, bater, recarregar
await step('armas',`P.weapons=Object.keys(WEP).sort((a,b)=>WORDER.indexOf(a)-WORDER.indexOf(b));for(const k of P.weapons){const W=WEP[k];if(!W.melee){P.mag[k]=W.mag;P.ammo[W.ammo]=999}}slotsDirty=invDirty=true;P.weapons.join()`);
const nW=await E('n','P.weapons.length');
for(let i=0;i<nW;i++){await E('arma'+i,`P.cur=${i};P.reload=0;slotsDirty=true;1`);await p.mouse.move(700,340);await p.mouse.down();await sleep(450);await p.mouse.up();await p.keyboard.press('r');await sleep(250)}
await p.keyboard.press('1');await p.keyboard.press('2');await p.mouse.wheel(0,200);await sleep(100);

// 4) itens: comer, beber, curar, vestir
await step('itens',`for(const k in ITEM){if(ITEM[k].slot)P.gearBag[k]=1;else P.items[k]=(P.items[k]||0)+3}for(const k of ['pano','sucata','polvora','couro','couro_javali','couro_urso','corda','trigo','martelo','chave'])P.mats[k]=20;P.fo=30;P.se=30;P.hp=40;invDirty=true;Object.keys(ITEM).length`);
for(let i=0;i<6;i++){await p.keyboard.press('f');await sleep(800);await p.keyboard.press('h');await sleep(800)}
await step('consume',`let n=0;for(const k in ITEM){if(P.items[k]>0&&!ITEM[k].slot){try{consume(k);n++}catch(e){throw new Error('consume '+k+': '+e.message)}}}n`,400);

// 5) inventário, abas, craft de todas as receitas, largar e pegar
await p.keyboard.press('Tab');await sleep(400);
await step('craft',`let ok=0;RECIPES.forEach((r,i)=>{for(const k in r.need)P.mats[k]=(P.mats[k]||0)+r.need[k]*2;P.mats.martelo=1;P.mats.chave=1;if(canCraft(r)){doCraft(i);ok++}});invDirty=true;ok+'/'+RECIPES.length`);
await step('craftUI',`for(const t of (typeof CTABS!=='undefined'?CTABS:[])){try{renderCraft&&renderCraft()}catch(e){throw e}}1`);
const tabs=await p.$$('#invPanel button, #invPanel [data-tab]');notes.push('botões no inventário: '+tabs.length);
for(const t of (await p.$$('#invPanel [data-tab], #invPanel .tab')).slice(0,8)){try{await t.click({timeout:800})}catch(e){}await sleep(150)}
for(const t of (await p.$$('#invPanel .dzt')).slice(0,6)){try{await t.click({button:'right',timeout:800})}catch(e){}await sleep(150)}
await p.keyboard.press('Tab');await sleep(300);
await step('chão',`const n=GI.list?GI.list.length:groundList().length;for(let i=0;i<8;i++)groundInteract&&groundInteract(()=>{});n`,500);
await p.keyboard.press('e');await sleep(300);await p.keyboard.press('e');await sleep(300);

// 6) barricada
await p.keyboard.press('b');await sleep(400);

// 7) todas as construções: entrar, vasculhar tudo, sair
const nb=await E('nb','buildings.length');let searched=0;
for(let i=0;i<nb;i++){const r=await E('predio'+i,`const b=buildings[${i}];enter(b);let n=0;for(const f of SC.furn||SC.b&&SC.b.int.furn||[]){if(f.c&&!f.done){try{finishSearch(f);n++}catch(e){throw new Error('busca em '+b.ty+': '+e.message)}}}for(const z of SC.Z||[])z.hp=0;b.ty+':'+n`);
  if(r){searched++}if(i%10===0){await sleep(250);await god()}await sleep(40);await E('sair'+i,`if(SC!==OUT)exitB();1`);await sleep(20)}
notes.push('construções visitadas: '+searched+'/'+nb);await sleep(500);
// entrar de verdade pela porta (tecla E) em algumas
for(const ty of ['hospital','mercado','igreja','tenda_med','armaria']){await E('porta '+ty,`const b=buildings.find(b=>b.ty==='${ty}');if(b){P.x=b.door.x;P.y=b.door.y+6}!!b`);await sleep(250);await p.keyboard.press('e');await sleep(900);const sc=await E('sc','SC===OUT?"fora":SC.b.ty');notes.push('porta '+ty+' -> '+sc);
  if(sc!=='fora'){await p.keyboard.down('s');await sleep(1500);await p.keyboard.up('s');await p.keyboard.press('e');await sleep(500);await E('sairp','if(SC!==OUT)exitB();1')}await sleep(300)}

// 8) caixas militares, sobrevivente, animais/pets
await step('caixas',`let n=0;for(const c of CRATES){if(!c.done){P.x=c.x+c.w/2;P.y=c.y+c.h+6;crateInteract(()=>{});n++}if(n>5)break}n`,400);
await step('trader',`if(trader){P.x=trader.x+20;P.y=trader.y;talk()}1`,500);
await step('animais',`let n=0;for(const a of A||[]){if(a.hp>0){damageEnemy(a,999,0,0);n++}if(n>8)break}n`,600);
await step('adotar',`const a=(A||[]).find(a=>(a.t==='cao'||a.t==='gato')&&a.hp>0);if(a){P.items.barra=3;adopt(a)}!!a`,500);

// 9) carro: dirigir e sair
await step('carro',`const c=cars.find(c=>!c.broken&&!c.done)||cars[0];P.x=c.x+c.w/2;P.y=c.y+c.h+14;1`,300);
await p.keyboard.press('g');await sleep(500);const drv=await E('drv','!!P.drv');notes.push('entrou no carro: '+drv);
await p.keyboard.down('w');await sleep(1200);await p.keyboard.down('a');await sleep(600);await p.keyboard.up('a');await p.keyboard.up('w');await p.keyboard.down('s');await sleep(600);await p.keyboard.up('s');await p.keyboard.press('g');await sleep(500);
notes.push('saiu do carro: '+!(await E('drv','!!P.drv')));

// 10) cavalo: domar, selar, montar, andar, desmontar
await step('cavalo',`horse={x:P.x+40,y:P.y,face:1,anim:0,saddled:false,name:'Trovão'};P.mats.sela=1;saddleHorse();mount();!!P.ride`,400);
await p.keyboard.down('d');await sleep(1000);await p.keyboard.up('d');await step('desmontar',`dismount();!P.ride`,300);
await step('colheita',`const f=(typeof FIELDS!=='undefined'?FIELDS:[])[0];if(f){P.x=f.x+f.w/2;P.y=f.y+f.h/2}1`,300);await p.keyboard.press('e');await sleep(1500);

// 11) esgoto (cena do túnel)
await step('esgoto',`const u=bueiros[1]||bueiros[0];P.x=u.x+4;P.y=u.y+4;1`,300);await p.keyboard.press('e');await sleep(1200);
notes.push('cena do esgoto: '+await E('cut','CUT.on'));await skipCut();await god();

// 12) noite, dias, mutante, chefe
await step('noite',`GT=DAY_LEN*.75;1`,1500);
await step('dia10',`GT=DAY_LEN*9.98;1`,2500);
await step('mutante',`spawnMutant();MUT.length`,800);
await step('matarMutante',`const z=OUT.Z.find(z=>z.t==='z4'||z.k==='z4'||z.type==='z4');if(z){P.x=z.x-60;P.y=z.y;damageEnemy(z,1e6,0,0)}!!z`,1500);
notes.push('cena do chefe: '+await E('cut','CUT.on'));await skipCut();await god();
await step('general',`const z=OUT.Z.find(z=>(z.t||z.k||z.type)==='zgen');if(z){P.x=z.x-80;P.y=z.y;damageEnemy(z,1e6,0,0)}!!z`,1200);
await step('explosivo',`const z=OUT.Z.find(z=>(z.t||z.k||z.type)==='zexp');if(z){P.x=z.x-50;P.y=z.y;damageEnemy(z,1e6,0,0)}!!z`,1200);await god();

// 13) mapa, pausa, música
await p.keyboard.press('m');await sleep(500);await p.mouse.wheel(0,-300);await sleep(200);await p.keyboard.press('m');await sleep(200);
await p.keyboard.press('Escape');await sleep(300);await p.keyboard.press('Escape');await sleep(300);
await step('musica','musToggle();musToggle();1',200);

// 14) deixar zumbis atacarem por um tempo (sem deus) e morrer
await step('mortal',`P.inv=0;P.hp=100;for(const z of OUT.Z.slice(0,40)){if(z.hp>0){z.x=P.x+30+Math.random()*60;z.y=P.y+Math.random()*40-20;z.state='chase'}}1`,4000);
await step('morrer',`hurtPlayer(9999,P.x,P.y,true);state`,1500);notes.push('estado após morrer: '+await E('st','state'));
const endTxt=await p.textContent('#end').catch(()=>'');notes.push('tela final: '+endTxt.replace(/\s+/g,' ').slice(0,120));
await p.screenshot({path:'shots/bot_end.png'});
// voltar ao menu e continuar do salvamento
const bs=await p.$$('#end button');notes.push('botões no fim: '+(await Promise.all(bs.map(x=>x.textContent()))).join(' | '));
await p.click('#again');await sleep(500);
notes.push('menu: CONTINUAR visível '+await E('c','!$("contBtn").hidden'));
if(await E('c','!$("contBtn").hidden')){await p.click('#contBtn');await sleep(1200);await skipCut();notes.push('continuou: '+await E('st','state+" dia "+curDay+" itens "+P.weapons.length'))}

// 15) vitória da missão
await step('vitoria',`for(const e of ZL)if(!e.dead){e.z.hp=0}1`,2500);
await step('vitoria2',`remaining()===0||endGame(true);state`,1500);notes.push('vitória: '+await E('st','state'));
await p.click('#again').catch(()=>{});await sleep(400);

// 16) modo livre: renascimento
await E('limpa',`try{localStorage.removeItem(SAVE_KEY)}catch(e){};menuSave();1`);
await startGame('facil','livre');await step('livre',`for(const z of OUT.Z)z.hp=0;1`,6000);notes.push('livre, zumbis vivos depois de matar todos: '+await E('z','OUT.Z.filter(z=>z.hp>0).length'));
await step('livreMorte',`P.inv=0;hurtPlayer(9999,P.x,P.y,true);state`,1500);notes.push('livre após morrer: '+await E('st','state'));
await p.screenshot({path:'shots/bot_livre.png'});

// 17) skin
await p.keyboard.press('Escape');await sleep(200);
if(await E('s','state')==='end')await p.click('#again');else if(await E('s','state')==='pause')await p.click('#pMenu');await sleep(400);
await p.click('#skinBtn').catch(e=>errs.push('skinBtn: '+e.message.slice(0,80)));await sleep(300);await p.click('#skinRand').catch(()=>{});await sleep(300);await p.click('#skinOk').catch(()=>{});

// 18) desempenho: tempo de quadro com muitos zumbis perto
await startGame('dificil','missao');
const fps=await E('fps',`(()=>{const P0=P;for(const z of OUT.Z.slice(0,150)){z.x=P0.x+(Math.random()-.5)*900;z.y=P0.y+(Math.random()-.5)*600;z.state='chase'}return 1})()`);
const ft=await p.evaluate(()=>new Promise(res=>{let n=0,t0=performance.now();const f=()=>{n++;if(n<120)requestAnimationFrame(f);else res(Math.round((performance.now()-t0)/n*10)/10)};requestAnimationFrame(f)}));
notes.push('ms por quadro com 150 zumbis perto: '+ft);

console.log('=== OBSERVAÇÕES ===\n'+notes.join('\n'));
console.log('=== ERROS ('+errs.length+') ===\n'+[...new Set(errs)].join('\n'));
await b.close()})().catch(e=>{console.log('FALHA DO ROBÔ:',e.message);console.log(notes.join('\n'));console.log([...new Set(errs)].join('\n'));process.exit(1)});
