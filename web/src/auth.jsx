import {createContext,useContext,useEffect,useState,useCallback} from 'react';
import {api,setToken,getToken,bus} from './api.js';
const AuthCtx=createContext(null);
export const useAuth=()=>useContext(AuthCtx);
export const ROLE_LABEL={employee:'Çalışan',manager:'Yönetici',director:'Direktör'};
export const isManager=u=>u&&(u.role==='manager'||u.role==='director');
export const homePath=u=>isManager(u)?'/reports':'/dashboard';
export function AuthProvider({children}) {
  const [user,setUser]=useState(null),[ready,setReady]=useState(false);
  useEffect(()=>{
    let active=true, generation=0;
    const load=async()=>{const current=++generation;try{if(getToken()){const me=await api('/me');if(active&&current===generation)setUser(me);}}catch{if(active&&current===generation){setToken(null);setUser(null);}}finally{if(active&&current===generation)setReady(true);}};
    load();
    const lost=()=>{generation++;setToken(null);setUser(null);setReady(true);};
    const storage=e=>{if(e.key==='cyberops_token'||e.key===null){setToken(e.key===null?null:e.newValue);setUser(null);setReady(false);load();}};
    bus.addEventListener('auth-lost',lost);window.addEventListener('storage',storage);
    return()=>{active=false;generation++;bus.removeEventListener('auth-lost',lost);window.removeEventListener('storage',storage);};
  },[]);
  useEffect(()=>{
    if(!user)return;
    const controller=new AbortController();
    const es=new EventSource('/api/notifications/stream?token='+encodeURIComponent(getToken()));
    es.addEventListener('notification',e=>bus.dispatchEvent(new CustomEvent('notification',{detail:JSON.parse(e.data)})));
    es.addEventListener('change',e=>{
      const detail=JSON.parse(e.data);bus.dispatchEvent(new CustomEvent('change',{detail}));
      if(detail.entity==='users')api('/me',{signal:controller.signal}).then(setUser).catch(()=>{});
    });
    es.onerror=()=>{if(!controller.signal.aborted)api('/me',{signal:controller.signal}).catch(()=>{});};
    return()=>{controller.abort();es.close();};
  },[user?.id,user?.role,user?.manager_id]);
  const login=useCallback(async userId=>{
    const result=await api('/auth/login',{method:'POST',body:{userId}});
    setToken(result.token);setUser(result.user);return result.user;
  },[]);
  const logout=useCallback(async()=>{
    try{await api('/auth/logout',{method:'POST'});}finally{setToken(null);setUser(null);}
  },[]);
  return <AuthCtx.Provider value={{user,ready,login,logout}}>{children}</AuthCtx.Provider>;
}
export function useLive(path,entities=[]) {
  const {user}=useAuth();
  const [state,setState]=useState({data:null,error:null,loading:true});
  const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(r=>r+1),[]);
  const entityKey=entities.join(',');
  useEffect(()=>{
    if(!path)return;
    const controller=new AbortController();
    setState(s=>({...s,error:null,loading:true}));
    api(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data,error:null,loading:false});})
      .catch(error=>{if(!controller.signal.aborted)setState(s=>({...s,error:error.message,loading:false}));});
    return()=>controller.abort();
  },[path,user?.id,user?.role,user?.manager_id,revision]);
  useEffect(()=>{
    const change=e=>{if(!entityKey||entityKey.split(',').includes(e.detail.entity))reload();};
    const notification=()=>{if(path?.startsWith('/notifications'))reload();};
    bus.addEventListener('change',change);bus.addEventListener('notification',notification);
    return()=>{bus.removeEventListener('change',change);bus.removeEventListener('notification',notification);};
  },[entityKey,path,reload]);
  const setData=useCallback(updater=>setState(s=>({...s,data:typeof updater==='function'?updater(s.data):updater})),[]);
  return {...state,reload,setData};
}
