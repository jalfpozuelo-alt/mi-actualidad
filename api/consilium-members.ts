const SOURCE='https://www.consilium.europa.eu/en/european-council/members/';

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'method_not_allowed'});
  try{
    const response=await fetch(SOURCE,{headers:{'user-agent':'mi-actualidad-consilium-proxy/1.0',accept:'text/html,application/xhtml+xml'},cache:'no-store'});
    const body=await response.text();
    if(!response.ok||body.length<200) return res.status(502).json({ok:false,error:'consilium_unavailable'});
    return res.status(200).setHeader('Cache-Control','no-store').json({ok:true,sourceUrl:SOURCE,fetchedAt:new Date().toISOString(),body});
  }catch(error){
    return res.status(502).json({ok:false,error:'consilium_unavailable'});
  }
}
