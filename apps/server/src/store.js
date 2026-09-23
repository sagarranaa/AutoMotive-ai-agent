import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
export class Store {
  constructor(filename) {
    if(filename!==':memory:') mkdirSync(path.dirname(filename),{recursive:true});
    this.db=new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(module TEXT, id TEXT, data TEXT NOT NULL, PRIMARY KEY(module,id));
      CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY, session TEXT NOT NULL, state TEXT NOT NULL, result TEXT);
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT);`);
  }
  newSession() {
    const session={token:randomBytes(32).toString('hex'), messages:[], stage:'discovery', slots:{}, refs:[], pending:null, createdAt:new Date().toISOString()};
    this.saveSession(session); return session;
  }
  session(token) { const row=this.db.prepare('SELECT data FROM sessions WHERE token=?').get(token); return row ? JSON.parse(row.data) : null; }
  saveSession(s) { this.db.prepare('INSERT OR REPLACE INTO sessions VALUES (?,?)').run(s.token,JSON.stringify(s)); }
  records(module) { return this.db.prepare('SELECT data FROM records WHERE module=?').all(module).map(r=>JSON.parse(r.data)); }
  record(module,id) { const r=this.db.prepare('SELECT data FROM records WHERE module=? AND id=?').get(module,id); return r ? JSON.parse(r.data):null; }
  put(module,record) { const r={...record,id:record.id || randomUUID(),modifiedAt:new Date().toISOString()}; this.db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?)').run(module,r.id,JSON.stringify(r)); return r; }
  operation(id) { const r=this.db.prepare('SELECT * FROM operations WHERE id=?').get(id); return r && {...r,result:r.result?JSON.parse(r.result):null}; }
  setOperation(id,token,state,result=null) { this.db.prepare('INSERT OR REPLACE INTO operations VALUES (?,?,?,?)').run(id,token,state,result?JSON.stringify(result):null); }
  close(){this.db.close();}
}
// Serializes chat and confirmations within one process; SQLite persists completed operation IDs.
export function createLock() {
  const active=new Map();
  return async (key,work)=> {
    const previous=active.get(key) || Promise.resolve();
    const run=previous.catch(()=>{}).then(work); active.set(key,run);
    try{return await run;} finally {if(active.get(key)===run) active.delete(key);}
  };
}
