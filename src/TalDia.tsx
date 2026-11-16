import {useEffect,useState} from 'react';
import './tal-dia.css';
type Event={text:string;year?:number;pages?:Array<{title:string;content_urls?:{desktop?:{page?:string}}}>};
export default function TalDia(){
 const [items,setItems]=useState<Event[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{const d=new Date();fetch('./data/on-this-day.json?version='+Date.now()).then(r=>r.ok?r.json():null).then(x=>{const all=(x?.items||[...(x?.events||[]),...(x?.births||[]),...(x?.deaths||[])]).filter((e:any)=>e?.text);setItems(all.slice(0,6))}).catch(()=>setItems([])).finally(()=>setLoading(false))},[]);
 return <section className="talDia"><p className="kicker">EFEMÉRIDES</p><h1>Tal día como hoy</h1><p className="talIntro">Una selección de acontecimientos relacionados con la fecha de esta edición.</p>{loading?<p className="talMessage">Cargando efemérides…</p>:items.length?<div className="talGrid">{items.map((e,i)=><article className="talCard" key={i}><div className="talYear">{e.year||'Hoy'}</div><p>{e.text}</p>{e.pages?.[0]?.content_urls?.desktop?.page&&<a href={e.pages[0].content_urls.desktop.page} target="_blank" rel="noreferrer">Ampliar información ↗</a>}</article>)}</div>:<p className="talMessage">No hay efemérides disponibles para esta fecha.</p>}</section>;
}
