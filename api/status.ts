const ALLOWED_ORIGINS = ["https://jalfpozuelo-alt.github.io","https://mi-actualidad.vercel.app"];
const REPO = "jalfpozuelo-alt/mi-actualidad";
const headers=(req)=>{const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0],"Access-Control-Allow-Headers":"content-type,x-refresh-password","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin"}};
const json=(req,body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers(req)}});
export function OPTIONS(req){return new Response(null,{headers:headers(req)})}
export async function GET(req){
 const r=await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/generate.yml/runs?per_page=1`,{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${process.env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28"}});
 if(!r.ok)return json(req,{ok:false,stage:"error"},502);
 const d=await r.json(),run=d.workflow_runs?.[0];
 if(!run)return json(req,{ok:true,stage:"idle",progress:0,label:"Sin ejecuciones recientes"});
 const failed=run.status==="completed"&&run.conclusion!=="success";
 const stages={queued:["En cola",10],in_progress:["Recopilando y traduciendo titulares",45],completed:["Publicación terminada",100]};
 const [label,progress]=stages[run.status]||["Comprobando estado",15];
 return json(req,{ok:!failed,stage:failed?"error":run.status,label:failed?"La actualización terminó con error":label,progress:failed?0:progress,updatedAt:run.updated_at});
}