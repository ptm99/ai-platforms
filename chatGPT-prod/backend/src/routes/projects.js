import express from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { callProvider } from '../services/callProvider.js';
import Redis from 'ioredis';
import { estimateTokensFromMessages } from '../utils/tokens.js';

const redis = new Redis(process.env.REDIS_URL);
const router = express.Router();
router.use(requireAuth);

// create project (allow choose provider)
router.post('/', async (req,res)=>{
  const { name, provider_id, model } = req.body;
  const r = await db.query(
    'insert into projects(user_id,name,provider_id,model,visibility,created_at) values($1,$2,$3,$4,$5,now()) returning id,name,provider_id,model',
    [req.user.id, name, provider_id || null, model || null, 'private']
  );
  res.json(r.rows[0]);
});

// list projects
router.get('/', async (req,res)=>{
  const r = await db.query('select p.id,p.name,p.visibility,p.created_at,p.provider_id,p.model,pr.name as provider_name from projects p left join providers pr on pr.id=p.provider_id where p.user_id=$1', [req.user.id]);
  res.json(r.rows);
});

// get messages
router.get('/:id/messages', async (req,res)=>{
  const pid = req.params.id;
  const pr = await db.query('select user_id from projects where id=$1', [pid]);
  if(!pr.rowCount || pr.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'no access' });
  const r = await db.query('select id,role,content,model,tokens_used,cost,created_at from messages where project_id=$1 order by created_at asc', [pid]);
  res.json(r.rows);
});

// chat -> proxy to selected provider
router.post('/:id/chat', async (req,res)=>{
  const pid = req.params.id;
  const { messages, model } = req.body;
  // check project ownership
  const pr = await db.query('select user_id, provider_id, model as project_model from projects where id=$1', [pid]);
  if(!pr.rowCount || pr.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'no access' });
  const provider_id = pr.rows[0].provider_id;
  const project_model = model || pr.rows[0].project_model;

  // rate limit simple: max 20 req per 10s
  const rlKey = `rl:${req.user.id}`;
  const v = await redis.incr(rlKey);
  if(v === 1) await redis.expire(rlKey, 10);
  if(v > 20) return res.status(429).json({ error: 'rate limit' });

  try{
    const out = await callProvider(provider_id, project_model, messages);
    // try to get tokens from provider; if missing, estimate
    let tokens = out.usage?.total_tokens;
    if(!tokens){
      // estimate from messages + response text
      const respText = out?.choices ? JSON.stringify(out.choices) : JSON.stringify(out);
      tokens = estimateTokensFromMessages(messages) + estimateTokensFromMessages([{ content: respText }]);
    }
    const cost = tokens * 0.000002; // placeholder rate (replace with real pricing)
    await db.query(`insert into usage_records(user_id,project_id,model,tokens,cost,request_id,created_at) values($1,$2,$3,$4,$5,$6,now())`, [req.user.id, pid, project_model || 'default', tokens, cost, out.id || null]);
    await db.query('update users set credits = credits - $1 where id=$2', [cost, req.user.id]);
    await db.query('insert into messages(project_id,user_id,role,content,model,tokens_used,cost,created_at) values($1,$2,$3,$4,$5,$6,$7,now())', [pid, req.user.id, 'assistant', JSON.stringify(out.choices || out), project_model || 'default', tokens, cost]);
    res.json({ result: out, tokens, cost });
  }catch(e){
    console.error('provider call error', e);
    res.status(500).json({ error: 'Provider proxy error', detail: e.message });
  }
});

export default router;
