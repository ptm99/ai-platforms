import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import providerRoutes from './routes/providers.js';
import db from './db.js';
import fs from 'fs';
dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/providers', providerRoutes);
app.get('/health', (req,res)=> res.json({ ok: true }));
const PORT = process.env.PORT || 3000;
const initSql = fs.readFileSync(new URL('./migrations/init.sql', import.meta.url));
(async()=>{
  try{
    await db.query(initSql.toString());
    app.listen(PORT, ()=> console.log(`Backend listening on ${PORT}`));
  }catch(e){
    console.error('Failed to run migrations', e);
    process.exit(1);
  }
})();