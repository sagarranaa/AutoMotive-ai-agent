import { AppError } from '../errors.js';
export class Groq {
 constructor(config,fetcher=fetch){this.config=config;this.fetch=fetcher;}
 async complete(messages,tools,onDelta=()=>{}){
  let response;
  try{response=await this.fetch(`${this.config.groqBase}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${this.config.groqKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.config.groqModel,messages,tools,tool_choice:'auto',temperature:0.2,max_completion_tokens:4096,...(this.config.groqModel.startsWith('openai/gpt-oss')?{reasoning_effort:'low'}:{}),stream:true,parallel_tool_calls:false}),signal:AbortSignal.timeout(45000)});}catch{throw new AppError('The AI provider is unavailable. Please try again.',503,'LLM_UNAVAILABLE');}
  if(!response.ok)throw new AppError(response.status===429?'AI rate limit reached. Wait a moment and retry.':'The AI request failed. Check the model and API key configuration.',502,'LLM_ERROR');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',content='',calls=[],finish=null;
  function line(raw){if(!raw.startsWith('data:'))return;const source=raw.slice(5).trim();if(!source||source==='[DONE]')return;const payload=JSON.parse(source);if(payload.error)throw new AppError('The AI stream failed.',502,'LLM_ERROR');const choice=payload.choices?.[0];if(!choice)return;finish=choice.finish_reason || finish;const d=choice.delta || {};
   if(d.content){content+=d.content;onDelta(d.content);}
   for(const t of d.tool_calls || []){const i=t.index;calls[i] ||= {id:'',type:'function',function:{name:'',arguments:''}};if(t.id)calls[i].id=t.id;if(t.function?.name)calls[i].function.name+=t.function.name;if(t.function?.arguments)calls[i].function.arguments+=t.function.arguments;}
  }
  try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop();lines.forEach(line);}buffer+=decoder.decode();if(buffer.trim())line(buffer);}catch(error){if(error instanceof AppError)throw error;throw new AppError('The AI stream was interrupted. Please try again.',502,'LLM_STREAM_ERROR');}finally{reader.releaseLock();}
  if(finish==='length'||!finish)throw new AppError('The AI response was incomplete. Please try a shorter request.',502,'LLM_INCOMPLETE');
  return {role:'assistant',content:content || null,...(calls.length?{tool_calls:calls.filter(Boolean)}:{})};
 }
}
