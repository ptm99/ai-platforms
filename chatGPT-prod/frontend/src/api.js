import axios from 'axios';
const API=axios.create({baseURL:import.meta.env.VITE_API_BASE||'http://localhost:3000/api'});
export function setAuth(token){ API.defaults.headers.common['Authorization']=`Bearer ${token}`; }
export default API;