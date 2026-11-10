(()=>{const bc=new BroadcastChannel('mock');const myId=Math.random().toString(36).slice(2,8);let ROOM;
ROOM={join:async(name)=>{const peers=new Map();let mine={};const send=()=>bc.postMessage({id:myId,name,pres:mine});
 bc.onmessage=e=>{const d=e.data;if(d.name!==name)return;if(d.bye){peers.delete(d.id);return}const old=peers.get(d.id);peers.set(d.id,Object.freeze({peer:d.id,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:Object.freeze(d.pres),updatedAt:Date.now()}));if(!old)send()};
 setInterval(send,1000);window.__presSize=()=>JSON.stringify(mine).length;
 return {name,presence:async p=>{mine={...mine};for(const k in p){if(p[k]===null)delete mine[k];else mine[k]=p[k]}if(JSON.stringify(mine).length>4096)throw {code:'invalid_argument'};send()},peers:()=>[{peer:myId,sameTab:true,isMe:true,kind:'viewer',presence:mine},...peers.values()],onConnection:(f)=>{setTimeout(()=>f(true));return()=>{}},leave:async()=>{bc.postMessage({id:myId,name,bye:1})},connected:()=>true}}};
window.claude={use:async n=>{await new Promise(r=>setTimeout(r,300));return n==='room'?ROOM:null}};})();
