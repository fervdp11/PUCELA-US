const rand=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
export const minDuration={chalk:2200,desks:2200,wires:2200,computer:2500,documents:2200,delivery:2000,book:2000,exams:2500,supplies:2500,bell:4000,german:2500,papers:2000,lights:2500,code:2500,folders:2500,bath:2500};
export function challenge(kind){
 switch(kind){
 case 'chalk':return {dirt:shuffle(Array.from({length:24},(_,i)=>i)).slice(0,16)};
 case 'desks':case 'lights':return {rotations:Array.from({length:kind==='desks'?6:9},()=>1+rand(3))};
 case 'wires':case 'german':return {order:shuffle([0,1,2,3])};
 case 'computer':return {target:Array.from({length:5},()=>rand(2)),states:Array.from({length:5},()=>rand(2))};
 case 'documents':case 'delivery':case 'exams':return {samples:shuffle([12,27,41,65,83])};
 case 'folders':return {samples:shuffle([0,1,2,3,4]),labels:['Actas','Becas','Circulares','Diplomas','Evaluaciones']};
 case 'supplies':return {items:shuffle([0,1,2,0,1,2]),labels:['Lápiz','Cuaderno','Regla']};
 case 'bell':return {sequence:Array.from({length:5},()=>rand(4))};
 case 'book':return {target:rand(12),titles:shuffle(['Atlas','Robótica','El Quijote','Poesía','Biología','Matemáticas','Deutsch','Historia','Física','Teatro','Música','Dibujo'])};
 case 'papers':return {papers:shuffle(Array.from({length:16},(_,i)=>i)).slice(0,8)};
 case 'bath':return {levels:Array.from({length:3},()=>25+rand(51))};
 case 'code':return {code:Array.from({length:5},()=>rand(10)).join('')};
 default:throw new Error('Tarea no reconocida.');
 }
}
export function solution(kind,c,s){
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 switch(kind){
 case 'chalk':return Array.isArray(s)&&equal([...s].sort((a,b)=>a-b),[...c.dirt].sort((a,b)=>a-b));
 case 'papers':return Array.isArray(s)&&equal([...s].sort((a,b)=>a-b),[...c.papers].sort((a,b)=>a-b));
 case 'desks':case 'lights':return Array.isArray(s)&&s.length===c.rotations.length&&s.every(v=>v===0);
 case 'wires':case 'german':return Array.isArray(s)&&s.length===4&&s.every((v,i)=>v===c.order.indexOf(i));
 case 'computer':return equal(s,c.target);
 case 'documents':case 'delivery':case 'exams':case 'folders':return equal(s,[...c.samples].sort((a,b)=>a-b));
 case 'supplies':return equal(s,c.items);
 case 'bell':return equal(s,c.sequence);
 case 'book':return s===c.target;
 case 'bath':return Array.isArray(s)&&s.length===3&&s.every((v,i)=>Number.isFinite(v)&&Math.abs(v-c.levels[i])<=2);
 case 'code':return String(s)===c.code;
 default:return false;
 }
}
