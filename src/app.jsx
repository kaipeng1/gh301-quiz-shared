// GH301 Quiz Bot — v1.5.0 (self-contained, dual-environment)
// Released: 2026-03-26
// Cards: 208 | Topics: 7 | Tags: 20
// Features: SRS scoring, API evaluation, topic/tag filters, add/edit/delete cards,
//           deleted tile + restore, export/import state, window.storage auto-persist
// State: Auto-saved to window.storage (artifact) or localStorage (local). Use Export for portable backups.
// Local: npm start with .env VITE_ANTHROPIC_KEY; see README.md
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CARDS from './cards.js';

// --- Environment detection ---
// Vite injects __ANTHROPIC_KEY__ via define config; artifact leaves it undefined.
const IS_LOCAL = typeof __ANTHROPIC_KEY__ === "string" && __ANTHROPIC_KEY__.length > 0;
const API_URL = IS_LOCAL ? "http://localhost:8081" : "https://api.anthropic.com/v1/messages";
const API_HEADERS = IS_LOCAL
  ? {"Content-Type":"application/json","x-api-key":__ANTHROPIC_KEY__,"anthropic-version":"2023-06-01"}
  : {"Content-Type":"application/json"};

// localStorage-based storage shim (used when window.storage is unavailable, e.g. local dev)
const _localStorageShim = {
  async get(key) { const v=localStorage.getItem(key); return v!==null?{key,value:v}:null; },
  async set(key,value) { localStorage.setItem(key,value); return {key,value}; },
  async delete(key) { localStorage.removeItem(key); return {key,deleted:true}; },
  async list(prefix) { const keys=Object.keys(localStorage).filter(k=>!prefix||k.startsWith(prefix)); return {keys,prefix}; },
};
const _storage = (typeof window !== "undefined" && window.storage) ? window.storage : _localStorageShim;

// Baked-in state — fallback when window.storage is empty. Do not edit manually.
const SAVED_STATE = {"srs":{},"deletedCards":["00f19d5d","0322941e","07f5c4a3","0c17b3a8","0cfa8942","0e941631","0f927f7a","13b5fdea","19a6da3d","1a030ac2","1aa72b66","27821494","29bf180b","2b5eb81b","2e82c8e6","2e9436ce","3c507bf5","3d02a149","44cc6f1c","466f5148","48b463cc","4d692d5f","4f482cd7","53837477","54645dc5","56821f3a","5c2a2ff0","6a884a2b","6f20b4e8","7191ce0a","7330485d","7b9b5cb1","7d686684","8a7153fc","8d2eae66","9249760c","956cfb3a","97d5fd87","98d617fb","9c24ba0b","9c91c887","9e09c11c","a4d694bd","a90eefce","a968b0f2","adff1532","b2d9dfc0","b371979a","b5d86a6e","b5ffa7ea","bc086bea","be33db66","c1b9fdea","c3466a3f","c4a290d8","c9e745e1","cc154d3e","cd59ad75","d12a8bad","d50e914b","d737c48e","db4d4480","e2b02340","e8fde644","e96f04bf","efe501bb","f6cfd12f","fd6580e4"],"cardEdits":{},"cardNotes":{},"cardImportance":{},"cardTagOverrides":{},"cardTypeOverrides":{},"userTags":{}};

const STORAGE_KEY = "gh301-state";
function getFullPayload(srs,deletedCards,cardEdits,cardNotes,cardImportance,cardTagOverrides,cardTypeOverrides,userTags){return{srs,deletedCards:[...(deletedCards instanceof Set?deletedCards:new Set(deletedCards))],cardEdits,cardNotes,cardImportance,cardTagOverrides,cardTypeOverrides,userTags}}
const VERSION = "1.5.0";
const RELEASE_DATE = "2026-03-26";
const TOPIC_LABELS = {0:"Master Lists",1:"Provider Contracting",2:"Disease Management",3:"Risk Adjustment",4:"Medical Data",5:"SDOH",6:"Predictive Analytics"};
const TAG_COLOR = "#74c0fc";
const GRAPH_PALETTE = ["#60a5fa","#34d399","#f472b6","#f59e0b","#a78bfa","#22d3ee","#fb7185","#4ade80","#facc15","#38bdf8","#c084fc","#f97316"];
const TAG_META = {
  "ACA":{l:"ACA",c:TAG_COLOR},
  "ACO":{l:"ACO",c:TAG_COLOR},
  "ASOP":{l:"ASOP",c:TAG_COLOR},
  "Bundled":{l:"Bundled Payment",c:TAG_COLOR},
  "Care_Mgmt":{l:"Care Management",c:TAG_COLOR},
  "Coding":{l:"Coding",c:TAG_COLOR},
  "Cost_Sharing":{l:"Cost Sharing",c:TAG_COLOR},
  "DM_Eval":{l:"DM Evaluation",c:TAG_COLOR},
  "Data":{l:"Data Sources",c:TAG_COLOR},
  "Formula":{l:"Formula",c:TAG_COLOR},
  "Medicaid":{l:"Medicaid",c:TAG_COLOR},
  "Medicare":{l:"Medicare",c:TAG_COLOR},
  "Pharmacy":{l:"Pharmacy",c:TAG_COLOR},
  "Propensity":{l:"Propensity",c:TAG_COLOR},
  "Provider_Pay":{l:"Provider Payment",c:TAG_COLOR},
  "Quality":{l:"Quality",c:TAG_COLOR},
  "Risk_Adjust":{l:"Risk Adjustment",c:TAG_COLOR},
  "SDOH":{l:"SDOH",c:TAG_COLOR},
  "VBC":{l:"Value-Based Care",c:TAG_COLOR},
};
const ALL_TAGS = Object.keys(TAG_META).sort((a,b)=>TAG_META[a].l.localeCompare(TAG_META[b].l));
const GRAPH_DATA = {"clusters":[{"n":"Savings Calcs","c":"#4ade80","d":"Expected \u2212 Actual = Savings across DM, ACO, bundled, vendor","cards":["929865ce","e67d05b4","c8069f17","98d617fb","7d686684","9249760c","b97e2e1d","b5ffa7ea","5c2a2ff0","e0bbd3a5","de8b88eb","5b91021a","0d33b688","1a030ac2","6028b9eb","d23b351e","a5dba35f","cd59ad75","c2467749","fc5f21ff","89f0f9eb"]},{"n":"ACO Mechanics","c":"#818cf8","d":"Assignment \u2192 benchmark \u2192 risk adj \u2192 savings \u2192 quality \u2192 settlement","cards":["ed147d5a","97ac7a85","fd6580e4","7ba9ac1c","01f7494d","af9448b3","b17c0501","56821f3a","9249760c","13b5fdea","b97e2e1d","0e7729e0","b371979a","c1b9fdea","5b2d194c","00741a40","1f0452d3","b0ff55a3","72c9fa31","2e9436ce","78a7ec9a","5ed41d98","b5ffa7ea","6f3b1ef4"]},{"n":"RA Models","c":"#f472b6","d":"CMS-HCC / HHS-HCC / CDPS / ERG comparison","cards":["6e762581","a7541050","c9fff4f0","c4a290d8","61a73cde","820de296","ea98c38d","188db88e","a54db9b7","c161233f","535b1131","34f3987d","31cd790a","3f4330d5","f235d555","7060281f","a968b0f2","97d5fd87","ad851436","4d692d5f","29bf180b","03cdf55b"]},{"n":"Provider Pay","c":"#fb923c","d":"FFS \u2192 capitation continuum with U-TIP risk types","cards":["5ed41d98","2a72a0ad","9dfb8e81","8945194a","9c24ba0b","e71d07fe","8cf67976","aa227b65","be33db66","b8124c8a","0322941e","eccc9327","a5dba35f","22b96cda","9c5fe6d6","0ce27509","dd117de9","62b31625","b17c0501","b5ffa7ea","d66a1fd1","1141b63f"]},{"n":"Bundled Pay","c":"#f97316","d":"Episode-scoped payments: pricing, stop-loss, contracting","cards":["a5dba35f","bc086bea","20a495b0","e01104d1","ae1bf19f","53837477","22b96cda"]},{"n":"DM Eval Threats","c":"#ef4444","d":"What invalidates a DM savings study","cards":["fc5f21ff","3712cda5","f0e9784c","d123eb9b","aafa494b","01b08fc6","9408b36e","7ea498b2","3d02a149","68661769","a28df44e","4d692d5f","fdf2defd","c8069f17","e67d05b4","112176bc","78a7ec9a"]},{"n":"Propensity","c":"#a78bfa","d":"Propensity scoring methodology and matching","cards":["09eb5231","398bc741","5ca152ca","48b463cc","112176bc","a659cf01"]},{"n":"Quality & Tier","c":"#2dd4bf","d":"Provider profiling, TNHP, HEDIS, quality domains","cards":["fed0499e","00f19d5d","778697be","d66a1fd1","6b4442a0","cd59ad75","c2467749","c8079443","a0e463b0","13b5fdea","6e74a360","eccc9327"]},{"n":"Cost-Share / NSA","c":"#facc15","d":"Member OOP, balance billing, No Surprises Act","cards":["e8fde644","efe501bb","1141b63f","4f482cd7","6c0b64a0","7b9b5cb1","b3f09ae9","be33db66","48b463cc"]},{"n":"ACA Stability","c":"#34d399","d":"3Rs, antiselection, model weaknesses","cards":["6b04d9ca","eb4c423b","36d3a536","bdee5191","258493a0","bd028c5f","11015b75","0080e4f3","d6f45d0d","15316ec3","0cfa8942","7191ce0a","ad851436","820de296","188db88e","ea98c38d","3f4330d5","4d692d5f"]},{"n":"SDOH & Ethics","c":"#38bdf8","d":"Social determinants, Z-codes, MassHealth, ethics","cards":["4cc660ff","ca2af4d5","545e0e37","44cc6f1c","2e82c8e6","1e1b574a","001c8289","03cdf55b","e96f04bf","5de2c040","7cf49eae","9c91c887"]},{"n":"Data & Coding","c":"#c084fc","d":"Codes \u2192 groupers \u2192 risk scores \u2192 payments \u2192 eval","cards":["1a7cdefa","c706fdf6","1d9147aa","76eeb44a","22b96cda","bc808b3a","466f5148","46927754","d50e914b","a90eefce","29bf180b","ac331b9e","24ce0681","c4a290d8","98ed2551","f75d8698"]},{"n":"EHR Data","c":"#e879f9","d":"EHR challenges, contents, extraction, data types","cards":["98ed2551","fd98cff0","2401626d","7b82cfce","5b2d194c","72c9fa31","f75d8698"]},{"n":"CM Design","c":"#22d3ee","d":"Building, staffing, targeting CM programs","cards":["e1a61b31","a049c009","de27656c","397ee39c","e369aa43","76c96bcc","e3afb34c","d260143e","5243586c","1b7cb930","66f7391e","7b156f20","a659cf01","e0bbd3a5","89f0f9eb","68661769","112176bc","fdf2defd","a28df44e"]},{"n":"Study Design","c":"#f0abfc","d":"RCT > Cohort > Case-Control > Cross-sectional","cards":["fdf2defd","28852ed7","ec8ff804","d737c48e","6f20b4e8","27821494","a28df44e","68661769"]},{"n":"ASOPs","c":"#fbbf24","d":"23=data, 41=communications, 45=RA models","cards":["2a83d9d6","ac331b9e","7060281f","6f3b1ef4","af9448b3"]},{"n":"Risk Mitigation","c":"#f87171","d":"5 techniques across all payment programs","cards":["847fa410","5ed41d98","bc086bea","eb4c423b","b17c0501"]}],"edges":[{"a":0,"b":1,"w":3},{"a":0,"b":3,"w":2},{"a":0,"b":4,"w":1},{"a":0,"b":5,"w":3},{"a":0,"b":7,"w":2},{"a":0,"b":13,"w":2},{"a":1,"b":3,"w":3},{"a":1,"b":5,"w":1},{"a":1,"b":7,"w":1},{"a":1,"b":12,"w":2},{"a":1,"b":15,"w":2},{"a":1,"b":16,"w":2},{"a":2,"b":5,"w":1},{"a":2,"b":9,"w":6},{"a":2,"b":10,"w":1},{"a":2,"b":11,"w":2},{"a":2,"b":15,"w":1},{"a":3,"b":4,"w":2},{"a":3,"b":7,"w":2},{"a":3,"b":8,"w":2},{"a":3,"b":11,"w":1},{"a":3,"b":16,"w":2},{"a":4,"b":11,"w":1},{"a":4,"b":16,"w":1},{"a":5,"b":6,"w":1},{"a":5,"b":9,"w":1},{"a":5,"b":13,"w":4},{"a":5,"b":14,"w":3},{"a":6,"b":8,"w":1},{"a":6,"b":13,"w":2},{"a":9,"b":16,"w":2},{"a":11,"b":12,"w":2},{"a":11,"b":15,"w":1},{"a":13,"b":14,"w":3}],"xref":{"27821494":[14],"46927754":[11],"53837477":[4],"68661769":[5,13,14],"929865ce":[0],"e67d05b4":[0,5],"c8069f17":[0,5],"98d617fb":[0],"7d686684":[0],"9249760c":[0,1],"b97e2e1d":[0,1],"b5ffa7ea":[0,1,3],"5c2a2ff0":[0],"e0bbd3a5":[0,13],"de8b88eb":[0],"5b91021a":[0],"0d33b688":[0],"1a030ac2":[0],"6028b9eb":[0],"d23b351e":[0],"a5dba35f":[0,3,4],"cd59ad75":[0,7],"c2467749":[0,7],"fc5f21ff":[0,5],"89f0f9eb":[0,13],"ed147d5a":[1],"97ac7a85":[1],"fd6580e4":[1],"7ba9ac1c":[1],"01f7494d":[1],"af9448b3":[1,15],"b17c0501":[1,3,16],"56821f3a":[1],"13b5fdea":[1,7],"0e7729e0":[1],"b371979a":[1],"c1b9fdea":[1],"5b2d194c":[1,12],"00741a40":[1],"1f0452d3":[1],"b0ff55a3":[1],"72c9fa31":[1,12],"2e9436ce":[1],"78a7ec9a":[1,5],"5ed41d98":[1,3,16],"6f3b1ef4":[1,15],"6e762581":[2],"a7541050":[2],"c9fff4f0":[2],"c4a290d8":[2,11],"61a73cde":[2],"820de296":[2,9],"ea98c38d":[2,9],"188db88e":[2,9],"a54db9b7":[2],"c161233f":[2],"535b1131":[2],"34f3987d":[2],"31cd790a":[2],"3f4330d5":[2,9],"f235d555":[2],"7060281f":[2,15],"a968b0f2":[2],"97d5fd87":[2],"ad851436":[2,9],"4d692d5f":[2,5,9],"29bf180b":[2,11],"03cdf55b":[2,10],"2a72a0ad":[3],"9dfb8e81":[3],"8945194a":[3],"9c24ba0b":[3],"e71d07fe":[3],"8cf67976":[3],"aa227b65":[3],"be33db66":[3,8],"b8124c8a":[3],"0322941e":[3],"eccc9327":[3,7],"22b96cda":[3,4,11],"9c5fe6d6":[3],"0ce27509":[3],"dd117de9":[3],"62b31625":[3],"d66a1fd1":[3,7],"1141b63f":[3,8],"bc086bea":[4,16],"20a495b0":[4],"e01104d1":[4],"ae1bf19f":[4],"3712cda5":[5],"f0e9784c":[5],"d123eb9b":[5],"aafa494b":[5],"01b08fc6":[5],"9408b36e":[5],"7ea498b2":[5],"3d02a149":[5],"a28df44e":[5,13,14],"fdf2defd":[5,13,14],"112176bc":[5,6,13],"09eb5231":[6],"398bc741":[6],"5ca152ca":[6],"48b463cc":[6,8],"a659cf01":[6,13],"fed0499e":[7],"00f19d5d":[7],"778697be":[7],"6b4442a0":[7],"c8079443":[7],"a0e463b0":[7],"6e74a360":[7],"e8fde644":[8],"efe501bb":[8],"4f482cd7":[8],"6c0b64a0":[8],"7b9b5cb1":[8],"b3f09ae9":[8],"6b04d9ca":[9],"eb4c423b":[9,16],"36d3a536":[9],"bdee5191":[9],"258493a0":[9],"bd028c5f":[9],"11015b75":[9],"0080e4f3":[9],"d6f45d0d":[9],"15316ec3":[9],"0cfa8942":[9],"7191ce0a":[9],"4cc660ff":[10],"ca2af4d5":[10],"545e0e37":[10],"44cc6f1c":[10],"2e82c8e6":[10],"1e1b574a":[10],"001c8289":[10],"e96f04bf":[10],"5de2c040":[10],"7cf49eae":[10],"9c91c887":[10],"1a7cdefa":[11],"c706fdf6":[11],"1d9147aa":[11],"76eeb44a":[11],"bc808b3a":[11],"466f5148":[11],"d50e914b":[11],"a90eefce":[11],"ac331b9e":[11,15],"24ce0681":[11],"98ed2551":[11,12],"f75d8698":[11,12],"fd98cff0":[12],"2401626d":[12],"7b82cfce":[12],"e1a61b31":[13],"a049c009":[13],"de27656c":[13],"397ee39c":[13],"e369aa43":[13],"76c96bcc":[13],"e3afb34c":[13],"d260143e":[13],"5243586c":[13],"1b7cb930":[13],"66f7391e":[13],"7b156f20":[13],"28852ed7":[14],"ec8ff804":[14],"d737c48e":[14],"6f20b4e8":[14],"2a83d9d6":[15],"847fa410":[16]}};



function stripHtml(h){return h.replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim().slice(0,800)}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function defSrs(){return{ease:2.5,interval:0,reps:0,nextReview:0,lastRating:null,reviews:0}}
function updSrs(s,r){const n=Date.now(),o={...s,reviews:(s.reviews||0)+1,lastRating:r};if(r==="strong"){o.reps=(s.reps||0)+1;o.interval=o.reps===1?1:o.reps===2?3:Math.round((s.interval||1)*s.ease);o.ease=Math.max(1.3,(s.ease||2.5)+0.1)}else if(r==="partial"){o.reps=Math.max(0,(s.reps||0)-1);o.interval=1;o.ease=Math.max(1.3,(s.ease||2.5)-0.15)}else{o.reps=0;o.interval=0;o.ease=Math.max(1.3,(s.ease||2.5)-0.2)}o.nextReview=n+o.interval*864e5;return o}
function isDue(s){return !s||!s.nextReview||Date.now()>=s.nextReview}
function escRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function highlightPlainText(text,query){
  if(!query.trim())return text;
  const rx=new RegExp(`(${escRegex(query.trim())})`,'ig');
  const parts=String(text).split(rx);
  return parts.map((part,i)=>i%2===1
    ?<span key={i} style={{background:"rgba(250,204,21,0.22)",color:"#fef08a",borderRadius:3,padding:"0 1px"}}>{part}</span>
    :part
  );
}
function highlightHtmlMatches(html,query){
  const needle=query.trim();
  if(!needle||typeof document==="undefined")return html;
  const root=document.createElement("div");
  root.innerHTML=html||"";
  const rx=new RegExp(escRegex(needle),'ig');
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      if(!node.nodeValue?.trim())return NodeFilter.FILTER_REJECT;
      const parent=node.parentElement?.tagName;
      if(parent==="SCRIPT"||parent==="STYLE")return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes=[];
  while(walker.nextNode())textNodes.push(walker.currentNode);
  textNodes.forEach(node=>{
    const text=node.nodeValue||"";
    rx.lastIndex=0;
    if(!rx.test(text))return;
    rx.lastIndex=0;
    const frag=document.createDocumentFragment();
    let last=0;
    text.replace(rx,(match,offset)=>{
      if(offset>last)frag.appendChild(document.createTextNode(text.slice(last,offset)));
      const mark=document.createElement("span");
      mark.textContent=match;
      mark.style.background="rgba(250,204,21,0.22)";
      mark.style.color="#fef08a";
      mark.style.borderRadius="3px";
      mark.style.padding="0 1px";
      frag.appendChild(mark);
      last=offset+match.length;
      return match;
    });
    if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode?.replaceChild(frag,node);
  });
  return root.innerHTML;
}

