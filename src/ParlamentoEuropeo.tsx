import React,{useState} from 'react';
type Group={key:string;label:string;short:string;seats:number;color:string;countries:string[]};
const groups:Group[]=[
 {key:'left',label:'Izquierda radical',short:'La Izquierda',seats:45,color:'#8E44AD',countries:['España','Francia','Alemania','Grecia','Italia']},
 {key:'social',label:'Socialistas y socialdemócratas',short:'S&D',seats:135,color:'#DC3545',countries:['España','Francia','Alemania','Italia','Portugal']},
 {key:'liberal',label:'Liberales y centro',short:'Renew Europe',seats:78,color:'#E5B700',countries:['España','Francia','Alemania','Países Bajos','Bélgica']},
 {key:'conservative',label:'Conservadores y democristianos',short:'PPE + ECR',seats:268,color:'#2563B8',countries:['España','Alemania','Italia','Polonia','Portugal']},
 {key:'nationalist',label:'Nacionalistas no radicales',short:'Sin grupo separado',seats:0,color:'#C77732',countries:[]},
 {key:'radical',label:'Derecha radical',short:'Patriotas + ESN',seats:112,color:'#23864B',countries:['Francia','Italia','España','Alemania','Polonia']},
 {key:'green',label:'Ecologistas',short:'Verdes/ALE',seats:53,color:'#16A6B6',countries:['España','Alemania','Francia','Países Bajos','Irlanda']},
 {key:'unaffiliated',label:'No inscritos',short:'No inscritos',seats:28,color:'#9299A3',countries:['España','Chipre','Grecia','Italia']}
];
export default function ParlamentoEuropeo(){
 const [open,setOpen]=useState(false);const [selected,setSelected]=useState<string|null>(null);
 const total=719;const visible=groups.filter(g=>g.seats);let offset=0;
 return <section className="euParliament" aria-label="Composición del Parlamento Europeo">
  <button className="euTitle" onClick={()=>setOpen(!open)}>PARLAMENTO EUROPEO · {open?'Ocultar detalle':'Ver composición'}</button>
  <p className="euSubhead">🇪🇺 Legislatura 2024–2029 · composición actualizada</p>
  <svg viewBox="0 0 300 165" role="img" aria-label="Composición del Parlamento Europeo por grupos políticos"><line x1="150" y1="9" x2="150" y2="148" stroke="currentColor" strokeDasharray="4 5" opacity=".45"/>{visible.map(g=>{const start=offset/total*180;offset+=g.seats;const end=offset/total*180;const p=(d:number)=>({x:150-112*Math.cos(d*Math.PI/180),y:138-112*Math.sin(d*Math.PI/180)});const a=p(start),b=p(end);return <path key={g.key} d={`M ${a.x} ${a.y} A 112 112 0 0 1 ${b.x} ${b.y}`} stroke={g.color} strokeWidth="27" fill="none" onClick={()=>setSelected(g.key)}><title>{g.label}: {g.seats}</title></path>})}</svg>
  <div className="euTotals">{groups.filter(g=>g.seats).map(g=><button key={g.key} className="euTotal" onClick={()=>setSelected(g.key)}><i style={{background:g.color}}/>{g.short}: {g.seats}</button>)}</div>
  {open&&<div className="euParliamentDetails"><h3>Grupos y escaños</h3>{groups.map(g=><button className="euCountry" key={g.key} onClick={()=>setSelected(g.key)}><i style={{background:g.color}}/><strong>{g.label}</strong> · {g.seats} escaños</button>)}</div>}
  {selected&&(()=>{const g=groups.find(x=>x.key===selected)!;return <div className="euModal" role="dialog"><button onClick={()=>setSelected(null)}>Cerrar</button><h3>{g.label}</h3><p><strong>{g.seats}</strong> eurodiputados · {g.short}</p><p>Países con representación: {g.countries.length?g.countries.join(', '):'ninguno en esta categoría actualmente'}.</p></div>})()}
  <p className="euTimestamp">Legislatura 2024–2029 · 719 eurodiputados asignados · 1 escaño vacante</p>
 </section>;
}