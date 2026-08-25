"use client";
import { useMemo, useState } from "react";

const nav = ["Command", "Social graph", "Warehouse", "Agents", "Governance"];
const metrics = [["Active identities","18.4M","+8.2%"],["Events today","2.91B","+14.7%"],["Query p95","84 ms","−12 ms"],["Agent savings","$428K","+21.4%"]];
const datasets = [{name:"social_graph",rows:"4.8B",health:98,type:"Identity"},{name:"content_events",rows:"18.2B",health:94,type:"Behavior"},{name:"creator_revenue",rows:"126M",health:100,type:"Finance"},{name:"trust_signals",rows:"902M",health:91,type:"Safety"}];
const agents = [{icon:"✦",name:"Audience Architect",task:"Builds high-intent audience segments",state:"Running",color:"violet"},{icon:"⌁",name:"Pulse Sentinel",task:"Detects anomalies across live event streams",state:"Watching",color:"cyan"},{icon:"◇",name:"Schema Keeper",task:"Maps, validates and documents new data",state:"Ready",color:"orange"}];
const activity = [["Audience Architect","Created “RVA early adopters” · 1.2M identities","2m"],["Pulse Sentinel","Resolved engagement spike · false positive","8m"],["Schema Keeper","Mapped 14 fields from creator_events_v3","21m"],["System","Incremental model refresh completed","34m"]];

export default function Home() {
  const [active,setActive] = useState("Command");
  const [range,setRange] = useState("24H");
  const [query,setQuery] = useState("");
  const [running,setRunning] = useState(false);
  const [toast,setToast] = useState("");
  const bars = useMemo(()=>[28,34,31,43,40,52,48,60,58,72,69,82,78,92,86,98,91,106,101,117,109,124,119,132],[]);
  function runQuery(){setRunning(true);setToast("");setTimeout(()=>{setRunning(false);setToast("Query complete · 1.2M identities matched in 84 ms")},850)}
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">S</span><div>SONOXO<span>DATA CLOUD</span></div></div>
      <nav>{nav.map((item,i)=><button key={item} className={active===item?"active":""} onClick={()=>setActive(item)}><span>{["◫","◎","▥","✦","⬡"][i]}</span>{item}</button>)}</nav>
      <div className="sideBottom"><div className="status"><i/>All systems operational</div><button className="profile"><span>AS</span><div>Almighty Sonoxo<small>Super Admin</small></div><b>•••</b></button></div>
    </aside>
    <section className="workspace">
      <header><div><p>AGENTIC DATA OS</p><h1>{active}</h1></div><div className="headerActions"><button className="search">⌕ <span>Search data, agents, people...</span><kbd>⌘ K</kbd></button><button className="iconBtn">♢<i/></button><button className="create" onClick={()=>setToast("New workspace initialized")}>＋ New workspace</button></div></header>
      {toast&&<div className="toast">✓ {toast}<button onClick={()=>setToast("")}>×</button></div>}
      <div className="content">
        <section className="welcome"><div><span className="eyebrow">LIVE COMMAND CENTER</span><h2>Your data is thinking<br/><em>ahead of you.</em></h2><p>Unify your social graph, content, commerce and intelligence in one governed warehouse—operated by agents that never stop learning.</p></div><div className="orb"><span/><span/><strong>2.9B<small>EVENTS / DAY</small></strong></div></section>
        <section className="metrics">{metrics.map(([label,value,delta])=><article key={label}><div><span>{label}</span><b>↗</b></div><h3>{value}</h3><small>{delta} <i>vs previous</i></small></article>)}</section>
        <section className="gridTwo">
          <article className="panel velocity"><div className="panelHead"><div><span className="dot cyan"/>Event velocity</div><div className="ranges">{["1H","24H","7D","30D"].map(r=><button className={range===r?"sel":""} onClick={()=>setRange(r)} key={r}>{r}</button>)}</div></div><div className="chart"><div className="chartValue">121.8K <small>events/sec</small></div><div className="bars">{bars.map((h,i)=><i key={i} style={{height:h}} className={i>19?"hot":""}/>)}</div><div className="axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>NOW</span></div></div></article>
          <article className="panel agentPanel"><div className="panelHead"><div><span className="dot violet"/>Active agents</div><button>View all ↗</button></div><div className="agentList">{agents.map(a=><div className="agent" key={a.name}><span className={"agentIcon "+a.color}>{a.icon}</span><div><b>{a.name}</b><small>{a.task}</small></div><label><i className={a.state==="Ready"?"ready":""}/>{a.state}</label></div>)}</div></article>
        </section>
        <section className="gridTwo lower">
          <article className="panel datasets"><div className="panelHead"><div><span className="dot orange"/>Warehouse health</div><button>Open warehouse ↗</button></div>{datasets.map(d=><div className="dataset" key={d.name}><div className="dbIcon">▱</div><div className="dsName"><b>{d.name}</b><small>{d.type} dataset</small></div><strong>{d.rows}<small>ROWS</small></strong><div className="health"><span>{d.health}%</span><i><b style={{width:d.health+"%"}}/></i></div></div>)}</article>
          <article className="panel activity"><div className="panelHead"><div><span className="dot green"/>Intelligence stream</div><button>•••</button></div>{activity.map((a,i)=><div className="activityRow" key={i}><i/><div><b>{a[0]}</b><span>{a[1]}</span></div><time>{a[2]}</time></div>)}</article>
        </section>
        <section className="ask"><div className="askTitle"><span>✦</span><div><b>Ask your entire cloud</b><small>Natural language → governed SQL → instant intelligence</small></div></div><div className="query"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runQuery()} placeholder="Which audiences grew fastest after our last campaign?"/><button onClick={runQuery}>{running?"Running…":"Run ↗"}</button></div><div className="suggestions"><span>Try:</span>{["Find churn risk","Map creator growth","Forecast engagement"].map(s=><button key={s} onClick={()=>setQuery(s)}>{s}</button>)}</div></section>
      </div>
    </section>
  </main>;
}
