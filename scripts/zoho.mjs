import { getConfig } from '../apps/server/src/config.js';
import { ZohoCRM } from '../apps/server/src/crm/zoho.js';
import { seedData } from '../apps/server/src/data/seed.js';
import { encode } from '../apps/server/src/crm/fields.js';
// These are explicit operator commands, never agent-callable tools.
const config=getConfig();if(config.crmMode!=='zoho')throw new Error('Set CRM_MODE=zoho and LLM_MODE=groq before using live setup commands.');
const crm=new ZohoCRM(config),command=process.argv[2];
async function upsertFixture(module,key,record){
 const existing=await crm.search(module,key,record[key]);if(existing.length){console.log(`${module}: fixture already exists (${existing[0].id})`);return existing[0];}
 let r;
 if(module==='Deals'){
  const payload=encode(crm.fields,module,record);payload.Closing_Date=new Date(Date.now()+30*86400000).toISOString().slice(0,10);if(config.pipeline)payload.Pipeline=config.pipeline;
  const result=await crm.request('POST','/Deals',{data:[payload]});r=crm.writeResult(module,result,record);
 }else r=await crm.create(module,record,module==='Leads'?'seed-rajesh-v1':undefined);
 console.log(`${module}: created ${r.id}`);return r;
}
try{
 if(command==='check'){
  let missing=false;
  for(const [module,fields] of Object.entries(crm.fields)){
   const result=await crm.request('GET',`/settings/fields?module=${module}`);const actual=new Map((result.fields || []).map(f=>[f.api_name,f]));
   const absent=Object.values(fields).filter(f=>!actual.has(f));
   console.log(`${module}: ${absent.length?'MISSING '+absent.join(', '):'mapped fields found'}`);
   const required=(result.fields||[]).filter(f=>f.system_mandatory).map(f=>f.api_name);console.log(`  System mandatory: ${required.join(', ')}`);
   for(const key of ['stage','status','origin']){const field=actual.get(fields[key]);if(field?.pick_list_values)console.log(`  ${fields[key]} options: ${field.pick_list_values.map(p=>p.actual_value).join(' | ')}`);}
   if(absent.length)missing=true;
  }
  if(missing)process.exitCode=1;
 }else if(command==='seed'){
  const seed=seedData();const contacts={};for(const r of seed.Contacts){const {id,...data}=r;contacts[id]=await upsertFixture('Contacts','phone',data);}
  for(const r of seed.Leads){const {id,...data}=r;await upsertFixture('Leads','phone',data);}
  for(const r of seed.Deals){const {id,...data}=r;data.contactId=contacts[r.contactId].id;if(r.bookingId)data.stage=config.bookedStage;await upsertFixture('Deals',r.bookingId?'bookingId':'phone',data);}
  console.log('Fixture setup completed. Confirm each record in the Zoho dashboard.');
 }else if(command==='watch'){
  if(!config.publicUrl?.startsWith('https://'))throw new Error('PUBLIC_BASE_URL must be your public HTTPS app URL.');
  if(!config.webhookToken||config.webhookToken.length<32||config.webhookToken.length>50)throw new Error('ZOHO_WEBHOOK_TOKEN must contain 32–50 characters.');
  if(!/^\d+$/.test(config.channelId))throw new Error('ZOHO_CHANNEL_ID must be numeric.');
  const expiry=new Date(Date.now()+6*86400000).toISOString();
  const result=await crm.request('POST','/actions/watch',{watch:[{channel_id:config.channelId,channel_expiry:expiry,token:config.webhookToken,notify_url:`${config.publicUrl.replace(/\/$/,'')}/api/webhooks/zoho`,events:['Leads.all','Deals.all','Contacts.all','Cases.all']}]});
  if(result.watch?.some(w=>w.status!=='success')||!result.watch?.length)throw new Error('Zoho rejected subscription. Check notifications scope and callback settings.');
  console.log(`Notifications registered. Renew before ${expiry} by running npm run zoho:watch again.`);
 }else throw new Error('Use check, seed, or watch.');
}catch(e){console.error(e.message);process.exitCode=1;}
