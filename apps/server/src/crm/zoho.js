import { AppError } from '../errors.js';
import { getFields,encode,decode } from './fields.js';
import { normalizePhone } from './mock.js';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export class ZohoCRM {
 constructor(config,fetcher=fetch){this.config=config;this.fetch=fetcher;this.fields=getFields(config);this.access=null;this.refreshing=null;}
 async token(force=false){
  if(!force && this.access && this.access.expiresAt>Date.now()+60000) return this.access.token;
  if(this.refreshing)return this.refreshing;
  this.refreshing=(async()=>{
   let response; try {response=await this.fetch(`${this.config.accountsUrl}/oauth/v2/token`,{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:this.config.clientId,client_secret:this.config.clientSecret,refresh_token:this.config.refreshToken}),signal:AbortSignal.timeout(15000)});}catch{throw new AppError('Zoho authentication is temporarily unavailable.',503,'ZOHO_AUTH_UNAVAILABLE');}
   const data=await response.json();
   if(!response.ok || !data.access_token)throw new AppError('Zoho OAuth failed. Check the backend credentials and data center.',502,'ZOHO_AUTH_ERROR');
   // Use the configured organization/environment domain, never an untrusted callback URL.
   this.access={token:data.access_token,expiresAt:Date.now()+Number(data.expires_in || 3600)*1000};return this.access.token;
  })();
  try{return await this.refreshing;}finally{this.refreshing=null;}
 }
 async request(method,route,body){
  for(let attempt=0;attempt<3;attempt++){
   const token=await this.token(); let response;
   try{response=await this.fetch(`${this.config.apiDomain}/crm/v8${route}`,{method,headers:{Authorization:`Zoho-oauthtoken ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});}catch{throw new AppError(method==='GET'?'Zoho is temporarily unavailable.':'CRM write outcome is uncertain. Check Zoho before retrying.',503,method==='GET'?'CRM_UNAVAILABLE':'WRITE_UNCERTAIN');}
   if(response.status===401 && attempt===0){await this.token(true);continue;}
   if(method==='GET' && (response.status===429 || response.status>=500) && attempt<2){await pause(Math.min(Number(response.headers.get('retry-after') || 1)*1000,3000));continue;}
   if(response.status===204)return {data:[]};
   let data;try{data=await response.json();}catch{throw new AppError('Invalid response from CRM.',502,method==='GET'?'CRM_ERROR':'WRITE_UNCERTAIN');}
   if (!response.ok) {
  const errors = Array.isArray(data.data) ? data.data : [data];

  console.error("Zoho request:", method, route.split("?")[0]);
  for (const error of errors) {
    console.error({
      code: error.code,
      message: error.message,
      field: error.details?.api_name,
      expectedType: error.details?.expected_data_type,
    });
  }
}
   if(!response.ok)throw new AppError(`Zoho request failed (${data.code || response.status}). Check configuration or retry later.`,502,method!=='GET'&&response.status>=500?'WRITE_UNCERTAIN':'CRM_ERROR');
   return data;
  }
  throw new AppError('Zoho request failed after retry.',502,'CRM_ERROR');
 }
 async search(module,field,value){
  const api=this.fields[module]?.[field]; if(!api)throw new AppError('Unsupported CRM search field.');
  // Narrow exact-match input prevents criteria syntax injection; server validates identifiers too.
  if(!/^[\w@.+\- ]{1,120}$/.test(value))throw new AppError('Use a valid phone number, email, or identifier.');
  const v=field==='phone'?normalizePhone(value):value;
  const result=await this.request('GET',`/${module}/search?${new URLSearchParams({criteria:`(${api}:equals:${v})`,per_page:'200'})}`);
  const rows=(result.data || []).map(r=>decode(this.fields,module,r)).filter(r=>field==='phone'?normalizePhone(r[field])===v:String(r[field] || '').toLowerCase()===v.toLowerCase());
  return rows;
 }
 async get(module,id){
  if(!/^\d{10,30}$/.test(id))throw new AppError('Use the numeric Zoho record ID, or search by phone/booking ID.');
  const data=await this.request('GET',`/${module}/${id}`); if(!data.data?.[0])throw new AppError('CRM record not found.',404,'NOT_FOUND');return decode(this.fields,module,data.data[0]);
 }
 async create(module,record,operationId){
  if(operationId){const found=await this.search(module,'operationId',operationId);if(found.length)return found[0];}
  const data=await this.request('POST',`/${module}`,{data:[encode(this.fields,module,{...record,...(operationId?{operationId}:{})})]});
  return this.writeResult(module,data,record,operationId);
 }
 async update(module,id,patch){const data=await this.request('PUT',`/${module}/${id}`,{data:[encode(this.fields,module,patch)]});return this.writeResult(module,data,{...patch,id});}
 writeResult(module,data,record,operationId){
  const r=data.data?.[0]; if(r?.status!=='success')throw new AppError(`Zoho rejected the record (${r?.code || 'UNKNOWN'}). Check required fields and picklist values.`,502,'CRM_WRITE_REJECTED');
  // Do not turn a successful write into a failure if an immediate read is eventually consistent.
  return {...record,id:r.details.id,operationId,modifiedAt:r.details.Modified_Time};
 }
}
