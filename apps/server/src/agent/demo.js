import { executeTool } from './tools.js';
const labels={fullName:'full name',phone:'phone',email:'email',city:'city',vehicle:'vehicle',registration:'registration',odometer:'odometer',issue:'issue',location:'location',serviceType:'service type'};
function parse(message){const out={};const map={name:'fullName','full name':'fullName',phone:'phone',email:'email',city:'city',vehicle:'vehicle',registration:'registration',odometer:'odometer',issue:'issue',location:'location','service type':'serviceType'};for(const chunk of message.split(/;|\n/)){const match=chunk.trim().match(/\b(full name|service type|name|phone|email|city|vehicle|registration|odometer|issue|location):\s*(.+)$/i);if(match&&map[match[1].toLowerCase()])out[map[match[1].toLowerCase()]]=match[2].trim();}const p=message.match(/(?:\+91[ -]?)?[6-9]\d{9}\b/);if(p&&!out.phone)out.phone=p[0];const e=message.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);if(e&&!out.email)out.email=e[0];const v=message.match(/scorpio[ -]?n|xuv700|thar/i);if(v)out.vehicle=/scorpio/i.test(v[0])?'Scorpio-N':/xuv/i.test(v[0])?'XUV700':'Thar';return out;}
function summarize(result){if(result.error)return result.error;if(!result.records?.length)return result.message;return result.records.map(r=>Object.entries(r).filter(([k,v])=>v!=null&&!['modifiedAt','contactId'].includes(k)).map(([k,v])=>`${k}: ${v}`).join('\n')).join('\n\n');}
export async function demoReply(context,message,emit){
 const {session}=context;const lower=message.toLowerCase();const call=(name,args)=>executeTool(name,args,context,emit);
 let requested;
 if(/\b(service|maintenance|complaint|odometer|registration)\b/.test(lower))requested='service';
 else if(/\b(delivery|booking|vin|allocation|balance|mah-\d+)\b/.test(lower))requested='booking';
 else if(/\b(deal|quotation|quote|follow.up|existing prospect|confirmation)\b/.test(lower))requested='pipeline';
 else if(/\b(explore|models|features|price|new lead|interested|discover)\b/.test(lower))requested='discovery';
 if(requested)session.stage=requested;
 const slots=session.slots[session.stage] ||= {};Object.assign(slots,parse(message));
 if(session.stage==='booking'){
  const identifier=message.match(/MAH-\d+/i)?.[0] || slots.bookingId || slots.phone;
  if(!identifier)return 'Please provide your booking ID (demo: MAH-9921) or registered phone number.';
  if(identifier.startsWith('MAH'))slots.bookingId=identifier;
  return summarize(await call('find_booking',{identifier}));
 }
 if(session.stage==='pipeline'){
  const pref=message.match(/(?:follow.up|preference)\s*:\s*(.+)/i)?.[1];
  const identifier=slots.phone || message.match(/deal-[a-z]+/i)?.[0] || slots.dealId;
  if(!identifier)return 'Please share your registered phone number (demo: 9000000002) or deal ID.';
  const found=await call('find_deal',{identifier});if(found.error||found.records?.length!==1)return summarize(found);
  slots.dealId=found.records[0].id;
  if(pref){const r=await call('propose_follow_up',{dealId:slots.dealId,preference:pref});return r.error||'Please review and confirm the follow-up change below.';}
  return `${summarize(found)}\n\nTo change your preference, send “follow-up: Phone after 6 PM”.`;
 }
 if(session.stage==='service'){
  if(/interval|how often/.test(lower))return (await call('service_guidance',{})).guidance;
  if(!slots.phone)return 'Please share the owner’s registered phone number (demo: 9000000003).';
  const found=await call('find_contact',{phone:slots.phone});if(found.error||found.records?.length!==1)return summarize(found);
  const fields=['registration','odometer','issue','location','serviceType'];const missing=fields.filter(k=>!slots[k]);
  if(missing.length)return `Please provide ${missing.map(k=>labels[k]).join(', ')}. In demo mode, use labels separated by semicolons. Example: registration: MH12AB1234; odometer: 15000; issue: Routine maintenance; location: Pune; service type: Periodic maintenance`;
  const r=await call('propose_service',{contactId:found.records[0].id,...Object.fromEntries(fields.map(k=>[k,k==='odometer'?Number(slots[k]):slots[k]]))});return r.error||'Review the service request below and press Confirm. The service center will confirm availability.';
 }
 if(/existing lead/.test(lower)&&slots.phone)return summarize(await call('find_lead',{phone:slots.phone}));
 const fields=['fullName','phone','email','city','vehicle'];
 if(fields.every(k=>slots[k])){const r=await call('propose_lead',Object.fromEntries(fields.map(k=>[k,slots[k]])));return r.error||(r.alreadyExists?`Your lead is already registered.\n${summarize(r)}`:'Please review your details and press Confirm to register your interest. A dealer will confirm the test drive.');}
 let intro='';if(slots.vehicle||/model|explore|price|features/.test(lower)){const result=await call('vehicle_catalog',{model:slots.vehicle || 'all'});intro=result.vehicles.map(v=>`${v.model}: ${v.positioning}. ${v.features.join('; ')}. Example variant: ${v.exampleVariant}. Synthetic price: ₹${v.indicativePriceINR.toLocaleString('en-IN')}.`).join('\n')+`\n${result.disclaimer}\n\n`;}
 return `${intro}Would you like a test drive? Please share ${fields.filter(k=>!slots[k]).map(k=>labels[k]).join(', ')}. Demo format: name: Sagar Rana; phone: 9000000004; email: sagar@example.com; city: Pune; vehicle: Thar`;
}
