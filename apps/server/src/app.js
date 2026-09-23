import express from 'express';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { root } from './config.js';
import { AppError,publicError } from './errors.js';
import { createLock } from './store.js';
import { runAgent } from './agent/runner.js';
import { confirmAction,safeRecord } from './agent/tools.js';
import { text } from './agent/validation.js';
const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function createApp({config,store,crm,provider}){
 const app=express(),lock=createLock(),subscribers=new Map(),rates=new Map();app.disable('x-powered-by');
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});next();});
 app.use(express.json({limit:'32kb'}));
 // Same-origin in production; Vite proxies API requests during development. No wildcard CORS.
 app.use('/api',(req,res,next)=>{
  const key=req.ip,now=Date.now();const window=rates.get(key);if(!window||now-window.start>60000)rates.set(key,{start:now,count:1});else if(++window.count>180)return res.status(429).json({error:'Too many requests. Please wait a minute.'});
  if(rates.size>10000)for(const [ip,w] of rates)if(now-w.start>60000)rates.delete(ip);next();
 });
 function broadcast(module,id){for(const [token,set] of subscribers){const session=store.session(token);if(session?.refs.some(r=>r.module===module&&r.id===id))for(const res of set)res.write(`event: crm_changed\ndata: ${JSON.stringify({module,id})}\n\n`);}}
 app.get('/api/health',(req,res)=>res.json({status:'ok',crmMode:config.crmMode,llmMode:config.llmMode,pollMs:config.pollMs}));
 app.post('/api/sessions',(req,res)=>{const s=store.newSession();res.status(201).json({token:s.token});});
 app.post('/api/webhooks/zoho',(req,res)=>{
  if(config.crmMode!=='zoho'||!config.webhookToken||!equal(req.body?.token,config.webhookToken)||String(req.body?.channel_id)!==config.channelId)return res.sendStatus(401);
  const {module,ids}=req.body;if(!['Leads','Contacts','Deals','Cases'].includes(module)||!Array.isArray(ids)||ids.length>100)return res.sendStatus(400);
  // Notification data is only an invalidation signal. Re-read records through authenticated CRM API.
  for(const id of ids)if(typeof id==='string'&&/^\d{10,30}$/.test(id))broadcast(module,id);
  res.sendStatus(204);
 });
 app.use('/api',(req,res,next)=>{const token=req.headers.authorization?.replace(/^Bearer /,'');if(!validToken(token)||!store.session(token))return res.status(401).json({error:'Session missing or expired. Start a new conversation.'});req.sessionToken=token;next();});
 const context=token=>({config,store,crm,provider,session:store.session(token)});
 app.get('/api/session',(req,res)=>{const s=store.session(req.sessionToken);res.json({messages:s.messages,stage:s.stage,pending:s.pending});});
 app.get('/api/events',(req,res)=>{
  res.set({'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();res.write('event: connected\ndata: {}\n\n');
  const set=subscribers.get(req.sessionToken)||new Set();subscribers.set(req.sessionToken,set);set.add(res);
  const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);req.on('close',()=>{clearInterval(heartbeat);set.delete(res);if(!set.size)subscribers.delete(req.sessionToken);});
 });
 app.post('/api/chat',async(req,res,next)=>{
  let message;try{message=text(req.body?.message,'Message',1,4000);}catch(e){return next(e);}
  res.set({'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();
  const emit=(event,data)=>{if(!res.destroyed)res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);};
  const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': keepalive\n\n');},15000);
  try{await lock(req.sessionToken,async()=>{const ctx=context(req.sessionToken);try{await runAgent(ctx,message,emit);}catch(e){ctx.session.messages.push({role:'assistant',content:publicError(e).error});store.saveSession(ctx.session);throw e;}emit('done',{stage:ctx.session.stage,pending:ctx.session.pending});});}
  catch(e){emit('error',publicError(e));}finally{clearInterval(heartbeat);res.end();}
 });
 app.post('/api/actions/:id/confirm',async(req,res)=>{
  const result=await lock(req.sessionToken,()=>lock('crm-writes',()=>confirmAction(context(req.sessionToken),req.params.id)));
  broadcast(result.module,result.record.id);res.json(result);
 });
 app.post('/api/actions/:id/cancel',async(req,res)=>{
  await lock(req.sessionToken,async()=>{const s=store.session(req.sessionToken);if(s.pending?.id!==req.params.id)throw new AppError('Review card not found.',404);s.pending=null;s.messages.push({role:'assistant',content:'The proposed change was cancelled. No CRM write was made.'});store.saveSession(s);});res.sendStatus(204);
 });
 app.get('/api/crm/snapshot',async(req,res)=>{
  const s=store.session(req.sessionToken);const records=await Promise.all(s.refs.map(async r=>{try{return {module:r.module,record:safeRecord(config,await crm.get(r.module,r.id))};}catch(e){return {...r,...publicError(e)};}}));res.json({records,checkedAt:new Date().toISOString()});
 });
 // Fictional local CRM control for demonstrating inbound sync. Never enabled with live Zoho.
 app.post('/api/demo/booking-stage',async(req,res)=>{
  if(config.crmMode!=='mock')throw new AppError('Demo endpoint unavailable.',404);
  const stage=text(req.body?.stage,'Allocation stage');if(!['Dispatch Pending','In Transit','Delivered'].includes(stage))throw new AppError('Invalid allocation stage.');
  await crm.update('Deals','deal-booking',{allocationStage:stage});broadcast('Deals','deal-booking');res.json({ok:true});
 });
 const dist=path.join(root,'apps/web/dist');if(existsSync(dist)){app.use(express.static(dist,{index:'index.html'}));app.get('/{*splat}',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Endpoint not found.'});res.sendFile(path.join(dist,'index.html'));});}
 app.use((req,res)=>res.status(404).json({error:'Endpoint not found.'}));
 app.use((err,req,res,next)=>{if(res.headersSent)return next(err);if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON body.'});if(err.type==='entity.too.large')return res.status(413).json({error:'Request body too large.'});console.error(JSON.stringify({event:'request_failed',code:err.code||'INTERNAL_ERROR',path:req.path}));res.status(err.status||500).json(publicError(err));});
 app.locals.closeEvents=()=>{for(const set of subscribers.values())for(const res of set)res.end();};
 return app;
}
