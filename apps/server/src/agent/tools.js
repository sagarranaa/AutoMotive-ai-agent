import { randomUUID } from 'node:crypto';
import { catalog } from '../data/catalog.js';
import { AppError,publicError } from '../errors.js';
import { text,phone,lead,service } from './validation.js';
const str=description=>({type:'string',description});
const def=(name,description,properties,required=Object.keys(properties))=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const definitions=[
 def('vehicle_catalog','Read the synthetic demo catalog; quote its disclaimer and offer a test drive.',{model:{type:'string',enum:['all','Thar','XUV700','Scorpio-N']}}),
 def('find_lead','Find a previously registered lead by phone, before proposing a duplicate lead.',{phone:str('Indian mobile number')}),
 def('find_deal','Read active prospect deal(s) by phone or exact CRM record ID.',{identifier:str('Phone or exact CRM record ID')}),
 def('find_booking','Read a booked vehicle by booking ID or phone. Only confirmed booking stages are returned.',{identifier:str('Booking ID such as MAH-9921 or phone')}),
 def('find_contact','Look up the existing Contact to link a service case.',{phone:str('Owner mobile number')}),
 def('propose_lead','Prepare a review card, not a CRM write. Collect all required details first.',{fullName:str('Full name'),phone:str('Mobile'),email:str('Email'),city:str('Preferred city'),vehicle:{type:'string',enum:['Thar','XUV700','Scorpio-N']}}),
 def('propose_follow_up','Prepare a change to a deal already returned by find_deal; user confirms in UI.',{dealId:str('Previously returned deal ID'),preference:str('Requested contact time and channel')}),
 def('propose_service','Prepare a service case linked to a previously found Contact; no guaranteed appointment.',{contactId:str('Previously returned Contact ID'),registration:str('Vehicle registration'),odometer:{type:'integer',minimum:0,maximum:2000000},issue:str('Reported issue'),location:str('Preferred service center/city'),serviceType:str('Complaint or periodic maintenance')}),
 def('service_guidance','Return conservative service guidance; do not invent manufacturer intervals.',{})
];
export function safeRecord(config,r){const v={...r};delete v.operationId;if(v.paymentUrl){try{const u=new URL(v.paymentUrl);if(u.protocol!=='https:'||u.username||u.password||!config.paymentHosts.includes(u.hostname))v.paymentUrl=null;}catch{v.paymentUrl=null;}}return v;}
export function remember(session,module,records){for(const r of records)if(!session.refs.some(x=>x.module===module&&x.id===r.id))session.refs.push({module,id:r.id});session.refs=session.refs.slice(-12);}
function requireRef(s,module,id){if(!s.refs.some(r=>r.module===module&&r.id===id))throw new AppError('Look up the record in this conversation first.');}
function pending(session,kind,data){if(session.pending)throw new AppError('Confirm or cancel the existing review card before preparing another change.');session.pending={id:randomUUID(),kind,data,createdAt:new Date().toISOString()};return {awaitingConfirmation:true,action:session.pending,message:'Ask the user to review and press Confirm in the app. Nothing has been written yet.'};}
export async function executeTool(name,args,{session,crm,config},emit=()=>{}){
 try {
  if(!definitions.some(t=>t.function.name===name))throw new AppError('Unknown tool.');
  const allowed=Object.keys(definitions.find(t=>t.function.name===name).function.parameters.properties);
  if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!allowed.includes(k)))throw new AppError('Invalid tool arguments.');
  emit('status',{message:`Checking ${name.replaceAll('_',' ')}…`});
  let module,records;
  switch(name){
   case 'vehicle_catalog':session.stage='discovery';return catalog(args.model || 'all');
   case 'service_guidance':session.stage='service';return {guidance:'Service intervals depend on model, model year, engine and usage. Check your owner manual or let the service center confirm the schedule. For warning lights, overheating, brake or steering faults, stop safely and seek authorized assistance. A case is a request; an appointment is confirmed only by the center.'};
   case 'find_lead':module='Leads';records=await crm.search(module,'phone',phone(args.phone));session.stage='discovery';break;
   case 'find_contact':module='Contacts';records=await crm.search(module,'phone',phone(args.phone));session.stage='service';break;
   case 'find_deal':{
    module='Deals';const id=text(args.identifier,'Phone or deal ID',3,120);
    records=/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(id)?await crm.search(module,'phone',phone(id)):[await crm.get(module,id)];
    records=records.filter(r=>![config.bookedStage,'Closed Won','Closed Lost'].includes(r.stage));session.stage='pipeline';break;
   }
   case 'find_booking':{
    module='Deals';const id=text(args.identifier,'Booking ID or phone',3,120);
    records=/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(id)?await crm.search(module,'phone',phone(id)):await crm.search(module,'bookingId',id.toUpperCase().replace(/^#/,''));
    records=records.filter(r=>r.stage===config.bookedStage || (r.stage==='Closed Won'&&r.bookingId));session.stage='booking';break;
   }
   case 'propose_lead':{
    const data=lead(args);const found=await crm.search('Leads','phone',data.phone);if(found.length){remember(session,'Leads',found);return {alreadyExists:true,records:found.map(r=>safeRecord(config,r)),message:'An existing lead was found. Do not create another.'};}
    session.stage='discovery';return pending(session,'lead',data);
   }
   case 'propose_follow_up':requireRef(session,'Deals',args.dealId);session.stage='pipeline';return pending(session,'follow_up',{dealId:args.dealId,preference:text(args.preference,'Follow-up preference',3,200)});
   case 'propose_service':requireRef(session,'Contacts',args.contactId);session.stage='service';return pending(session,'service',{...service(args),contactId:args.contactId});
  }
  remember(session,module,records);return {module,records:records.map(r=>safeRecord(config,r)),message:records.length?'Use only these CRM values. Ask the customer to choose if multiple records match.':'No matching record found. Ask for a corrected identifier; do not invent records.'};
 }catch(error){return publicError(error);}
}
export async function confirmAction({session,crm,store,config},actionId){
 const previous=store.operation(actionId);
 if(previous){if(previous.session!==session.token)throw new AppError('Action not found.',404);if(previous.state==='complete')return previous.result;throw new AppError('This action has an uncertain earlier outcome. Check CRM before creating a new request.',409,'WRITE_UNCERTAIN');}
 const action=session.pending;
 if(!action||action.id!==actionId)throw new AppError('Review card expired or not found.',409);
 if(Date.now()-Date.parse(action.createdAt)>30*60*1000)throw new AppError('Review card expired. Cancel it and prepare a new request.',409);
 store.setOperation(actionId,session.token,'started');
 let module,record;
 try {
  if(action.kind==='lead'){
   module='Leads';const existing=await crm.search(module,'phone',action.data.phone);
   record=existing[0] || await crm.create(module,action.data,actionId);
  }else if(action.kind==='follow_up'){
   module='Deals';requireRef(session,module,action.data.dealId);record=await crm.update(module,action.data.dealId,{followUp:action.data.preference});
  }else if(action.kind==='service'){
   module='Cases';requireRef(session,'Contacts',action.data.contactId);await crm.get('Contacts',action.data.contactId);
   record=await crm.create(module,{...action.data,subject:`${action.data.serviceType}: ${action.data.registration}`,status:'New',origin:'Web'},actionId);
  }else throw new AppError('Invalid pending action.');
 }catch(error){
  if(error.code==='WRITE_UNCERTAIN')store.setOperation(actionId,session.token,'uncertain');
  else store.db.prepare('DELETE FROM operations WHERE id=?').run(actionId);
  throw error;
 }
 const result={module,record:safeRecord(config,record),message:action.kind==='service'?'Service request saved. The center must confirm the appointment.':action.kind==='lead'?'Lead saved. The dealer will need to confirm a test drive.':'Follow-up preference saved.'};
 remember(session,module,[record]);session.pending=null;session.messages.push({role:'assistant',content:`${result.message} CRM reference: ${record.id}.`});
 store.db.exec('BEGIN');try{store.setOperation(actionId,session.token,'complete',result);store.saveSession(session);store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
 return result;
}
