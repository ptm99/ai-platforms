import db from '../db.js';
import axios from 'axios';
import { providers } from '../providers.js';

// call provider by id from DB
export async function callProvider(provider_id, model, messages){
  // fetch provider record
  const r = await db.query('select id,name,base_url,api_key from providers where id=$1', [provider_id]);
  if(!r.rowCount) throw new Error('provider not found');
  const prov = r.rows[0];
  const adapter = providers[prov.name];
  if(!adapter) throw new Error('no adapter for provider ' + prov.name);

  // build endpoint and payload
  let endpoint = adapter.endpoint;
  let payload = adapter.prepare(model || 'default', messages);
  let headers = adapter.headers(prov.api_key || process.env.OPENAI_API_KEY);

  if(adapter.name === 'gemini'){
    endpoint = `${adapter.base}/${model}:generateContent`;
    // convert payload to Google style
    payload = {
      prompt: {
        text: messages.map(m=>`${m.role}: ${m.content}`).join('\n')
      }
    };
  }

  const resp = await axios.post(endpoint, payload, { headers, timeout: 120000 });
  return resp.data;
}
