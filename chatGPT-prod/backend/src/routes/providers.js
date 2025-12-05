import express from 'express';
import db from '../db.js';
const router = express.Router();

// list providers (admin/readonly)
router.get('/', async (req,res) => {
  const r = await db.query('select id,name,base_url,model_map,display_name from providers order by id');
  res.json(r.rows);
});

export default router;
