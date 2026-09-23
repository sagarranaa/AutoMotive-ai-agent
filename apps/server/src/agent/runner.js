import { definitions,executeTool } from './tools.js';
import { systemPrompt } from './prompt.js';
import { AppError } from '../errors.js';
import { demoReply } from './demo.js';
export async function runAgent(context,message,emit=()=>{}){
 const {session,store,config,provider}=context;
 if(session.messages.length>=160)throw new AppError('This conversation is full. Start a new conversation.',409);
 session.messages.push({role:'user',content:message});store.saveSession(session);
 if(config.llmMode==='demo'){
  const answer=await demoReply(context,message,emit);session.messages.push({role:'assistant',content:answer});store.saveSession(session);emit('delta',{text:answer});return answer;
 }
 // Tool messages exist only within this turn, so persisted history never contains orphaned tool calls.
 const conversation=[{role:'system',content:systemPrompt(session)},...session.messages];let answer='';
 for(let round=0;round<6;round++){
  const response=await provider.complete(conversation,definitions,delta=>{answer+=delta;emit('delta',{text:delta});});
  conversation.push(response);
  if(!response.tool_calls?.length){if(!answer)answer='Please share more details so I can help.';session.messages.push({role:'assistant',content:answer});store.saveSession(session);return answer;}
  for(const call of response.tool_calls.slice(0,6)){
   let result;try{result=await executeTool(call.function.name,JSON.parse(call.function.arguments),context,emit);}catch{result={error:'Invalid tool arguments. Ask the user for missing details.'};}
   conversation.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(result)});store.saveSession(session);
  }
  if(response.tool_calls.length>6)break;
 }
 throw new AppError('The agent reached its tool limit. Any prepared action is still available for review. Please narrow your request.',422,'TOOL_LIMIT');
}
