import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from '../config.js';
export const defaultFields={
 Leads:{fullName:'Last_Name',phone:'Phone',email:'Email',city:'City',vehicle:'Vehicle_Model',status:'Lead_Status',operationId:'Agent_Request_ID'},
 Contacts:{fullName:'Last_Name',phone:'Phone',email:'Email'},
 Deals:{name:'Deal_Name',phone:'Customer_Phone',vehicle:'Vehicle_Model',stage:'Stage',testDriveAt:'Test_Drive_At',quote:'Amount',dealer:'Dealer_Contact',followUp:'Follow_Up_Preference',contactId:'Contact_Name',bookingId:'Booking_ID',allocationStage:'Allocation_Stage',deliveryDate:'Expected_Delivery_Date',vin:'VIN',paymentUrl:'Balance_Payment_Link'},
 Cases:{subject:'Subject',description:'Description',status:'Status',origin:'Case_Origin',contactId:'Related_To',registration:'Vehicle_Registration',odometer:'Odometer_Km',location:'Service_Center_Location',serviceType:'Service_Type',operationId:'Agent_Request_ID'}
};
export function getFields(config){const override=config.fieldMapFile?JSON.parse(readFileSync(path.resolve(root,config.fieldMapFile),'utf8')):{}; return Object.fromEntries(Object.entries(defaultFields).map(([m,f])=>[m,{...f,...override[m]}]));}
export function encode(fields,module,record){const out={}; for(const [key,value] of Object.entries(record)) {if(key==='id') out.id=value; else if(fields[module][key] && value!==undefined) out[fields[module][key]]=key==='contactId'&&value?{id:value}:value;} return out;}
export function decode(fields,module,r){const out={id:r.id}; for(const [key,api] of Object.entries(fields[module])) {let value=r[api]; if(key==='contactId') value=value?.id; if(key==='fullName') value=r.Full_Name || [r.First_Name,r.Last_Name].filter(Boolean).join(' '); out[key]=value ?? null;} out.modifiedAt=r.Modified_Time;return out;}
