import {Component} from 'react';
export function RequestState({loading,error,reload}) {
  if(error)return <div role="alert" className="my-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><p>{error}</p><button onClick={reload} className="mt-3 rounded-lg bg-slate-800 px-3 py-2 text-slate-100">Yeniden dene</button></div>;
  if(loading)return <div role="status" className="p-8 text-center text-sm text-slate-400">Yükleniyor…</div>;
  return null;
}
export class ErrorBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<RequestState error="Bu ekran yüklenemedi." reload={()=>window.location.reload()}/>:this.props.children;}
}
