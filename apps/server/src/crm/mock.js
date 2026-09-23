import { seedData } from '../data/seed.js';
import { AppError } from '../errors.js';
export const normalizePhone=value=>String(value || '').replace(/\D/g,'').slice(-10);
export class MockCRM {
 constructor(store){this.store=store; if(!store.db.prepare("SELECT value FROM metadata WHERE key='seeded'").get()) {for(const [m,rs] of Object.entries(seedData())) rs.forEach(r=>store.put(m,r)); store.db.prepare("INSERT INTO metadata VALUES ('seeded','true')").run();}}
 async search(module,field,value){return this.store.records(module).filter(r=>field==='phone'?normalizePhone(r[field])===normalizePhone(value):String(r[field] || '').toLowerCase()===String(value).toLowerCase());}
 async get(module,id){const r=this.store.record(module,id); if(!r)throw new AppError('CRM record not found.',404,'NOT_FOUND'); return r;}
 async create(module,data,operationId){const existing=this.store.records(module).find(r=>r.operationId===operationId); return existing || this.store.put(module,{...data,operationId});}
 async update(module,id,patch){return this.store.put(module,{...await this.get(module,id),...patch,id});}
}
