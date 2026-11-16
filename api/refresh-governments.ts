const ALLOWED_ORIGINS=["https://jalfpozuelo-alt.github.io","https://mi-actualidad.vercel.app"];
const REPO="jalfpozuelo-alt/mi-actualidad";
const headers=(req)=>{const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0],"Access-Control-Allow-Headers":"content-type,x-refresh-password","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}};
const json=(req,body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers(req)}});
export function OPTIONS(req){return new Response(null,{headers:headers(req)})}
export async function POST(req){
 if(req.headers.get("x-refresh-password")!==process.env.REFRESH_PASSWORD)return json(req,{ok:false,message:"Contraseña incorrecta"},401);
 const r=await fetch("https://api.github.com/repos/"+REPO+"/actions/workflows/governments.yml/dispatches",{method:"POST",headers:{"Accept":"application/vnd.github+json","Authorization:"Bearer "+process.env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:JSON.stringify({ref:"main"})});
 if(r.ok)return json(req,{ok:true,stage:"queued",label:"Actualización de gobiernos iniciada"});
 return json(req,{ok:false,message:"GitHub rechazó la actualización de gobiernos",status:r.status,detail:(await r.text().catch(()=>"" )).slice(0,180)},502);
}