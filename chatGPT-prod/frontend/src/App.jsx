import React,{useState,useEffect} from 'react';
import API,{setAuth} from './api';
export default function App(){
  const[token,setToken]=useState(localStorage.getItem('token'));
  const[projects,setProjects]=useState([]);
  const[providers,setProviders]=useState([]);
  const[providerId,setProviderId]=useState(null);
  const[projectId,setProjectId]=useState(null);
  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState('');
  useEffect(()=>{ if(token){ setAuth(token); fetchProviders(); fetchProjects(); } },[token]);
  async function fetchProviders(){
    try{
      const r = await API.get('/providers');
      setProviders(r.data);
      if(r.data.length) setProviderId(r.data[0].id);
    }catch(e){ console.error(e); }
  }
  async function fetchProjects(){
    try{
      const r=await API.get('/projects');
      setProjects(r.data);
      if(r.data.length && !projectId) setProjectId(r.data[0].id);
    }catch(e){ console.error(e); }
  }
  async function login(){
    const r=await API.post('/auth/login',{email:'user@example.com',password:'password'});
    localStorage.setItem('token',r.data.token);
    setToken(r.data.token);
  }
  async function createProject(){
    if(!providerId){ alert('Choose provider'); return; }
    await API.post('/projects',{name:'New Project',provider_id:providerId});
    fetchProjects();
  }
  async function loadMessages(){
    if(!projectId) return;
    const r=await API.get(`/projects/${projectId}/messages`);
    setMessages(r.data);
  }
  async function send(){
    if(!projectId||!input) return;
    await API.post(`/projects/${projectId}/chat`,{messages:[{role:'user',content:input}]});
    setInput(''); loadMessages();
  }
  return(<div style={{padding:20}}>
    {!token? <button onClick={login}>Quick login</button>:<>
      <h3>Create project (select provider)</h3>
      <select value={providerId||''} onChange={e=>setProviderId(e.target.value)}>
        {providers.map(p=> <option key={p.id} value={p.id}>{p.display_name || p.name}</option>)}
      </select>
      <button onClick={createProject}>Create Project</button>
      <h3>Projects</h3>
      <ul>{projects.map(p=><li key={p.id}><button onClick={()=>{setProjectId(p.id);loadMessages();}}>{p.name||p.id} - {p.provider_name||'default'}</button></li>)}</ul>
      <h3>Chat</h3>
      <div style={{minHeight:200,border:'1px solid #ddd',padding:10}}>
        {messages.map(m=> <div key={m.id}><b>{m.role}</b>: <pre style={{whiteSpace:'pre-wrap'}}>{m.content}</pre></div>)}
      </div>
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={4} cols={60}/>
      <br/><button onClick={send}>Send</button>
    </>}
  </div>);
}