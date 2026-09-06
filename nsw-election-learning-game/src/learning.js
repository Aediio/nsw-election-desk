/* Pure deterministic learning rules. Browser + Node, no storage or network. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.Learning=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const levels=['beginner','standard','hard','expert'];
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);};
const version=c=>hash(JSON.stringify([c.prompt,c.answer,c.numeric||null,c.sourceIds]));
function difficulty(setting,p={}) {if(levels.includes(setting))return setting;let n=p.adaptiveLevel||0;return levels[Math.min(3,n)];}
function estimate(input,value,tolerance){const s=String(input).trim().replace(/%$/,'').trim();return /^\d+(\.\d+)?$/.test(s)&&Math.abs(Number(s)-value)<=tolerance+1e-9;}
function band(v){return v<2?'Under 2%':v<5?'2% to under 5%':v<10?'5% to under 10%':'10% or more';}
function choices(answer,others,count,seed){const a=[...new Set(others)].filter(x=>x!==answer).slice(0,count-1);a.push(answer);return a.sort((x,y)=>hash(seed+x).localeCompare(hash(seed+y)));}
function question(card,level,pool,progress={}) {
 const seed=card.id+level+(progress.reviews||0), count=level==='beginner'?3:4;
 const q={prompt:card.prompt,answer:card.answer,format:'recall',level};
 if(card.numeric){const n=card.numeric,v=n.value;q.unit=n.unit;q.exact=`${v}${n.unit} · ${n.context} · ${n.asOf}`;
  if(level==='expert'){return {...q,prompt:n.prompt+' Give an estimate.',format:'estimate',answer:String(v),tolerance:n.tolerance??0.5};}
  if(n.type==='magnitude'){const values=[10,100,1000,10000],near=values.reduce((a,b)=>Math.abs(Math.log10(v/a))<Math.abs(Math.log10(v/b))?a:b);return {...q,prompt:n.prompt+' Choose the closest order of magnitude (million dollars).',format:'choice',answer:String(near),options:choices(String(near),values.map(String),level==='beginner'?3:4,seed)};}
  if(n.type==='trend'){const answer=Math.abs(v-n.previous)<=n.tolerance?'Broadly unchanged':v>n.previous?'Increase':'Decrease';return {...q,prompt:n.prompt,format:'choice',answer,options:choices(answer,['Increase','Decrease','Broadly unchanged'],3,seed)};}
  if(level==='beginner'){const answer=band(v);return {...q,prompt:n.prompt+' Choose the margin band.',format:'choice',answer,options:choices(answer,['Under 2%','2% to under 5%','5% to under 10%','10% or more'],3,seed)};}
  if(level==='hard'&&n.comparisons?.length>=2){const peers=n.comparisons.slice(0,2),items=[{name:n.name,value:v},...peers].sort((a,b)=>a.value-b.value||a.name.localeCompare(b.name));const ordered=items.map(x=>x.name); if((progress.reviews||0)%2===0){return {...q,prompt:`Order these seats from smallest to largest margin (${n.context}, ${n.asOf}).`,format:'ordering',answer:ordered.join(' → '),options:choices(ordered[0],ordered.slice(1),3,seed),exact:items.map(x=>`${x.name}: ${x.value}%`).join(' · ')+` · ${n.context} · ${n.asOf}`};}return {...q,prompt:`Which has the smaller margin: ${n.name} or ${peers[0].name}? (${n.context}, ${n.asOf})`,format:'choice',answer:v<=peers[0].value?n.name:peers[0].name,options:[n.name,peers[0].name],exact:`${n.name}: ${v}% · ${peers[0].name}: ${peers[0].value}% · ${n.context} · ${n.asOf}`};}
  if((progress.reviews||0)%3===1){return {...q,prompt:n.prompt+' Is it under 5%?',format:'choice',answer:v<5?'Yes':'No',options:['Yes','No']};}
  const step=level==='hard'?0.5:2,anchor=Math.round(v/step)*step;const vals=[anchor,...[-1,1,-2,2,-3,3,4,5].map(k=>anchor+k*step).filter(x=>x>=0&&Math.abs(x-v)>Math.abs(anchor-v)+1e-9)];const answer=anchor.toFixed(1)+'%';return {...q,prompt:n.prompt+' Choose the closest value.',format:'choice',answer,options:choices(answer,vals.map(x=>x.toFixed(1)+'%'),4,seed)};
 }
 if(level==='expert')return q;
 const candidates=pool.filter(c=>c.id!==card.id&&c.kind===card.kind&&c.answer!==card.answer);
 const score=c=>(c.tags||[]).filter(t=>(card.tags||[]).includes(t)).length*3+(card.neighbours||[]).filter(t=>(c.tags||[]).includes(t)).length*7+(progress.commonWrongAnswers?.[c.answer]||0)*10;
 candidates.sort((a,b)=>level==='beginner'?score(a)-score(b)||a.id.localeCompare(b.id):score(b)-score(a)||a.id.localeCompare(b.id));
 const alternatives=card.distractors||(card.kind==='static'?[]:candidates.map(c=>c.answer));
 if(alternatives.length>=2&&!['campaign','interstate','scenario'].includes(card.kind)){q.format='choice';q.options=choices(card.answer,alternatives,count,seed);}
 return q;
}
function review(previous={},event){const {day,correct,confidence,level,wrongAnswer,contentVersion,responseTime}=event;
 const p={...previous},valid=p.contentVersion===contentVersion||!p.contentVersion;
 const dates=valid?[...(p.recallDates||[])]:[];
 const eligible=correct&&confidence>=2&&level!=='beginner';
 if(eligible&&!dates.includes(day))dates.push(day);dates.sort();
 const expertDates=valid?[...(p.expertDates||[])]:[];if(eligible&&level==='expert'&&!expertDates.includes(day))expertDates.push(day);
 const span=dates.length?(Date.parse(day)-Date.parse(dates[0]))/86400000:0;
 const mastery=dates.length>=3&&span>=14&&expertDates.length>=2?'mastered':dates.length>=2?'learned':correct?'familiar':'learning';
 const sameDayLapse=p.lastReview===day&&p.lastRating==='again';
 const interval=!correct||sameDayLapse?1:confidence===1?2:confidence===2?[4,10,21][Math.min(2,Math.max(0,dates.length-1))]:[7,21,45][Math.min(2,Math.max(0,dates.length-1))];
 const commonWrongAnswers={...(p.commonWrongAnswers||{})};if(!correct&&wrongAnswer)commonWrongAnswers[String(wrongAnswer).slice(0,500)]=(commonWrongAnswers[wrongAnswer]||0)+1;
 const best=correct&&confidence>=2?Math.max(levels.indexOf(p.highestDifficultySucceeded),levels.indexOf(level)):levels.indexOf(p.highestDifficultySucceeded);
 const due=new Date(Date.parse(day+'T12:00:00Z')+interval*86400000).toISOString().slice(0,10);
 return {...p,firstSeenAt:p.firstSeenAt||day,lastReviewedAt:day,nextDueAt:due,due,interval,reviews:(p.reviews||0)+1,attempts:(p.attempts||p.reviews||0)+1,successes:(p.successes||0)+(correct?1:0),lapses:(p.lapses||0)+(correct?0:1),lastRating:correct?(confidence===1?'hard':'good'):'again',lastConfidence:confidence,lastReview:day,recallDates:dates,expertDates,successfulSpacedRecalls:dates.length,mastery,level:mastery==='mastered'?4:mastery==='learned'?2:correct?1:0,adaptiveLevel:!correct?Math.max(0,levels.indexOf(level)-1):correct&&confidence>=2&&p.lastReview!==day?Math.min(3,levels.indexOf(level)+1):levels.indexOf(level),highestDifficultySucceeded:levels[best]||null,commonWrongAnswers,highConfidenceErrors:(p.highConfidenceErrors||0)+(!correct&&confidence===3?1:0),responseTime,contentVersion,updated:false};
}
function reconcile(records,cards,day){const out={...records};for(const c of cards){const p=out[c.id];if(!p)continue;const v=version(c);if(!p.contentVersion)out[c.id]={...p,contentVersion:v};else if(p.contentVersion!==v)out[c.id]={...p,contentVersion:v,updated:true,previousVersion:p.contentVersion,recallDates:[],expertDates:[],successfulSpacedRecalls:0,mastery:'learning',level:0,adaptiveLevel:0,due:day,nextDueAt:day};}return out;}
function importState(input,base){if(!input||input.version!==1||!input.cards||Array.isArray(input.cards)||typeof input.cards!=='object')throw Error('Invalid progress');
 const clean=JSON.parse(JSON.stringify(input));const dangerous=o=>{if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Invalid field');dangerous(o[k]);}};dangerous(clean);
 for(const p of Object.values(clean.cards)){if(!p||typeof p!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(p.due)||!Number.isFinite(p.reviews)||p.reviews<0)throw Error('Invalid card');for(const key of ['recallDates','expertDates'])if(p[key]!=null&&(!Array.isArray(p[key])||!p[key].every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d))))throw Error('Invalid recall dates');if(p.commonWrongAnswers!=null&&(typeof p.commonWrongAnswers!=='object'||Array.isArray(p.commonWrongAnswers)||Object.values(p.commonWrongAnswers).some(n=>!Number.isFinite(n)||n<0)))throw Error('Invalid confusions');for(const key of ['level','successes','lapses','interval','adaptiveLevel','highConfidenceErrors','attempts','successfulSpacedRecalls'])if(p[key]!=null&&(!Number.isFinite(p[key])||p[key]<0))throw Error('Invalid metric');}
 const settings={...base.settings};for(const k of ['theme','difficulty','sessionLength','confidencePrompts','mapAssistance'])if(clean.settings?.[k]!=null)settings[k]=clean.settings[k];
 if(!['system','light','dark'].includes(settings.theme))settings.theme='system';if(![...levels,'adaptive'].includes(settings.difficulty))settings.difficulty='standard';if(![5,10,12,20].includes(settings.sessionLength))settings.sessionLength=10;
 const activity={...base.activity};for(const k of ['sessions','totalReviews','successfulReviews','highConfidenceMisses'])if(Number.isFinite(clean.activity?.[k])&&clean.activity[k]>=0)activity[k]=clean.activity[k];if(/^\d{4}-\d{2}-\d{2}$/.test(clean.activity?.lastStudy))activity.lastStudy=clean.activity.lastStudy;activity.confidence=structuredClone(base.activity.confidence);for(const k of ['1','2','3']){const b=clean.activity?.confidence?.[k];if(b&&Number.isFinite(b.reviews)&&Number.isFinite(b.successes)&&b.reviews>=b.successes&&b.successes>=0)activity.confidence[k]=b;}
 const notes={};for(const [k,v]of Object.entries(clean.notes||{})){if(typeof v!=='string'||v.length>100000)throw Error('Invalid note');notes[k]=v;}
 return {...base,cards:clean.cards,notes,settings,activity};}
return {levels,normalize,hash,version,difficulty,estimate,band,question,review,reconcile,importState};
});
