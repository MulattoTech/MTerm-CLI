// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-gateway (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-10-remote-occupancy; explain registry admission with existing text nodes.
// Modified: 2026-11-12-device-readiness-observations; label presence, offers and accepted results separately.
import { html, randomToken, escapeHtml } from './security.mjs';
const styles = `:root{color-scheme:dark;font:15px system-ui,-apple-system,Segoe UI,sans-serif;background:#0b1220;color:#edf3fe}
*{box-sizing:border-box}
html,body{width:100%;min-width:0}
body{margin:0;overflow-wrap:anywhere}
a{color:#8ebcff;text-decoration:none;overflow-wrap:anywhere}
a:hover{text-decoration:underline}
header{border-bottom:1px solid #27334a;padding:18px max(24px,calc((100vw - 1160px)/2));display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
header>a{min-width:0;max-width:100%}
.brand{font-size:20px;font-weight:700;color:#f0f6ff}
.brand span{color:#69a9ff}
main{width:100%;min-width:0;max-width:1160px;margin:auto;padding:36px 24px 64px}
h1{font-size:clamp(26px,4vw,38px);letter-spacing:-.03em;margin:0 0 12px}
h2{font-size:20px;margin:0}
h3{margin:0;font-size:17px}
p{line-height:1.65;color:#b1bfd5}
button,input{font:inherit;min-width:0;max-width:100%}
button{border:1px solid #426189;background:#193b69;color:#eef5ff;border-radius:9px;padding:10px 15px;cursor:pointer;white-space:normal;overflow-wrap:anywhere}
button:hover{background:#244d80}
button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #78b8ff;outline-offset:3px}
button:disabled{opacity:.5;cursor:not-allowed}
button.secondary{background:#182237;border-color:#34445f}
button.danger{background:#432329;border-color:#934553;color:#ffd9dd}
input{display:block;width:100%;padding:12px;border-radius:8px;border:1px solid #3c4c68;background:#0d1729;color:#f4f7ff;margin:8px 0 14px}
label{font-size:14px;color:#c4cfe1}
.row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;min-width:0}
.row>*{min-width:0;max-width:100%}
.row>div{flex:1 1 240px}
.muted,small{color:#9babc5}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px;min-width:0;width:100%}
.grid>*{min-width:0}
.panel{padding:22px;border:1px solid #2c3952;background:#111d30;border-radius:14px;margin-top:20px;min-width:0;max-width:100%}
.card{padding:20px;border:1px solid #30415c;background:#122038;border-radius:12px;min-width:0;max-width:100%}
.badge{display:inline-flex;align-items:center;flex-wrap:wrap;gap:6px;padding:5px 10px;border-radius:50px;background:#1b3555;color:#b9d6ff;font-size:12px;font-weight:600;min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.online{color:#a7e5c5;background:#1a3e33}
.offline,.revoked{color:#c4cbda;background:#2d3443}
.reconnecting{color:#ffe0a4;background:#463b22}
.error{border:1px solid #ab5260;background:#3d202b;color:#ffdae0;padding:14px;border-radius:10px;margin-top:18px;white-space:pre-wrap}
.hidden{display:none}
.spaced{margin-top:18px}
.statusbar{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0;min-width:0}
.statusbar>*{min-width:0;max-width:100%}
.endpoint{display:flex;gap:10px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}
.endpoint code{overflow-wrap:anywhere;flex:1 1 180px;min-width:0;max-width:100%;white-space:normal;background:#091322;padding:13px;border:1px solid #2c4363;border-radius:8px;color:#c4dcff}
code{font-size:13px;overflow-wrap:anywhere}
ul{padding-left:20px;line-height:1.8;color:#b8c6db}
.activity{list-style:none;padding:0;margin:15px 0 0}
.activity li{padding:10px 0;border-top:1px solid #26344b;font-size:13px;overflow-wrap:anywhere}
.empty{padding:26px;text-align:center;border:1px dashed #3b506e;border-radius:10px;color:#b1bfd5}
.topgap{margin-top:34px}
.consent{max-width:620px;margin:8vh auto}
.consent form{display:flex;gap:12px;margin-top:25px;flex-wrap:wrap}
.footer{font-size:12px;color:#879bb9;margin-top:32px}
.stat{font-size:32px;color:#f2f6ff;font-weight:700;margin:12px 0 3px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
@media(max-width:600px){
  header{padding:16px 20px;align-items:flex-start;gap:10px}
  header .brand{flex-basis:100%}
  main{padding:26px 18px}
  .row{gap:12px}
  .grid{grid-template-columns:minmax(0,1fr)}
  .panel{padding:18px}
  .panel>.row{align-items:flex-start}
  .panel>.row>h2{flex-basis:100%}
  .card{padding:16px}
  .endpoint{display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch}
  .endpoint button{width:100%}
}`;
function shell(title, nonce, contents, script = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style nonce="${nonce}">${styles}</style></head><body><header><a class="brand" href="/">M<span>Term</span> <small>by M-TechLabs</small></a><a href="https://m-techlabs.com">M-TechLabs home ↗</a></header>${contents}${script ? `<script nonce="${nonce}">${script}</script>` : ''}</body></html>`;
}
export function consentPage({ nonce: consent, clientName, redirectOrigin }) {
  const nonce = randomToken(16);
  return html(
    shell(
      'Authorize MTerm read access',
      nonce,
      `<main class="consent"><span class="badge">Private MTerm authorization</span><h1 class="spaced">Connect ${escapeHtml(clientName)}</h1><p>Client callback: <strong>${escapeHtml(redirectOrigin)}</strong></p><p>This client is requesting read access to computers paired with your signed-in identity. You will explicitly choose the computer on each tool call.</p><div class="panel"><h2>Permission: mterm:read</h2><ul><li>List your paired computers and connection status.</li><li>Read text files, metadata and folders within each computer’s owner-selected root.</li><li>Search filenames and text within that root.</li></ul><p>File writing and process execution are disabled. You can revoke this client from the MTerm dashboard.</p></div><form method="post" action="/oauth/authorize"><input type="hidden" name="consent" value="${escapeHtml(consent)}"><button type="submit" name="decision" value="approve">Authorize read access</button><button class="secondary" type="submit" name="decision" value="deny">Cancel</button></form></main>`,
    ),
    nonce,
    200,
    redirectOrigin,
  );
}
export function dashboardPage(conf, env) {
  const nonce = randomToken(16);
  const content = `<main><div class="row"><div><span class="badge">${escapeHtml(env.ENVIRONMENT || 'private')} · read-only</span><h1 class="spaced">Your connected computers</h1><p>Manage private MCP access through your M-TechLabs identity.</p></div><button id="refresh" class="secondary">Refresh status</button></div><div id="error" class="error hidden" role="alert"></div><div class="statusbar"><span class="badge online" id="identity">Verifying identity…</span><span class="badge">Read access enabled</span><span class="badge offline">Writing disabled</span><span class="badge offline">Execution disabled</span></div><section class="panel"><div class="row"><h2>Connect your AI client</h2><span class="badge">OAuth + PKCE</span></div><p>Add this remote MCP URL in a compatible client, then authorize read access through M-TechLabs.</p><div class="endpoint"><code id="endpoint">${escapeHtml(conf.resource)}</code><button id="copy">Copy MCP URL</button></div><details class="spaced"><summary>Connection instructions</summary><p>In ChatGPT, add a custom MCP app where your account supports it. In Claude or another compatible MCP client, add a remote connector. Use the URL above and complete the displayed authorization flow yourself. No separate shared API key is required.</p><p>After connecting, call <code>mterm_list_devices</code> and pass the chosen <code>deviceId</code> with each file tool. Connecting here does not prove that a particular client has finished its authorization.</p></details></section><section class="topgap"><div class="row"><h2>Computers</h2><button id="showpair">Pair a computer</button></div><p class="muted" id="updated" aria-live="polite">Loading connection status…</p><div id="devices" class="grid"></div></section><section id="pairing" class="panel hidden"><h2>Verify the computer in front of you</h2><p>Run <code>mterm-cli remote pair</code> on the computer. Check the pairing ID and enter the verification code displayed there. Only approve a computer you recognize.</p><form id="pairform"><label for="pairid">Pairing ID</label><input id="pairid" autocomplete="off" required><label for="paircode">Verification code</label><input id="paircode" autocomplete="off" maxlength="16" required><button type="submit">Approve read-only pairing</button></form><p id="pairstatus" aria-live="polite"></p></section><div class="grid topgap"><section class="panel"><h2>Client authorizations</h2><p>Revoking a client immediately rejects its access and refresh tokens.</p><div id="grants"></div></section><section class="panel"><h2>Active requests</h2><p>Requests have a 20-second deadline. Reconnecting a computer does not replay delivered requests.</p><div id="sessions"></div></section></div><section class="panel"><div class="row"><h2>Recent activity</h2><span class="muted">Metadata only · up to 128 events</span></div><ul id="audit" class="activity"></ul></section><section class="panel"><div class="row"><div><h2>Revoke all access</h2><p>Disconnect your paired computers and revoke all client authorizations.</p></div><button id="revokeall" class="danger">Revoke all access</button></div></section><p class="footer" id="build">Authenticated private preview. No background startup service is installed.</p><div id="announcement" class="sr" aria-live="polite"></div></main>`;
  const script = `const $=id=>document.getElementById(id);let loading=false;function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}function showError(error){$('error').textContent=error.message||'Request failed. Refresh or sign in again.';$('error').classList.remove('hidden');}async function api(path,data){const r=await fetch(path,{method:data?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:data?{'content-type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});if(!r.ok){let code='request_failed';try{code=(await r.json()).error||code;}catch{}throw Error(r.status===401?'Your sign-in expired. Reload this page to sign in.':code.replaceAll('_',' '));}return r.json();}function empty(host,text){host.replaceChildren(node('p',text,'empty'));}async function post(path,data){try{await api(path,data);await refresh();}catch(e){showError(e);}}function button(text,fn,danger=false){const b=node('button',text,danger?'danger':'secondary');b.type='button';b.addEventListener('click',fn);return b;}function appendObservations(card,x){const o=x.observations,capacity=o?.lastReportedCapacity,result=o?.lastAcceptedResult;card.append(node('p',capacity?(capacity.slots===null?'Last capacity offer: not reported at ':'Last capacity offer: '+capacity.slots+' slot(s) at ')+new Date(capacity.at).toLocaleString()+'. This offer may already be consumed.':'No capacity offer recorded.'),node('p',result?'Last accepted result: '+result.outcome+' at '+new Date(result.at).toLocaleString()+'.':'No accepted result recorded.'),node('p','Executor health is unverified. Poll receipt does not prove the agent received its response; a past result does not prove current readiness.','muted'));}function presenceLabel(status){return {online:'Recent poll',reconnecting:'Poll overdue',offline:'No recent poll',revoked:'Revoked'}[status]||'Unknown presence';}async function refresh(){if(loading)return;loading=true;$('refresh').disabled=true;try{const d=await api('/api/dashboard');$('error').classList.add('hidden');$('identity').textContent=d.identityKind==='staging-service'?'Staging service authenticated':'M-TechLabs identity verified';$('updated').textContent='Updated '+new Date().toLocaleTimeString()+' · '+d.devices.length+' computer(s)';$('build').textContent='Build '+d.build+' · Read-only private preview. No background startup service is installed.';const devices=$('devices');devices.replaceChildren();if(!d.devices.length)empty(devices,'No paired computers yet. Start pairing on your computer.');for(const x of d.devices){const card=node('article',undefined,'card'),top=node('div',undefined,'row');top.append(node('h3',x.name),node('span',presenceLabel(x.status),'badge '+x.status));card.append(top,node('p',x.platform+' · '+x.permissions),node('p','Device '+x.id,'muted'),node('small',x.lastSeen?'Last seen '+new Date(x.lastSeen).toLocaleString():'Waiting for the interactive agent to start.'));appendObservations(card,x);const admission=x.registryAdmission;card.append(node('p','Registry admission: '+admission.occupied+' of '+admission.limit+' occupied · '+admission.remaining+' device slots remaining.'),node('p',admission.queued+' queued · '+admission.delivered+' delivered · '+admission.completedAwaitingConsumption+' results awaiting collection.'),node('p','Delivered does not prove execution. Other limits, authorization and device availability still apply.','muted'));const details=node('details');details.append(node('summary',x.capabilities.length+' available tools'));const list=node('ul');for(const t of x.capabilities)list.append(node('li',t));details.append(list);card.append(details);if(x.status!=='revoked'){const b=button('Revoke computer',()=>{if(confirm('Revoke '+x.name+'? Pair it again to restore access.'))post('/api/devices/revoke',{deviceId:x.id});},true);b.classList.add('spaced');card.append(b);}devices.append(card);}const grants=$('grants');grants.replaceChildren();if(!d.grants.length)empty(grants,'No active client authorizations.');for(const g of d.grants){const row=node('div',undefined,'card spaced');row.append(node('p','Client '+g.clientId),node('small','Read access · expires '+new Date(g.expiresAt).toLocaleString()),button('Revoke authorization',()=>post('/api/grants/revoke',{grantId:g.id}),true));grants.append(row);}const sessions=$('sessions');sessions.replaceChildren();if(!d.sessions.length)empty(sessions,'No active tool requests.');for(const s of d.sessions){const row=node('div',undefined,'card spaced');row.append(node('p',s.tool+' · '+s.status),node('small',s.requestId),button('Cancel request',()=>post('/api/requests/cancel',{requestId:s.requestId})));sessions.append(row);}const audit=$('audit');audit.replaceChildren();for(const e of d.audit.slice(0,30))audit.append(node('li',new Date(e.at).toLocaleTimeString()+' · '+(e.tool||e.decision)+' · '+e.result+(e.deviceId?' · '+e.deviceId.slice(0,8):'')));if(!d.audit.length)audit.append(node('li','No activity yet.'));}catch(e){showError(e);}finally{loading=false;$('refresh').disabled=false;}}$('refresh').addEventListener('click',refresh);$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('endpoint').textContent);$('copy').textContent='Copied';$('announcement').textContent='MCP URL copied.';setTimeout(()=>$('copy').textContent='Copy MCP URL',2000);}catch{showError(Error('Select the URL above and copy it manually.'));}});$('showpair').addEventListener('click',()=>{$('pairing').classList.toggle('hidden');$('pairid').focus();});$('pairform').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api('/api/pair/approve',{pairId:$('pairid').value.trim(),userCode:$('paircode').value.trim()});$('pairstatus').textContent='Pairing approved. Return to the computer and start the agent.';$('paircode').value='';await refresh();}catch(x){showError(x);}finally{b.disabled=false;}});$('revokeall').addEventListener('click',()=>{if(confirm('Revoke ALL paired computers and client authorizations for your identity?'))post('/api/revoke-all',{});});const pair=new URL(location.href).searchParams.get('pair');if(pair&&/^[a-f0-9-]{36}$/i.test(pair)){$('pairid').value=pair;$('pairing').classList.remove('hidden');$('paircode').focus();}refresh();setInterval(()=>{if(!document.hidden)refresh();},10000);`;
  return html(shell('MTerm · Connected computers', nonce, content, script), nonce);
}
