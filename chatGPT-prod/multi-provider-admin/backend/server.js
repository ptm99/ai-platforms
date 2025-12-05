
const express = require('express');
const app = express();
app.use(express.json());

let providers = [
  {id:1, name:'OpenAI', api_key:null},
  {id:2, name:'Gemini', api_key:null},
  {id:3, name:'Claude', api_key:null}
];

app.get('/api/admin/providers', (req,res)=>{res.json(providers);});
app.post('/api/admin/providers/:id', (req,res)=>{
  const p = providers.find(x=>x.id==req.params.id);
  if(!p) return res.status(404).json({error:'not found'});
  p.api_key = req.body.api_key;
  res.json(p);
});

app.listen(3000, ()=>console.log("backend running"));
