/* Device-only optional service. Never included in progress exports. */
(function(root){'use strict';
const KEY='nswElectionDesk.gemini.device';
class GeminiService {
 constructor(storage,fetcher){this.storage=storage;this.fetcher=fetcher;}
 config(){try{return JSON.parse(this.storage.getItem(KEY))||{};}catch{return {};}}
 save({key,model,enabled}){const prior=this.config();this.storage.setItem(KEY,JSON.stringify({key:key||prior.key||'',model:model||prior.model||'gemini-3.6-flash',enabled:!!enabled}));}
 remove(){this.storage.removeItem(KEY);}
 isConfigured(){const c=this.config();return !!(c.key&&c.enabled);}
 async request(prompt,{grounded=false,test=false}={}){const c=this.config();if(!c.key||(!c.enabled&&!test))throw Error('Add a key and enable AI in Settings.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{const res=await this.fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model||'gemini-3.6-flash')}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':c.key},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],...(grounded?{tools:[{google_search:{}}]}:{})}),signal:controller.signal});
 if(!res.ok)throw Error(({400:'Request rejected. Check the key, model and search support.',401:'The API key was not accepted.',403:'Key permission or restriction prevented access.',404:'Model unavailable. Choose another model.',429:'Gemini quota reached. Try again later.'})[res.status]||'Gemini is unavailable. Try again later.');
 const body=await res.json(),candidate=body.candidates?.[0];const text=(candidate?.content?.parts||[]).map(p=>p.text||'').join('\n').split(c.key).join('[redacted]');if(!text)throw Error('Gemini returned no answer. Try a different question.');
 const sources=(candidate?.groundingMetadata?.groundingChunks||[]).map(x=>x.web).filter(x=>x&&/^https:\/\//.test(x.uri)&&!x.uri.includes(c.key));return {text,sources};
 }catch(e){if(e.name==='AbortError')throw Error('Gemini timed out. Core learning is still available.');if(e instanceof TypeError)throw Error('Connection failed. Check your connection and key restrictions.');throw e;}finally{clearTimeout(timeout);}}
 testConnection(){return this.request('Reply with: Connection successful.',{test:true});}
 explain(context,task='Explain why this fact matters and give a short memory clue.'){return this.request(`You help a politically neutral NSW state reporter learn. Use ONLY the supplied approved snapshot for factual claims. Separate inference. Do not invent facts or sources. ${task}\nApproved context: ${JSON.stringify(context)}`);}
 research(query){return this.request(`Research for a politically neutral NSW state reporter as of ${new Date().toISOString().slice(0,10)}. Prefer NSW Parliament, NSWEC and official documents; then accountability institutions and established reporting. Cite dated sources. Distinguish state districts, federal divisions and council wards. A party claim establishes only what they said. Label uncertainty and candidate status. This is temporary research, never an approved factual update. Question: ${query}`,{grounded:true});}
}
if(typeof module==='object')module.exports=GeminiService;else root.GeminiService=GeminiService;
})(typeof globalThis!=='undefined'?globalThis:this);
