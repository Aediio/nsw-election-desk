const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),read=p=>fs.readFileSync(p,'utf8');
const html=read(path.join(dist,'index.html'));
assert(!html.includes('/*__'));assert(!html.includes('__D3_'));assert(fs.statSync(path.join(dist,'index.html')).size<25000);
for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert(fs.existsSync(path.join(dist,match[1])),match[1]);
for(const file of ['app.js','learning.js','gemini.js','data.js','d3.js','sw.js'])new vm.Script(read(path.join(dist,file)),{filename:file});
const context={window:{},localStorage:{getItem:()=>null},document:{},console,Date,Intl,Set,Map,JSON,structuredClone};context.window.fetch=()=>{};context.window.Learning=require('../nsw-election-learning-game/src/learning.js');context.window.GeminiService=require('../nsw-election-learning-game/src/gemini.js');vm.createContext(context);vm.runInContext(read(path.join(dist,'data.js')),context);
let app=read(path.join(dist,'app.js'));app=app.slice(0,app.indexOf("    document.addEventListener("))+'\nwindow.testCards=cards;})();';vm.runInContext(app,context);
const cards=context.window.testCards,L=context.window.Learning;assert(cards.length>500);assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
let summary={};for(const level of L.levels){const formats={};for(const card of cards){const q=L.question(card,level,cards);formats[q.format]=(formats[q.format]||0)+1;if(q.options){assert.equal(new Set(q.options).size,q.options.length,card.id);if(q.format!=='ordering')assert(q.options.includes(q.answer),card.id);assert(q.options.length>=2);}}
summary[level]=formats;}
for(const file of fs.readdirSync(dist)){if(fs.statSync(path.join(dist,file)).isFile())assert(!/AIza[0-9A-Za-z_-]{35}/.test(read(path.join(dist,file))),'Potential API key in '+file);}
assert.equal(context.window.NSW_GAME_DATA.seats.length,93);assert.equal(context.window.NSW_GAME_DATA.membersLC.length,42);
console.log('Built asset integrity passed; '+cards.length+' derived cards. '+JSON.stringify(summary));
