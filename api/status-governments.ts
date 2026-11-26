const ALLOWED_ORIGINS = ["https://jalfpozuelo-alt.github.io","https://mi-actualidad.vercel.app"];
const REPO = "jalfpozuelo-alt/mi-actualidad";
const headers=(req)=>{const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0],"Access-Control-Allow-Headers":"content-type,x-refresh-password","Access-Control-Allow-Methods":"GET,OPTIONS","Vary":"Origin"}};
const json=(req,body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers(req)}});
export function OPTIONS(req){return new Response(null,{headers:headers(req)})}
export async function GET(req){
 const after=new URL(req.url).searchParams.get('after');
 const r=await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/governments.yml/runs?per_page=20`,{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${process.env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28"}});
 if(!r.ok)return json(req,{ok:false,stage:"error",label:"No se pudo consultar el proceso"},502);
 const d=await r.json();
 const run=(d.workflow_runs||[]).find(candidate=>!after||new Date(candidate.created_at).getTime()>=new Date(after).getTime()-5_000);
 if(!run)return json(req,{ok:true,stage:"queued",progress:10,label:"Esperando a que GitHub inicie la comprobación"});
 const failed=run.status==="completed"&&run.conclusion!=="success";
 const stages={queued:["En cola",10],in_progress:["Comprobando datos políticos",45],completed:["Comprobación terminada",100]};
 const [label,progress]=stages[run.status]||["Comprobando estado",15];
 return json(req,{ok:!failed,stage:failed?"error":run.status,conclusion:run.conclusion,label:failed?"La actualización terminó con error":label,progress:failed?0:progress,updatedAt:run.updated_at,createdAt:run.created_at});
}