export default function QuizApp(){
  const[phase,setPhase]=useState("setup");
  const[mode,setMode]=useState("quiz"); // "quiz" | "graph"
  const[viewCard2,setViewCard2]=useState(null);
  const[srs,setSrs]=useState(SAVED_STATE.srs||{});
  const[qCards,setQCards]=useState([]);
  const[msgs,setMsgs]=useState([]);
  const[inp,setInp]=useState("");
  const[ci,setCi]=useState(0);
  const[qp,setQp]=useState("asking");
  const[scores,setScores]=useState([]);
  const[loading,setLoading]=useState(false);
  const[fs,setFs]=useState(18);
  const[showPanel,setShowPanel]=useState("match");
  const[deletedSearchQ,setDeletedSearchQ]=useState("");
  const[revFilter,setRevFilter]=useState(null);
  const[searchQ,setSearchQ]=useState("");
  const[dualPaneEnabled,setDualPaneEnabled]=useState(true);
  const[viewCard,setViewCard]=useState(null);
  const[setupListCursorId,setSetupListCursorId]=useState(null);
  const[graphListCursorId,setGraphListCursorId]=useState(null);
  const[cardEdits,setCardEdits]=useState(SAVED_STATE.cardEdits||{});
  const[deletedCards,setDeletedCards]=useState(new Set(SAVED_STATE.deletedCards||[]));
  const[cardNotes,setCardNotes]=useState(SAVED_STATE.cardNotes||{});
  const[noteInputs,setNoteInputs]=useState({});
  const[cardImportance,setCardImportance]=useState(SAVED_STATE.cardImportance||{});
  const[cardTagOverrides,setCardTagOverrides]=useState(SAVED_STATE.cardTagOverrides||{});
  const[cardTypeOverrides,setCardTypeOverrides]=useState(SAVED_STATE.cardTypeOverrides||{});
  const[userTags,setUserTags]=useState(SAVED_STATE.userTags||{});
  const[storageLoaded,setStorageLoaded]=useState(false);
  const[editCard,setEditCard]=useState(null);
  const[confirmDeleteCard,setConfirmDeleteCard]=useState(null);
  const[inlineEditing,setInlineEditing]=useState(new Set());
  const[inlineDrafts,setInlineDrafts]=useState({});
  const[inlineEditOrig,setInlineEditOrig]=useState({});
  const[inlineActiveTable,setInlineActiveTable]=useState(null);
  const[editQ,setEditQ]=useState("");
  const[editA,setEditA]=useState("");
  const[showTB,setShowTB]=useState(false);
  const[tbData,setTbData]=useState([]);
  const[tbHasHeader,setTbHasHeader]=useState(true);
  const[tbActive,setTbActive]=useState([0,0]);
  const[tbBold,setTbBold]=useState(new Set());
  const tbRef=useRef({});
  const[gNodes,setGNodes]=useState([]);
  const[gSimDone,setGSimDone]=useState(false);
  const[gSel,setGSel]=useState(null);
  const[gSel2,setGSel2]=useState(null);
  const[gTagFilter,setGTagFilter]=useState(null);
  const[gTopicFilter,setGTopicFilter]=useState(new Set([0,1,2,3,4,5,6]));
  const[gTypeFilter,setGTypeFilter]=useState(new Set(["master","formula","concept"]));
  const[gImpFilter,setGImpFilter]=useState(new Set(["high","medium","low","unset"]));
  const[gCam,setGCam]=useState({x:0,y:0,z:1});
  const[gHov,setGHov]=useState(null);
  const[gPanelOpen,setGPanelOpen]=useState(false);
  const gDragN=useRef(null);
  const gPanStart=useRef(null);
  const gDragRef=useRef({nx:0,ny:0,mx:0,my:0});
  const gClickRef=useRef({t:0,x:0,y:0});
  const[selTopics,setSelTopics]=useState(new Set([0,1,2,3,4,5,6]));
  const[selTypes,setSelTypes]=useState(new Set(["master","formula","concept"]));
  const[selTags,setSelTags]=useState(new Set(ALL_TAGS));
  const[cardCount,setCardCount]=useState(15);
  const[priMode,setPriMode]=useState("dueFirst");
  const[selImp,setSelImp]=useState(new Set(["high","medium","low","unset"]));
  const chatEnd=useRef(null),inputRef=useRef(null);
  const[taH,setTaH]=useState(120);
  const drag=useRef({active:false,startY:0,startH:0});
  const[setupPanelH,setSetupPanelH]=useState(320);
  const setupPanelDrag=useRef({active:false,startY:0,startH:0});
  const setupRowRefs=useRef({});
  const[hoverPreview,setHoverPreview]=useState(null);
  const hoverPreviewTimer=useRef(null);
  const hoverPreviewRef=useRef(null);
  const setupControlsRef=useRef(null);
  const setupListRef=useRef(null);
  const setupViewerRef=useRef(null);
  const prevSetupPanelIdsRef=useRef([]);
  const prevSetupScrollCursorRef=useRef(null);
  const graphListRef=useRef(null);
  const graphViewerRef=useRef(null);
  const graphRowRefs=useRef({});
  const prevGraphPanelIdsRef=useRef([]);
  const prevGraphScrollCursorRef=useRef(null);
  const inlineEditRefs=useRef({});
  const setupPanelDismissSuppressUntil=useRef(0);
  const isInteractiveUiTarget=target=>!!(target&&target.closest&&target.closest('button,input,textarea,select,option,label,a,summary,[contenteditable="true"],[data-ui-safe="true"]'));
  const getSetupPanelMaxHeight=()=>{
    const viewportCap=Math.floor(window.innerHeight*0.75);
    const controlsH=setupControlsRef.current?.offsetHeight||84;
    const reservedTop=controlsH+56;
    return Math.max(180,Math.min(viewportCap,window.innerHeight-reservedTop));
  };

  useEffect(()=>{
    const mv=e=>{if(!drag.current.active)return;const y=e.touches?e.touches[0].clientY:e.clientY;setTaH(Math.min(400,Math.max(60,drag.current.startH+(drag.current.startY-y))))};
    const up=()=>{drag.current.active=false;document.body.style.userSelect=""};
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);window.addEventListener("touchmove",mv);window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",mv);window.removeEventListener("touchend",up)};
  },[]);
  function startDrag(e){e.preventDefault();const y=e.touches?e.touches[0].clientY:e.clientY;drag.current={active:true,startY:y,startH:taH};document.body.style.userSelect="none"}
  useEffect(()=>{
    const mv=e=>{
      if(!setupPanelDrag.current.active)return;
      const y=e.touches?e.touches[0].clientY:e.clientY;
      const nextH=Math.max(180,setupPanelDrag.current.startH+(setupPanelDrag.current.startY-y));
      if(Math.abs(nextH-setupPanelDrag.current.startH)>4)setupPanelDrag.current.moved=true;
      setSetupPanelH(Math.min(getSetupPanelMaxHeight(),nextH));
    };
    const up=()=>{
      if(setupPanelDrag.current.active&&setupPanelDrag.current.moved)setupPanelDismissSuppressUntil.current=Date.now()+250;
      setupPanelDrag.current.active=false;
      setupPanelDrag.current.moved=false;
      document.body.style.userSelect="";
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);window.addEventListener("touchmove",mv);window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",mv);window.removeEventListener("touchend",up)};
  },[]);
  useEffect(()=>{
    const clampSetupPanel=()=>setSetupPanelH(h=>Math.min(h,getSetupPanelMaxHeight()));
    window.addEventListener("resize",clampSetupPanel);
    return()=>window.removeEventListener("resize",clampSetupPanel);
  },[]);
  function startSetupPanelDrag(e){e.preventDefault();const y=e.touches?e.touches[0].clientY:e.clientY;setupPanelDrag.current={active:true,startY:y,startH:setupPanelH,moved:false};setupPanelDismissSuppressUntil.current=Date.now()+250;document.body.style.userSelect="none"}

  useEffect(()=>{
    if(!document.getElementById("katex-css")){
      const css=document.createElement("link");css.id="katex-css";css.rel="stylesheet";
      css.href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";document.head.appendChild(css);
      const js=document.createElement("script");js.src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
      js.onload=()=>{
        const ar=document.createElement("script");ar.src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js";
        ar.onload=()=>{setMathReady(true)};document.head.appendChild(ar);
      };document.head.appendChild(js);
    }
  },[]);
  const[mathReady,setMathReady]=useState(typeof renderMathInElement!=='undefined');
  const chatRef=useRef(null);const modalRef=useRef(null);const panel2Ref=useRef(null);
  const renderMath=useCallback(()=>{
    if(!window.renderMathInElement)return;
    const opts={delimiters:[{left:"\\[",right:"\\]",display:true},{left:"\\(",right:"\\)",display:false},{left:"$$",right:"$$",display:true}],throwOnError:false};
    setTimeout(()=>{
      if(chatRef.current)try{window.renderMathInElement(chatRef.current,opts)}catch{}
      if(modalRef.current)try{window.renderMathInElement(modalRef.current,opts)}catch{}
      if(panel2Ref.current)try{window.renderMathInElement(panel2Ref.current,opts)}catch{}
      if(hoverPreviewRef.current)try{window.renderMathInElement(hoverPreviewRef.current,opts)}catch{}
    },50);
  },[]);
  function fixMath(html){return html||""}
  function fmtText(text){
    if(!text)return"";
    const esc=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const bold=esc.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    const lines=bold.split('\n');
    let html='',inUl=false,inOl=false;
    for(const line of lines){
      const trimmed=line.trimStart();
      const isBullet=/^[-\u2022]\s/.test(trimmed);
      const isNum=/^\d+\.\s/.test(trimmed);
      if(isBullet){
        if(!inUl){if(inOl){html+='</ol>';inOl=false}html+='<ul style="margin:2px 0;padding-left:18px">';inUl=true}
        html+='<li>'+trimmed.replace(/^[-\u2022]\s*/,'')+'</li>';
      }else if(isNum){
        if(!inOl){if(inUl){html+='</ul>';inUl=false}html+='<ol style="margin:2px 0;padding-left:18px">';inOl=true}
        html+='<li>'+trimmed.replace(/^\d+\.\s*/,'')+'</li>';
      }else{
        if(inUl){html+='</ul>';inUl=false}
        if(inOl){html+='</ol>';inOl=false}
        html+=line+(line===''?'<br>':'<br>');
      }
    }
    if(inUl)html+='</ul>';if(inOl)html+='</ol>';
    return html.replace(/<br>$/,'');
  }
  function insertFmt(type){
    const ta=inputRef.current;if(!ta)return;
    const start=ta.selectionStart,end=ta.selectionEnd,val=inp;
    let next=val,cursor=start;
    if(type==='bold'){
      const sel=val.slice(start,end);
      next=val.slice(0,start)+'**'+sel+'**'+val.slice(end);
      cursor=sel?end+4:start+2;
    }else if(type==='bullet'){
      const lineStart=val.lastIndexOf('\n',start-1)+1;
      next=val.slice(0,lineStart)+'- '+val.slice(lineStart);
      cursor=start+2;
    }else if(type==='number'){
      const lineStart=val.lastIndexOf('\n',start-1)+1;
      const before=val.slice(0,lineStart);
      const prevLines=before.split('\n').filter(l=>/^\d+\.\s/.test(l.trimStart()));
      const num=prevLines.length+1;
      next=val.slice(0,lineStart)+num+'. '+val.slice(lineStart);
      cursor=start+String(num).length+2;
    }
    setInp(next);
    setTimeout(()=>{ta.focus();ta.setSelectionRange(cursor,cursor)},0);
  }
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth",block:"end"})},[msgs]);
  // MutationObserver: auto-re-render KaTeX when React replaces rendered math with raw LaTeX
  useEffect(()=>{
    if(!mathReady)return;
    let tid=null;let rendering=false;
    const hasRawLatex=node=>{if(!node||rendering)return false;const t=node.textContent||"";return/\\[\[\(]/.test(t)||t.includes("$$")};
    const rerender=()=>{if(tid)return;tid=setTimeout(()=>{tid=null;if(hasRawLatex(chatRef.current)){rendering=true;renderMath();setTimeout(()=>{rendering=false},200)}},60)};
    const obs=new MutationObserver(rerender);
    const cfg={childList:true,subtree:true,characterData:true};
    if(chatRef.current)obs.observe(chatRef.current,cfg);
    return()=>{obs.disconnect();if(tid)clearTimeout(tid)};
  },[mathReady,renderMath,phase]);
  useEffect(()=>{
    if(!mathReady||(!viewCard&&!viewCard2))return;
    renderMath();
    const t1=setTimeout(renderMath,150);
    const t2=setTimeout(renderMath,400);
    return()=>{clearTimeout(t1);clearTimeout(t2)};
  },[mathReady,renderMath,viewCard,viewCard2]);
  useEffect(()=>{if(phase==="quiz"){setViewCard(null);setViewCard2(null)}},[phase]);
  // Global overflow fix: prevent double scrollbar in artifact iframe
  useEffect(()=>{
    const s=document.createElement("style");s.textContent="html,body{overflow:hidden!important;height:100%!important;margin:0!important;padding:0!important}";
    document.head.appendChild(s);return()=>s.remove();
  },[]);
  // Auto-load from storage on mount
  useEffect(()=>{
    (async()=>{
      try{
        const res=await _storage.get(STORAGE_KEY);
        if(res&&res.value){
          const p=JSON.parse(res.value);
          if(p.srs)setSrs(p.srs);
          if(p.deletedCards)setDeletedCards(new Set(p.deletedCards));
          if(p.cardEdits)setCardEdits(p.cardEdits);
          if(p.cardNotes)setCardNotes(p.cardNotes);
          if(p.cardImportance)setCardImportance(p.cardImportance);
          if(p.cardTagOverrides)setCardTagOverrides(p.cardTagOverrides);
          if(p.cardTypeOverrides)setCardTypeOverrides(p.cardTypeOverrides);
          if(p.userTags)setUserTags(p.userTags);
        }
      }catch(e){/* storage unavailable or key missing — use SAVED_STATE defaults */}
      setStorageLoaded(true);
    })();
  },[]);
  // Auto-save to storage on state changes (debounced)
  const storageTimer=useRef(null);
  useEffect(()=>{
    if(!storageLoaded)return;
    if(storageTimer.current)clearTimeout(storageTimer.current);
    storageTimer.current=setTimeout(()=>{
      (async()=>{
        try{
          const p=getFullPayload(srs,deletedCards,cardEdits,cardNotes,cardImportance,cardTagOverrides,cardTypeOverrides,userTags);
          await _storage.set(STORAGE_KEY,JSON.stringify(p));
        }catch(e){/* silent */}
      })();
    },800);
    return()=>{if(storageTimer.current)clearTimeout(storageTimer.current)};
  },[storageLoaded,srs,deletedCards,cardEdits,cardNotes,cardImportance,cardTagOverrides,cardTypeOverrides,userTags]);
  function saveSrs(d){setSrs(d)}
  function saveCardEdit(id,q,a){setCardEdits(prev=>({...prev,[id]:{q,a}}))}
  function saveDeletedCards(s){setDeletedCards(s)}
  function saveCardNotes(d){setCardNotes(d)}
  function saveCardImportance(d){setCardImportance(d)}
  function saveCardTagOverrides(d){setCardTagOverrides(d)}
  function saveCardTypeOverrides(d){setCardTypeOverrides(d)}
  function saveUserTags(d){setUserTags(d)}
  useEffect(()=>{if(Object.keys(userTags).length>0){setSelTags(prev=>{const next=new Set(prev);Object.keys(userTags).forEach(k=>next.add(k));return next})}},[userTags]);
  function addNote(cardId,text){if(!text.trim())return;const cur=cardNotes[cardId]||[];const updated={...cardNotes,[cardId]:[...cur,{text:text.trim(),ts:new Date().toISOString()}]};saveCardNotes(updated)}
  function deleteNote(cardId,idx){const cur=[...(cardNotes[cardId]||[])];cur.splice(idx,1);const updated={...cardNotes,[cardId]:cur};if(cur.length===0)delete updated[cardId];saveCardNotes(updated)}
  function handleExportState(){
    const payload={...getFullPayload(srs,deletedCards,cardEdits,cardNotes,cardImportance,cardTagOverrides,cardTypeOverrides,userTags),exportedAt:new Date().toISOString(),cardCount:Object.keys(srs).length};
    const json=JSON.stringify(payload);
    const blob=new Blob([json],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`gh301_state_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  }
  function handleImportState(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try{
        const payload=JSON.parse(ev.target.result);
        if(payload.srs){await saveSrs(payload.srs)}
        if(payload.deletedCards){await saveDeletedCards(new Set(payload.deletedCards))}
        if(payload.cardEdits){setCardEdits(payload.cardEdits)}
        if(payload.cardNotes){await saveCardNotes(payload.cardNotes)}
        if(payload.cardImportance){await saveCardImportance(payload.cardImportance)}
        if(payload.cardTagOverrides){await saveCardTagOverrides(payload.cardTagOverrides)}
        if(payload.cardTypeOverrides){await saveCardTypeOverrides(payload.cardTypeOverrides)}
        if(payload.userTags){await saveUserTags(payload.userTags)}
        alert(`Imported: ${Object.keys(payload.srs||{}).filter(k=>(payload.srs[k].reviews||0)>0).length} reviewed cards`);
      }catch(err){alert("Import failed: invalid file")}
    };
    reader.readAsText(file);
    e.target.value="";
  }
  function gc(c){const e=cardEdits[c.id];return e?{...c,q:e.q||c.q,a:e.a||c.a}:c}
  const cards=useMemo(()=>CARDS.map(gc),[cardEdits]);
  function getEffTags(id){return cardTagOverrides[id]||cards.find(c=>c.id===id)?.tg||[]}
  function getEffType(id){return cardTypeOverrides[id]||cards.find(c=>c.id===id)?.t||"concept"}
  function getImp(id){return cardImportance[id]||null}
  const allTagKeys=[...ALL_TAGS,...Object.keys(userTags)];
  function allTagMeta(key){const m=TAG_META[key]||userTags[key];return m?{...m,c:TAG_COLOR}:{l:key,c:TAG_COLOR}}

  function getFiltered(){
    return cards.filter(c=>{
      if(deletedCards.has(c.id))return false;
      if(!selTopics.has(c.tn))return false;
      if(!selTypes.has(getEffType(c.id)))return false;
      const imp=cardImportance[c.id]||"unset";
      if(!selImp.has(imp))return false;
      const eTags=getEffTags(c.id);
      if(selTags.size===allTagKeys.length)return true;
      if(selTags.size===0)return false;
      return eTags.some(t=>selTags.has(t));
    });
  }
  function getDue(){return getFiltered().filter(c=>isDue(srs[c.id])).length}
  function getNew(){return getFiltered().filter(c=>!srs[c.id]).length}
  function toggleTag(tag){const s=new Set(selTags);s.has(tag)?s.delete(tag):s.add(tag);setSelTags(s)}
  function selectAllTags(){setSelTags(new Set(allTagKeys))}
  function clearAllTags(){setSelTags(new Set())}
  function toggleGroup(groupTags){const allSel=groupTags.every(t=>selTags.has(t));const s=new Set(selTags);groupTags.forEach(t=>allSel?s.delete(t):s.add(t));setSelTags(s)}

  function startQuiz(){
    let pool=getFiltered();if(!pool.length)return;
    if(priMode==="dueFirst"){
      const d=pool.filter(c=>isDue(srs[c.id])),nd=pool.filter(c=>!isDue(srs[c.id]));
      pool=[...shuffle(d),...shuffle(nd)];
    }else if(priMode==="newOnly"){
      const nw=pool.filter(c=>!srs[c.id]);
      pool=nw.length?shuffle(nw):shuffle(pool);
    }else{
      pool=shuffle(pool);
    }
    const sel=pool.slice(0,Math.min(cardCount,pool.length));
    setQCards(sel);setCi(0);setScores([]);
    setMsgs([{role:"bot",type:"intro",content:`Quiz: ${sel.length} cards. ${priMode==="dueFirst"?"Due cards first.":priMode==="newOnly"?"New cards only.":"Random."} Ctrl+Enter to submit.`}]);
    setPhase("quiz");setQp("asking");setTimeout(()=>askQ(sel,0),300);
  }
  function resumeQuiz(){
    if(!hasInProgressQuiz)return;
    setPhase("quiz");
    setTimeout(()=>inputRef.current?.focus(),100);
  }
  function askQ(cards,idx){
    if(idx>=cards.length){setQp("done");return}
    const c=cards[idx],s=srs[c.id],st=!s?"new":isDue(s)?"due":"review";
    setMsgs(p=>[...p,{role:"bot",type:"question",cardType:getEffType(c.id),cardId:c.id,cardNum:idx+1,total:cards.length,content:c.q,status:st,interval:s?.interval||0,tags:getEffTags(c.id)}]);
    setQp("asking");setTimeout(()=>inputRef.current?.focus(),100);
  }
  async function handleSubmit(e){
    e?.preventDefault();if(!inp.trim()||qp!=="asking")return;
    const ua=inp.trim();setInp("");setMsgs(p=>[...p,{role:"user",content:ua}]);setQp("evaluating");setLoading(true);
    const c=qCards[ci],tb=stripHtml(c.a);
    try{
      const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),30000);
      const res=await fetch(API_URL,{method:"POST",headers:API_HEADERS,signal:ctrl.signal,
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:"You are grading a student's answer for the SOA GH301 actuarial exam. Be encouraging but honest.\n\nGRADING RULES:\n- Award: STRONG (key concepts + most details), PARTIAL (some correct but missing important elements), or NEEDS REVIEW (fundamental gaps).\n- Lists: don't need every bullet, but must hit major themes.\n- Formulas: must know structure and key variables; exact notation not required.\n- Master cards: focus on breadth across key themes.\n\nRESPONSE FORMAT (follow exactly):\nLine 1: STRONG, PARTIAL, or NEEDS REVIEW\nLine 2+: 2-3 sentences of feedback.\nThen if anything substantive was missed, add a line \"MISSED:\" followed by bullet points (one per line starting with \"- \"). Only include genuinely important omissions.",
          messages:[{role:"user",content:"QUESTION: "+c.q+"\n\nANSWER KEY:\n"+tb+"\n\nSTUDENT'S ANSWER:\n"+ua+"\n\nGrade this answer."}]})});
      clearTimeout(timer);
      if(!res.ok){const errBody=await res.text().catch(()=>"");console.error("API error:",res.status,errBody);throw new Error("API "+res.status)}
      const data=await res.json();const et=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"Could not evaluate.";
      if(data.error){console.error("API error:",data.error);throw new Error(data.error.message||"API error")}
      let rating="needs_review";const fl=et.trim().split("\n")[0].toUpperCase();
      if(fl.includes("STRONG"))rating="strong";else if(fl.includes("PARTIAL"))rating="partial";
      setScores(p=>[...p,rating]);
      const ns={...srs};ns[c.id]=updSrs(srs[c.id]||defSrs(),rating);await saveSrs(ns);
      setMsgs(p=>[...p,{role:"bot",type:"eval",rating,content:et,cardId:c.id,scoreIdx:scores.length},{role:"bot",type:"answer_key",cardType:getEffType(c.id),cardId:c.id,content:c.a,prompt:c.q}]);
    }catch(err){
      console.error("Evaluator error:",err);
      setScores(p=>[...p,"error"]);
      const errMsg=err.name==="AbortError"?"Evaluator timed out (30s). Review the answer key and self-assess.":"Couldn't reach evaluator: "+err.message+". Review the answer key and self-assess.";
      setMsgs(p=>[...p,{role:"bot",type:"eval",rating:"error",content:errMsg,cardId:c.id,scoreIdx:scores.length},{role:"bot",type:"answer_key",cardType:getEffType(c.id),cardId:c.id,content:c.a,prompt:c.q}]);
    }
    setLoading(false);setQp(ci+1>=qCards.length?"done":"between");
  }
  function handleSkip(){
    if(qp!=="asking")return;const c=qCards[ci];
    setMsgs(p=>[...p,{role:"user",content:"(skipped)"}]);setScores(p=>[...p,"needs_review"]);
    const ns={...srs};ns[c.id]=updSrs(srs[c.id]||defSrs(),"needs_review");saveSrs(ns);
    setMsgs(p=>[...p,{role:"bot",type:"eval",rating:"needs_review",content:"NEEDS REVIEW\nSkipped. Review the answer key.",cardId:c.id,scoreIdx:scores.length},{role:"bot",type:"answer_key",cardType:getEffType(c.id),cardId:c.id,content:c.a,prompt:c.q}]);
    setQp(ci+1>=qCards.length?"done":"between");
  }
  function handleNext(){const n=ci+1;setCi(n);askQ(qCards,n)}
  useEffect(()=>{
    const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"&&qp==="between"){e.preventDefault();handleNext()}};
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  });
  async function handleResetSrs(){await saveSrs({})}
  function startEdit(card){
    if(!card)return;
    const c=gc(card);
    if(phase==="quiz"){
      setEditQ(c.q);
      setEditA(c.a);
      editOrigQ.current=c.q;
      editOrigA.current=null;
      setEditCard(card);
      setEditSource(false);
      setEditTagInput("");
      return;
    }
    setInlineEditing(prev=>new Set(prev).add(card.id));
    setInlineDrafts(prev=>prev[card.id]?prev:({...prev,[card.id]:{q:c.q,a:c.a,source:false,tagInput:""}}));
    setInlineEditOrig(prev=>prev[card.id]?prev:({...prev,[card.id]:{q:c.q,a:c.a}}));
  }
  async function handleSaveEdit(){if(!editCard)return;syncFromEditor();const a=editRef.current?editRef.current.innerHTML:editA;await saveCardEdit(editCard.id,editQ,a);setEditCard(null);if(viewCard?.id===editCard.id)setViewCard({...viewCard,q:editQ,a})}
  async function handleDeleteCard(card){if(!card)return;const ns=new Set(deletedCards);ns.add(card.id);await saveDeletedCards(ns);setConfirmDeleteCard(null);if(editCard?.id===card.id)setEditCard(null)}
  const editRef=useRef(null);
  const editOrigQ=useRef("");
  const editOrigA=useRef(null);
  useEffect(()=>{if(editCard&&editRef.current&&editOrigA.current===null){editOrigA.current=editRef.current.innerHTML}},[editCard]);
  function isEditDirty(){if(!editCard)return false;const curA=(!editSource&&editRef.current)?editRef.current.innerHTML:editA;const origA=editOrigA.current!==null?editOrigA.current:editA;return editQ!==editOrigQ.current||curA!==origA}
  function closeEdit(){if(isEditDirty()){if(!confirm("You have unsaved changes to this card. Discard?"))return}setConfirmDeleteCard(null);setEditCard(null)}
  const[editSource,setEditSource]=useState(false);
  const[editTagInput,setEditTagInput]=useState("");
  const[viewTagInput,setViewTagInput]=useState("");
  const[quizTagInput,setQuizTagInput]=useState({});
  const[expandedNotes,setExpandedNotes]=useState(new Set());
  function syncFromEditor(){if(editRef.current)setEditA(editRef.current.innerHTML)}
  function toggleSource(){if(editSource){setEditSource(false)}else{syncFromEditor();setEditSource(true)}}
  function syncInlineEditor(cardId){
    const el=inlineEditRefs.current[cardId];
    if(!el)return;
    setInlineDrafts(prev=>prev[cardId]?({...prev,[cardId]:{...prev[cardId],a:el.innerHTML}}):prev);
  }
  function isInlineDirty(cardId){
    const draft=inlineDrafts[cardId];
    const orig=inlineEditOrig[cardId];
    if(!draft||!orig)return false;
    return draft.q!==orig.q||draft.a!==orig.a;
  }
  function closeInlineEdit(cardId){
    if(isInlineDirty(cardId)&&!confirm("You have unsaved changes to this card. Discard?"))return;
    setInlineEditing(prev=>{const next=new Set(prev);next.delete(cardId);return next});
    setInlineDrafts(prev=>{const next={...prev};delete next[cardId];return next});
    setInlineEditOrig(prev=>{const next={...prev};delete next[cardId];return next});
    if(inlineActiveTable===cardId){setShowTB(false);setInlineActiveTable(null)}
  }
  async function saveInlineEdit(cardId){
    const draft=inlineDrafts[cardId];
    if(!draft)return;
    syncInlineEditor(cardId);
    const latest=inlineEditRefs.current[cardId]?.innerHTML ?? draft.a;
    await saveCardEdit(cardId,draft.q,latest);
    if(viewCard?.id===cardId)setViewCard(prev=>prev?{...prev,q:draft.q,a:latest}:prev);
    if(viewCard2?.id===cardId)setViewCard2(prev=>prev?{...prev,q:draft.q,a:latest}:prev);
    setInlineEditing(prev=>{const next=new Set(prev);next.delete(cardId);return next});
    setInlineDrafts(prev=>{const next={...prev};delete next[cardId];return next});
    setInlineEditOrig(prev=>{const next={...prev};delete next[cardId];return next});
    if(inlineActiveTable===cardId){setShowTB(false);setInlineActiveTable(null)}
  }
  function toggleInlineSource(cardId){
    const draft=inlineDrafts[cardId];
    if(!draft)return;
    if(!draft.source)syncInlineEditor(cardId);
    setInlineDrafts(prev=>({...prev,[cardId]:{...prev[cardId],source:!prev[cardId].source}}));
  }
  function setInlineDraft(cardId,patch){
    setInlineDrafts(prev=>prev[cardId]?({...prev,[cardId]:{...prev[cardId],...patch}}):prev);
  }
  function handleInlineEditorKeyDown(e){
    if(!(e.ctrlKey||e.metaKey))return;
    const key=e.key.toLowerCase();
    if(key==="b"){
      e.preventDefault();
      document.execCommand?.("bold");
      return;
    }
    if(key==="i"){
      e.preventDefault();
      document.execCommand?.("italic");
      return;
    }
    if(key==="u"){
      e.preventDefault();
      document.execCommand?.("underline");
    }
  }
  function initTB(r,c){const d=[];for(let i=0;i<r;i++){const row=[];for(let j=0;j<c;j++)row.push("");d.push(row)}setTbData(d);setTbActive([0,0]);setTbBold(new Set())}
  function openNewTable(){initTB(3,3);setTbHasHeader(true);setShowTB(true);setTimeout(()=>{const k="0-0";tbRef.current[k]?.focus()},50)}
  function openEditTable(){
    const html=inlineActiveTable?(inlineEditRefs.current[inlineActiveTable]?.innerHTML ?? inlineDrafts[inlineActiveTable]?.a ?? ""):(syncFromEditor(),editA);
    const div=document.createElement("div");div.innerHTML=html;
    const table=div.querySelector("table");
    if(!table){openNewTable();return}
    const rows=[...table.querySelectorAll("tr")];if(!rows.length){openNewTable();return}
    const hasH=rows[0]?.querySelector("th")!=null;const bold=new Set();
    const d=rows.map((r,ri)=>[...(r.querySelectorAll("th,td"))].map((c,ci)=>{
      if(c.querySelector("b")||c.style.fontWeight==="700")bold.add(`${ri}-${ci}`);
      return c.innerHTML.replace(/<b>(.*?)<\/b>/gi,"$1").replace(/<br\s*\/?>/g,"\n").replace(/<[^>]+>/g,"").trim()
    }));
    setTbData(d);setTbHasHeader(hasH);setTbBold(bold);setTbActive([0,0]);setShowTB(true)
  }
  function tbCell(r,c,v){setTbData(p=>{const d=p.map(x=>[...x]);d[r][c]=v;return d})}
  function tbToggleBold(r,c){setTbBold(p=>{const s=new Set(p);const k=`${r}-${c}`;s.has(k)?s.delete(k):s.add(k);return s})}
  function tbAddRow(after){setTbData(p=>{const nc=p[0]?.length||3;const nr=Array(nc).fill("");const d=[...p];d.splice(after+1,0,nr);return d})}
  function tbAddCol(after){setTbData(p=>p.map(r=>{const nr=[...r];nr.splice(after+1,0,"");return nr}))}
  function tbDelRow(i){setTbData(p=>{if(p.length<=1)return p;return p.filter((_,j)=>j!==i)})}
  function tbDelCol(i){setTbData(p=>{if((p[0]?.length||0)<=1)return p;return p.map(r=>r.filter((_,j)=>j!==i))})}
  function tbNav(ri,ci,dir){
    const rows=tbData.length,cols=tbData[0]?.length||0;
    let nr=ri,nc=ci;
    if(dir==="right"){nc++;if(nc>=cols){nc=0;nr++}}
    if(dir==="left"){nc--;if(nc<0){nc=cols-1;nr--}}
    if(dir==="down")nr++;
    if(dir==="up")nr--;
    if(nr>=0&&nr<rows&&nc>=0&&nc<cols){setTbActive([nr,nc]);const k=`${nr}-${nc}`;setTimeout(()=>tbRef.current[k]?.focus(),0)}
  }
  function tbKeyDown(e,ri,ci){
    if(e.key==="Tab"){e.preventDefault();tbNav(ri,ci,e.shiftKey?"left":"right")}
    else if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();tbNav(ri,ci,"down")}
    else if(e.key==="ArrowDown"&&e.altKey){e.preventDefault();tbNav(ri,ci,"down")}
    else if(e.key==="ArrowUp"&&e.altKey){e.preventDefault();tbNav(ri,ci,"up")}
    else if(e.key==="b"&&(e.ctrlKey||e.metaKey)){e.preventDefault();tbToggleBold(ri,ci)}
  }
  function tbPaste(e,ri,ci){
    const text=e.clipboardData?.getData("text/plain");if(!text)return;
    const lines=text.split("\n").map(l=>l.split("\t"));
    if(lines.length<=1&&lines[0]?.length<=1)return;
    e.preventDefault();
    setTbData(p=>{
      const d=p.map(x=>[...x]);
      for(let r=0;r<lines.length;r++){
        for(let c=0;c<lines[r].length;c++){
          const tr=ri+r,tc=ci+c;
          while(d.length<=tr)d.push(Array(d[0]?.length||1).fill(""));
          while(d[0].length<=tc)d.forEach(row=>row.push(""));
          d[tr][tc]=lines[r][c].trim()
        }
      }
      return d
    })
  }
  function tbGenHTML(){
    const ts='border-collapse:collapse;width:100%;margin:8px 0;';
    const ths='border:1px solid #2a2e3f;padding:4px 8px;text-align:left;font-weight:700;background:#1a1e30;color:#a5b4fc;font-size:0.9em;';
    const tds='border:1px solid #2a2e3f;padding:4px 8px;vertical-align:top;font-size:0.9em;';
    let h=`<table style="${ts}">`;
    tbData.forEach((row,ri)=>{
      h+="<tr>";
      row.forEach((cell,ci)=>{
        const tag=(ri===0&&tbHasHeader)?"th":"td";
        const st=(ri===0&&tbHasHeader)?ths:tds;
        let val=cell.replace(/\n/g,"<br>");
        if(tbBold.has(`${ri}-${ci}`)&&tag!=="th")val=`<b>${val}</b>`;
        h+=`<${tag} style="${st}">${val}</${tag}>`;
      });
      h+="</tr>";
    });
    h+="</table>";return h
  }
  function tbInsert(){
    const thtml=tbGenHTML();
    const baseHtml=inlineActiveTable?(inlineEditRefs.current[inlineActiveTable]?.innerHTML ?? inlineDrafts[inlineActiveTable]?.a ?? ""):(syncFromEditor(),editA);
    const div=document.createElement("div");div.innerHTML=baseHtml;
    const existing=div.querySelector("table");
    if(existing){existing.outerHTML=thtml}else{div.innerHTML=baseHtml+thtml}
    if(inlineActiveTable){
      setInlineDrafts(prev=>({...prev,[inlineActiveTable]:{...prev[inlineActiveTable],a:div.innerHTML,source:false}}));
      setTimeout(()=>{const el=inlineEditRefs.current[inlineActiveTable];if(el)el.innerHTML=div.innerHTML},0);
      setShowTB(false);setInlineActiveTable(null);
      return;
    }
    setEditA(div.innerHTML);setShowTB(false);setEditSource(false)
  }
  function renderNotesBlock(cardId){
    const notes=cardNotes[cardId]||[];const nInp=noteInputs[cardId]||"";
    const expanded=expandedNotes.has(cardId);
    const recent=[...notes].reverse();
    const shown=expanded?recent:recent.slice(0,2);
    return(<div>
      <div style={{fontSize:Math.max(9,fs-7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>{"\uD83D\uDCDD"} Notes {notes.length>0&&<span style={{fontWeight:400,opacity:0.7}}>({notes.length})</span>}</div>
      <div style={{display:"flex",gap:5,marginBottom:5}}>
        <textarea value={nInp} onChange={e=>setNoteInputs(p=>({...p,[cardId]:e.target.value}))} placeholder="Add a note..." rows={3} onClick={e=>e.stopPropagation()} style={{flex:1,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:7,padding:"6px 10px",color:"#c4c8df",fontSize:Math.max(11,fs-4),resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.4,minHeight:64}}/>
        <button onClick={()=>{addNote(cardId,nInp);setNoteInputs(p=>({...p,[cardId]:""}))}} disabled={!nInp.trim()} style={{padding:"6px 12px",borderRadius:7,border:"none",background:nInp.trim()?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#2a2e3f",color:nInp.trim()?"#fff":"#6b7094",fontSize:Math.max(10,fs-5),fontWeight:600,cursor:nInp.trim()?"pointer":"default",alignSelf:"flex-end"}}>Add</button>
      </div>
      {shown.map((n,ni)=>{const origIdx=notes.length-1-(expanded?ni:ni);return(<div key={origIdx} style={{background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:7,padding:"6px 10px",marginBottom:4,fontSize:Math.max(11,fs-4)}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{color:"#c4c8df",lineHeight:1.5,whiteSpace:"pre-wrap",flex:1}}>{n.text}</div>
          <button onClick={(e)=>{e.stopPropagation();deleteNote(cardId,origIdx)}} style={{background:"transparent",border:"none",color:"#f8717166",fontSize:12,cursor:"pointer",padding:"0 2px",flexShrink:0,marginLeft:6}}>{"\u2715"}</button>
        </div>
        <div style={{fontSize:Math.max(8,fs-8),color:"#3b3f58",marginTop:2}}>{new Date(n.ts).toLocaleDateString()} {new Date(n.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
      </div>)})}
      {notes.length>2&&<button onClick={(e)=>{e.stopPropagation();const s=new Set(expandedNotes);expanded?s.delete(cardId):s.add(cardId);setExpandedNotes(s)}} style={{background:"transparent",border:"none",color:"#6366f1",fontSize:Math.max(10,fs-5),cursor:"pointer",padding:"2px 0"}}>{expanded?"\u25B2 Show less":"\u25BC Show all "+notes.length+" notes"}</button>}
    </div>);
  }
  function renderEditModal(){
    if(!editCard)return null;
    const edited=cardEdits[editCard.id];
    return(<div onClick={closeEdit} style={{position:"fixed",inset:0,background:"rgba(8,10,16,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:12,fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e4e7ef"}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:"#0f1118",border:"1px solid #2a2e3f",borderRadius:14,width:"min(1200px, calc(100vw - 24px))",maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 28px 80px rgba(0,0,0,0.45)",fontFamily:"inherit",color:"inherit"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #1e2235",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {(()=>{const et=getEffType(editCard.id);const tc=et==="master"?"#ffa94d":et==="formula"?"#69db7c":"#e879f9";return <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",padding:"2px 6px",borderRadius:4,background:tc+"18",color:tc}}>{et}</span>})()}
            <span style={{fontSize:13,fontWeight:700,color:"#e4e7ef"}}>{"\u270E"} Edit Card</span>
            {edited&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"#6366f120",color:"#a5b4fc"}}>edited</span>}
            <span style={{fontSize:8,color:"#3b3f58",fontFamily:"monospace"}}>{editCard.id}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setConfirmDeleteCard(editCard)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #f8717133",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer",fontWeight:600}}>Delete</button>
            <button onClick={closeEdit} style={{background:"transparent",border:"none",color:"#6b7094",fontSize:16,cursor:"pointer"}}>{"\u2715"}</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Question</div>
            <textarea value={editQ} onChange={e=>setEditQ(e.target.value)} style={{width:"100%",minHeight:60,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:8,padding:"8px 10px",color:"#e4e7ef",fontSize:Math.max(14,fs-1),fontWeight:600,resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.4,boxSizing:"border-box"}}/>
          </div>
          {(()=>{const eTags=getEffTags(editCard.id);const eSugg=editTagInput.trim()?allTagKeys.filter(t=>!eTags.includes(t)&&allTagMeta(t).l.toLowerCase().includes(editTagInput.toLowerCase())):[];return(
          <div style={{paddingBottom:10,borderBottom:"1px solid #1e2235"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",flex:1,minWidth:240}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Importance</div>
                  <div style={{display:"flex",gap:4}}>
                    {(()=>{const curImp=getImp(editCard.id);return [{k:"high",c:"#f87171"},{k:"medium",c:"#facc15"},{k:"low",c:"#4ade80"}].map(({k,c})=>(
                      <button key={k} onClick={async()=>{const d={...cardImportance};if(curImp===k)delete d[editCard.id];else d[editCard.id]=k;await saveCardImportance(d)}} style={{padding:"3px 10px",borderRadius:4,border:curImp===k?"2px solid "+c:"1px solid #2a2e3f",background:curImp===k?c+"20":"transparent",color:curImp===k?c:"#3b3f58",fontSize:12,fontWeight:curImp===k?700:400,cursor:"pointer",textTransform:"capitalize"}}>{k}</button>
                    ))})()}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Type</div>
                  <div style={{display:"flex",gap:4}}>
                    {[{k:"master",c:"#ffa94d"},{k:"formula",c:"#69db7c"},{k:"concept",c:"#e879f9"}].map(({k:tk,c:tc})=>{const curType=getEffType(editCard.id);const origCard=CARDS.find(x=>x.id===editCard.id);return(<button key={tk} onClick={async()=>{const d={...cardTypeOverrides};if(origCard&&tk===origCard.t){delete d[editCard.id]}else{d[editCard.id]=tk}await saveCardTypeOverrides(d)}} style={{padding:"3px 10px",borderRadius:4,border:curType===tk?`2px solid ${tc}`:"1px solid #2a2e3f",background:curType===tk?`${tc}20`:"transparent",color:curType===tk?tc:"#3b3f58",fontSize:12,fontWeight:curType===tk?700:400,cursor:"pointer",textTransform:"capitalize"}}>{tk}</button>)})}
                  </div>
                </div>
                {srs[editCard.id]&&<div style={{fontSize:9,color:"#4b5072",alignSelf:"flex-end"}}>
                  Last: <span style={{color:srs[editCard.id].lastRating==="strong"?"#4ade80":srs[editCard.id].lastRating==="partial"?"#facc15":"#f87171"}}>{srs[editCard.id].lastRating}</span>
                  {" \u2022 "}{srs[editCard.id].reviews} reviews
                  {" \u2022 "}{srs[editCard.id].interval}d interval
                  {" \u2022 "}{(srs[editCard.id].ease||2.5).toFixed(1)} ease
                </div>}
              </div>
            </div>
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Tags</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:5}}>
                {eTags.map(t=>{const tm=allTagMeta(t);return(<span key={t} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:4,background:`${tm.c}12`,border:`1px solid ${tm.c}33`,color:tm.c,fontSize:12}}>
                  {tm.l}<button onClick={async()=>{const next=eTags.filter(x=>x!==t);const d={...cardTagOverrides,[editCard.id]:next};await saveCardTagOverrides(d)}} style={{background:"transparent",border:"none",color:`${tm.c}66`,fontSize:12,cursor:"pointer",padding:"0 2px"}}>{"\u2715"}</button>
                </span>)})}
                {eTags.length===0&&<span style={{fontSize:12,color:"#3b3f58",fontStyle:"italic"}}>No tags</span>}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={editTagInput} onChange={e=>setEditTagInput(e.target.value)} placeholder="Search or create tag..." style={{flex:1,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:6,padding:"5px 10px",color:"#c4c8df",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                {editTagInput.trim()&&!allTagKeys.includes(editTagInput.trim())&&(
                  <button onClick={async()=>{const key=editTagInput.trim().replace(/\s+/g,"_");const newUT={...userTags,[key]:{l:editTagInput.trim(),c:TAG_COLOR}};await saveUserTags(newUT);const next=[...eTags,key];const d={...cardTagOverrides,[editCard.id]:next};await saveCardTagOverrides(d);setEditTagInput("")}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #4ade8044",background:"transparent",color:"#4ade80",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>+ Create</button>
                )}
              </div>
              {editTagInput.trim()&&eSugg.length>0&&(
                <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:3}}>
                  {eSugg.slice(0,8).map(t=>{const tm=allTagMeta(t);return(<button key={t} onClick={async()=>{const next=[...eTags,t];const d={...cardTagOverrides,[editCard.id]:next};await saveCardTagOverrides(d);setEditTagInput("")}} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${tm.c}33`,background:"transparent",color:tm.c,fontSize:12,cursor:"pointer"}}>{tm.l}</button>)})}
                </div>
              )}
            </div>
          </div>);})()}
          <div style={{flex:1,display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:10,fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Answer</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={openEditTable} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #1e2235",background:showTB?"#6366f120":"transparent",color:showTB?"#a5b4fc":"#6b7094",fontSize:Math.max(9,fs-7),cursor:"pointer"}}>{"\u25A6"} Table</button>
                <button onClick={toggleSource} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #1e2235",background:editSource?"#6366f120":"transparent",color:editSource?"#a5b4fc":"#6b7094",fontSize:Math.max(9,fs-7),cursor:"pointer"}}>{editSource?"\u2190 Visual":"</> Source"}</button>
              </div>
            </div>
            {editSource?
              <textarea value={editA} onChange={e=>setEditA(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&["b","i","u"].includes(e.key.toLowerCase()))e.preventDefault()}} style={{width:"100%",flex:1,minHeight:200,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:8,padding:"8px 10px",color:"#c4c8df",fontSize:Math.max(11,fs-4),resize:"vertical",outline:"none",fontFamily:"'Cascadia Code','Fira Code',monospace",lineHeight:1.5,boxSizing:"border-box"}}/>:
              <div ref={editRef} contentEditable suppressContentEditableWarning onBlur={()=>syncFromEditor()} onKeyDown={handleInlineEditorKeyDown} dangerouslySetInnerHTML={{__html:editA}} style={{flex:1,minHeight:200,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:8,padding:"8px 12px",color:"#a8acc4",fontSize:Math.max(12,fs-3),lineHeight:1.7,overflowY:"auto",outline:"none",cursor:"text",boxSizing:"border-box"}}/>
            }
            {showTB&&<div style={{background:"#111320",border:"1px solid #2a2e3f",borderRadius:10,padding:"12px",marginTop:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#a5b4fc"}}>Table Editor</span>
                  <span style={{fontSize:9,color:"#4b5072"}}>{tbData.length}x{tbData[0]?.length||0}</span>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <label style={{fontSize:10,color:"#6b7094",display:"flex",alignItems:"center",gap:3,cursor:"pointer"}}>
                    <input type="checkbox" checked={tbHasHeader} onChange={e=>setTbHasHeader(e.target.checked)} style={{accentColor:"#6366f1",width:12,height:12}}/>Hdr
                  </label>
                  <button onClick={()=>tbToggleBold(tbActive[0],tbActive[1])} style={{padding:"1px 6px",borderRadius:3,border:`1px solid ${tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?"#a5b4fc":"#2a2e3f"}`,background:tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?"#6366f120":"transparent",color:tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?"#a5b4fc":"#6b7094",fontSize:11,fontWeight:700,cursor:"pointer"}}>B</button>
                  <span style={{color:"#1e2235",fontSize:10}}>|</span>
                  <button onClick={()=>tbAddRow(tbActive[0])} title="Insert row below" style={{padding:"1px 6px",borderRadius:3,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:9,cursor:"pointer"}}>+Row</button>
                  <button onClick={()=>tbAddCol(tbActive[1])} title="Insert col right" style={{padding:"1px 6px",borderRadius:3,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:9,cursor:"pointer"}}>+Col</button>
                  <button onClick={()=>tbDelRow(tbActive[0])} title="Delete row" style={{padding:"1px 6px",borderRadius:3,border:"1px solid #f8717122",background:"transparent",color:"#f8717188",fontSize:9,cursor:"pointer"}}>{"\u2212"}Row</button>
                  <button onClick={()=>tbDelCol(tbActive[1])} title="Delete col" style={{padding:"1px 6px",borderRadius:3,border:"1px solid #f8717122",background:"transparent",color:"#f8717188",fontSize:9,cursor:"pointer"}}>{"\u2212"}Col</button>
                  <button onClick={()=>setShowTB(false)} style={{background:"transparent",border:"none",color:"#6b7094",fontSize:13,cursor:"pointer",padding:"0 2px"}}>{"\u2715"}</button>
                </div>
              </div>
              <div style={{fontSize:9,color:"#3b3f58",marginBottom:6}}>Tab/Enter to navigate | Alt+Arrow Up/Down | Ctrl+B bold | Paste from Excel</div>
              <div style={{overflowX:"auto",marginBottom:8,border:"1px solid #1e2235",borderRadius:6}}>
                <table style={{borderCollapse:"collapse",width:"100%"}}>
                  <tbody>
                    {tbData.map((row,ri)=><tr key={ri}>
                      <td style={{padding:0,width:24,textAlign:"center",background:"#0d0f17",borderRight:"1px solid #1e2235",borderBottom:"1px solid #1e2235",color:"#3b3f58",fontSize:9,userSelect:"none"}}>{ri+1}</td>
                      {row.map((cell,ci)=>{const isActive=tbActive[0]===ri&&tbActive[1]===ci;const isHdr=ri===0&&tbHasHeader;const isBold=tbBold.has(`${ri}-${ci}`);return(
                        <td key={ci} style={{padding:0,borderBottom:"1px solid #1e2235",borderRight:"1px solid #1e2235",position:"relative"}}>
                          <textarea ref={el=>{tbRef.current[`${ri}-${ci}`]=el}} value={cell} onChange={e=>tbCell(ri,ci,e.target.value)}
                            onFocus={()=>setTbActive([ri,ci])} onKeyDown={e=>tbKeyDown(e,ri,ci)} onPaste={e=>tbPaste(e,ri,ci)}
                            rows={1} style={{width:"100%",minWidth:70,background:isActive?(isHdr?"#1a1e30":"#161828"):(isHdr?"#141824":"#0f1118"),
                            border:"none",borderLeft:isActive?"2px solid #6366f1":"2px solid transparent",
                            padding:"4px 6px",color:isHdr?"#a5b4fc":"#c4c8df",fontSize:11,fontWeight:isHdr||isBold?700:400,
                            outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none",overflow:"hidden",lineHeight:1.4,
                            display:"block"}}/>
                        </td>)})}
                    </tr>)}
                    {tbData[0]&&<tr>
                      <td style={{padding:0,background:"#0d0f17",borderRight:"1px solid #1e2235"}}></td>
                      {tbData[0].map((_,ci)=><td key={ci} style={{padding:0,textAlign:"center",background:"#0d0f17",borderRight:"1px solid #1e2235",color:"#3b3f58",fontSize:9,userSelect:"none"}}>{String.fromCharCode(65+ci)}</td>)}
                    </tr>}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",gap:6,justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:9,color:"#3b3f58"}}>Cell [{tbActive[0]+1},{String.fromCharCode(65+tbActive[1])}]{tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?" B":""}</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setShowTB(false)} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:10,cursor:"pointer"}}>Cancel</button>
                  <button onClick={tbInsert} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:10,fontWeight:600,cursor:"pointer"}}>{editA.includes("<table")?"Update Table":"Insert Table"}</button>
                </div>
              </div>
            </div>}
          </div>
          <div style={{marginTop:"auto",paddingTop:10,borderTop:"1px solid #1e2235"}}>
            {renderNotesBlock(editCard.id)}
          </div>
        </div>
        <div style={{padding:"10px 16px",borderTop:"1px solid #1e2235",display:"flex",gap:8,justifyContent:"flex-end",flexShrink:0}}>
          {edited&&<button onClick={()=>{const ne={...cardEdits};delete ne[editCard.id];setCardEdits(ne);const orig=CARDS.find(c=>c.id===editCard.id);if(orig){setEditQ(orig.q);setEditA(orig.a);setEditSource(false)}}} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:11,cursor:"pointer"}}>Revert edits</button>}
          <button onClick={closeEdit} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:11,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>handleSaveEdit()} style={{padding:"6px 18px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Save</button>
        </div>
        {confirmDeleteCard&&<div onClick={()=>setConfirmDeleteCard(null)} style={{position:"absolute",inset:0,background:"rgba(6,8,13,0.78)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:2}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(460px, 100%)",background:"linear-gradient(180deg,#151925,#10131c)",border:"1px solid #2a2e3f",borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.45)",padding:18,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:"#f8717118",border:"1px solid #f8717133",color:"#f87171",fontSize:16,fontWeight:700}}>!</div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:"#f3f4f6"}}>Delete Card</div>
                <div style={{fontSize:12,color:"#8b93b5",marginTop:2}}>This card will be moved to deleted cards. You can restore it later.</div>
              </div>
            </div>
            <div style={{background:"#0c0f17",border:"1px solid #1e2235",borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:10,fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Question Preview</div>
              <div style={{fontSize:13,color:"#d7dbeb",lineHeight:1.45,maxHeight:88,overflow:"hidden"}}>{confirmDeleteCard.q}</div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setConfirmDeleteCard(null)} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #2a2e3f",background:"transparent",color:"#8b93b5",fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>handleDeleteCard(confirmDeleteCard)} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #f8717144",background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Delete</button>
            </div>
          </div>
        </div>}
      </div>
    </div>);
  }

  const rc={strong:{bg:"#0a2e1a",border:"#16a34a",text:"#4ade80",label:"STRONG"},partial:{bg:"#2a2000",border:"#ca8a04",text:"#facc15",label:"PARTIAL"},needs_review:{bg:"#2a0a0a",border:"#dc2626",text:"#f87171",label:"NEEDS REVIEW"},error:{bg:"#1a1a2e",border:"#6366f1",text:"#a5b4fc",label:"ERROR"}};
  const typeColors={master:"#ffa94d",formula:"#69db7c",concept:"#e879f9"};
  const strong=scores.filter(s=>s==="strong").length,partial_=scores.filter(s=>s==="partial").length,needs=scores.filter(s=>s==="needs_review"||s==="error").length;
  const hasInProgressQuiz=qCards.length>0&&!(qp==="done"&&ci>=qCards.length-1);
  const setupFiltered=getFiltered();
  const setupDueCards=setupFiltered.filter(c=>isDue(srs[c.id]));
  const setupNewCards=setupFiltered.filter(c=>!srs[c.id]);
  const setupReviewedCards=setupFiltered.filter(c=>srs[c.id]);
  const setupSearchResults=searchQ.trim()?setupFiltered.filter(c=>{const q=searchQ.trim().toLowerCase();return c.id.startsWith(q)||c.q.toLowerCase().includes(q)||c.a.replace(/<[^>]+>/g,' ').toLowerCase().includes(q)}):[];
  const setupActivePanel=searchQ.trim()?"search":showPanel;
  const setupPanelMap={match:setupFiltered,due:setupDueCards,new:setupNewCards,reviewed:setupReviewedCards,search:setupSearchResults,deleted:(()=>{const all=CARDS.map(gc).filter(c=>deletedCards.has(c.id));if(!deletedSearchQ.trim())return all;const q=deletedSearchQ.trim().toLowerCase();return all.filter(c=>c.id.startsWith(q)||c.q.toLowerCase().includes(q)||c.a.replace(/<[^>]+>/g,' ').toLowerCase().includes(q))})()};
  const setupPanelCardsRaw=setupActivePanel?setupPanelMap[setupActivePanel]||[]:[];
  const setupPanelCards=setupActivePanel==="reviewed"&&revFilter?setupPanelCardsRaw.filter(c=>srs[c.id]?.lastRating===revFilter):setupPanelCardsRaw;
  const setupRevCounts=setupActivePanel==="reviewed"?{strong:setupReviewedCards.filter(c=>srs[c.id]?.lastRating==="strong").length,partial:setupReviewedCards.filter(c=>srs[c.id]?.lastRating==="partial").length,needs_review:setupReviewedCards.filter(c=>srs[c.id]?.lastRating==="needs_review").length}:{};
  const setupControlledId=viewCard2?.id||viewCard?.id||null;
  const activeSetupCursorId=setupPanelCards.some(c=>c.id===setupListCursorId)?setupListCursorId:(setupPanelCards.some(c=>c.id===setupControlledId)?setupControlledId:null);
  const cardById=useMemo(()=>new Map(cards.map(c=>[c.id,c])),[cardEdits]);
  const graphSourceCards=useMemo(()=>cards.filter(c=>!deletedCards.has(c.id)),[cards,deletedCards]);
  const graphFilterBaseCards=useMemo(()=>graphSourceCards.filter(c=>{
    if(!gTopicFilter.has(c.tn))return false;
    if(!gTypeFilter.has(getEffType(c.id)))return false;
    const imp=cardImportance[c.id]||"unset";
    return gImpFilter.has(imp);
  }),[graphSourceCards,gTopicFilter,gTypeFilter,gImpFilter,cardTypeOverrides,cardImportance]);
  const graphVisibleCardSet=useMemo(()=>new Set(graphSourceCards.filter(c=>{
    if(!gTopicFilter.has(c.tn))return false;
    if(!gTypeFilter.has(getEffType(c.id)))return false;
    const imp=cardImportance[c.id]||"unset";
    return gImpFilter.has(imp);
  }).map(c=>c.id)),[graphSourceCards,gTopicFilter,gTypeFilter,gImpFilter,cardTypeOverrides,cardImportance]);
  const graphData=useMemo(()=>{
    const liveCards=graphSourceCards;
    const untaggedKey="__untagged__";
    const groupsByKey=new Map();
    const edgeWeights=new Map();
    const cardGroups=new Map();
    liveCards.forEach(card=>{
      const rawTags=[...new Set(getEffTags(card.id).filter(Boolean))];
      const keys=rawTags.length?rawTags:[untaggedKey];
      cardGroups.set(card.id,keys);
      keys.forEach(key=>{
        if(!groupsByKey.has(key))groupsByKey.set(key,{key,cards:[],types:{master:0,formula:0,concept:0},topics:new Set(),topicCounts:{}});
        const group=groupsByKey.get(key);
        group.cards.push(card.id);
        const effType=getEffType(card.id);
        group.types[effType]=(group.types[effType]||0)+1;
        group.topics.add(card.tn);
        group.topicCounts[card.tn]=(group.topicCounts[card.tn]||0)+1;
      });
      for(let i=0;i<keys.length;i++){
        for(let j=i+1;j<keys.length;j++){
          const edgeKey=[keys[i],keys[j]].sort().join("|");
          edgeWeights.set(edgeKey,(edgeWeights.get(edgeKey)||0)+1);
        }
      }
    });
    const groups=[...groupsByKey.values()]
      .sort((a,b)=>{
        if(a.key===untaggedKey&&b.key!==untaggedKey)return 1;
        if(b.key===untaggedKey&&a.key!==untaggedKey)return -1;
        const an=a.key===untaggedKey?"Untagged":allTagMeta(a.key).l;
        const bn=b.key===untaggedKey?"Untagged":allTagMeta(b.key).l;
        return an.localeCompare(bn);
      })
      .map((group,idx)=>{
        const meta=group.key===untaggedKey?{l:"Untagged"}:allTagMeta(group.key);
        const color=group.key===untaggedKey?"#94a3b8":GRAPH_PALETTE[idx%GRAPH_PALETTE.length];
        const typeRank=["master","formula","concept"];
        const dominantType=typeRank.reduce((best,key)=>group.types[key]>(group.types[best]||0)?key:best,"concept");
        const topics=[...group.topics].sort((a,b)=>a-b);
        const primaryTopic=(topics.length?topics.reduce((best,topic)=>((group.topicCounts[topic]||0)>(group.topicCounts[best]||0)?topic:best),topics[0]):null);
        return{
          key:group.key,
          n:meta.l,
          c:color,
          cards:[...group.cards].sort((a,b)=>{
            const aq=cardById.get(a)?.q||a;
            const bq=cardById.get(b)?.q||b;
            return aq.localeCompare(bq);
          }),
          count:group.cards.length,
          type:dominantType,
          topics,
          primaryTopic,
          d:`${group.cards.length} live cards across ${topics.length||1} topic${topics.length===1?"":"s"}`
        };
      });
    const indexByKey=new Map(groups.map((group,idx)=>[group.key,idx]));
    const edges=[...edgeWeights.entries()].map(([edgeKey,w])=>{
      const[aKey,bKey]=edgeKey.split("|");
      const a=indexByKey.get(aKey);
      const b=indexByKey.get(bKey);
      return a===undefined||b===undefined?null:{a,b,w};
    }).filter(Boolean);
    return{groups,edges,totalCards:liveCards.length,cardGroups};
  },[graphSourceCards,cardEdits,cardTagOverrides,cardTypeOverrides,userTags]);
  const graphGroups=graphData.groups;
  const graphEdges=graphData.edges;
  const graphAllKeys=useMemo(()=>graphGroups.map(group=>group.key),[graphGroups]);
  const activeGraphFilterSet=useMemo(()=>gTagFilter===null?new Set(graphAllKeys):new Set(gTagFilter),[gTagFilter,graphAllKeys]);
  const graphVisibleCountByKey=useMemo(()=>new Map(graphGroups.map(group=>[group.key,group.cards.filter(id=>graphVisibleCardSet.has(id)).length])),[graphGroups,graphVisibleCardSet]);
  const graphTagCounts=useMemo(()=>{
    const counts={};
    graphFilterBaseCards.forEach(c=>{getEffTags(c.id).forEach(tag=>{counts[tag]=(counts[tag]||0)+1})});
    return counts;
  },[graphFilterBaseCards,cardTagOverrides,userTags]);
  const graphVisibleTagKeys=useMemo(()=>graphAllKeys.filter(key=>(graphTagCounts[key]||0)>0),[graphAllKeys,graphTagCounts]);
  const graphPanelCards=useMemo(()=>{
    if(gSel===null||!graphGroups[gSel])return[];
    const secondary=gSel2!==null&&graphGroups[gSel2]?new Set(graphGroups[gSel2].cards):null;
    const rows=graphGroups[gSel].cards.map(id=>{
      const c=cardById.get(id);
      return c?{id,c,isShared:secondary?.has(id)||false}:null;
    }).filter(Boolean).filter(row=>graphVisibleCardSet.has(row.id));
    rows.sort((a,b)=>{
      if(secondary&&a.isShared!==b.isShared)return a.isShared?-1:1;
      return a.c.q.localeCompare(b.c.q);
    });
    return rows;
  },[graphGroups,gSel,gSel2,cardById,graphVisibleCardSet]);
  const graphCardsOnly=useMemo(()=>graphPanelCards.map(x=>x.c),[graphPanelCards]);
  const graphControlledId=viewCard2?.id||viewCard?.id||null;
  const activeGraphCursorId=graphCardsOnly.some(c=>c.id===graphListCursorId)?graphListCursorId:(graphCardsOnly.some(c=>c.id===graphControlledId)?graphControlledId:null);
  function getListCursorNext(cardsInList, prevIds, missingId, excludeId=null){
    if(!cardsInList.length)return null;
    const startIdx=Math.max(0,prevIds.indexOf(missingId));
    for(let i=startIdx;i<cardsInList.length;i++)if(cardsInList[i].id!==excludeId)return cardsInList[i];
    for(let i=Math.min(startIdx-1,cardsInList.length-1);i>=0;i--)if(cardsInList[i].id!==excludeId)return cardsInList[i];
    return null;
  }
  function getNextListNeighbor(cardsInList,currentId,excludeId=null){
    if(!cardsInList.length)return null;
    const idx=cardsInList.findIndex(c=>c.id===currentId);
    if(idx<0){
      return cardsInList.find(c=>c.id!==excludeId)||null;
    }
    for(let i=idx+1;i<cardsInList.length;i++)if(cardsInList[i].id!==excludeId)return cardsInList[i];
    for(let i=idx-1;i>=0;i--)if(cardsInList[i].id!==excludeId)return cardsInList[i];
    return null;
  }
  function handleToggleDualPane(){
    if(dualPaneEnabled){
      setDualPaneEnabled(false);
      setSetupListCursorId(viewCard?.id||null);
      setGraphListCursorId(viewCard?.id||null);
      return;
    }
    setDualPaneEnabled(true);
    if(viewCard2||!viewCard)return;
    const currentList=
      mode==="graph"
        ? graphPanelCards.map(x=>x.c)
        : (setupActivePanel ? setupPanelCards : setupFiltered);
    const nextCard=getNextListNeighbor(currentList,viewCard.id,viewCard.id);
    if(nextCard){
      setViewCard2(nextCard);
      setSetupListCursorId(nextCard.id);
      setGraphListCursorId(nextCard.id);
    }
  }

  useEffect(()=>{
    const N=Math.max(1,graphGroups.length);
    setGNodes(prev=>{
      const prevByKey=new Map(prev.map(node=>[node.key,node]));
      return graphGroups.map((group,i)=>{
        const prevNode=prevByKey.get(group.key);
        const angle=(i/N)*Math.PI*2-Math.PI/2;
        const ring=Math.min(360,220+graphGroups.length*7);
        return{
          ...group,
          idx:i,
          r:Math.max(24,Math.min(54,18+Math.sqrt(group.cards.length)*5.5)),
          x:prevNode?.x ?? (440+Math.cos(angle)*ring),
          y:prevNode?.y ?? (320+Math.sin(angle)*ring)
        };
      });
    });
    setGSimDone(false);
  },[graphGroups]);
  useEffect(()=>{
    if(gSel!==null&&!graphGroups[gSel]){setGSel(null);setGSel2(null);return}
    if(gSel2!==null&&!graphGroups[gSel2])setGSel2(null);
  },[graphGroups,gSel,gSel2]);
  useEffect(()=>{
    setGTagFilter(prev=>{
      if(prev===null)return prev;
      const next=new Set([...prev].filter(key=>graphVisibleTagKeys.includes(key)));
      return next.size===prev.size?prev:next;
    });
  },[graphVisibleTagKeys]);
  useEffect(()=>{
    if(gSel!==null){
      const key=graphGroups[gSel]?.key;
      if(!activeGraphFilterSet.has(key)||(graphVisibleCountByKey.get(key)||0)===0){setGSel(null);setGSel2(null);return}
    }
    if(gSel2!==null){
      const key=graphGroups[gSel2]?.key;
      if(!activeGraphFilterSet.has(key)||(graphVisibleCountByKey.get(key)||0)===0)setGSel2(null);
    }
  },[activeGraphFilterSet,graphGroups,gSel,gSel2,graphVisibleCountByKey]);
  function toggleGraphTagFilter(key){
    setGTagFilter(prev=>{
      if(prev===null)return new Set([key]);
      const next=new Set(prev);
      if(next.has(key))next.delete(key);else next.add(key);
      return next;
    });
  }
  function selectAllGraphTags(){setGTagFilter(null)}
  function clearGraphTagFilter(){setGTagFilter(new Set())}
  function toggleGraphTopicFilter(topic){setGTopicFilter(prev=>{const next=new Set(prev);if(next.has(topic))next.delete(topic);else next.add(topic);return next})}
  function toggleGraphTypeFilter(key){setGTypeFilter(prev=>{const next=new Set(prev);if(next.has(key))next.delete(key);else next.add(key);return next})}
  function toggleGraphImpFilter(key){setGImpFilter(prev=>{const next=new Set(prev);if(next.has(key))next.delete(key);else next.add(key);return next})}

  function selectSetupCard(card){
    if(!card)return;
    if(mode==="graph")setGraphListCursorId(card.id);
    else setSetupListCursorId(card.id);
    if(!dualPaneEnabled){setViewCard(card);setViewCard2(null);return}
    if(!viewCard){setViewCard(card);return}
    if(viewCard.id===card.id){
      if(!viewCard2){setViewCard2(card);return}
      setViewCard(card);
      return;
    }
    if(!viewCard2){setViewCard2(card);return}
    setViewCard2(card);
  }
  function setSetupPrimary(next){
    if(next===null){if(dualPaneEnabled&&viewCard2){setViewCard(viewCard2);setViewCard2(null);setSetupListCursorId(viewCard2.id);setGraphListCursorId(viewCard2.id)}else setViewCard(null);return}
    setSetupListCursorId(next.id);
    setGraphListCursorId(next.id);
    setViewCard(next);
  }
  function setSetupSecondary(next){
    if(!dualPaneEnabled){setViewCard2(null);return}
    if(next===null){setViewCard2(null);return}
    setSetupListCursorId(next.id);
    setGraphListCursorId(next.id);
    setViewCard2(next);
  }
  function clearHoverPreview(){if(hoverPreviewTimer.current){clearTimeout(hoverPreviewTimer.current);hoverPreviewTimer.current=null}setHoverPreview(null)}
  function queueHoverPreview(card,e){
    if(hoverPreviewTimer.current)clearTimeout(hoverPreviewTimer.current);
    const mx=e.clientX, my=e.clientY;
    hoverPreviewTimer.current=setTimeout(()=>{
      hoverPreviewTimer.current=null;
      setHoverPreview({card,top:Math.min(window.innerHeight-260,Math.max(12,my+14)),left:Math.min(window.innerWidth-380,Math.max(12,mx+14))});
    },220);
  }
  useEffect(()=>{
    if(phase!=="setup"||!setupActivePanel||!activeSetupCursorId){
      prevSetupScrollCursorRef.current=null;
      return;
    }
    if(prevSetupScrollCursorRef.current===activeSetupCursorId)return;
    const row=setupRowRefs.current[activeSetupCursorId];
    if(row){
      row.scrollIntoView({block:"nearest"});
      prevSetupScrollCursorRef.current=activeSetupCursorId;
    }
  },[phase,setupActivePanel,activeSetupCursorId,setupPanelCards]);
  useEffect(()=>{
    if(!dualPaneEnabled&&viewCard2){
      if(!viewCard)setViewCard(viewCard2);
      setViewCard2(null);
    }
  },[dualPaneEnabled,viewCard,viewCard2]);
  useEffect(()=>{
    const nextIds=setupPanelCards.map(c=>c.id);
    if(phase==="setup"&&mode!=="graph"&&setupActivePanel){
      const prevIds=prevSetupPanelIdsRef.current;
      const visibleIds=new Set(nextIds);
      let nextPrimary=viewCard;
      let nextSecondary=dualPaneEnabled?viewCard2:null;
      let nextCursor=activeSetupCursorId;
      if(nextPrimary&&deletedCards.has(nextPrimary.id)&&!visibleIds.has(nextPrimary.id))nextPrimary=getListCursorNext(setupPanelCards,prevIds,nextPrimary.id,nextSecondary?.id||null);
      if(nextSecondary&&deletedCards.has(nextSecondary.id)&&!visibleIds.has(nextSecondary.id))nextSecondary=getListCursorNext(setupPanelCards,prevIds,nextSecondary.id,nextPrimary?.id||null);
      if(setupControlledId&&!visibleIds.has(setupControlledId))nextCursor=getListCursorNext(setupPanelCards,prevIds,setupControlledId,nextSecondary?.id||null)?.id||nextCursor;
      if(nextCursor&&!visibleIds.has(nextCursor))nextCursor=getListCursorNext(setupPanelCards,prevIds,nextCursor,nextSecondary?.id||null)?.id||null;
      if(!nextPrimary&&nextSecondary){nextPrimary=nextSecondary;nextSecondary=null}
      if((nextPrimary?.id||null)!==(viewCard?.id||null))setViewCard(nextPrimary||null);
      if((nextSecondary?.id||null)!==(viewCard2?.id||null))setViewCard2(nextSecondary||null);
      if((nextCursor||null)!==(setupListCursorId||null))setSetupListCursorId(nextCursor||null);
    }
    prevSetupPanelIdsRef.current=nextIds;
  },[phase,mode,setupActivePanel,setupPanelCards,viewCard,viewCard2,dualPaneEnabled,deletedCards,activeSetupCursorId,setupControlledId,setupListCursorId]);
  useEffect(()=>{
    if(mode!=="graph"||gSel===null||!activeGraphCursorId){
      prevGraphScrollCursorRef.current=null;
      return;
    }
    if(prevGraphScrollCursorRef.current===activeGraphCursorId)return;
    const row=graphRowRefs.current[activeGraphCursorId];
    if(row){
      row.scrollIntoView({block:"nearest"});
      prevGraphScrollCursorRef.current=activeGraphCursorId;
    }
  },[mode,gSel,activeGraphCursorId,viewCard2,viewCard]);
  useEffect(()=>{
    const nextIds=graphCardsOnly.map(c=>c.id);
    if(mode==="graph"&&gSel!==null){
      const prevIds=prevGraphPanelIdsRef.current;
      const visibleIds=new Set(nextIds);
      let nextPrimary=viewCard;
      let nextSecondary=dualPaneEnabled?viewCard2:null;
      let nextCursor=activeGraphCursorId;
      if(nextPrimary&&deletedCards.has(nextPrimary.id)&&!visibleIds.has(nextPrimary.id))nextPrimary=getListCursorNext(graphCardsOnly,prevIds,nextPrimary.id,nextSecondary?.id||null);
      if(nextSecondary&&deletedCards.has(nextSecondary.id)&&!visibleIds.has(nextSecondary.id))nextSecondary=getListCursorNext(graphCardsOnly,prevIds,nextSecondary.id,nextPrimary?.id||null);
      if(graphControlledId&&!visibleIds.has(graphControlledId))nextCursor=getListCursorNext(graphCardsOnly,prevIds,graphControlledId,nextSecondary?.id||null)?.id||nextCursor;
      if(nextCursor&&!visibleIds.has(nextCursor))nextCursor=getListCursorNext(graphCardsOnly,prevIds,nextCursor,nextSecondary?.id||null)?.id||null;
      if(!nextPrimary&&nextSecondary){nextPrimary=nextSecondary;nextSecondary=null}
      if((nextPrimary?.id||null)!==(viewCard?.id||null))setViewCard(nextPrimary||null);
      if((nextSecondary?.id||null)!==(viewCard2?.id||null))setViewCard2(nextSecondary||null);
      if((nextCursor||null)!==(graphListCursorId||null))setGraphListCursorId(nextCursor||null);
    }
    prevGraphPanelIdsRef.current=nextIds;
  },[mode,gSel,graphCardsOnly,viewCard,viewCard2,dualPaneEnabled,deletedCards,activeGraphCursorId,graphControlledId,graphListCursorId]);
  useEffect(()=>{
    if(phase!=="setup"||!setupActivePanel||!activeSetupCursorId)return;
    const onKeyDown=e=>{
      const t=e.target;
      if(t&&((t.tagName==="INPUT")||(t.tagName==="TEXTAREA")||t.isContentEditable))return;
      if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;
      const controlledId=viewCard2?.id||viewCard?.id||null;
      if(controlledId&&controlledId!==activeSetupCursorId){
        const queued=setupPanelCards.find(c=>c.id===activeSetupCursorId);
        if(!queued)return;
        e.preventDefault();
        if(viewCard2)setViewCard2(queued);else setViewCard(queued);
        return;
      }
      const idx=setupPanelCards.findIndex(c=>c.id===activeSetupCursorId);
      if(idx<0)return;
      e.preventDefault();
      const nextIdx=e.key==="ArrowDown"?Math.min(setupPanelCards.length-1,idx+1):Math.max(0,idx-1);
      if(nextIdx===idx)return;
      const nextCard=setupPanelCards[nextIdx];
      setSetupListCursorId(nextCard.id);
      if(viewCard2)setViewCard2(nextCard);else setViewCard(nextCard);
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[phase,setupActivePanel,activeSetupCursorId,setupPanelCards,viewCard2]);
  useEffect(()=>{
    if(mode!=="graph"||gSel===null)return;
    const onKeyDown=e=>{
      const t=e.target;
      if(t&&((t.tagName==="INPUT")||(t.tagName==="TEXTAREA")||t.isContentEditable))return;
      if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;
      if(!activeGraphCursorId)return;
      const controlledId=viewCard2?.id||viewCard?.id||null;
      if(controlledId&&controlledId!==activeGraphCursorId){
        const queued=graphCardsOnly.find(c=>c.id===activeGraphCursorId);
        if(!queued)return;
        e.preventDefault();
        if(viewCard2)setViewCard2(queued);else setViewCard(queued);
        return;
      }
      const idx=graphCardsOnly.findIndex(c=>c.id===activeGraphCursorId);
      if(idx<0)return;
      e.preventDefault();
      const nextIdx=e.key==="ArrowDown"?Math.min(graphCardsOnly.length-1,idx+1):Math.max(0,idx-1);
      if(nextIdx===idx)return;
      const nextCard=graphCardsOnly[nextIdx];
      setGraphListCursorId(nextCard.id);
      if(viewCard2)setViewCard2(nextCard);else setViewCard(nextCard);
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[mode,gSel,graphCardsOnly,viewCard,viewCard2,activeGraphCursorId]);
  useEffect(()=>{
    const onKeyDown=e=>{
      if(e.key!=="Escape")return;
      if(showTB){e.preventDefault();setShowTB(false);setInlineActiveTable(null);return}
      if(inlineEditing.size){e.preventDefault();[...inlineEditing].forEach(id=>closeInlineEdit(id));return}
      if(editCard){e.preventDefault();closeEdit();return}
      if(viewCard||viewCard2){e.preventDefault();setViewCard(null);setViewCard2(null);clearHoverPreview();return}
      if(phase==="setup"&&(searchQ.trim()||showPanel!=="match"||deletedSearchQ.trim()||revFilter||hoverPreview)){
        e.preventDefault();
        setSearchQ("");
        setDeletedSearchQ("");
        setRevFilter(null);
        setShowPanel("match");
        clearHoverPreview();
      }
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[showTB,inlineEditing,editCard,viewCard,viewCard2,phase,searchQ,showPanel,deletedSearchQ,revFilter,hoverPreview]);
  useEffect(()=>()=>{if(hoverPreviewTimer.current)clearTimeout(hoverPreviewTimer.current)},[]);
  useEffect(()=>{
    if(!mathReady||!hoverPreview)return;
    renderMath();
    const t1=setTimeout(renderMath,120);
    return()=>clearTimeout(t1);
  },[mathReady,hoverPreview,renderMath]);
  useEffect(()=>{
    if(phase!=="setup"||mode==="graph"||(!viewCard&&!viewCard2))return;
    const onClick=e=>{
      if(Date.now()<setupPanelDismissSuppressUntil.current)return;
      const target=e.target;
      if(isInteractiveUiTarget(target))return;
      if(setupListRef.current?.contains(target))return;
      if(setupViewerRef.current?.contains(target))return;
      setViewCard(null);setViewCard2(null);clearHoverPreview();
    };
    document.addEventListener("click",onClick);
    return()=>document.removeEventListener("click",onClick);
  },[phase,mode,viewCard,viewCard2]);
  useEffect(()=>{
    if(mode!=="graph"||(!viewCard&&!viewCard2))return;
    const onClick=e=>{
      const target=e.target;
      if(graphListRef.current?.contains(target))return;
      if(graphViewerRef.current?.contains(target))return;
      setViewCard(null);setViewCard2(null);clearHoverPreview();
    };
    document.addEventListener("click",onClick);
    return()=>document.removeEventListener("click",onClick);
  },[mode,viewCard,viewCard2]);


  // ==== CONCEPT MAP (SVG React) ====
  function renderCardPanel(card, setter, opts={}) {
    if(!card) return null;
    const et = getEffType(card.id);
    const tc = typeColors[et]||"#e879f9";
    const sz=(min,off)=>Math.max(min,fs-off);
    const highlightQuery=mode!=="graph"?(searchQ.trim()||(setupActivePanel==="deleted"?deletedSearchQ.trim():"")):"";
    const bRef=opts.slot===2?panel2Ref:modalRef;
    const stopP=opts.isPanel?undefined:(e=>e.stopPropagation());
    const isInlineEditing=inlineEditing.has(card.id);
    const draft=inlineDrafts[card.id];
    const orig=inlineEditOrig[card.id];
    const vTags=getEffTags(card.id);
    const vSugg=viewTagInput.trim()?allTagKeys.filter(t=>!vTags.includes(t)&&allTagMeta(t).l.toLowerCase().includes(viewTagInput.toLowerCase())):[];
    const inlineTags=draft?.tagInput?.trim()?allTagKeys.filter(t=>!vTags.includes(t)&&allTagMeta(t).l.toLowerCase().includes(draft.tagInput.toLowerCase())):[];
    const answerHtml=highlightQuery?highlightHtmlMatches(fixMath(card.a),highlightQuery):fixMath(card.a);
    return (
      <div style={{flex:opts.isPanel?1:undefined,display:"flex",flexDirection:"column",minWidth:0,maxHeight:opts.isPanel?"100%":"85vh",width:opts.isPanel?undefined:"100%",overflow:"hidden",border:"1px solid #2a2e3f",borderRadius:opts.isPanel?10:14,background:"#141624"}} onClick={stopP}>
        {/* HEADER */}
        <div style={{padding:opts.isPanel?"10px 14px":"14px 18px",borderBottom:"1px solid #1e2235",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div style={{flex:1,marginRight:12}}>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:sz(8,8),fontWeight:700,textTransform:"uppercase",padding:"2px 7px",borderRadius:4,background:tc+"18",color:tc}}>{et}</span>
            </div>
            <div style={{fontSize:opts.isPanel?Math.max(14,fs-1):sz(14,1),fontWeight:600,color:"#e4e7ef",lineHeight:1.45}}>{highlightPlainText(card.q,highlightQuery)}</div>
            <div style={{fontSize:sz(9,7),color:"#3b3f58",marginTop:3,fontFamily:"monospace"}}>{card.id}</div>
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {opts.slot===1 && dualPaneEnabled && <button onClick={()=>setViewCard2(card)} title="Pin to slot 2" style={{background:"transparent",border:"1px solid #2a2e3f",color:"#facc15",fontSize:11,cursor:"pointer",padding:"2px 6px",borderRadius:4}}>📌</button>}
            <button onClick={()=>{renderMath();setTimeout(renderMath,150);setTimeout(renderMath,400)}} title="Re-render math" style={{background:"transparent",border:"1px solid #2a2e3f",color:"#6b7094",fontSize:12,cursor:"pointer",padding:"2px 7px",borderRadius:4,fontStyle:"italic",fontFamily:"serif",fontWeight:700}}>∑</button>
            {!isInlineEditing&&(
              deletedCards.has(card.id)
                ?<button onClick={async(e)=>{e.stopPropagation();const ns=new Set(deletedCards);ns.delete(card.id);await saveDeletedCards(ns)}} style={{background:"transparent",border:"1px solid #4ade8033",color:"#4ade80",fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:4,fontWeight:700}}>Restore</button>
                :<button onClick={async(e)=>{e.stopPropagation();const ns=new Set(deletedCards);ns.add(card.id);await saveDeletedCards(ns)}} style={{background:"transparent",border:"1px solid #f8717133",color:"#f87171",fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:4,fontWeight:700}}>Delete</button>
            )}
            {!isInlineEditing&&<button onClick={(e)=>{e.stopPropagation();startEdit(card)}} style={{background:"rgba(99,102,241,0.1)",border:"1px solid #6366f1",color:"#a5b4fc",fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:4,fontWeight:700}}>{"\u270E"} Edit</button>}
            {isInlineEditing&&<button onClick={()=>saveInlineEdit(card.id)} style={{background:"rgba(99,102,241,0.14)",border:"1px solid #6366f1",color:"#a5b4fc",fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:4,fontWeight:700}}>Save</button>}
            {isInlineEditing&&<button onClick={()=>closeInlineEdit(card.id)} style={{background:"transparent",border:"1px solid #2a2e3f",color:"#6b7094",fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:4}}>Cancel</button>}
            <button onClick={()=>setter(null)} style={{background:"transparent",border:"none",color:"#6b7094",fontSize:sz(16,2),cursor:"pointer",padding:"0 2px",flexShrink:0}}>{"\u2715"}</button>
          </div>
        </div>
        {/* BODY */}
        <div style={{padding:opts.isPanel?"10px 14px":"14px 18px",flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}} ref={bRef}>
          {isInlineEditing ? (
            <>
              <div>
                <div style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Question</div>
                <textarea value={draft?.q||""} onChange={e=>setInlineDraft(card.id,{q:e.target.value})} style={{width:"100%",minHeight:64,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:8,padding:"8px 10px",color:"#e4e7ef",fontSize:Math.max(14,fs-1),fontWeight:600,resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.4,boxSizing:"border-box"}}/>
              </div>
              <div style={{marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Answer</div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>{setInlineActiveTable(card.id);openEditTable()}} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #1e2235",background:showTB&&inlineActiveTable===card.id?"#6366f120":"transparent",color:showTB&&inlineActiveTable===card.id?"#a5b4fc":"#6b7094",fontSize:Math.max(9,fs-7),cursor:"pointer"}}>{"\u25A6"} Table</button>
                    <button onClick={()=>toggleInlineSource(card.id)} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #1e2235",background:draft?.source?"#6366f120":"transparent",color:draft?.source?"#a5b4fc":"#6b7094",fontSize:Math.max(9,fs-7),cursor:"pointer"}}>{draft?.source?"\u2190 Visual":"</> Source"}</button>
                  </div>
                </div>
                {draft?.source
                  ?<textarea value={draft.a} onChange={e=>setInlineDraft(card.id,{a:e.target.value})} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&["b","i","u"].includes(e.key.toLowerCase()))e.preventDefault()}} style={{width:"100%",minHeight:220,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:8,padding:"8px 10px",color:"#c4c8df",fontSize:Math.max(11,fs-4),resize:"vertical",outline:"none",fontFamily:"'Cascadia Code','Fira Code',monospace",lineHeight:1.5,boxSizing:"border-box"}}/>
                  :<div ref={el=>{if(el)inlineEditRefs.current[card.id]=el;else delete inlineEditRefs.current[card.id]}} contentEditable suppressContentEditableWarning onBlur={()=>syncInlineEditor(card.id)} onKeyDown={handleInlineEditorKeyDown} dangerouslySetInnerHTML={{__html:draft?.a||""}} style={{minHeight:220,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:8,padding:"8px 12px",color:"#a8acc4",fontSize:Math.max(12,fs-3),lineHeight:1.7,overflowY:"auto",outline:"none",cursor:"text",boxSizing:"border-box"}}/>
                }
                {showTB&&inlineActiveTable===card.id&&<div style={{background:"#111320",border:"1px solid #2a2e3f",borderRadius:10,padding:"12px",marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#a5b4fc"}}>Table Editor</span>
                      <span style={{fontSize:9,color:"#4b5072"}}>{tbData.length}x{tbData[0]?.length||0}</span>
                    </div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <label style={{fontSize:10,color:"#6b7094",display:"flex",alignItems:"center",gap:3,cursor:"pointer"}}>
                        <input type="checkbox" checked={tbHasHeader} onChange={e=>setTbHasHeader(e.target.checked)} style={{accentColor:"#6366f1",width:12,height:12}}/>Hdr
                      </label>
                      <button onClick={()=>tbToggleBold(tbActive[0],tbActive[1])} style={{padding:"1px 6px",borderRadius:3,border:`1px solid ${tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?"#a5b4fc":"#2a2e3f"}`,background:tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?"#6366f120":"transparent",color:tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?"#a5b4fc":"#6b7094",fontSize:11,fontWeight:700,cursor:"pointer"}}>B</button>
                      <span style={{color:"#1e2235",fontSize:10}}>|</span>
                      <button onClick={()=>tbAddRow(tbActive[0])} style={{padding:"1px 6px",borderRadius:3,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:9,cursor:"pointer"}}>+Row</button>
                      <button onClick={()=>tbAddCol(tbActive[1])} style={{padding:"1px 6px",borderRadius:3,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:9,cursor:"pointer"}}>+Col</button>
                      <button onClick={()=>tbDelRow(tbActive[0])} style={{padding:"1px 6px",borderRadius:3,border:"1px solid #f8717122",background:"transparent",color:"#f8717188",fontSize:9,cursor:"pointer"}}>{"\u2212"}Row</button>
                      <button onClick={()=>tbDelCol(tbActive[1])} style={{padding:"1px 6px",borderRadius:3,border:"1px solid #f8717122",background:"transparent",color:"#f8717188",fontSize:9,cursor:"pointer"}}>{"\u2212"}Col</button>
                      <button onClick={()=>{setShowTB(false);setInlineActiveTable(null)}} style={{background:"transparent",border:"none",color:"#6b7094",fontSize:13,cursor:"pointer",padding:"0 2px"}}>{"\u2715"}</button>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:"#3b3f58",marginBottom:6}}>Tab/Enter to navigate | Alt+Arrow Up/Down | Ctrl+B bold | Paste from Excel</div>
                  <div style={{overflowX:"auto",marginBottom:8,border:"1px solid #1e2235",borderRadius:6}}>
                    <table style={{borderCollapse:"collapse",width:"100%"}}><tbody>
                      {tbData.map((row,ri)=><tr key={ri}>
                        <td style={{padding:0,width:24,textAlign:"center",background:"#0d0f17",borderRight:"1px solid #1e2235",borderBottom:"1px solid #1e2235",color:"#3b3f58",fontSize:9,userSelect:"none"}}>{ri+1}</td>
                        {row.map((cell,ci)=>{const isActive=tbActive[0]===ri&&tbActive[1]===ci;const isHdr=ri===0&&tbHasHeader;const isBold=tbBold.has(`${ri}-${ci}`);return(
                          <td key={ci} style={{padding:0,borderBottom:"1px solid #1e2235",borderRight:"1px solid #1e2235",position:"relative"}}>
                            <textarea ref={el=>{tbRef.current[`${ri}-${ci}`]=el}} value={cell} onChange={e=>tbCell(ri,ci,e.target.value)} onFocus={()=>setTbActive([ri,ci])} onKeyDown={e=>tbKeyDown(e,ri,ci)} onPaste={e=>tbPaste(e,ri,ci)} rows={1} style={{width:"100%",minWidth:70,background:isActive?(isHdr?"#1a1e30":"#161828"):(isHdr?"#141824":"#0f1118"),border:"none",borderLeft:isActive?"2px solid #6366f1":"2px solid transparent",padding:"4px 6px",color:isHdr?"#a5b4fc":"#c4c8df",fontSize:11,fontWeight:isHdr||isBold?700:400,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none",overflow:"hidden",lineHeight:1.4,display:"block"}}/>
                          </td>)})}
                      </tr>)}
                      {tbData[0]&&<tr><td style={{padding:0,background:"#0d0f17",borderRight:"1px solid #1e2235"}}></td>{tbData[0].map((_,ci)=><td key={ci} style={{padding:0,textAlign:"center",background:"#0d0f17",borderRight:"1px solid #1e2235",color:"#3b3f58",fontSize:9,userSelect:"none"}}>{String.fromCharCode(65+ci)}</td>)}</tr>}
                    </tbody></table>
                  </div>
                  <div style={{display:"flex",gap:6,justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:9,color:"#3b3f58"}}>Cell [{tbActive[0]+1},{String.fromCharCode(65+tbActive[1])}]{tbBold.has(`${tbActive[0]}-${tbActive[1]}`)?" B":""}</span>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setShowTB(false);setInlineActiveTable(null)}} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:10,cursor:"pointer"}}>Cancel</button>
                      <button onClick={tbInsert} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:10,fontWeight:600,cursor:"pointer"}}>{(draft?.a||"").includes("<table")?"Update Table":"Insert Table"}</button>
                    </div>
                  </div>
                </div>}
              </div>
              <div style={{marginTop:12,borderTop:"1px solid #1e2235",paddingTop:10}}>{renderNotesBlock(card.id)}</div>
              <div style={{marginTop:10,borderTop:"1px solid #1e2235",paddingTop:8}}>
                <div style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Tags</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:5}}>
                  {vTags.map(t=>{const tm=allTagMeta(t);return(<span key={t} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:4,background:`${tm.c}12`,border:`1px solid ${tm.c}33`,color:tm.c,fontSize:sz(8,8)}}>
                    {tm.l}<button onClick={async(e)=>{e.stopPropagation();const next=vTags.filter(x=>x!==t);const d={...cardTagOverrides,[card.id]:next};await saveCardTagOverrides(d)}} style={{background:"transparent",border:"none",color:`${tm.c}66`,fontSize:9,cursor:"pointer",padding:"0 1px"}}>{"\u2715"}</button>
                  </span>)})}
                  {vTags.length===0&&<span style={{fontSize:sz(8,8),color:"#3b3f58",fontStyle:"italic"}}>No tags</span>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <input value={draft?.tagInput||""} onChange={e=>setInlineDraft(card.id,{tagInput:e.target.value})} placeholder="Search or create tag..." style={{flex:1,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:6,padding:"4px 8px",color:"#c4c8df",fontSize:sz(9,7),outline:"none",fontFamily:"inherit"}}/>
                  {draft?.tagInput?.trim()&&!allTagKeys.includes(draft.tagInput.trim())&&(
                    <button onClick={async()=>{const key=draft.tagInput.trim().replace(/\s+/g,"_");const newUT={...userTags,[key]:{l:draft.tagInput.trim(),c:TAG_COLOR}};await saveUserTags(newUT);const next=[...vTags,key];const d={...cardTagOverrides,[card.id]:next};await saveCardTagOverrides(d);setInlineDraft(card.id,{tagInput:""})}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #4ade8044",background:"transparent",color:"#4ade80",fontSize:sz(9,7),cursor:"pointer",whiteSpace:"nowrap"}}>+ Create</button>
                  )}
                </div>
                {draft?.tagInput?.trim()&&inlineTags.length>0&&<div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:3}}>
                  {inlineTags.slice(0,8).map(t=>{const tm=allTagMeta(t);return(<button key={t} onClick={async()=>{const next=[...vTags,t];const d={...cardTagOverrides,[card.id]:next};await saveCardTagOverrides(d);setInlineDraft(card.id,{tagInput:""})}} style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${tm.c}33`,background:"transparent",color:tm.c,fontSize:sz(8,8),cursor:"pointer"}}>{tm.l}</button>)})}
                </div>}
              </div>
            </>
          ) : (
            <>
              <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
                <div style={{marginBottom:12,paddingBottom:10,borderBottom:"1px solid #1e2235"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",flex:1,minWidth:220}}>
                      {(()=>{const curImp=getImp(card.id);const impDef=[{k:"high",c:"#f87171"},{k:"medium",c:"#facc15"},{k:"low",c:"#4ade80"}];return(<span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Imp</span>
                        {impDef.map(({k,c})=>(<button key={k} onClick={async(e)=>{e.stopPropagation();const d={...cardImportance};if(curImp===k)delete d[card.id];else d[card.id]=k;await saveCardImportance(d);setter({...card})}} style={{padding:"3px 8px",borderRadius:5,border:curImp===k?`2px solid ${c}`:"1px solid #2a2e3f",background:curImp===k?`${c}20`:"transparent",color:curImp===k?c:"#3b3f58",fontSize:sz(9,7),fontWeight:curImp===k?700:400,cursor:"pointer",textTransform:"capitalize"}}>{k}</button>))}
                      </span>)})()}
                      {(()=>{const curType=getEffType(card.id);const typeDef=[{k:"master",c:"#ffa94d"},{k:"formula",c:"#69db7c"},{k:"concept",c:"#e879f9"}];return(<span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Type</span>
                        {typeDef.map(({k,c})=>(<button key={k} onClick={async(e)=>{e.stopPropagation();const d={...cardTypeOverrides};if(k===card.t){delete d[card.id]}else{d[card.id]=k}await saveCardTypeOverrides(d);setter({...card})}} style={{padding:"3px 8px",borderRadius:5,border:curType===k?`2px solid ${c}`:"1px solid #2a2e3f",background:curType===k?`${c}20`:"transparent",color:curType===k?c:"#3b3f58",fontSize:sz(9,7),fontWeight:curType===k?700:400,cursor:"pointer",textTransform:"capitalize"}}>{k}</button>))}
                      </span>)})()}
                      {srs[card.id]&&<span style={{fontSize:sz(9,7),color:"#4b5072"}}>
                        Last: <span style={{color:srs[card.id].lastRating==="strong"?"#4ade80":srs[card.id].lastRating==="partial"?"#facc15":"#f87171"}}>{srs[card.id].lastRating}</span>
                        {" \u2022 "}{srs[card.id].reviews}r{" \u2022 "}{srs[card.id].interval}d{" \u2022 "}{(srs[card.id].ease||2.5).toFixed(1)}
                      </span>}
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                    </div>
                  </div>
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Tags</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:5}}>
                      {vTags.map(t=>{const tm=allTagMeta(t);return(<span key={t} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:4,background:`${tm.c}12`,border:`1px solid ${tm.c}33`,color:tm.c,fontSize:sz(8,8)}}>
                        {tm.l}<button onClick={async(e)=>{e.stopPropagation();const next=vTags.filter(x=>x!==t);const d={...cardTagOverrides,[card.id]:next};await saveCardTagOverrides(d);setter({...card})}} style={{background:"transparent",border:"none",color:`${tm.c}66`,fontSize:9,cursor:"pointer",padding:"0 1px"}}>{"\u2715"}</button>
                      </span>)})}
                      {vTags.length===0&&<span style={{fontSize:sz(8,8),color:"#3b3f58",fontStyle:"italic"}}>No tags</span>}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <input value={viewTagInput} onChange={e=>setViewTagInput(e.target.value)} placeholder="Search or create tag..." onClick={e=>e.stopPropagation()} style={{flex:1,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:6,padding:"4px 8px",color:"#c4c8df",fontSize:sz(9,7),outline:"none",fontFamily:"inherit"}}/>
                      {viewTagInput.trim()&&!allTagKeys.includes(viewTagInput.trim())&&(
                        <button onClick={async(e)=>{e.stopPropagation();const key=viewTagInput.trim().replace(/\s+/g,"_");const newUT={...userTags,[key]:{l:viewTagInput.trim(),c:TAG_COLOR}};await saveUserTags(newUT);const next=[...vTags,key];const d={...cardTagOverrides,[card.id]:next};await saveCardTagOverrides(d);setViewTagInput("");setter({...card})}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #4ade8044",background:"transparent",color:"#4ade80",fontSize:sz(9,7),cursor:"pointer",whiteSpace:"nowrap"}}>+ Create</button>
                      )}
                    </div>
                    {viewTagInput.trim()&&vSugg.length>0&&(
                      <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:3}}>
                        {vSugg.slice(0,8).map(t=>{const tm=allTagMeta(t);return(<button key={t} onClick={async(e)=>{e.stopPropagation();const next=[...vTags,t];const d={...cardTagOverrides,[card.id]:next};await saveCardTagOverrides(d);setViewTagInput("");setter({...card})}} style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${tm.c}33`,background:"transparent",color:tm.c,fontSize:sz(8,8),cursor:"pointer"}}>{tm.l}</button>)})}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{flex:1,minHeight:0,overflowY:"auto",overflowX:"auto",paddingRight:2}}>
                  <div style={{fontSize:sz(12,3),color:"#a8acc4",lineHeight:1.7,userSelect:"text"}} dangerouslySetInnerHTML={{__html:answerHtml}}/>
                </div>
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1e2235",flexShrink:0}}>{renderNotesBlock(card.id)}</div>
              </div>
            </>
          )}
        </div>
        {/* FOOTER */}
        {isInlineEditing&&<div style={{padding:opts.isPanel?"8px 14px":"10px 18px",borderTop:"1px solid #1e2235",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {(()=>{const curImp=getImp(card.id);const impDef=[{k:"high",c:"#f87171"},{k:"medium",c:"#facc15"},{k:"low",c:"#4ade80"}];return(<span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Imp</span>
                {impDef.map(({k,c})=>(<button key={k} onClick={async(e)=>{e.stopPropagation();const d={...cardImportance};if(curImp===k)delete d[card.id];else d[card.id]=k;await saveCardImportance(d);setter({...card})}} style={{padding:"3px 8px",borderRadius:5,border:curImp===k?`2px solid ${c}`:"1px solid #2a2e3f",background:curImp===k?`${c}20`:"transparent",color:curImp===k?c:"#3b3f58",fontSize:sz(9,7),fontWeight:curImp===k?700:400,cursor:"pointer",textTransform:"capitalize"}}>{k}</button>))}
              </span>)})()}
              {(()=>{const curType=getEffType(card.id);const typeDef=[{k:"master",c:"#ffa94d"},{k:"formula",c:"#69db7c"},{k:"concept",c:"#e879f9"}];return(<span style={{display:"inline-flex",alignItems:"center",gap:5,marginLeft:8}}>
                <span style={{fontSize:sz(9,7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Type</span>
                {typeDef.map(({k,c})=>(<button key={k} onClick={async(e)=>{e.stopPropagation();const d={...cardTypeOverrides};if(k===card.t){delete d[card.id]}else{d[card.id]=k}await saveCardTypeOverrides(d);setter({...card})}} style={{padding:"3px 8px",borderRadius:5,border:curType===k?`2px solid ${c}`:"1px solid #2a2e3f",background:curType===k?`${c}20`:"transparent",color:curType===k?c:"#3b3f58",fontSize:sz(9,7),fontWeight:curType===k?700:400,cursor:"pointer",textTransform:"capitalize"}}>{k}</button>))}
              </span>)})()}
              {srs[card.id]&&<span style={{fontSize:sz(9,7),color:"#4b5072",marginLeft:8}}>
                Last: <span style={{color:srs[card.id].lastRating==="strong"?"#4ade80":srs[card.id].lastRating==="partial"?"#facc15":"#f87171"}}>{srs[card.id].lastRating}</span>
                {" \u2022 "}{srs[card.id].reviews}r{" \u2022 "}{srs[card.id].interval}d{" \u2022 "}{(srs[card.id].ease||2.5).toFixed(1)}
              </span>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {deletedCards.has(card.id)
                ?<button onClick={async(e)=>{e.stopPropagation();const ns=new Set(deletedCards);ns.delete(card.id);await saveDeletedCards(ns)}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #4ade8033",background:"transparent",color:"#4ade80",fontSize:sz(10,5),cursor:"pointer",fontWeight:600}}>Restore</button>
                :<button onClick={async(e)=>{e.stopPropagation();const ns=new Set(deletedCards);ns.add(card.id);await saveDeletedCards(ns)}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #f8717133",background:"transparent",color:"#f87171",fontSize:sz(10,5),cursor:"pointer",fontWeight:600}}>Delete</button>
              }
              {!isInlineEditing&&<button onClick={(e)=>{e.stopPropagation();startEdit(card)}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #6366f1",background:"rgba(99,102,241,0.1)",color:"#a5b4fc",fontSize:sz(10,5),cursor:"pointer",fontWeight:600}}>{"\u270E"} Edit</button>}
              {isInlineEditing&&cardEdits[card.id]&&<button onClick={()=>{const ne={...cardEdits};delete ne[card.id];setCardEdits(ne);const origCard=CARDS.find(c=>c.id===card.id);if(origCard){setInlineDrafts(prev=>({...prev,[card.id]:{...prev[card.id],q:origCard.q,a:origCard.a,source:false}}));setInlineEditOrig(prev=>({...prev,[card.id]:{q:origCard.q,a:origCard.a}}));const el=inlineEditRefs.current[card.id];if(el)el.innerHTML=origCard.a}}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:sz(10,5),cursor:"pointer",fontWeight:600}}>Revert</button>}
            </div>
          </div>
        </div>}
      </div>
    );
  }

  function ConceptMap() {
    const nodes = gNodes, setNodes = setGNodes;
    const simDone = gSimDone, setSimDone = setGSimDone;
    const cam = gCam, setCam = setGCam;
    const hov = gHov, setHov = setGHov;
    const svgRef = useRef(null);
    const dragRef = gDragRef;
    const clickRef = gClickRef;
    const selectedGroup = gSel!==null ? graphGroups[gSel] : null;
    const compareGroup = gSel2!==null ? graphGroups[gSel2] : null;
    const sharedSet = compareGroup ? new Set(compareGroup.cards) : null;
    const secondaryOnlyCount = compareGroup ? compareGroup.cards.filter(id=>!selectedGroup?.cards.includes(id)).length : 0;
    const visibleNodeSet = useMemo(()=>new Set(graphGroups.filter(group=>activeGraphFilterSet.has(group.key)&&(graphVisibleCountByKey.get(group.key)||0)>0).map(group=>group.key)),[graphGroups,activeGraphFilterSet,graphVisibleCountByKey]);
    const visibleNodes = useMemo(()=>nodes.filter(node=>visibleNodeSet.has(node.key)),[nodes,visibleNodeSet]);
    const visibleEdges = useMemo(()=>graphEdges.filter(edge=>visibleNodeSet.has(graphGroups[edge.a]?.key)&&visibleNodeSet.has(graphGroups[edge.b]?.key)),[graphEdges,graphGroups,visibleNodeSet]);
    const selectedVisibleCount = selectedGroup ? (graphVisibleCountByKey.get(selectedGroup.key)||0) : 0;

    // Track whether bottom panel is open
    useEffect(()=>{setGPanelOpen(!!(viewCard||viewCard2))},[viewCard,viewCard2]);

    useEffect(()=>{
      if(simDone || !nodes.length) return;
      setNodes(prev=>{
        const ns=prev.map(n=>({...n}));
        for(let iter=0;iter<240;iter++){
          for(let i=0;i<ns.length;i++){
            for(let j=i+1;j<ns.length;j++){
              let dx=ns[j].x-ns[i].x,dy=ns[j].y-ns[i].y;
              let d=Math.sqrt(dx*dx+dy*dy)||1;
              let f=2600/(d*d);
              ns[i].x-=dx/d*f; ns[i].y-=dy/d*f;
              ns[j].x+=dx/d*f; ns[j].y+=dy/d*f;
            }
          }
          visibleEdges.forEach(e=>{
            let dx=ns[e.b].x-ns[e.a].x,dy=ns[e.b].y-ns[e.a].y;
            let d=Math.sqrt(dx*dx+dy*dy)||1;
            let f=(d-170-Math.min(60,e.w*5))*0.026;
            ns[e.a].x+=dx/d*f; ns[e.a].y+=dy/d*f;
            ns[e.b].x-=dx/d*f; ns[e.b].y-=dy/d*f;
          });
          ns.forEach(n=>{n.x+=(440-n.x)*0.006;n.y+=(300-n.y)*0.006});
        }
        setSimDone(true);
        return ns;
      });
    },[visibleEdges,nodes.length,simDone]);

    const s2w=(sx,sy)=>({x:(sx-cam.x)/cam.z,y:(sy-cam.y)/cam.z});

    const handleWheel = (e)=>{
      e.preventDefault();
      const rect=svgRef.current.getBoundingClientRect();
      const mx=e.clientX-rect.left, my=e.clientY-rect.top;
      const factor=e.deltaY<0?1.12:1/1.12;
      setCam(c=>{
        const bef={x:(mx-c.x)/c.z,y:(my-c.y)/c.z};
        const nz=Math.max(0.3,Math.min(4,c.z*factor));
      return{x:mx-bef.x*nz, y:my-bef.y*nz, z:nz};
      });
    };
    const findVisibleHit=(clientX,clientY)=>{
      const rect=svgRef.current.getBoundingClientRect();
      const w=s2w(clientX-rect.left,clientY-rect.top);
      const hitNode=visibleNodes.find(n=>Math.hypot(n.x-w.x,n.y-w.y)<n.r+6);
      return hitNode?nodes.findIndex(n=>n.key===hitNode.key):-1;
    };

    const handleNodeClick = (i)=>{
      if(!(graphGroups[i]?.cards.length))return;
      if(gSel===i && gSel2===null)return;
      if(gSel!==null && gSel!==i && gSel2===null){setGSel2(i);return}
      setGSel(i);
      setGSel2(null);
    };

    const graphViewer = useMemo(()=>{
      if(!(viewCard||viewCard2)||mode!=="graph")return null;
      return(
        <div ref={graphViewerRef} onClick={e=>e.stopPropagation()} style={{height:setupPanelH,flexShrink:0,background:"#0e1019",borderTop:"2px solid #6366f1",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div onMouseDown={startSetupPanelDrag} onTouchStart={startSetupPanelDrag} style={{height:12,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center",borderBottom:"1px solid #1e2235"}}>
            <div style={{width:36,height:3,borderRadius:2,background:"#2a2e3f"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",flexShrink:0,borderBottom:"1px solid #1e2235"}}>
            <div style={{fontSize:Math.max(10,fs-6),color:"#6b7094"}}>{viewCard2?"Arrow keys update panel 2":"Arrow keys update panel 1"}</div>
            <button onClick={()=>{setViewCard(null);setViewCard2(null)}} style={{background:"transparent",border:"1px solid #2a2e3f",color:"#f87171",fontSize:10,cursor:"pointer",padding:"3px 10px",borderRadius:4}}>Close All</button>
          </div>
          <div style={{display:"flex",gap:1,flex:1,overflow:"hidden"}}>
            {renderCardPanel(viewCard,setSetupPrimary,{isPanel:true,slot:0,allowPin:false})}
            {dualPaneEnabled&&viewCard2 && renderCardPanel(viewCard2,setSetupSecondary,{isPanel:true,slot:2,allowPin:false})}
          </div>
        </div>
      );
    },[mode,viewCard,viewCard2,setupPanelH,fs,cardEdits,cardNotes,noteInputs,expandedNotes,cardImportance,cardTagOverrides,cardTypeOverrides,deletedCards,srs,userTags,viewTagInput,dualPaneEnabled]);

    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0b0d14",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e4e7ef",overflow:"hidden"}}>
        {/* Top area: graph + sidebar */}
        <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
        {/* SVG graph */}
        <div style={{flex:1,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:10,left:12,zIndex:5,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",maxWidth:"calc(100% - 24px)"}}>
            <button onClick={()=>{setViewCard(null);setViewCard2(null);setMode("quiz")}} style={{background:"transparent",border:"1px solid #2a2e3f",color:"#a5b4fc",fontSize:13,cursor:"pointer",padding:"6px 12px",borderRadius:8}}>← Quiz</button>
            <span style={{fontSize:14,fontWeight:700,color:"#e4e7ef"}}>Concept Graph</span>
            <span style={{fontSize:10,color:"#4b5072"}}>{visibleNodes.length}/{graphGroups.length} tags · {visibleEdges.length}/{graphEdges.length} links · {graphData.totalCards} live cards</span>
            {selectedGroup&&<span style={{fontSize:10,padding:"4px 8px",borderRadius:999,border:`1px solid ${selectedGroup.c}55`,background:`${selectedGroup.c}12`,color:selectedGroup.c,fontWeight:700}}>{selectedGroup.n}</span>}
            {compareGroup&&<span style={{fontSize:10,padding:"4px 8px",borderRadius:999,border:`1px solid ${compareGroup.c}55`,background:`${compareGroup.c}12`,color:compareGroup.c,fontWeight:700}}>Compare {compareGroup.n}</span>}
          </div>
          <div style={{position:"absolute",top:46,left:12,right:12,zIndex:5,padding:"10px 12px",borderRadius:12,border:"1px solid #1e2235",background:"rgba(15,17,26,0.88)",backdropFilter:"blur(10px)",display:"flex",flexDirection:"column",gap:10,maxHeight:210,overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:"#6b7094",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Topics</span>
              {Object.entries(TOPIC_LABELS).map(([k,label])=>{
                const tn=parseInt(k,10);
                const active=gTopicFilter.has(tn);
                const cnt=graphSourceCards.filter(c=>c.tn===tn).length;
                return <button key={k} onClick={()=>toggleGraphTopicFilter(tn)} style={{padding:"3px 9px",borderRadius:7,border:active?"1px solid #6366f1":"1px solid #2a2e3f",background:active?"rgba(99,102,241,0.12)":"transparent",color:active?"#a5b4fc":"#6b7094",fontSize:10,cursor:"pointer",fontWeight:600}}>{label} ({cnt})</button>;
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,paddingTop:2,borderTop:"1px solid #1e2235"}}>
              <div>
                <div style={{fontSize:10,color:"#6b7094",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Card Types</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[["master","Master","#ffa94d"],["formula","Formula","#69db7c"],["concept","Concept","#e879f9"]].map(([key,label,color])=>{
                    const active=gTypeFilter.has(key);
                    const cnt=graphSourceCards.filter(c=>getEffType(c.id)===key).length;
                    return <button key={key} onClick={()=>toggleGraphTypeFilter(key)} style={{padding:"4px 12px",borderRadius:7,border:active?`1px solid ${color}44`:"1px solid #1e2235",background:active?`${color}12`:"#141624",color:active?color:"#4b5072",fontSize:10,cursor:"pointer",fontWeight:active?600:400}}>{label} ({cnt})</button>;
                  })}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:"#6b7094",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Importance</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[["high","High","#f87171"],["medium","Medium","#facc15"],["low","Low","#4ade80"],["unset","Unset","#94a3b8"]].map(([key,label,color])=>{
                    const active=gImpFilter.has(key);
                    const cnt=key==="unset"?graphSourceCards.filter(c=>!cardImportance[c.id]).length:graphSourceCards.filter(c=>cardImportance[c.id]===key).length;
                    return <button key={key} onClick={()=>toggleGraphImpFilter(key)} style={{padding:"4px 10px",borderRadius:7,border:active?`1px solid ${color}66`:"1px solid #1e2235",background:active?`${color}12`:"#141624",color:active?color:"#3b3f58",fontSize:10,cursor:"pointer",fontWeight:active?600:400}}>{label} <span style={{opacity:0.5}}>({cnt})</span></button>;
                  })}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",paddingTop:2,borderTop:"1px solid #1e2235"}}>
              <span style={{fontSize:10,color:"#6b7094",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Tags</span>
              <button onClick={selectAllGraphTags} style={{padding:"2px 8px",borderRadius:999,border:"1px solid #2a2e3f",background:gTagFilter===null?"rgba(99,102,241,0.14)":"transparent",color:gTagFilter===null?"#a5b4fc":"#6b7094",fontSize:10,cursor:"pointer",fontWeight:600}}>All</button>
              <button onClick={clearGraphTagFilter} style={{padding:"2px 8px",borderRadius:999,border:"1px solid #2a2e3f",background:gTagFilter!==null&&gTagFilter.size===0?"rgba(248,113,113,0.12)":"transparent",color:gTagFilter!==null&&gTagFilter.size===0?"#f87171":"#6b7094",fontSize:10,cursor:"pointer",fontWeight:600}}>None</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {graphVisibleTagKeys.sort((a,b)=>allTagMeta(a).l.localeCompare(allTagMeta(b).l)).map(tag=>{
                const active=activeGraphFilterSet.has(tag);
                const m=allTagMeta(tag);
                const n=graphTagCounts[tag]||0;
                return <button key={tag} onClick={()=>toggleGraphTagFilter(tag)} style={{padding:"3px 9px",borderRadius:6,border:active?`1px solid ${m.c}44`:"1px solid #1e2235",background:active?`${m.c}12`:"#0f111a",color:active?m.c:"#3b3f58",fontSize:10,cursor:"pointer",fontWeight:active?600:400}}>{m.l} <span style={{opacity:0.6}}>({n})</span></button>;
              })}
              {graphVisibleTagKeys.length===0&&<span style={{fontSize:10,color:"#4b5072",fontStyle:"italic"}}>No tags match the current topic/type/importance filters.</span>}
            </div>
          </div>
          <div style={{position:"absolute",bottom:8,right:8,zIndex:5,display:"flex",flexDirection:"column",gap:3}}>
            <button onClick={()=>setCam(c=>({...c,z:Math.min(4,c.z*1.3)}))} style={{width:28,height:28,borderRadius:6,border:"1px solid #2a2e3f",background:"#141624",color:"#e4e7ef",fontSize:14,cursor:"pointer"}}>+</button>
            <button onClick={()=>setCam(c=>({...c,z:Math.max(0.3,c.z/1.3)}))} style={{width:28,height:28,borderRadius:6,border:"1px solid #2a2e3f",background:"#141624",color:"#e4e7ef",fontSize:14,cursor:"pointer"}}>−</button>
            <button onClick={()=>setCam({x:0,y:0,z:1})} style={{width:28,height:28,borderRadius:6,border:"1px solid #2a2e3f",background:"#141624",color:"#e4e7ef",fontSize:10,cursor:"pointer"}}>⟲</button>
            <button onClick={()=>{
              setSimDone(false);
              const N=Math.max(1,visibleNodes.length);
              setNodes(nodes.map((node,i)=>{
                const visibleIdx=visibleNodes.findIndex(v=>v.key===node.key);
                if(visibleIdx<0)return node;
                const group=graphGroups.find(g=>g.key===node.key)||node;
                const angle=(i/N)*Math.PI*2-Math.PI/2;
                const ring=Math.min(360,220+visibleNodes.length*7);
                return{...node,...group,idx:group.idx,r:Math.max(24,Math.min(54,18+Math.sqrt(group.cards.length)*5.5)),x:440+Math.cos((visibleIdx/N)*Math.PI*2-Math.PI/2)*ring,y:320+Math.sin((visibleIdx/N)*Math.PI*2-Math.PI/2)*ring};
              }));
            }} title="Repack nodes" style={{width:28,height:28,borderRadius:6,border:"1px solid #2a2e3f",background:"#141624",color:"#f87171",fontSize:9,cursor:"pointer"}}>↻</button>
          </div>
          {selectedGroup&&(
            <div style={{position:"absolute",top:228,left:12,zIndex:5,maxWidth:360,padding:"10px 12px",borderRadius:12,border:"1px solid #1e2235",background:"rgba(15,17,26,0.92)",backdropFilter:"blur(10px)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:10,height:10,borderRadius:999,background:selectedGroup.c,boxShadow:`0 0 16px ${selectedGroup.c}55`}}/>
                <div style={{fontSize:13,fontWeight:700}}>{selectedGroup.n}</div>
                <div style={{fontSize:10,color:"#6b7094"}}>{selectedVisibleCount}/{selectedGroup.count} cards in view</div>
              </div>
              <div style={{fontSize:11,color:"#9aa3c7",lineHeight:1.45}}>
                {selectedGroup.d}. {selectedGroup.type} cards lead this tag.
                {compareGroup?` ${graphPanelCards.filter(row=>row.isShared).length} shared card${graphPanelCards.filter(row=>row.isShared).length===1?"":"s"} with ${compareGroup.n}; ${secondaryOnlyCount} card${secondaryOnlyCount===1?"":"s"} remain unique to the compare tag.`:" Click another node to compare overlap."}
              </div>
            </div>
          )}
          <svg ref={svgRef} style={{width:"100%",height:"100%",background:"transparent",userSelect:"none",WebkitUserSelect:"none"}}
            onWheel={handleWheel}
            onMouseDown={e=>{
              e.preventDefault();
              clickRef.current={t:Date.now(),x:e.clientX,y:e.clientY};
              const hit=findVisibleHit(e.clientX,e.clientY);
              if(hit>=0){gDragN.current=hit;dragRef.current={nx:nodes[hit].x,ny:nodes[hit].y,mx:e.clientX,my:e.clientY}}
              else{gPanStart.current={cx:cam.x,cy:cam.y,mx:e.clientX,my:e.clientY}}
            }}
            onMouseMove={e=>{
              if(gDragN.current!==null){
                const dx=(e.clientX-dragRef.current.mx)/cam.z, dy=(e.clientY-dragRef.current.my)/cam.z;
                setNodes(prev=>prev.map((n,i)=>i===gDragN.current?{...n,x:dragRef.current.nx+dx,y:dragRef.current.ny+dy}:n));
              } else if(gPanStart.current){
                const ps=gPanStart.current;
                setCam(c=>({...c,x:ps.cx+e.clientX-ps.mx,y:ps.cy+e.clientY-ps.my}));
              } else {
                const hit=findVisibleHit(e.clientX,e.clientY);
                setHov(prev=>prev===(hit>=0?hit:null)?prev:(hit>=0?hit:null));
              }
            }}
            onMouseUp={e=>{
              const dt=Date.now()-clickRef.current.t;
              const dist=Math.hypot(e.clientX-clickRef.current.x,e.clientY-clickRef.current.y);
              if(dt<300 && dist<8){
                const hit=findVisibleHit(e.clientX,e.clientY);
                if(hit>=0)handleNodeClick(hit);
                else{setGSel(null);setGSel2(null)}
              }
              gDragN.current=null;gPanStart.current=null;
            }}
            onMouseLeave={()=>{gDragN.current=null;gPanStart.current=null;setHov(null)}}
          >
            <g transform={`translate(${cam.x},${cam.y}) scale(${cam.z})`}>
              {/* edges */}
              {visibleEdges.map((e,i)=>{
                const a=nodes[e.a],b=nodes[e.b];
                if(!a||!b)return null;
                const isBridge=gSel!==null&&gSel2!==null&&((e.a===gSel&&e.b===gSel2)||(e.a===gSel2&&e.b===gSel));
                if(gSel!==null&&gSel2!==null&&!isBridge)return null;
                const touches=gSel!==null&&(e.a===gSel||e.b===gSel);
                const dim=gSel!==null&&!touches&&!isBridge;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isBridge?"rgba(250,204,21,0.8)":touches?"rgba(120,130,255,0.6)":dim?"rgba(80,85,120,0.06)":"rgba(100,110,160,0.25)"}
                  strokeWidth={isBridge?2.8+e.w*0.9:touches?1.8+e.w*0.7:dim?0.5:0.9+e.w*0.35}/>;
              })}
              {/* nodes */}
              {nodes.map((n,i)=>{
                if(!visibleNodeSet.has(n.key))return null;
                const isSel=gSel===i||gSel2===i;
                const liveCount=graphGroups[i]?.cards.length||0;
                const conn=gSel!==null&&!gSel2&&visibleEdges.some(e=>(e.a===gSel&&e.b===i)||(e.b===gSel&&e.a===i));
                const dim=liveCount===0||(gSel!==null&&!isSel&&(gSel2!==null||!conn));
                const isHov=hov===i;
                return <g key={i} style={{cursor:liveCount===0?"default":"pointer",opacity:dim?0.15:1,transition:"opacity 0.2s"}}>
                  {(isHov||isSel)&&<circle cx={n.x} cy={n.y} r={n.r*2.2} fill={n.c+"15"}/>}
                  <circle cx={n.x} cy={n.y} r={n.r} fill={n.c+"18"} stroke={n.c+(isSel?"cc":"66")} strokeWidth={isSel?2.5:1.2}/>
                  <text x={n.x} y={n.y-n.r-7} textAnchor="middle" fill={n.c} fontSize={11} fontWeight={isSel||isHov?700:500} fontFamily="'Segoe UI',sans-serif" style={{pointerEvents:"none"}}>{n.n}</text>
                  <text x={n.x} y={n.y+4} textAnchor="middle" fill="#ffffffaa" fontSize={Math.max(10,n.r*0.5)} fontWeight={700} fontFamily="monospace" style={{pointerEvents:"none"}}>{liveCount}</text>
                </g>;
              })}
            </g>
          </svg>
        </div>

        {/* Sidebar — card list when cluster selected */}
        {selectedGroup && (
          <div ref={graphListRef} onClick={e=>e.stopPropagation()} style={{width:340,borderLeft:"1px solid #1e2235",background:"#10121c",display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #1e2235",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontWeight:700,color:selectedGroup.c}}>{selectedGroup.n}</span>
                  {compareGroup && <span style={{color:"#4b5072"}}> + <span style={{color:compareGroup.c,fontWeight:600}}>{compareGroup.n}</span></span>}
                </div>
                <button onClick={()=>{setGSel(null);setGSel2(null)}} style={{background:"transparent",border:"none",color:"#6b7094",fontSize:14,cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:10,color:"#4b5072",marginTop:2}}>{selectedGroup.d}</div>
              {sharedSet && <div style={{fontSize:9,color:"#facc15",marginTop:4,fontWeight:600}}>{graphPanelCards.filter(x=>x.isShared).length} shared cards</div>}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"4px 8px"}}>
              {graphPanelCards.map(({id,c,isShared})=>{
                const isPrimary=viewCard?.id===c.id;
                const isSecondary=viewCard2?.id===c.id;
                const isCurrent=activeGraphCursorId===c.id;
                const rowTags=getEffTags(c.id);
                const rowBg=isCurrent?"linear-gradient(90deg,rgba(99,102,241,0.18),rgba(99,102,241,0.04))":isSecondary?"linear-gradient(90deg,rgba(250,204,21,0.12),rgba(250,204,21,0.03))":isPrimary?"linear-gradient(90deg,rgba(96,165,250,0.12),rgba(96,165,250,0.03))":isShared?"#facc1508":"transparent";
                const rowBorder=isCurrent?"1px solid rgba(165,180,252,0.45)":isSecondary?"1px solid rgba(250,204,21,0.3)":isPrimary?"1px solid rgba(96,165,250,0.28)":"1px solid transparent";
                return(
                <div key={id} ref={el=>{if(el)graphRowRefs.current[id]=el;else delete graphRowRefs.current[id];}} onClick={e=>{e.stopPropagation();selectSetupCard(c)}} style={{padding:"6px 8px",borderBottom:"1px solid #0f111a",cursor:"pointer",opacity:sharedSet&&!isShared?0.35:1,background:rowBg,borderRadius:8,marginBottom:2,border:rowBorder,boxShadow:isCurrent?"0 0 0 1px rgba(99,102,241,0.18), inset 0 0 24px rgba(99,102,241,0.08)":"none",transition:"background 0.15s,border-color 0.15s,box-shadow 0.15s"}}
                  onMouseEnter={e=>{if(!isPrimary&&!isSecondary&&!isCurrent)e.currentTarget.style.background=isShared?"#facc1512":"#1a1e30";queueHoverPreview(c,e)}}
                  onMouseLeave={e=>{if(!isPrimary&&!isSecondary&&!isCurrent)e.currentTarget.style.background=isShared?"#facc1508":"transparent";clearHoverPreview()}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:isShared?600:400,color:sharedSet&&!isShared?"#4b5072":"#c4c8df",lineHeight:1.3}}>
                        {c.q}
                        {isShared&&<span style={{fontSize:8,fontWeight:700,marginLeft:4,padding:"1px 4px",borderRadius:3,background:"#facc1520",color:"#facc15"}}>shared</span>}
                      </div>
                      <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                        {(()=>{const et=getEffType(c.id);return <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:(et==="master"?"#ffa94d":et==="formula"?"#69db7c":"#e879f9")+"18",color:et==="master"?"#ffa94d":et==="formula"?"#69db7c":"#e879f9"}}>{et}</span>})()}
                        {rowTags.length===0
                          ?<span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:"#94a3b818",color:"#94a3b8"}}>untagged</span>
                          :rowTags.slice(0,4).map(tag=>{
                            const tm=allTagMeta(tag);
                            return <span key={tag} style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:`${tm.c}12`,border:`1px solid ${tm.c}26`,color:tm.c}}>{tm.l}</span>;
                          })
                        }
                        {rowTags.length>4&&<span style={{fontSize:8,color:"#6b7094"}}>+{rowTags.length-4}</span>}
                      </div>
                    </div>
                    {(isPrimary||isSecondary)&&<span style={{fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:999,background:isSecondary?"rgba(250,204,21,0.18)":"rgba(96,165,250,0.16)",color:isSecondary?"#facc15":"#93c5fd",flexShrink:0,marginTop:1}}>{isSecondary?"2":"1"}</span>}
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
        </div>{/* end top flex-row */}

        {/* Dual card viewer — bottom panel (flex member, pushes graph up) */}
        {graphViewer}
        {renderEditModal()}
      </div>
    );
  }
  if(mode==="graph")return <ConceptMap/>;

  if(phase==="setup"){
    const reviewed=Object.keys(srs).length;
    const setupBottomOpen=!!(viewCard||viewCard2);
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0b0d14",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e4e7ef",overflow:"hidden"}}>
        <div style={{maxHeight:setupBottomOpen?0:140,opacity:setupBottomOpen?0:1,overflow:"hidden",transition:"max-height 0.28s ease, opacity 0.22s ease",flexShrink:0}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #1e2235",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,transform:setupBottomOpen?"translateY(-100%)":"translateY(0)",transition:"transform 0.28s ease",pointerEvents:setupBottomOpen?"none":"auto"}}>
          <div style={{minWidth:0}} data-ui-safe="true">
            <div style={{fontSize:fs+2,fontWeight:700}}>GH301 Quiz Bot</div>
            <div style={{fontSize:Math.max(11,fs-4),color:"#6b7094",marginTop:2}}>{CARDS.filter(c=>!deletedCards.has(c.id)).length} cards - {reviewed} reviewed{Object.keys(cardEdits).length>0&&<span> - <span style={{color:"#a5b4fc"}}>{Object.keys(cardEdits).length} edited</span></span>} {" - "} <span style={{color:"#4b5072",fontFamily:"monospace"}}>v{VERSION}</span></div>
          </div>
          <div style={{display:"flex",gap:8,rowGap:6,alignItems:"center",alignContent:"center",justifyContent:"center",flex:1,minWidth:0,flexWrap:"wrap"}} data-ui-safe="true">
            {reviewed>0?<div onClick={()=>{if(confirm(`Reset SRS progress for all ${reviewed} reviewed cards?\n\nThis clears all review history, intervals, and ease factors. Card edits, notes, tags, and importance are kept.`))handleResetSrs()}} style={{display:"flex",alignItems:"center",gap:6,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"7px 11px",cursor:"pointer",marginLeft:"auto",flexShrink:0}}>
              <div style={{fontSize:fs-1,fontWeight:700,color:"#f8717188",lineHeight:1}}>{"\u21BA"}</div>
              <div style={{fontSize:Math.max(10,fs-6),color:"#7a80a6",fontWeight:600,lineHeight:1}}>Reset SRS</div>
            </div>:<div style={{display:"flex",alignItems:"center",gap:6,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"7px 11px",opacity:0.3,marginLeft:"auto",flexShrink:0}}>
              <div style={{fontSize:fs-1,fontWeight:700,color:"#3b3f58",lineHeight:1}}>{"\u21BA"}</div>
              <div style={{fontSize:Math.max(10,fs-6),color:"#3b3f58",fontWeight:600,lineHeight:1}}>Reset SRS</div>
            </div>}
            <div onClick={handleExportState} style={{display:"flex",alignItems:"center",gap:6,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"7px 11px",cursor:"pointer",flexShrink:0}}>
              <div style={{fontSize:fs-1,fontWeight:700,color:"#6b709488",lineHeight:1}}>{"\u2B06"}</div>
              <div style={{fontSize:Math.max(10,fs-6),color:"#7a80a6",fontWeight:600,lineHeight:1}}>Export State</div>
            </div>
            <div onClick={()=>document.getElementById("srs-import-input").click()} style={{display:"flex",alignItems:"center",gap:6,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"7px 11px",cursor:"pointer",flexShrink:0}}>
              <div style={{fontSize:fs-1,fontWeight:700,color:"#6b709488",lineHeight:1}}>{"\u2B07"}</div>
              <div style={{fontSize:Math.max(10,fs-6),color:"#7a80a6",fontWeight:600,lineHeight:1}}>Import State</div>
            </div>
            <div onClick={()=>{setViewCard(null);setViewCard2(null);setMode("graph")}} style={{display:"flex",alignItems:"center",gap:6,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"7px 11px",cursor:"pointer",flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{display:"block",flexShrink:0}}>
                <line x1="3" y1="4" x2="8" y2="8" stroke="#a5b4fc" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="8" y1="8" x2="13" y2="4" stroke="#a5b4fc" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="8" y1="8" x2="12" y2="12.5" stroke="#a5b4fc" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="3" cy="4" r="1.9" fill="#0b0d14" stroke="#a5b4fc" strokeWidth="1.4"/>
                <circle cx="8" cy="8" r="1.9" fill="#0b0d14" stroke="#a5b4fc" strokeWidth="1.4"/>
                <circle cx="13" cy="4" r="1.9" fill="#0b0d14" stroke="#a5b4fc" strokeWidth="1.4"/>
                <circle cx="12" cy="12.5" r="1.9" fill="#0b0d14" stroke="#a5b4fc" strokeWidth="1.4"/>
              </svg>
              <div style={{fontSize:Math.max(10,fs-6),color:"#a5b4fc",fontWeight:600,lineHeight:1}}>Graph</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}} data-ui-safe="true">
            <div style={{display:"flex",alignItems:"center",gap:6,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"4px 5px 4px 9px"}}>
              <span style={{fontSize:10,color:"#6b7094"}}>Font</span>
              <button onClick={()=>setFs(f=>Math.max(12,f-2))} style={{width:24,height:24,borderRadius:999,border:"1px solid #242941",background:"transparent",color:"#6b7094",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2212"}</button>
              <span style={{fontSize:11,color:"#a7adcc",minWidth:18,textAlign:"center",fontWeight:700}}>{fs}</span>
              <button onClick={()=>setFs(f=>Math.min(24,f+2))} style={{width:24,height:24,borderRadius:999,border:"1px solid #242941",background:"transparent",color:"#6b7094",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>
        </div>
        </div>
        <div style={{padding:"16px 20px",flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div ref={setupControlsRef} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,flexShrink:0}} data-ui-safe="true">
            <div style={{display:"flex",gap:8,rowGap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0,minWidth:0}}>
              {[{n:setupFiltered.length,l:"Match",c:"#a5b4fc",k:"match"},{n:getDue(),l:"Due",c:"#f87171",k:"due"},{n:getNew(),l:"New",c:"#c084fc",k:"new"},{n:setupReviewedCards.length,l:"Reviewed",c:"#4ade80",k:"reviewed"},{n:deletedCards.size,l:"Deleted",c:"#6b7094",k:"deleted"}].map((s,i)=>(
                <div key={i} onClick={()=>{setSearchQ("");setDeletedSearchQ("");setShowPanel(showPanel===s.k?"match":s.k);setRevFilter(null)}} style={{display:"flex",alignItems:"baseline",gap:6,background:setupActivePanel===s.k?`${s.c}12`:"#141624",border:setupActivePanel===s.k?`1px solid ${s.c}44`:"1px solid #1e2235",borderRadius:999,padding:"7px 11px",cursor:"pointer",transition:"all 0.15s",flexShrink:0,boxShadow:setupActivePanel===s.k?`inset 0 0 18px ${s.c}14`:"none"}}>
                  <div style={{fontSize:fs,fontWeight:800,color:s.c,lineHeight:1}}>{s.n}</div>
                  <div style={{fontSize:Math.max(10,fs-6),color:setupActivePanel===s.k?s.c:"#7a80a6",fontWeight:600,lineHeight:1}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{flex:1,minWidth:260,display:"flex",alignItems:"stretch",background:"#141624",border:"1px solid #1e2235",borderRadius:10,overflow:"hidden"}}>
              <button
                onClick={handleToggleDualPane}
                title={dualPaneEnabled?"Turn dual pane off":"Turn dual pane on"}
                style={{
                  flexShrink:0,
                  border:"none",
                  borderRight:"1px solid #1e2235",
                  background:dualPaneEnabled?"rgba(99,102,241,0.12)":"transparent",
                  color:dualPaneEnabled?"#a5b4fc":"#6b7094",
                  padding:"0 11px",
                  cursor:"pointer",
                  minWidth:44,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center"
                }}
              >
                <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" style={{display:"block"}}>
                  <rect x="1.25" y="1.25" width="13.5" height="11.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.1"/>
                  <line x1="7.9" y1="1.8" x2="7.9" y2="12.2" stroke="currentColor" strokeWidth="1.1"/>
                </svg>
              </button>
              <input value={searchQ} onChange={e=>{const next=e.target.value;setSearchQ(next);setShowPanel(next.trim()?null:"match")}} placeholder="Search cards by name, content, or ID..." style={{width:"100%",background:"transparent",border:"none",padding:"8px 12px",color:"#e4e7ef",fontSize:Math.max(12,fs-3),outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          </div>
          <input id="srs-import-input" type="file" accept=".json" onChange={handleImportState} style={{display:"none"}}/>
          {setupActivePanel&&(<div style={{flex:1,minHeight:180,marginBottom:(viewCard||viewCard2)?0:16,display:"flex"}}>
          <div ref={setupListRef} onClick={e=>e.stopPropagation()} onMouseLeave={clearHoverPreview} style={{background:"#111320",border:"1px solid #1e2235",borderRadius:10,flex:1,minHeight:0,overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",position:"sticky",top:0,background:"#111320",zIndex:2,borderBottom:"1px solid #1e2235"}}>
              <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>{setupActivePanel==="search"?`Search: "${searchQ.trim()}"`:setupActivePanel} ({setupPanelCards.length})</div>
              {setupActivePanel==="reviewed"&&<div style={{display:"flex",gap:4}}>
                {[{k:null,l:"All",c:"#6b7094"},{k:"strong",l:"Strong",c:"#4ade80"},{k:"partial",l:"Partial",c:"#facc15"},{k:"needs_review",l:"Review",c:"#f87171"}].map(r=>(
                  <button key={r.l} onClick={(e)=>{e.stopPropagation();setRevFilter(revFilter===r.k?null:r.k)}} style={{padding:"2px 7px",borderRadius:5,border:revFilter===r.k?`1px solid ${r.c}66`:"1px solid #1e2235",background:revFilter===r.k?`${r.c}18`:"transparent",color:revFilter===r.k?r.c:"#4b5072",fontSize:Math.max(9,fs-7),cursor:"pointer",fontWeight:revFilter===r.k?600:400}}>
                    {r.l}{r.k!==null?` ${setupRevCounts[r.k]||0}`:""}
                  </button>
                ))}
              </div>}
              <button onClick={()=>{setShowPanel("match");setSearchQ("");setDeletedSearchQ("");setRevFilter(null)}} style={{background:"transparent",border:"none",color:"#6b7094",fontSize:14,cursor:"pointer",padding:"0 4px"}}>{"\u2715"}</button>
            </div>
            {setupActivePanel==="deleted"&&<div style={{padding:"6px 14px 4px",position:"sticky",top:40,background:"#111320",zIndex:2}}>
              <input value={deletedSearchQ} onChange={e=>setDeletedSearchQ(e.target.value)} placeholder="Search deleted cards..." style={{width:"100%",background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:6,padding:"5px 10px",color:"#c4c8df",fontSize:Math.max(11,fs-4),outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>}
            <div style={{padding:"6px 14px 10px"}}>
            {setupPanelCards.length===0?<div style={{fontSize:Math.max(11,fs-4),color:"#4b5072",fontStyle:"italic"}}>No cards</div>:
              setupPanelCards.map((c,ci)=>{
                const s=srs[c.id];
                const ratingColor=s?.lastRating==="strong"?"#4ade80":s?.lastRating==="partial"?"#facc15":s?.lastRating==="needs_review"?"#f87171":"#4b5072";
                const interval=s?.interval?`${s.interval}d`:"";
                const ac=(()=>{const et=getEffType(c.id);return et==="master"?"#ffa94d":et==="formula"?"#69db7c":"#e879f9"})();
                const effT=getEffType(c.id);
                const isDeleted=setupActivePanel==="deleted";
                const isPrimary=viewCard?.id===c.id;
                const isSecondary=viewCard2?.id===c.id;
                const isCurrent=activeSetupCursorId===c.id;
                const rowBg=isCurrent?"linear-gradient(90deg,rgba(99,102,241,0.18),rgba(99,102,241,0.04))":isSecondary?"linear-gradient(90deg,rgba(250,204,21,0.12),rgba(250,204,21,0.03))":isPrimary?"linear-gradient(90deg,rgba(96,165,250,0.12),rgba(96,165,250,0.03))":"transparent";
                const rowBorder=isCurrent?"1px solid rgba(165,180,252,0.45)":isSecondary?"1px solid rgba(250,204,21,0.3)":isPrimary?"1px solid rgba(96,165,250,0.28)":"1px solid transparent";
                return(<div key={c.id} ref={el=>{if(el)setupRowRefs.current[c.id]=el;else delete setupRowRefs.current[c.id];}} style={{padding:"7px 8px",borderBottom:ci<setupPanelCards.length-1?"1px solid #1a1e30":"none",display:"flex",gap:6,alignItems:"flex-start",borderRadius:8,background:rowBg,border:rowBorder,boxShadow:isCurrent?"0 0 0 1px rgba(99,102,241,0.18), inset 0 0 24px rgba(99,102,241,0.08)":"none",transition:"background 0.15s,border-color 0.15s,box-shadow 0.15s"}} onMouseEnter={e=>{if(!isPrimary&&!isSecondary&&!isCurrent)e.currentTarget.style.background="#1a1e30";queueHoverPreview(c,e)}} onMouseLeave={e=>{if(!isPrimary&&!isSecondary&&!isCurrent)e.currentTarget.style.background="transparent";clearHoverPreview()}}>
                  <div onClick={()=>selectSetupCard(c)} style={{display:"flex",gap:8,alignItems:"flex-start",flex:1,cursor:"pointer",minWidth:0}}>
                    <span style={{fontSize:Math.max(8,fs-8),fontWeight:700,textTransform:"uppercase",padding:"2px 6px",borderRadius:3,background:`${ac}15`,color:`${ac}aa`,flexShrink:0,marginTop:2}}>{effT.slice(0,3)}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:Math.max(11,fs-4),color:"#c4c8df",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{c.q}{cardEdits[c.id]&&<span style={{fontSize:8,color:"#a5b4fc",marginLeft:4}}>{" [edit]"}</span>}</div>
                      <div style={{fontSize:Math.max(8,fs-8),color:"#3b3f58",marginTop:1,fontFamily:"monospace"}}>{c.id}</div>
                      {s&&<div style={{fontSize:Math.max(9,fs-7),color:"#4b5072",marginTop:2}}>
                        <span style={{color:ratingColor}}>{s.lastRating||"-"}</span>
                        {interval&&<span> {" - "} next: {interval}</span>}
                        <span> {" - "} {s.reviews||0} reviews</span>
                      </div>}
                    </div>
                    {(isPrimary||isSecondary)&&<span style={{fontSize:Math.max(8,fs-8),fontWeight:800,padding:"1px 5px",borderRadius:999,background:isSecondary?"rgba(250,204,21,0.18)":"rgba(96,165,250,0.16)",color:isSecondary?"#facc15":"#93c5fd",flexShrink:0,alignSelf:"flex-start",marginTop:1}}>{isSecondary?"2":"1"}</span>}
                  </div>
                  {isDeleted
                    ?<button onClick={async(e)=>{e.stopPropagation();const ns=new Set(deletedCards);ns.delete(c.id);await saveDeletedCards(ns);}} style={{flexShrink:0,background:"transparent",border:"1px solid #4ade8033",color:"#4ade80",borderRadius:5,padding:"2px 8px",fontSize:Math.max(9,fs-7),cursor:"pointer",alignSelf:"center"}}>Restore</button>
                    :<button onClick={async(e)=>{e.stopPropagation();const ns=new Set(deletedCards);ns.add(c.id);await saveDeletedCards(ns);}} style={{flexShrink:0,background:"transparent",border:"none",color:"transparent",borderRadius:5,padding:"2px 7px",fontSize:Math.max(11,fs-5),cursor:"pointer",alignSelf:"center",lineHeight:1}} onMouseEnter={e=>{e.currentTarget.style.color="#f87171"}} onMouseLeave={e=>{e.currentTarget.style.color="transparent"}}>&#x2715;</button>
                  }
                </div>);
              })
            }
            </div>
          </div>
          </div>)}
          {hoverPreview&&(<div ref={hoverPreviewRef} style={{position:"fixed",top:hoverPreview.top,left:hoverPreview.left,width:340,maxWidth:"calc(100vw - 32px)",maxHeight:260,overflow:"hidden",background:"#10131f",border:"1px solid #2a2e3f",borderRadius:12,boxShadow:"0 18px 45px rgba(0,0,0,0.45)",padding:"12px 14px",zIndex:40,pointerEvents:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",padding:"2px 7px",borderRadius:999,background:`${typeColors[getEffType(hoverPreview.card.id)]||"#e879f9"}18`,color:typeColors[getEffType(hoverPreview.card.id)]||"#e879f9"}}>{getEffType(hoverPreview.card.id)}</span>
              <span style={{fontSize:10,color:"#3b3f58",fontFamily:"monospace"}}>{hoverPreview.card.id}</span>
            </div>
            <div style={{fontSize:Math.max(11,fs-4),fontWeight:600,color:"#e4e7ef",lineHeight:1.4,marginBottom:8}}>{hoverPreview.card.q}</div>
            <div style={{fontSize:Math.max(10,fs-6),color:"#a8acc4",lineHeight:1.55,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:7,WebkitBoxOrient:"vertical"}} dangerouslySetInnerHTML={{__html:fixMath(hoverPreview.card.a)}}/>
          </div>)}
          {!(viewCard||viewCard2)&&<div style={{marginTop:setupActivePanel?0:"auto",paddingTop:setupActivePanel?0:4,overflowY:"auto",minHeight:0}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Topics</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {Object.entries(TOPIC_LABELS).map(([k,v])=>{const tn=parseInt(k),sel=selTopics.has(tn),cnt=CARDS.filter(c=>c.tn===tn).length;
                return(<button key={k} onClick={()=>{const s=new Set(selTopics);sel?s.delete(tn):s.add(tn);setSelTopics(s)}} style={{padding:"4px 10px",borderRadius:7,border:sel?"1px solid #6366f1":"1px solid #1e2235",background:sel?"rgba(99,102,241,0.12)":"#141624",color:sel?"#a5b4fc":"#4b5072",fontSize:Math.max(10,fs-5),cursor:"pointer",fontWeight:sel?600:400}}>{v} ({cnt})</button>)
              })}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Tags</div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={selectAllTags} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #1e2235",background:"transparent",color:"#6b7094",fontSize:Math.max(9,fs-6),cursor:"pointer"}}>All</button>
                <button onClick={clearAllTags} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #1e2235",background:"transparent",color:"#6b7094",fontSize:Math.max(9,fs-6),cursor:"pointer"}}>None</button>
              </div>
            </div>
            {(()=>{
              const baseCards=cards.filter(c=>{if(deletedCards.has(c.id))return false;if(!selTopics.has(c.tn))return false;if(!selTypes.has(getEffType(c.id)))return false;const imp=cardImportance[c.id]||"unset";return selImp.has(imp)});
              const tagCounts={};baseCards.forEach(c=>{getEffTags(c.id).forEach(t=>{tagCounts[t]=(tagCounts[t]||0)+1})});
              const allKeys=[...new Set([...ALL_TAGS,...Object.keys(userTags)])]
                .filter(tag=>(tagCounts[tag]||0)>0)
                .sort((a,b)=>allTagMeta(a).l.localeCompare(allTagMeta(b).l));
              return(<div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {allKeys.map(tag=>{const m=allTagMeta(tag);const sel=selTags.has(tag);const n=tagCounts[tag]||0;
                  return(<button key={tag} onClick={()=>toggleTag(tag)} style={{padding:"3px 9px",borderRadius:6,border:sel?`1px solid ${m.c}44`:"1px solid #1e2235",background:sel?`${m.c}12`:"#0f111a",color:sel?m.c:"#3b3f58",fontSize:Math.max(9,fs-6),cursor:"pointer",fontWeight:sel?600:400}}>
                    {m.l} <span style={{opacity:0.6}}>({n})</span>
                  </button>)
                })}
                {allKeys.length===0&&<span style={{fontSize:Math.max(10,fs-5),color:"#4b5072",fontStyle:"italic"}}>No tags match the current filters.</span>}
              </div>)
            })()}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Card Types</div>
            <div style={{display:"flex",gap:5}}>
              {[["master","Master"],["formula","Formula"],["concept","Concept"]].map(([k,v])=>{const sel=selTypes.has(k);const n=cards.filter(c=>!deletedCards.has(c.id)&&getEffType(c.id)===k).length;
                return(<button key={k} onClick={()=>{const s=new Set(selTypes);sel?s.delete(k):s.add(k);setSelTypes(s)}} style={{padding:"4px 12px",borderRadius:7,border:sel?`1px solid ${typeColors[k]}44`:"1px solid #1e2235",background:sel?`${typeColors[k]}12`:"#141624",color:sel?typeColors[k]:"#4b5072",fontSize:Math.max(10,fs-5),cursor:"pointer",fontWeight:sel?600:400}}>
                  {v} ({n})
                </button>)
              })}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Importance</div>
            <div style={{display:"flex",gap:5,marginBottom:10}}>
              {[{k:"high",l:"High",c:"#f87171"},{k:"medium",l:"Medium",c:"#facc15"},{k:"low",l:"Low",c:"#4ade80"},{k:"unset",l:"Unset",c:"#6b7094"}].map(({k,l,c})=>{
                const sel=selImp.has(k);const cnt=k==="unset"?cards.filter(x=>!deletedCards.has(x.id)&&!cardImportance[x.id]).length:cards.filter(x=>!deletedCards.has(x.id)&&cardImportance[x.id]===k).length;
                return(<button key={k} onClick={()=>{const s=new Set(selImp);sel?s.delete(k):s.add(k);setSelImp(s)}} style={{padding:"4px 10px",borderRadius:7,border:sel?`1px solid ${c}66`:"1px solid #1e2235",background:sel?`${c}12`:"#141624",color:sel?c:"#3b3f58",fontSize:Math.max(10,fs-5),cursor:"pointer",fontWeight:sel?600:400}}>
                  {l} <span style={{opacity:0.5}}>({cnt})</span>
                </button>)
              })}
            </div>
            <div style={{display:"flex",gap:16,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Cards</div>
                <div style={{display:"flex",gap:4}}>
                  {[5,10,15,25,50].map(n=>(<button key={n} onClick={()=>setCardCount(n)} style={{padding:"4px 10px",borderRadius:7,border:cardCount===n?"1px solid #6366f1":"1px solid #1e2235",background:cardCount===n?"rgba(99,102,241,0.12)":"#141624",color:cardCount===n?"#a5b4fc":"#4b5072",fontSize:Math.max(10,fs-5),fontWeight:cardCount===n?700:400,cursor:"pointer"}}>{n}</button>))}
                </div>
              </div>
              <div>
                <div style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Priority</div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setPriMode("random")} style={{padding:"4px 10px",borderRadius:7,border:priMode==="random"?"1px solid #6366f1":"1px solid #1e2235",background:priMode==="random"?"rgba(99,102,241,0.10)":"#141624",color:priMode==="random"?"#a5b4fc":"#4b5072",fontSize:Math.max(10,fs-5),fontWeight:priMode==="random"?700:400,cursor:"pointer"}}>{"\u2736"} Random</button>
                  <button onClick={()=>setPriMode("dueFirst")} style={{padding:"4px 10px",borderRadius:7,border:priMode==="dueFirst"?"1px solid #f87171":"1px solid #1e2235",background:priMode==="dueFirst"?"rgba(248,113,113,0.08)":"#141624",color:priMode==="dueFirst"?"#f87171":"#4b5072",fontSize:Math.max(10,fs-5),fontWeight:priMode==="dueFirst"?700:400,cursor:"pointer"}}>{"\u2713"} Due first</button>
                  <button onClick={()=>setPriMode("newOnly")} style={{padding:"4px 10px",borderRadius:7,border:priMode==="newOnly"?"1px solid #34d399":"1px solid #1e2235",background:priMode==="newOnly"?"rgba(52,211,153,0.08)":"#141624",color:priMode==="newOnly"?"#34d399":"#4b5072",fontSize:Math.max(10,fs-5),fontWeight:priMode==="newOnly"?700:400,cursor:"pointer"}}>{"\u2729"} New only</button>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {hasInProgressQuiz&&<button onClick={resumeQuiz} style={{padding:"13px 16px",borderRadius:11,border:"1px solid #4c6ef533",background:"rgba(76,110,245,0.08)",color:"#a5b4fc",fontSize:Math.max(13,fs-2),fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Resume Quiz</button>}
            <button onClick={startQuiz} disabled={setupFiltered.length===0} style={{flex:1,padding:"13px",borderRadius:11,border:"none",background:setupFiltered.length>0?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#2a2e3f",color:setupFiltered.length>0?"#fff":"#6b7094",fontSize:Math.max(13,fs-2),fontWeight:700,cursor:setupFiltered.length>0?"pointer":"default"}}>
              Start Quiz ({Math.min(cardCount,setupFiltered.length)} cards)
            </button>
          </div>
          </div>}
        </div>
        {(viewCard||viewCard2)&&(<div ref={setupViewerRef} onClick={e=>e.stopPropagation()} style={{height:setupPanelH,flexShrink:0,background:"#0e1019",borderTop:"2px solid #6366f1",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div onMouseDown={startSetupPanelDrag} onTouchStart={startSetupPanelDrag} style={{height:12,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center",borderBottom:"1px solid #1e2235"}}>
            <div style={{width:36,height:3,borderRadius:2,background:"#2a2e3f"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",flexShrink:0,borderBottom:"1px solid #1e2235"}}>
            <div style={{fontSize:Math.max(10,fs-6),color:"#6b7094"}}>{viewCard2?"Arrow keys update panel 2":"Arrow keys update panel 1"}</div>
            <button onClick={()=>{setViewCard(null);setViewCard2(null)}} style={{background:"transparent",border:"1px solid #2a2e3f",color:"#f87171",fontSize:10,cursor:"pointer",padding:"3px 10px",borderRadius:4}}>Close All</button>
          </div>
          <div style={{display:"flex",gap:1,flex:1,overflow:"hidden"}}>
            {renderCardPanel(viewCard,setSetupPrimary,{isPanel:true,slot:0,allowPin:false})}
            {dualPaneEnabled&&viewCard2 && renderCardPanel(viewCard2,setSetupSecondary,{isPanel:true,slot:2,allowPin:false})}
          </div>
        </div>)}
        {renderEditModal()}
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0b0d14",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>
      <div style={{padding:"8px 14px",borderBottom:"1px solid #1e2235",background:"#10121c",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><button onClick={()=>setPhase("setup")} style={{background:"transparent",border:"1px solid #2a2e3f",color:"#a5b4fc",fontSize:fs+4,cursor:"pointer",padding:"6px 14px",borderRadius:8,display:"flex",alignItems:"center"}}>{"\u2190"}</button><div><div style={{fontSize:fs,fontWeight:700,color:"#e4e7ef"}}>GH301 Quiz</div><div style={{fontSize:Math.max(10,fs-5),color:"#6b7094"}}>{qCards.length} cards</div></div></div>
        <div style={{display:"flex",gap:12,fontSize:Math.max(11,fs-4),alignItems:"center"}}>
          <span style={{color:"#4ade80"}}>{strong}{"\u2713"}</span><span style={{color:"#facc15"}}>{partial_}~</span><span style={{color:"#f87171"}}>{needs}{"\u2717"}</span>
          <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:4,background:"#141624",border:"1px solid #1e2235",borderRadius:999,padding:"4px 5px 4px 9px"}}>
            <span style={{fontSize:Math.max(9,fs-8),color:"#6b7094",lineHeight:1}}>Font</span>
            <button onClick={()=>setFs(f=>Math.max(12,f-2))} style={{width:24,height:24,borderRadius:"50%",border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{"\u2212"}</button>
            <span style={{minWidth:18,textAlign:"center",fontSize:Math.max(10,fs-7),fontWeight:700,color:"#a5b4fc",lineHeight:1}}>{fs}</span>
            <button onClick={()=>setFs(f=>Math.min(24,f+2))} style={{width:24,height:24,borderRadius:"50%",border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
          </div>
        </div>
      </div>
      <div style={{height:3,background:"#1e2235",flexShrink:0}}><div style={{height:"100%",width:`${(scores.length/qCards.length)*100}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",transition:"width 0.5s ease"}}/></div>
      <div ref={chatRef} style={{flex:1,minHeight:0,overflowY:"auto",padding:"10px 12px 6px",display:"flex",flexDirection:"column",gap:7}}>
        {msgs.map((m,i)=>{
          if(m.role==="user")return(<div key={i} style={{alignSelf:"flex-end",maxWidth:"80%",background:"#2a2d6b",borderRadius:"14px 14px 4px 14px",padding:"9px 13px",color:"#d4d7f0",fontSize:fs,lineHeight:1.5}} dangerouslySetInnerHTML={{__html:fmtText(m.content)}}/>);
          if(m.type==="intro")return(<div key={i} style={{alignSelf:"flex-start",maxWidth:"85%",background:"#141624",border:"1px solid #1e2235",borderRadius:"14px 14px 14px 4px",padding:"10px 14px",color:"#9ba0be",fontSize:fs-2,lineHeight:1.5}}>{m.content}</div>);
          if(m.type==="question"){
            const ac=typeColors[m.cardType]||"#e879f9";
            const stl=m.status==="new"?"NEW":m.status==="due"?`DUE ${m.interval}d`:`${m.interval}d`;
            const stc=m.status==="new"?"#c084fc":m.status==="due"?"#f87171":"#4ade80";
            const liveQ=m.cardId?cards.find(c=>c.id===m.cardId)?.q||m.content:m.content;
            return(<div key={i} style={{alignSelf:"flex-start",maxWidth:"85%",background:"#141624",border:`1px solid ${ac}33`,borderRadius:"14px 14px 14px 4px",padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:Math.max(9,fs-7),fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",padding:"2px 7px",borderRadius:4,background:`${ac}18`,color:ac}}>{m.cardType}</span>
                <span style={{fontSize:Math.max(9,fs-7),fontWeight:600,color:stc}}>{stl}</span>
                <span style={{fontSize:Math.max(8,fs-8),color:"#3b3f58",fontFamily:"monospace"}}>{m.cardId}</span>
                <span style={{fontSize:Math.max(10,fs-5),color:"#6b7094",marginLeft:"auto"}}>{m.cardNum}/{m.total}</span>
              </div>
              <div style={{fontSize:fs,fontWeight:600,color:"#e4e7ef",lineHeight:1.4}}>{liveQ}</div>
            </div>);
          }
          if(m.type==="eval"){
            const curRating=m.scoreIdx!=null&&scores[m.scoreIdx]?scores[m.scoreIdx]:m.rating;
            const r=rc[curRating]||rc.error;
            const rl=m.content.split("\n").filter(Boolean);let fb=[],mi=[],inM=false;
            for(let li=1;li<rl.length;li++){const l=rl[li].trim();if(l.toUpperCase().startsWith("MISSED:")){inM=true;continue}if(inM){if(l.startsWith("- ")||l.startsWith("\u2022 "))mi.push(l.replace(/^[-\u2022]\s*/,""));else if(l.length>0)mi.push(l)}else fb.push(l)}
            return(<div key={i} style={{alignSelf:"flex-start",maxWidth:"85%",display:"flex",flexDirection:"column",gap:5}}>
              <div style={{background:r.bg,border:`1px solid ${r.border}44`,borderRadius:"14px 14px 14px 4px",padding:"10px 14px",transition:"background 0.3s,border-color 0.3s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
                  <span style={{fontSize:Math.max(10,fs-5),fontWeight:700,letterSpacing:"1px",color:r.text,textTransform:"uppercase"}}>{r.label}</span>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {curRating!==m.rating&&m.rating!=="error"&&<span style={{fontSize:Math.max(8,fs-8),color:"#6b7094",marginRight:2}}>was {rc[m.rating]?.label.split(" ")[0]}</span>}
                    {["strong","partial","needs_review"].map(x=>{const active=curRating===x;return(<button key={x} onClick={()=>{if(m.scoreIdx!=null){const ns=[...scores];ns[m.scoreIdx]=x;setScores(ns)}if(m.cardId){const nd={...srs};nd[m.cardId]=updSrs(srs[m.cardId]||defSrs(),x);saveSrs(nd)}}} style={{padding:"2px 8px",borderRadius:4,border:active?`2px solid ${rc[x].border}`:`1px solid ${rc[x].border}33`,background:active?rc[x].bg:"transparent",color:active?rc[x].text:`${rc[x].text}66`,fontSize:Math.max(9,fs-7),fontWeight:active?700:400,cursor:"pointer"}}>{rc[x].label.split(" ")[0]}</button>)})}
                  </div>
                </div>
                <div style={{marginTop:5,fontSize:fs-1,color:"#c4c8df",lineHeight:1.55}}>{fb.join(" ")||rl[0]}</div>
              </div>
              {mi.length>0&&(<div style={{background:"rgba(248,113,113,0.05)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:"12px 12px 12px 4px",padding:"8px 12px"}}>
                <div style={{fontSize:Math.max(9,fs-7),fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"#f87171",marginBottom:3}}>{"\u25B3"} Missed</div>
                <ul style={{margin:0,paddingLeft:12,listStyle:"none"}}>{mi.map((item,j)=><li key={j} style={{fontSize:fs-2,color:"#d4a0a0",lineHeight:1.5,marginBottom:1,paddingLeft:4,position:"relative"}}><span style={{position:"absolute",left:-8,color:"#f8717188"}}>{"\u2022"}</span>{item}</li>)}</ul>
              </div>)}
            </div>);
          }
          if(m.type==="answer_key"){
            const ac=typeColors[m.cardType]||"#e879f9";
            const liveCard=m.cardId?cards.find(c=>c.id===m.cardId):null;
            const answerHtml=liveCard?liveCard.a:m.content;
            const promptText=liveCard?.q || m.prompt || "";
            const qTags=m.cardId?getEffTags(m.cardId):[];
            const qTInp=quizTagInput[m.cardId]||"";
            const qSugg=qTInp.trim()?allTagKeys.filter(t=>!qTags.includes(t)&&allTagMeta(t).l.toLowerCase().includes(qTInp.toLowerCase())):[];
            const curImp=m.cardId?getImp(m.cardId):null;
            const impDef=[{k:"high",c:"#f87171"},{k:"medium",c:"#facc15"},{k:"low",c:"#4ade80"}];
            return(<div key={i} style={{alignSelf:"flex-start",maxWidth:"88%",background:"#111320",border:"1px solid #1e2235",borderRadius:"14px 14px 14px 4px",padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:Math.max(10,fs-5),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>
                    <span style={{display:"inline-block",width:5,height:5,borderRadius:"50%",background:ac,marginRight:5}}></span>Answer Key
                  </span>
                  <span style={{fontSize:Math.max(8,fs-8),color:"#3b3f58",fontFamily:"monospace"}}>{m.cardId}</span>
                </div>
                {liveCard&&<div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                  <button onClick={()=>startEdit(liveCard)} style={{padding:"2px 8px",borderRadius:5,border:"1px solid #6366f144",background:"transparent",color:"#6b7094",fontSize:Math.max(9,fs-7),cursor:"pointer"}}>{"\u270E"} Edit</button>
                  <button onClick={()=>{renderMath();setTimeout(renderMath,150);setTimeout(renderMath,400)}} title="Re-render math" style={{padding:"2px 8px",borderRadius:5,border:"1px solid #6366f144",background:"transparent",color:"#6b7094",fontSize:Math.max(9,fs-7),cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontStyle:"italic",fontFamily:"serif",fontWeight:700}}>∑</button>
                </div>}
              </div>
              <div style={{height:1,background:"#1e2235",marginBottom:12}}/>
              {promptText&&<div style={{marginBottom:12,paddingBottom:10,borderBottom:"1px solid #1e2235"}}>
                <div style={{fontSize:Math.max(14,fs-1),fontWeight:700,color:"#e4e7ef",lineHeight:1.45}}>{promptText}</div>
              </div>}
              <div style={{fontSize:fs-2,color:"#a8acc4",lineHeight:1.6}} dangerouslySetInnerHTML={{__html:fixMath(answerHtml)}}/>
              {m.cardId&&<div style={{marginTop:10,borderTop:"1px solid #1e2235",paddingTop:8}}>
                {renderNotesBlock(m.cardId)}
              </div>}
              {m.cardId&&<div style={{marginTop:8,borderTop:"1px solid #1e2235",paddingTop:8}}>
                <div style={{fontSize:Math.max(9,fs-7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Tags</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:5}}>
                  {qTags.map(t=>{const tm=allTagMeta(t);return(<span key={t} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:4,background:`${tm.c}12`,border:`1px solid ${tm.c}33`,color:tm.c,fontSize:Math.max(8,fs-8)}}>
                    {tm.l}<button onClick={async()=>{const next=qTags.filter(x=>x!==t);const d={...cardTagOverrides,[m.cardId]:next};await saveCardTagOverrides(d)}} style={{background:"transparent",border:"none",color:`${tm.c}66`,fontSize:9,cursor:"pointer",padding:"0 1px"}}>{"\u2715"}</button>
                  </span>)})}
                  {qTags.length===0&&<span style={{fontSize:Math.max(8,fs-8),color:"#3b3f58",fontStyle:"italic"}}>No tags</span>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <input value={qTInp} onChange={e=>setQuizTagInput(p=>({...p,[m.cardId]:e.target.value}))} placeholder="Search or create tag..." style={{flex:1,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:6,padding:"4px 8px",color:"#c4c8df",fontSize:Math.max(9,fs-7),outline:"none",fontFamily:"inherit"}}/>
                  {qTInp.trim()&&!allTagKeys.includes(qTInp.trim())&&(
                    <button onClick={async()=>{const key=qTInp.trim().replace(/\s+/g,"_");const newUT={...userTags,[key]:{l:qTInp.trim(),c:TAG_COLOR}};await saveUserTags(newUT);const next=[...qTags,key];const d={...cardTagOverrides,[m.cardId]:next};await saveCardTagOverrides(d);setQuizTagInput(p=>({...p,[m.cardId]:""}))}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #4ade8044",background:"transparent",color:"#4ade80",fontSize:Math.max(9,fs-7),cursor:"pointer",whiteSpace:"nowrap"}}>+ Create</button>
                  )}
                </div>
                {qTInp.trim()&&qSugg.length>0&&(
                  <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:3}}>
                    {qSugg.slice(0,8).map(t=>{const tm=allTagMeta(t);return(<button key={t} onClick={async()=>{const next=[...qTags,t];const d={...cardTagOverrides,[m.cardId]:next};await saveCardTagOverrides(d);setQuizTagInput(p=>({...p,[m.cardId]:""}))}} style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${tm.c}33`,background:"transparent",color:tm.c,fontSize:Math.max(8,fs-8),cursor:"pointer"}}>{tm.l}</button>)})}
                  </div>
                )}
              </div>}
              {m.cardId&&<div style={{marginTop:8,borderTop:"1px solid #1e2235",paddingTop:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:Math.max(9,fs-7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Importance</span>
                {impDef.map(({k,c})=>(<button key={k} onClick={async()=>{const d={...cardImportance};if(curImp===k)delete d[m.cardId];else d[m.cardId]=k;await saveCardImportance(d)}} style={{padding:"3px 10px",borderRadius:5,border:curImp===k?`2px solid ${c}`:"1px solid #2a2e3f",background:curImp===k?`${c}20`:"transparent",color:curImp===k?c:"#3b3f58",fontSize:Math.max(9,fs-7),fontWeight:curImp===k?700:400,cursor:"pointer",textTransform:"capitalize"}}>{k}</button>))}
                {!curImp&&<span style={{fontSize:Math.max(8,fs-8),color:"#2a2e3f"}}>unset</span>}
                <span style={{marginLeft:12,display:"inline-flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:Math.max(9,fs-7),fontWeight:700,color:"#6b7094",textTransform:"uppercase",letterSpacing:"1px"}}>Type</span>
                  {[{k:"master",c:"#ffa94d"},{k:"formula",c:"#69db7c"},{k:"concept",c:"#e879f9"}].map(({k:tk,c:tc})=>{const curType=getEffType(m.cardId);const origCard=cards.find(x=>x.id===m.cardId);return(<button key={tk} onClick={async()=>{const d={...cardTypeOverrides};if(origCard&&tk===origCard.t){delete d[m.cardId]}else{d[m.cardId]=tk}await saveCardTypeOverrides(d)}} style={{padding:"3px 10px",borderRadius:5,border:curType===tk?`2px solid ${tc}`:"1px solid #2a2e3f",background:curType===tk?`${tc}20`:"transparent",color:curType===tk?tc:"#3b3f58",fontSize:Math.max(9,fs-7),fontWeight:curType===tk?700:400,cursor:"pointer",textTransform:"capitalize"}}>{tk}</button>)})}
                </span>
              </div>}
            </div>);
          }
          return null;
        })}
        {loading&&(<div style={{alignSelf:"flex-start",background:"#141624",border:"1px solid #1e2235",borderRadius:"14px 14px 14px 4px",padding:"10px 14px"}}>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>{[0,0.2,0.4].map((d,ii)=><div key={ii} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`pulse 1s infinite ${d}s`}}/>)}<span style={{fontSize:Math.max(11,fs-4),color:"#6b7094",marginLeft:5}}>Evaluating...</span></div>
          <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        </div>)}
        {qp==="done"&&(<div style={{alignSelf:"center",maxWidth:"90%",background:"#141624",border:"1px solid #2a2e6b",borderRadius:14,padding:"16px 20px",textAlign:"center",marginTop:6}}>
          <div style={{fontSize:fs+6,marginBottom:2}}>{strong>=qCards.length*0.8?"\uD83C\uDFAF":strong>=qCards.length*0.5?"\uD83D\uDCAA":"\uD83D\uDCDA"}</div>
          <div style={{fontSize:fs,fontWeight:700,color:"#e4e7ef",marginBottom:12}}>Quiz Complete</div>
          <div style={{display:"flex",justifyContent:"center",gap:18,marginBottom:12}}>
            {[{n:strong,c:"#4ade80",l:"Strong"},{n:partial_,c:"#facc15",l:"Partial"},{n:needs,c:"#f87171",l:"Review"}].map((s,ii)=>(<div key={ii}><div style={{fontSize:fs+4,fontWeight:700,color:s.c}}>{s.n}</div><div style={{fontSize:Math.max(10,fs-6),color:"#6b7094"}}>{s.l}</div></div>))}
          </div>
          <button onClick={()=>setPhase("setup")} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"9px 22px",fontSize:Math.max(13,fs-2),fontWeight:600,cursor:"pointer"}}>New Quiz</button>
        </div>)}
        <div ref={chatEnd}/>
      </div>
      <div style={{flexShrink:0,background:"#10121c"}}>
        {(qp==="asking"||qp==="evaluating")&&(<div>
          <div onMouseDown={startDrag} onTouchStart={startDrag} style={{height:12,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center",borderTop:"1px solid #1e2235"}}>
            <div style={{width:36,height:3,borderRadius:2,background:"#2a2e3f"}}/>
          </div>
          <div style={{padding:"0 12px",display:"flex",gap:4,marginBottom:4}}>
            {[{t:'bold',l:'B',s:{fontWeight:700}},{t:'bullet',l:'\u2022',s:{}},{t:'number',l:'1.',s:{}}].map(b=>(
              <button key={b.t} onClick={()=>insertFmt(b.t)} disabled={qp==="evaluating"} style={{width:28,height:24,borderRadius:5,border:"1px solid #2a2e3f",background:"transparent",color:qp==="evaluating"?"#2a2e3f":"#6b7094",fontSize:Math.max(12,fs-3),cursor:qp==="evaluating"?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",...b.s}}>{b.l}</button>
            ))}
            <span style={{fontSize:Math.max(9,fs-7),color:"#3b3f58",marginLeft:"auto",alignSelf:"center"}}>**bold** {"\u2022"} - bullets {"\u2022"} 1. numbers</span>
            <button onClick={()=>{renderMath();setTimeout(renderMath,150)}} title="Re-render math" style={{width:28,height:24,borderRadius:5,border:"1px solid #2a2e3f",background:"transparent",color:"#6b7094",fontSize:Math.max(11,fs-4),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>∑</button>
          </div>
          <div style={{padding:"0 12px 10px",display:"flex",gap:7,alignItems:"flex-end"}}>
            <textarea ref={inputRef} value={inp} onChange={e=>setInp(e.target.value)}
              onKeyDown={e=>{
                if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();handleSubmit(e)}
                else if(e.key==="Enter"&&!e.shiftKey){
                  const ta=e.target,pos=ta.selectionStart,val=inp;
                  const lineStart=val.lastIndexOf('\n',pos-1)+1;
                  const line=val.slice(lineStart,pos);
                  const bulletMatch=line.match(/^(\s*[-\u2022]\s)/);
                  const numMatch=line.match(/^(\s*)(\d+)\.\s/);
                  if(bulletMatch&&line.trim()!=='-'&&line.trim()!=='\u2022'){
                    e.preventDefault();const prefix=bulletMatch[1];
                    const next=val.slice(0,pos)+'\n'+prefix+val.slice(pos);
                    setInp(next);setTimeout(()=>{ta.selectionStart=ta.selectionEnd=pos+1+prefix.length},0);
                  }else if(numMatch&&line.trim()!==numMatch[2]+'.'){
                    e.preventDefault();const indent=numMatch[1],num=parseInt(numMatch[2])+1;
                    const prefix=indent+num+'. ';
                    const next=val.slice(0,pos)+'\n'+prefix+val.slice(pos);
                    setInp(next);setTimeout(()=>{ta.selectionStart=ta.selectionEnd=pos+1+prefix.length},0);
                  }
                }
              }}
              disabled={qp==="evaluating"} placeholder="Type your answer... (Ctrl+Enter to submit)"
              style={{flex:1,height:taH,background:"#1a1d2e",border:"1px solid #2a2e3f",borderRadius:10,padding:"9px 12px",color:qp==="evaluating"?"#6b7094":"#e4e7ef",fontSize:fs,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,opacity:qp==="evaluating"?0.6:1}}/>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <button onClick={handleSubmit} disabled={!inp.trim()||qp==="evaluating"} style={{background:inp.trim()&&qp==="asking"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#2a2e3f",color:inp.trim()&&qp==="asking"?"#fff":"#6b7094",border:"none",borderRadius:9,padding:"9px 14px",fontSize:Math.max(12,fs-3),fontWeight:600,cursor:inp.trim()&&qp==="asking"?"pointer":"default"}}>Submit</button>
              <button onClick={handleSkip} disabled={qp==="evaluating"} style={{background:"transparent",color:"#6b7094",border:"1px solid #1e2235",borderRadius:7,padding:"4px 8px",fontSize:Math.max(10,fs-5),cursor:qp==="evaluating"?"default":"pointer",opacity:qp==="evaluating"?0.5:1}}>Skip</button>
            </div>
          </div>
        </div>)}
        {qp==="between"&&(<div style={{padding:"8px 12px 12px",borderTop:"1px solid #1e2235"}}>
          <button onClick={handleNext} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:Math.max(13,fs-2),fontWeight:600,cursor:"pointer"}}>{`Next \u2192`}</button>
        </div>)}
        {qp==="done"&&(<div style={{textAlign:"center",color:"#6b7094",fontSize:Math.max(11,fs-4),padding:"8px 12px 12px",borderTop:"1px solid #1e2235"}}>Progress saved</div>)}
      </div>
      {renderEditModal()}
    </div>
  );
}
