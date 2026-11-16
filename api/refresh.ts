const ORIGIN = "https://jalfpozuelo-alt.github.io";
const REPO = "jalfpozuelo-alt/mi-actualidad";
const API = "https://api.github.com";
const cors = {"Access-Control-Allow-Origin": ORIGIN,"Access-Control-Allow-Headers":"content-type,x-refresh-password","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...cors}});
function authorized(req){return req.headers.get("x-refresh-password")===process.env.REFRESH_PASSWORD}
async function github(path,options={}){return fetch(API+path,{...options,headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${process.env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28",...(options.headers||{})}})}
export default async function handler(req){
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return json({ok:false,message:"Método no permitido"},405);
 if(!authorized(req))return json({ok:false,message:"Contraseña incorrecta"},401);
 const r=await github(`/repos/${REPO}/actions/workflows/generate.yml/dispatches`,{method:"POST",body:JSON.stringify({ref:"main"})});
 return r.ok?json({ok:true,stage:"queued",label:"Actualización iniciada"}):json({ok:false,message:"No se pudo iniciar la actualización"},502);
}