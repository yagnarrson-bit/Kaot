// Teste rápido: abre o jogo, pula a intro, começa a partida e salva um print.
// Uso: sirva a pasta public na porta 8765 (ex.: npx http-server public -p 8765) e rode: node tools/teste-exemplo.js
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:760}});const errs=[];
p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(600);
await p.click('#introSkip');await p.waitForTimeout(800);await p.click('#go');await p.waitForTimeout(800);
await p.keyboard.press('Enter');await p.waitForTimeout(1500);await p.screenshot({path:'print.png'});
console.log(errs.length?errs:'sem erros');await b.close()})();
