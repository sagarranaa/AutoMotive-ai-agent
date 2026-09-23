let token=sessionStorage.getItem('automotive-session');
export function forgetSession(){token=null;sessionStorage.removeItem('automotive-session');}
export async function api(path,options={}){
 const r=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}});
 if(!r.ok){let error;try{error=(await r.json()).error;}catch{}throw new Error(error || `Request failed (${r.status})`);}
 return r.status===204?null:r.json();
}
export async function initSession(){if(!token){const s=await api('/sessions',{method:'POST'});token=s.token;sessionStorage.setItem('automotive-session',token);}return api('/session');}
export async function stream(path,options,onEvent){
 const r=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}});
 if(!r.ok){const body=await r.json();throw new Error(body.error || 'Connection failed.');}
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='';
 try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);const event=frame.match(/^event: (.+)$/m)?.[1],data=frame.match(/^data: (.+)$/m)?.[1];if(event&&data)onEvent(event,JSON.parse(data));}}}finally{reader.releaseLock();}
}
