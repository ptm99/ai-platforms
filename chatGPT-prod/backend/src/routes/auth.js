import express from 'express';
import { register, authenticate } from '../auth.js';
const router = express.Router();
router.post('/register', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const u = await register(email,password);
    res.json(u);
  }catch(e){
    console.error(e);
    res.status(500).json({ error: 'register failed' });
  }
});
router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const r = await authenticate(email,password);
    if(!r) return res.status(401).json({ error: 'invalid credentials' });
    res.json(r);
  }catch(e){
    console.error(e);
    res.status(500).json({ error: 'login failed' });
  }
});
export default router;
