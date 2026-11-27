const ALLOWED_ORIGINS = ["https://jalfpozuelo-alt.github.io","https://mi-actualidad.vercel.app"];
const REPO = "jalfpozuelo-alt/mi-actualidad";
const API = "https://api.github.com";
const headers=(req)=>{const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0],"Access-Control-Allow-Headers":"content-type,x-refresh-password","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin"}};
const json=(req,body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers(req)}});
function authorized(req){return Boolean(process.env.REFRESH_PASSWORD)&&req.headers.get("x-refresh-password")===process.env.REFRESH_PASSWORD}
async function github(path,options={}){return fetch(API+path,{...options,headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${process.env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28",...(options.headers||{})}})}
export function OPTIONS(req){return new Response(null,{headers:headers(req)})}
export async function POST(req){
 if(!authorized(req))return json(req,{ok:false,message:"Contraseña incorrecta"},401);
 let inputs={}; try { const body=await req.json(); inputs={countries:JSON.stringify(body.countries||[]),topics:JSON.stringify(body.topics||[]),profiles:JSON.stringify(body.profiles||[])}; } catch {}
 const r=await github(`/repos/${REPO}/actions/workflows/generate.yml/dispatches`,{method:"POST",body:JSON.stringify({ref:"main",inputs})});
 if(r.ok)return json(req,{ok:true,stage:"queued",label:"Actualización iniciada",requestedAt:new Date().toISOString()});
 const detail=await r.text().catch(()=> "");
 return json(req,{ok:false,message:"GitHub rechazó el lanzamiento de la actualización",status:r.status,detail:detail.slice(0,180)},502);
}
