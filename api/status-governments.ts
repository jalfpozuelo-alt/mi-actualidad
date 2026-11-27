const ALLOWED_ORIGINS=["https://jalfpozuelo-alt.github.io","https://mi-actualidad.vercel.app"];
const REPO="jalfpozuelo-alt/mi-actualidad";
const headers=req=>{const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0],"Access-Control-Allow-Headers":"content-type,x-refresh-password","Access-Control-Allow-Methods":"GET,OPTIONS","Vary":"Origin"}};
const json=(req,body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers(req)}});
const apiHeaders={"Accept":"application/vnd.github+json","Authorization":`Bearer ${process.env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28"};
export function OPTIONS(req){return new Response(null,{headers:headers(req)})}
export async function GET(req){
 const after=new URL(req.url).searchParams.get('after');
 const response=await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/governments.yml/runs?per_page=20`,{headers:apiHeaders});
 if(!response.ok)return json(req,{ok:false,stage:"error",label:"No se pudo consultar el proceso"},502);
 const data=await response.json();
 const run=(data.workflow_runs||[]).find(candidate=>!after||new Date(candidate.created_at).getTime()>=new Date(after).getTime()-5_000);
 if(!run)return json(req,{ok:true,stage:"queued",progress:10,label:"Esperando a que GitHub inicie la actualización"});
 const failed=run.status==="completed"&&run.conclusion!=="success";
 let label="Comprobando datos políticos…",progress=35;
 if(run.status==="queued"){label="En cola";progress=10}
 else if(run.status==="completed"){label="Comprobación terminada";progress=100}
 else {
   const jobsResponse=await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${run.id}/jobs`,{headers:apiHeaders});
   const jobs=jobsResponse.ok?(await jobsResponse.json()).jobs||[]:[];
   const step=jobs.flatMap(job=>job.steps||[]).find(step=>["in_progress","queued"].includes(step.status));
   const copy={"Actualizando gobiernos y Parlamento Europeo":["Actualizando gobiernos y Parlamento Europeo…",45],"Validar datos actualizados":["Validando datos políticos…",75],"Publicar datos políticos":["Publicando gráficos…",90]};
   [label,progress]=copy[step?.name]||[label,progress];
 }
 return json(req,{ok:!failed,stage:failed?"error":run.status,conclusion:run.conclusion,label:failed?"La actualización terminó con error":label,progress:failed?0:progress,updatedAt:run.updated_at,createdAt:run.created_at});
}