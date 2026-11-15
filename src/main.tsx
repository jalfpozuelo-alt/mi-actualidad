import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import data from '../public/data/news.json';

type Story={id:string;section:string;category:string;country:string;title:string;summary:string;publishedAt:string;updatedAt:string;importance:number;source:{name:string;url:string}};
const tabs=['PORTADA','ESPAÑA','INTERNACIONAL','TECNOLOGÍA','MEDICINA','NUTRICIÓN'];
const countries=['España','Estados Unidos','Francia','Reino Unido','Alemania','Argentina','China','Rusia'];
const readPrefs=()=>{try{return JSON.parse(localStorage.getItem('mi-actualidad-preferences')||'{}')}catch{return {}}};
function App(){
 const [tab,setTab]=useState('PORTADA'); const [dark,setDark]=useState(readPrefs().dark||false); const [selected,setSelected]=useState<string[]>(readPrefs().countries||countries); const [notice,setNotice]=useState('');
 const stories=data.stories as Story[];
 const visible=useMemo(()=>stories.filter(s=>selected.includes(s.country)&& (tab==='PORTADA'?true:s.section===tab)).sort((a,b)=>b.importance-a.importance),[tab,selected]);
 const cover=stories.filter(s=>['Política','Economía','Sociedad','Actualidad general'].includes(s.category)&&s.section!=='Tecnología'&&s.section!=='Medicina'&&s.section!=='Nutrición').sort((a,b)=>b.importance-a.importance).slice(0,5);
 useEffect(()=>{try{localStorage.setItem('mi-actualidad-preferences',JSON.stringify({dark,countries:selected}))}catch{}},[dark,selected]);
 useEffect(()=>{if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{})},[]);
 const exportConfig=()=>{const blob=new Blob([JSON.stringify({version:1,dark,countries:selected},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mi-actualidad-configuracion.json';a.click();URL.revokeObjectURL(a.href)};
 const importConfig=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(String(r.result));if(x.version!==1||!Array.isArray(x.countries))throw Error();setSelected(x.countries.filter((c:string)=>countries.includes(c)));setDark(Boolean(x.dark));setNotice('Configuración importada correctamente.')}catch{setNotice('El archivo no tiene un formato válido.')}};r.readAsText(f)};
 return <div className={dark?'app dark':'app'}><header><div className="eyebrow">EDICIÓN · 15 NOVIEMBRE 2026</div><div className="brand"><span>MI</span> ACTUALIDAD <button onClick={()=>setDark(!dark)} aria-label="Cambiar modo">{dark?'☼':'☾'}</button></div><p className="dek">Un periódico internacional, en español y con contexto.</p></header>
 <nav aria-label="Secciones">{tabs.map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</nav>
 <main><div className="toolbar"><span>Última edición: 08:00 · datos de demostración</span><button onClick={()=>setNotice('Recarga completada. La edición disponible sigue siendo la última válida.')}>ACTUALIZAR NOTICIAS</button></div>{notice&&<div className="notice">{notice}</div>}
 {tab==='PORTADA'?<><section className="hero"><p className="kicker">PORTADA</p><h1>Las noticias que importan, explicadas con claridad.</h1><p>Una primera versión funcional preparada para fuentes verificables, resúmenes en español y edición diaria automatizada.</p></section><h2>Las cinco principales</h2><div className="grid">{cover.map(s=><Card s={s} key={s.id}/>)}</div></>:<><section className="sectionHead"><p className="kicker">{tab}</p><h1>Actualidad de {tab.toLowerCase()}</h1></section><div className="grid">{visible.map(s=><Card s={s} key={s.id}/>)}</div></>}
 <section className="settings"><h2>Personaliza tu edición</h2><p>Estos ajustes son personales y se guardan solo en este dispositivo.</p><div className="chips">{countries.map(c=><label key={c}><input type="checkbox" checked={selected.includes(c)} onChange={e=>setSelected(e.target.checked?[...selected,c]:selected.filter(x=>x!==c))}/>{c}</label>)}</div><div className="actions"><button onClick={exportConfig}>EXPORTAR CONFIGURACIÓN</button><label className="button">IMPORTAR CONFIGURACIÓN<input type="file" accept="application/json" onChange={importConfig}/></label></div></section></main><footer>MI ACTUALIDAD · Producto editorial estático · Fuentes y resúmenes reales se incorporarán mediante GitHub Actions.</footer></div>;
}
function Card({s}:{s:Story}){return <article className="card"><div className="placeholder">{s.section.slice(0,2).toUpperCase()}</div><div className="meta">{s.country} · {s.category}</div><h3>{s.title}</h3><p>{s.summary}</p><div className="source">Fuente principal: <a href={s.source.url} target="_blank" rel="noreferrer">{s.source.name}</a><br/>Actualizado {new Date(s.updatedAt).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'})}</div></article>}
createRoot(document.getElementById('root')!).render(<App/>);

