'use strict';
const D=window.STACK_DATA;
const colors=[['#49392d','#f0b384'],['#354348','#9cc9d2'],['#433849','#c7acd9'],['#35423a','#acd0ac'],['#3a3c4c','#b7c0e4'],['#49363b','#e5adb7'],['#3a4545','#a2c5c1']];
const players=D.players.map((p,i)=>({...p,initial:p.name[0],bg:colors[i][0],color:colors[i][1]}));
const snapshots=D.snapshots, matches=[...D.matches,...(D.pwMatches||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
const pendingPwRecords=()=>D.personalRecords.filter(r=>!r.officialMatchId);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,n=2)=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(n):'—';
const percent=(v,n=1)=>typeof v==='number'?fmt(v,n)+'%':'—';
const who=id=>players.find(p=>p.id===id);
const avatar=(p,size='')=>`<span class="avatar avatar-${p.id} ${size}" aria-hidden="true" style="--avatar-bg:${p.bg};--avatar-color:${p.color}">${p.initial}</span>`;
const badge=p=>`<span class="platform-badge ${p==='5E'?'five':''}">${p==='5E'?'5E':'完美'}</span>`;
const state={page:'overview',platform:'all',search:'',period:'all',player:'all',map:'all',result:'all',limit:20,recordView:'matches',combinedSort:'rating',combinedDirection:-1,showAllStats:false,minGames:1,sort:'rating',direction:-1};
const rowSnapshots=id=>snapshots.filter(s=>(!id||s.player===id)&&(state.platform==='all'||s.platform===state.platform));
const inPlatform=p=>state.platform==='all'||p===state.platform;
const mapNames={Dust2:'炙热沙城 II',Inferno:'炼狱小镇',Mirage:'荒漠迷城',Nuke:'核子危机',Ancient:'远古遗迹',Vertigo:'殒命大厦',Anubis:'阿努比斯',Overpass:'死亡游乐园',Train:'列车停放站'};
const metric=(label,value,foot)=>`<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></div>`;
const section=(label,sub,link)=>`<div class="section-title"><h2>${label}${sub?`<small>${sub}</small>`:''}</h2>${link?`<a class="text-link" href="#${link}">查看全部 <span aria-hidden="true">›</span></a>`:''}</div>`;
const empty=(head,body)=>`<div class="empty"><strong>${head}</strong>${body}</div>`;
function timeLabel(date,precise=false){if(date.length===10)return date.slice(5)+' · 无具体时刻';return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',...(precise?{hour:'2-digit',minute:'2-digit',hour12:false}:{})}).format(new Date(date));}
function recordsFor(s){const official=matches.filter(m=>m.platform===s.platform).flatMap(m=>m.observations.filter(o=>o.snapshot===s.id).map(o=>({...o,fullScoreboard:m.fullScoreboard})));return [...official,...(s.platform==='完美'?pendingPwRecords().filter(r=>r.snapshot===s.id):[])].sort((a,b)=>new Date(b.date)-new Date(a.date));}
function showDialog(label,html){$('#dialogLabel').textContent=label;$('#dialogContent').innerHTML=html;if(!$('#detailDialog').open)$('#detailDialog').showModal();$('#detailDialog').scrollTop=0;}
function chart(records){const vals=records.slice(0,10).reverse().map(r=>r.rating).filter(v=>typeof v==='number');if(!vals.length)return empty('暂无趋势','没有可绘制的真实比赛记录。');const min=Math.min(...vals)*.8,max=Math.max(...vals)*1.12;const points=vals.map((v,i)=>`${20+i*280/Math.max(vals.length-1,1)},${112-(v-min)/(max-min||1)*90}`);return `<svg class="spark-chart" viewBox="0 0 320 130" role="img" aria-label="最近个人记录的 Rating 走势"><path d="M0 25H320M0 65H320M0 105H320" stroke="#35404e" stroke-dasharray="3 5"/><polyline points="${points.join(' ')}" fill="none" stroke="#ff985f" stroke-width="2.5"/>${points.map((p,i)=>`<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#ffc19a"><title>Rating ${vals[i]}</title></circle>`).join('')}</svg><div class="chart-labels"><span>较早</span><span>最近 ${vals.length} 条 · Rating</span><span>最近</span></div>`;}
function filteredGames(){const cutoff=state.period==='all'?Infinity:Number(state.period)*86400000;const end=new Date(D.capturedAt+'T23:59:59+08:00');return [...matches.filter(m=>inPlatform(m.platform)).map(m=>({kind:'match',data:m})),...pendingPwRecords().filter(r=>inPlatform(r.platform)).map(r=>({kind:'personal',data:r}))].filter(({kind,data:m})=>{
 const ids=kind==='match'?m.players:[m.player];const people=ids.map(who).filter(Boolean);const searchText=[m.map,mapNames[m.map],m.account,...people.flatMap(p=>[p.name,...p.pw,...p.fe])].join(' ').toLowerCase();
 return (state.recordView==='pending'?kind==='personal':kind==='match')&&(state.player==='all'||ids.includes(state.player))&&(state.map==='all'||m.map===state.map)&&(!state.search||searchText.includes(state.search.toLowerCase()))&&(end-new Date(m.date)<cutoff)&&(state.result==='all'||(kind==='personal'?m.result===state.result:m.observations.some(o=>(state.player==='all'||o.player===state.player)&&o.result===state.result)));
 }).sort((a,b)=>new Date(b.data.date)-new Date(a.data.date));}
function rankingsPage(){const cols=[['games','场次'],['rating','Rating'],['adr','ADR'],['hs','爆头率'],['wr','胜率'],['elo','ELO']];return `<div class="toolbar"><label><span class="sr-only">搜索榜单</span><input id="search" class="search" placeholder="搜索姓名或账号…" value="${esc(state.search)}"></label><label class="muted">最低场次 <select id="minGames">${[1,5,10,20,50].map(n=>`<option value="${n}" ${n===state.minGames?'selected':''}>${n} 场</option>`).join('')}</select></label></div>${['完美','5E'].filter(inPlatform).map(platform=>{const rows=rowSnapshots().filter(s=>s.platform===platform&&s.games>=state.minGames&&[who(s.player).name,s.account].join(' ').toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>compareValues(a[state.sort],b[state.sort],state.direction));return `<section class="ranking-block">${section(platform==='完美'?'完美 · 赛季截图':'5E · 2026 S5 优先排位',platform==='完美'?'RATING PRO':'5E RATING')}<div class="panel table-wrap"><table class="data-table"><thead><tr><th>序</th><th>选手 / 账号</th><th>平台段位</th>${cols.map(([k,label])=>`<th><button class="sort-button" data-sort="${k}">${label}${state.sort===k?(state.direction===-1?' ↓':' ↑'):''}</button></th>`).join('')}</tr></thead><tbody>${rows.map((s,i)=>`<tr><td>${i+1}</td><td><button class="player-name" data-player="${s.player}" data-account="${esc(s.id)}">${avatar(who(s.player))}<span><b>${who(s.player).name}</b><small class="table-account">${esc(s.account)}</small></span></button></td><td>${rankBadge(s)}</td><td>${s.games}</td><td class="orange">${fmt(s.rating)}</td><td>${fmt(s.adr,1)}</td><td>${percent(s.hs)}</td><td>${percent(s.wr)}</td><td>${fmt(s.elo,0)}</td></tr>`).join('')}</tbody></table></div>${rows.length?'':empty('暂无符合最低场次的账号','降低最低场次，或选择其他平台。')}<p class="table-note">${platform==='完美'?'按各账号截图的赛季数据排序，采集日期见详情。':'同一赛季、同一模式；多账号各占一行，本季 0 场的账号不参与排行。'} 小样本数据请结合场次参考。</p></section>`;}).join('')}`;}
function sourceLine(s){return `来源：${esc(s.source)} · ${s.capturedAt}${s.sourceUrl?` · <a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener">平台主页 ↗</a>`:''}`;}
function rankBadge(s){return `<span class="rank-badge" title="${esc(s.rankSource)} · ${esc(s.rankAt)}">${esc(s.rankLabel||'未取得')}${typeof s.rankScore==='number'?`<small>${fmt(s.rankScore,0)} 分</small>`:''}</span>`;}
function snapshotMetrics(s){return `<p class="scope-note">${badge(s.platform)} ${esc(s.account)} · ${esc(s.scope)}</p><div class="profile-metrics">${metric(s.seasonRankLabel?'当前段位':'平台段位',rankBadge(s),`采集于 ${s.rankAt}`)}${s.seasonRankLabel?metric('赛季段位',rankBadge({...s,rankLabel:s.seasonRankLabel,rankScore:s.seasonRankScore}),esc(s.scope)):''}${metric(s.ratingLabel,fmt(s.rating),'原平台评分')}${metric('ADR',fmt(s.adr,1),'平台所选赛季汇总')}${metric('爆头率',percent(s.hs),'平台原值')}${metric('胜率',percent(s.wr),'平台原值')}${metric('赛季场次',fmt(s.games,0),s.games?'该账号独立统计':'本季尚无比赛')}${metric(s.platform==='完美'?'WE':'Swing',fmt(s.platform==='完美'?s.we:s.swing),'不与其他指标换算')}${metric('K/D',fmt(s.kd),s.kd==null?'截图未显示':s.platform==='完美'?'平台赛季原值':'总击杀 / 总死亡')}${metric('RWS',fmt(s.rws),'平台赛季原值')}${s.platform==='完美'&&s.firepower!=null?metric('火力',fmt(s.firepower,0),'平台赛季原值'):''}</div>${s.lifetimeGames!=null?`<p class="table-note">5E 生涯：${s.lifetimeGames} 场 / ${s.lifetimeHours} 小时，与当季统计分开保留。</p>`:''}<p class="dialog-notice">${sourceLine(s)}</p>${s.attributedAway?`<p class="table-note">本账号有 ${s.attributedAway} 场对局按实际操作者计入对应选手的站内汇总。上方赛季概览采用 5E 平台原值。</p>`:''}`;}
function personalMaps(s,records){if(s.mapStats)return s.mapStats.map(m=>({...m,note:s.season?'客户端赛季截图 · 部分地图仅显示场次和胜率':'截图所选范围'}));const relevant=records.filter(r=>r.mode==='9'),names=[...new Set(relevant.map(r=>r.map))];return names.map(map=>{const rows=relevant.filter(r=>r.map===map);return {map,games:rows.length,wr:rows.filter(r=>r.result==='win').length/rows.length*100,adr:rows.reduce((a,r)=>a+(r.adr||0),0)/rows.length,note:'已收录近期优先排位记录'};}).sort((a,b)=>b.games-a.games).slice(0,5);}
function showPlayer(id,accountId){if(accountId==='combined')return showCombined(id);const p=who(id);if(!p)return;const options=rowSnapshots(id),s=options.find(s=>s.id===accountId)||options[0];if(!s)return;const records=recordsFor(s);const mps=personalMaps(s,records);showDialog('选手档案',`<div class="profile-top">${avatar(p,'huge')}<div><h2 id="dialogTitle">${p.name}</h2><p>${p.pw.length} 个完美账号 · ${p.fe.length} 个 5E 昵称</p></div></div><label class="account-select-label">当前账号 <select id="profileAccount" data-owner="${id}"><option value="combined">个人合并数据 · 当前平台筛选</option>${options.map(v=>`<option value="${v.id}" ${v.id===s.id?'selected':''}>${v.platform} · ${esc(v.account)}</option>`).join('')}</select></label>${snapshotMetrics(s)}<div class="detail-columns"><section><h3>最近比赛表现</h3>${chart(records)}<p class="rank-hint">个人记录原始顺序；不混合账号或平台。</p></section><section><h3>地图表现</h3>${mps.map(m=>`<div class="detail-map-row"><span>${esc(m.map)}<small style="display:block;text-align:left">${m.games} 场${m.adr!=null?' · ADR '+fmt(m.adr,2):''}${m.rating!=null?' · Rating '+fmt(m.rating):''}${m.killsPerMatch!=null?' · 场均击杀 '+fmt(m.killsPerMatch,1):''}</small></span><small>胜率</small><span>${percent(m.wr)}</span></div>`).join('')||'<p>暂无地图数据</p>'}<p class="rank-hint">${mps[0]?.note||''}</p></section></div><section class="recent-profile"><h3 class="dialog-subtitle">最近个人记录</h3>${personalTable(records.slice(0,10),s.platform)}</section><p class="dialog-notice">${s.platform==='完美'?'已取得官方战报的记录按比赛 ID 合并，并补充 ADR、精确时间与全场选手。其余保留截图个人记录。'+D.limits.pwDatesNote+'。':'每次更新读取账号最新 20 条，并保留之前已收录的历史记录；不代表完整生涯比赛。部分其他模式未提供有效评分与 ADR，显示为 —。'}</p>`);}
function personalTable(rows,platform){return rows.length?`<div class="panel table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>地图</th><th>赛果</th><th>K / D / A</th><th>Rating</th><th>${platform==='完美'?'WE':'ADR'}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.matchId?`<button class="text-link" data-match="${esc(r.matchId)}">${timeLabel(r.date)} ↗</button>`:timeLabel(r.date)}${r.sourceAccount?`<small class="table-account">使用 ${esc(r.sourceAccount)}</small>`:''}</td><td>${esc(r.map)}</td><td class="${r.result==='win'?'win':r.result==='loss'?'loss':''}">${r.result==='win'?'胜':r.result==='loss'?'负':'平'}</td><td>${fmt(r.kill,0)} / ${fmt(r.death,0)} / ${fmt(r.assist,0)}</td><td>${fmt(r.rating)}</td><td>${fmt(platform==='完美'?r.we:r.adr,1)}</td></tr>`).join('')}</tbody></table></div>`:empty('暂无近期个人记录','保留真实空状态。');}
function scoreboard(team,platform){return `<div class="panel table-wrap"><table class="data-table"><thead><tr><th>选手 / 游戏昵称</th><th>K / D / A</th><th>ADR</th><th>爆头率</th><th>${platform==='完美'?'Rating Pro':'Rating'}</th>${platform==='完美'?'<th>WE</th>':''}</tr></thead><tbody>${team.map(r=>`<tr><td>${r.player?`<button class="player-name" data-player="${r.player}"><b class="orange">${who(r.player).name}</b><small>${esc(r.sourceAccount||r.account)}</small></button>`:esc(r.account||'平台未提供昵称')}</td><td>${fmt(r.kill,0)} / ${fmt(r.death,0)} / ${fmt(r.assist,0)}</td><td>${fmt(r.adr,1)}</td><td>${percent(r.hs)}</td><td>${fmt(r.rating)}</td>${platform==='完美'?`<td>${fmt(r.we,1)}</td>`:''}</tr>`).join('')}</tbody></table></div>`;}
function showMatch(id){const m=matches.find(m=>m.id===id);if(!m)return;showDialog('比赛战报',`<div class="match-detail-head">${badge(m.platform)}<h2 id="dialogTitle">${esc(m.map)} · ${esc(mapNames[m.map]||m.map)}</h2><p>${timeLabel(m.date,true)}${m.timeMeaning?' · '+m.timeMeaning:''} · ${m.platform==='完美'?esc(m.mode):m.mode==='9'?'优先排位':'其他模式'}</p><div class="big-score">${m.score1} <span class="colon">:</span> ${m.score2}</div><div class="team-labels"><span>队伍 1</span><span>队伍 2</span></div></div>${m.fullScoreboard?m.teams.map((t,i)=>`<h3 class="scoreboard-title">队伍 ${i+1} ${m.winner===i+1?'· 胜方':''}</h3>${scoreboard(t,m.platform)}`).join(''):`${empty('全场计分板暂未取得','以下只展示公开列表中可读取的朋友个人数据。')}${m.observations.map(o=>`<h3 class="scoreboard-title">${who(o.player).name} · ${esc(o.sourceAccount||o.account)}</h3>${personalTable([o],m.platform)}`).join('')}`}<p class="dialog-notice">来源：${m.platform==='完美'?'完美官方比赛详情接口':'5E 公开比赛记录'+(m.fullScoreboard?'与比赛详情':'')} · 采集于 ${m.capturedAt||D.platformCapturedAt[m.platform]||D.capturedAt}<br>比赛编号：${esc(m.officialId||m.id)}。原平台队伍顺序保留，朋友可能分属不同队伍。${m.platform==='完美'?`本场已关联 ${m.matchedRecordIds.length} 条原截图，列表仅显示一场。`:''}</p>`);}
function showRecord(id){const r=D.personalRecords.find(r=>r.id===id);if(!r)return;if(r.officialMatchId)return showMatch(r.officialMatchId);const s=snapshots.find(s=>s.id===r.snapshot);showDialog('完美个人比赛记录',`<div class="match-detail-head">${badge('完美')}<h2 id="dialogTitle">${who(r.player).name} · ${esc(r.map)}</h2><p>${esc(r.account)} · ${timeLabel(r.date)}</p><div class="big-score"><span class="${r.result==='win'?'win':r.result==='loss'?'loss':''}">${r.ownScore}</span><span class="colon"> : </span>${r.otherScore}</div><div class="team-labels"><span>该选手队伍</span><span>对方队伍</span></div></div><div class="profile-metrics">${metric('Rating Pro',fmt(r.rating),'截图原值')}${metric('WE',fmt(r.we,1),'截图原值')}${metric('击杀 / 死亡 / 助攻',`${r.kill} / ${r.death} / ${r.assist}`,'该选手个人数据')}${metric('赛果',r.result==='win'?'胜利':r.result==='loss'?'失利':'平局','截图原值')}</div><p class="dialog-notice">来源：${esc(r.source)}。${D.limits.pwDatesNote}。截图未提供比赛编号和其他队员的数据，因此不生成双方计分板。</p><button class="button secondary" data-player="${r.player}">查看选手档案 ↗</button>`);}
function showCompare(){showDialog('HEAD TO HEAD · 账号对比',`<h2 id="dialogTitle">用数据，聊聊谁在 Carry</h2><p>同一平台分别比较，多账号不混合统计。</p><div class="toolbar"><label>对比平台 <select id="comparePlatform"><option value="5E" ${state.platform!=='完美'?'selected':''}>5E · 2026 S5</option><option value="完美" ${state.platform==='完美'?'selected':''}>完美 · 本批截图</option></select></label></div><div class="compare-selects"><label>左侧账号<select id="compareA"></select></label><span>VS</span><label>右侧账号<select id="compareB"></select></label></div><div id="compareResults"></div><p class="dialog-notice" id="compareNote"></p>`);fillCompare();}
function fillCompare(){const rows=snapshots.filter(s=>s.platform===$('#comparePlatform').value&&s.games>0);$('#compareA').innerHTML=rows.map(s=>`<option value="${s.id}">${who(s.player).name} · ${esc(s.account)}</option>`).join('');$('#compareB').innerHTML=rows.map((s,i)=>`<option value="${s.id}" ${i===1?'selected':''}>${who(s.player).name} · ${esc(s.account)}</option>`).join('');updateCompare();}
function updateCompare(){const a=snapshots.find(s=>s.id===$('#compareA').value),b=snapshots.find(s=>s.id===$('#compareB').value);if(!a||!b){$('#compareResults').innerHTML=empty('暂无可对比数据','选择其他平台。');return;}$('#compareNote').textContent=a.platform==='完美'?'两张截图未显示赛季编号；这里只对照截图数值，不宣称跨赛季数据可直接排名。':'仅使用 2026 S5 优先排位数据。注意不同账号的场次数量与样本差异。';$('#compareResults').innerHTML=[['games','场次',0],['rating',a.ratingLabel,2],['adr','ADR',1],['hs','爆头率',1],['wr','胜率',1]].map(([k,label,n])=>{const max=Math.max(a[k]||0,b[k]||0,1);return `<div class="compare-row"><div class="compare-bar ${a[k]>b[k]?'better':''}"><i style="width:${Math.max(a[k]||0,0)/max*100}%"></i><b>${fmt(a[k],n)}${['wr','hs'].includes(k)?'%':''}</b></div><span>${label}</span><div class="compare-bar ${b[k]>a[k]?'better':''}"><i style="width:${Math.max(b[k]||0,0)/max*100}%"></i><b>${fmt(b[k],n)}${['wr','hs'].includes(k)?'%':''}</b></div></div>`;}).join('');}
function showSquad(){showDialog('小队名单',`<h2 id="dialogTitle">我们这 7 个人</h2>${players.map(p=>`<div class="roster-row">${avatar(p)}<div><strong>${p.name}</strong><small>完美：${p.pw.map(esc).join(' / ')}<br>5E：${p.fe.map(esc).join(' / ')}</small></div><button class="text-link" data-player="${p.id}">档案 ↗</button></div>`).join('')}<p class="dialog-notice">所有账号按本人提供的归属建档，多账号独立统计。</p>`);}
// Person totals use match rows, never the sum of overlapping account snapshots.
function combinedRecords(id, period = state.period){const end=new Date(D.capturedAt+'T23:59:59+08:00');return D.combined.records.filter(r=>(!id||r.player===id)&&inPlatform(r.platform)&&(period==='all'||(end-new Date(r.date)>=0&&end-new Date(r.date)<Number(period)*86400000)));}
function combinedStats(rows){
 const good=v=>typeof v==='number'&&Number.isFinite(v),sum=k=>rows.reduce((n,r)=>n+(good(r[k])?r[k]:0),0),count=k=>rows.filter(r=>good(r[k])).length;
 const damage=rows.filter(r=>good(r.adr)&&r.rounds>0),hs=rows.filter(r=>good(r.headshots)&&good(r.kill)),rounds=damage.reduce((n,r)=>n+r.rounds,0),kills=hs.reduce((n,r)=>n+r.kill,0);
 const wins=rows.filter(r=>r.result==='win').length,ratings=p=>rows.filter(r=>r.platform===p&&good(r.rating));
 return {games:rows.length,rating:count('rating')?sum('rating')/count('rating'):null,wins,losses:rows.filter(r=>r.result==='loss').length,draws:rows.filter(r=>r.result==='tie').length,
 kill:count('kill')?sum('kill'):null,death:count('death')?sum('death'):null,assist:count('assist')?sum('assist'):null,
 kd:sum('death')&&count('kill')===rows.length&&count('death')===rows.length?sum('kill')/sum('death'):null,wr:rows.length?wins/rows.length*100:null,
 adr:rounds?damage.reduce((n,r)=>n+r.adr*r.rounds,0)/rounds:null,hs:kills?hs.reduce((n,r)=>n+r.headshots,0)/kills*100:null,
 confirmed:rows.filter(r=>r.sourceKind==='official').length,pending:rows.filter(r=>r.sourceKind==='screenshot').length,
 coverage:{rating:count('rating'),kill:count('kill'),death:count('death'),assist:count('assist'),adr:damage.length,hs:hs.length},
 ratings:Object.fromEntries(['完美','5E'].map(p=>[p,ratings(p).length?ratings(p).reduce((n,r)=>n+r.rating,0)/ratings(p).length:null]))};
}
function combinedMethod(){return `<details class="combined-method"><summary>统计范围与计算方式</summary><p>汇总已收录的完美天梯、5E 优先排位对局，合并同一人的全部账号。这里是已收录比赛样本，包含历史赛季，并非完整生涯或两个平台当前赛季之和。顶部平台筛选和下方时间范围对汇总生效。</p><p>每人每个平台的同一比赛编号只计一次。已关联的截图以战报为准。尚待关联的截图只计该人的个人记录，不推测队友；无法确认同一人多账号同场的记录暂不计入。训练等其他模式不计入。</p><p>K/D = 总击杀 ÷ 总死亡；胜率 = 胜场 ÷ 全部场次（含平局）。ADR = Σ（单场 ADR × 回合数）÷ 有 ADR 的总回合数，受平台原值舍入精度影响。爆头率 = 有爆头数记录的总爆头击杀 ÷ 同批记录总击杀。缺少的字段不按 0 补齐，指标下标说明覆盖场次。</p><p>合并 Rating = 全部有效单场 Rating 之和 ÷ 有评分的场次，各账号按实际比赛数计权。这是本站跨平台参考均值，两平台评分算法不同，不能作为平台官方 Rating。完美 Rating Pro、5E Rating 另行保留各自场均值。原平台 ELO、WE、Swing 仍在分账号档案查看。</p></details>`;}
function combinedMetrics(s){return `<div class="profile-metrics">${metric('合并 Rating',fmt(s.rating),`本站参考 · 覆盖 ${s.coverage.rating} / ${s.games} 场`)}${metric('个人合并场次',s.games,`${s.confirmed} 场有编号 · ${s.pending} 条待关联截图`)}${metric('胜 / 负 / 平',`${s.wins} / ${s.losses} / ${s.draws}`,'全部已收录竞技记录')}${metric('胜率',percent(s.wr),'胜场 / 总场次')}${metric('总 K / D / A',`${fmt(s.kill,0)} / ${fmt(s.death,0)} / ${fmt(s.assist,0)}`,`击杀/死亡覆盖 ${s.coverage.kill}/${s.coverage.death} 场 · 助攻 ${s.coverage.assist} 场`)}${metric('K/D',fmt(s.kd),'总击杀 / 总死亡')}${metric('合并 ADR',fmt(s.adr,2),`${s.coverage.adr} / ${s.games} 场 · 按回合加权`)}${metric('合并爆头率',percent(s.hs),`${s.coverage.hs} / ${s.games} 场 · 按击杀加权`)}${metric('平台场均 Rating',`${fmt(s.ratings['完美'])} / ${fmt(s.ratings['5E'])}`,'完美 Pro / 5E · 分别计算')}</div>`;}
function showCombined(id){
 const p=who(id);if(!p)return;const rows=combinedRecords(id),s=combinedStats(rows),accounts=rowSnapshots(id);
 const recent=rows.slice(0,15);
 showDialog('个人汇总',`<div class="profile-top">${avatar(p,'huge')}<div><h2 id="dialogTitle">${p.name}</h2><p>${state.platform==='all'?'完美 + 5E':state.platform} · ${accounts.length} 个账号 · ${state.period==='all'?'已收录全部时间':'近 '+state.period+' 天'}</p></div></div><label class="account-select-label">查看数据 <select id="profileAccount" data-owner="${id}"><option value="combined">个人合并数据</option>${accounts.map(a=>`<option value="${a.id}">${a.platform} · ${esc(a.account)}</option>`).join('')}</select></label>${combinedMetrics(s)}<h3 class="dialog-subtitle" style="margin-top:25px">各账号对本次汇总的贡献</h3><div class="panel table-wrap"><table class="data-table"><thead><tr><th>平台 / 账号</th><th>段位</th><th>场均 Rating</th><th>场次</th><th>胜 / 负 / 平</th><th>K / D / A</th><th>ADR</th></tr></thead><tbody>${accounts.map(a=>{const z=combinedStats(rows.filter(r=>r.snapshot===a.id));return `<tr><td><button class="text-link" data-player="${id}" data-account="${a.id}">${badge(a.platform)} ${esc(a.account)} ↗</button></td><td>${rankBadge(a)}</td><td>${fmt(z.rating)}</td><td>${z.games}</td><td>${z.wins} / ${z.losses} / ${z.draws}</td><td>${fmt(z.kill,0)} / ${fmt(z.death,0)} / ${fmt(z.assist,0)}</td><td>${fmt(z.adr,2)}</td></tr>`;}).join('')}</tbody></table></div><p class="table-note">这里按收录对局重新计算，与原平台账号的赛季概览统计范围不同。0 场表示当前筛选中没有收录记录。</p><h3 class="dialog-subtitle" style="margin-top:25px">合并后的最近个人记录</h3><div class="panel table-wrap"><table class="data-table"><thead><tr><th>日期 / 来源</th><th>账号</th><th>地图</th><th>赛果</th><th>K / D / A</th><th>原平台 Rating</th></tr></thead><tbody>${recent.map(r=>`<tr><td><button class="text-link" data-${r.matchId?'match':'record'}="${esc(r.matchId||r.recordId)}">${timeLabel(r.date)} ↗</button><small class="table-account">${r.platform} · ${r.sourceKind==='official'?'平台战报':'待关联截图'}</small></td><td>${esc(r.account)}${r.sourceAccount?`<small class="table-account">使用 ${esc(r.sourceAccount)}</small>`:''}</td><td>${esc(r.map)}</td><td>${r.result==='win'?'胜':r.result==='tie'?'平':'负'}</td><td>${fmt(r.kill,0)} / ${fmt(r.death,0)} / ${fmt(r.assist,0)}</td><td>${fmt(r.rating)}</td></tr>`).join('')}</tbody></table></div>${rows.length?'':empty('暂无可汇总记录','可切换平台或时间范围。')}${combinedMethod()}`);
}


function overview() {
  const accounts = rowSnapshots();
  const visibleMatches = matches.filter(m => inPlatform(m.platform));
  const boards = visibleMatches.filter(m => m.fullScoreboard).length;
  const pending = inPlatform('完美') ? pendingPwRecords().length : 0;
  const leaders = squadStats('all', false).sort((a, b) => compareValues(a.s.rating, b.s.rating, -1));
  return `<div class="overview-counts" aria-label="收录概况">
    ${metric('已确认比赛', visibleMatches.length, visibleMatches.length===1?'1 场对局':'按比赛编号去重')}
    ${metric('完整战报', boards, '双方十人计分板')}
    ${metric('选手 / 账号', `${new Set(accounts.map(s => s.player)).size} / ${accounts.length}`, '当前平台范围')}
    ${metric('待关联记录', pending, '完美个人截图')}
  </div>
  <div class="dashboard-grid">
    <section class="dashboard-section">
      ${section('小队表现', '', 'combined')}
      ${statTable(leaders, true)}
      <p class="table-note">按已收录竞技记录计算。Rating 为本站参考均值。</p>
    </section>
    <section class="dashboard-section">
      ${section('最近比赛', '', 'matches')}
      ${groupedGames(visibleMatches.slice(0, 6).map(data => ({kind: 'match', data})), true)}
    </section>
  </div>`;
}

function playerCard(player) {
  const accounts = rowSnapshots(player.id);
  return `<article class="player-card">
    <button class="player-card-header" data-player="${player.id}">
      ${avatar(player, 'big')}
      <span><strong>${player.name}</strong><small>${accounts.length} 个账号</small></span>
      <span class="card-arrow" aria-hidden="true">↗</span>
    </button>
    <div class="account-mini">${accounts.map(s => `<button class="account-line" data-player="${player.id}" data-account="${esc(s.id)}">
      ${badge(s.platform)}<span class="account-name" title="${esc(s.account)}">${esc(s.account)}</span>
      ${rankBadge(s)}<strong title="${esc(s.ratingLabel)}">${fmt(s.rating)}</strong>
    </button>`).join('')}</div>
  </article>`;
}

function searchField(label, placeholder) {
  return `<label class="search-field"><span class="sr-only">${label}</span><input type="search" id="search" class="search" placeholder="${placeholder}" value="${esc(state.search)}"></label>`;
}

function peopleMatch(p) {
  return [p.name, ...p.pw, ...p.fe].join(' ').toLowerCase().includes(state.search.trim().toLowerCase());
}

function playersPage() {
  const list = players.filter(p => rowSnapshots(p.id).length && peopleMatch(p));
  return `<div class="toolbar">${searchField('搜索选手', '搜索姓名或平台昵称')}<span class="result-count">${list.length} 位选手</span></div>
    ${list.length ? `<div class="player-cards">${list.map(playerCard).join('')}</div>` : empty('未找到选手', '试试其他姓名或昵称。')}`;
}

function matchClock(date) {
  return date.length === 10 ? '—' : date.slice(11, 16);
}

function gameRow(m, kind, compact = false) {
  const official = kind === 'match';
  const people = (official ? m.players : [m.player]).map(who).filter(Boolean);
  const names = people.map(p => p.name).join('、');
  const score = official ? [m.score1, m.score2] : [m.ownScore, m.otherScore];
  const style = official ? ['team-leading', 'team-trailing'] : ['win', 'loss'];
  const left = score[0] > score[1] ? style[0] : score[0] < score[1] ? style[1] : '';
  const right = score[1] > score[0] ? style[0] : score[1] < score[0] ? style[1] : '';
  const result = official ? (m.fullScoreboard ? '完整战报' : '个人摘要') : ({win:'胜', loss:'负', tie:'平'}[m.result] || '截图');
  return `<button class="match-row${compact?' compact-match':''}" data-${official?'match':'record'}="${esc(m.id)}" aria-label="${esc(m.map)}，${score[0]} 比 ${score[1]}，${esc(names)}，${result}">
    <span class="match-time">${matchClock(m.date)}</span>
    <span class="match-map"><strong>${esc(m.map)}</strong>${badge(m.platform)}</span>
    <span class="score"><b class="${left}">${score[0]}</b><span>:</span><b class="${right}">${score[1]}</b></span>
    <span class="match-people" title="${esc(names)}"><span class="match-avatars">${people.slice(0,5).map(p => avatar(p)).join('')}</span><span class="match-names">${esc(names)}</span></span>
    <span class="match-kind ${official?'':esc(m.result)}">${result}</span>
    <span class="row-arrow" aria-hidden="true">›</span>
  </button>`;
}

function groupedGames(rows, compact = false) {
  if (!rows.length) return empty('没有符合筛选的比赛', '可以切换平台、时间或其他筛选条件。');
  const grouped = rows.reduce((days, row) => {
    const date = row.data.date.slice(0, 10);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(row);
    return days;
  }, new Map());
  return `<div class="match-groups${compact?' compact-groups':''}">${[...grouped].map(([date, games]) => {
    const [year, month, day] = date.split('-').map(Number);
    const label = year === Number(D.capturedAt.slice(0,4)) ? `${month} 月 ${day} 日` : `${year} 年 ${month} 月 ${day} 日`;
    return `<section class="match-day"><h3><time datetime="${date}">${label}</time></h3><div class="match-list">${games.map(r => gameRow(r.data, r.kind, compact)).join('')}</div></section>`;
  }).join('')}</div>`;
}

function filterSelect(id, label, options, selected) {
  return `<label class="filter-select"><span>${label}</span><select id="${id}">${options.map(([value, title]) => `<option value="${esc(value)}" ${String(selected)===String(value)?'selected':''}>${esc(title)}</option>`).join('')}</select></label>`;
}

const periodOptions = [['all', '全部时间'], ['7','近 7 天'], ['30','近 30 天'], ['90','近 90 天']];

function matchesPage() {
  const list = filteredGames();
  const maps = [...new Set([...matches, ...D.personalRecords].filter(m => inPlatform(m.platform)).map(m => m.map))].sort();
  const pending = pendingPwRecords().length;
  const isPending = state.recordView === 'pending';
  return `<div class="toolbar matches-toolbar">
    ${searchField('搜索比赛', '搜索选手、昵称或地图')}
    <div class="filter-controls">
      ${filterSelect('recordPlayer','选手',[['all','全部选手'], ...players.map(p => [p.id,p.name])],state.player)}
      ${filterSelect('recordMap','地图',[['all','全部地图'], ...maps.map(m => [m,m])],state.map)}
      ${filterSelect('period','时间',periodOptions,state.period)}
    </div>
  </div>
  <div class="results-heading"><div class="tabs" aria-label="记录类型">
    <button data-record-view="matches" aria-pressed="${!isPending}">比赛战报</button>
    ${inPlatform('完美')?`<button data-record-view="pending" aria-pressed="${isPending}">待关联截图 <small>${pending}</small></button>`:''}
  </div><span class="result-count">${list.length} ${isPending?'条记录':'场'}</span></div>
  ${isPending?'<p class="table-note">这些截图尚未匹配比赛编号，仅显示个人记录。</p>':''}
  ${groupedGames(list.slice(0,state.limit))}
  ${list.length>state.limit?`<button class="button secondary load-more" data-more>再显示 ${Math.min(20,list.length-state.limit)} 场${isPending?'记录':''}</button>`:''}`;
}

function compareValues(a, b, direction) {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  return direction * (a - b);
}

function squadStats(period = state.period, search = true) {
  return players.filter(p => rowSnapshots(p.id).length && (!search || peopleMatch(p)))
    .map(p => ({p, s: combinedStats(combinedRecords(p.id, period))}));
}

const statColumns = [
  ['rating','Rating',s => fmt(s.rating),'primary'],
  ['games','场次',s => s.games,''],
  ['kd','K/D',s => fmt(s.kd),''],
  ['adr','ADR',s => fmt(s.adr,1),'secondary-stat'],
  ['wr','胜率',s => percent(s.wr),'secondary-stat'],
  ['hs','爆头率',s => percent(s.hs),'wide-stat'],
  ['kill','总 K / D / A',s => `${fmt(s.kill,0)} / ${fmt(s.death,0)} / ${fmt(s.assist,0)}`,'wide-stat'],
  ['wins','胜 / 负 / 平',s => `${s.wins} / ${s.losses} / ${s.draws}`,'wide-stat']
];

function statTable(rows, compact = false) {
  if (!rows.length) return empty('未找到选手', '试试姓名或游戏昵称。');
  const columns = compact ? statColumns.slice(0,4) : statColumns;
  return `<div class="panel table-wrap"><table class="data-table stats-table${compact?' stats-compact':state.showAllStats?' stats-expanded':''}">
    <thead><tr><th scope="col" class="position-column">#</th><th scope="col" class="name-column">选手</th>
    ${columns.map(([key, label, , style]) => {
      const active = state.combinedSort === key;
      const order = active ? state.combinedDirection === -1 ? 'descending' : 'ascending' : 'none';
      return `<th scope="col" class="${style}"${compact?'':` aria-sort="${order}"`}>${compact?label:`<button class="sort-button${active?' active':''}" data-combined-sort="${key}">${label}${active?state.combinedDirection===-1?' ↓':' ↑':''}</button>`}</th>`;
    }).join('')}</tr></thead>
    <tbody>${rows.map(({p,s},index) => `<tr>
      <td class="position-column">${String(index+1).padStart(2,'0')}</td>
      <td class="name-column"><button class="player-name" data-combined="${p.id}">
        ${avatar(p)}<span><b>${p.name}</b>${compact?'':`<small class="table-account">${rowSnapshots(p.id).length} 个账号${s.pending?` · ${s.pending} 条待关联`:''}</small>`}</span>
      </button></td>
      ${columns.map(([, , value, style]) => `<td class="${style}">${value(s)}</td>`).join('')}
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function combinedPage() {
  const list = squadStats().sort((a,b) => compareValues(a.s[state.combinedSort], b.s[state.combinedSort], state.combinedDirection));
  return `<div class="toolbar">${searchField('搜索个人汇总','搜索姓名或任一账号')}
    <div class="filter-controls">${filterSelect('period','时间',periodOptions,state.period)}<span class="result-count">${list.length} 位选手</span>${list.length?`<button class="button secondary mobile-stats-toggle" data-stats-toggle aria-pressed="${state.showAllStats}">${state.showAllStats?'精简指标':'完整指标'}</button>`:''}</div>
  </div>${statTable(list)}<p class="table-note">Rating 为本站参考均值。查看选手可见平台、账号贡献及指标覆盖场次。</p>${combinedMethod()}`;
}

function render(){const meta={combined:['个人汇总','按选手合并已收录的完美天梯和 5E 排位成绩。'],overview:['小队总览','完美与 5E 的选手表现和最近战报。'],players:['选手档案','选择账号，查看赛季数据和个人比赛记录。'],matches:['比赛记录','按日期浏览赛果，点击比分查看计分板。'],rankings:['平台排行','按平台和账号查看赛季数据。']}[state.page];$('#pageTitle').textContent=meta[0];$('#pageSubtitle').textContent=meta[1];document.querySelectorAll('[data-page]').forEach(e=>{e.classList.toggle('active',e.dataset.page===state.page);if(e.dataset.page===state.page)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});document.querySelectorAll('[data-platform]').forEach(e=>{const active=e.dataset.platform===state.platform;e.classList.toggle('active',active);e.setAttribute('aria-pressed',String(active));});$('#content').innerHTML=({combined:combinedPage,overview,players:playersPage,matches:matchesPage,rankings:rankingsPage}[state.page])();}
function navigate(){state.page=['overview','players','matches','rankings','combined'].includes(location.hash.slice(1))?location.hash.slice(1):'overview';state.search='';state.limit=20;state.player='all';state.map='all';render();}
document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;if(el.dataset.recordView){state.recordView=el.dataset.recordView;state.limit=20;render();}if(el.dataset.platform){state.platform=el.dataset.platform;state.map='all';if(state.platform==='5E')state.recordView='matches';state.limit=20;render();}if(el.dataset.combinedSort){const key=el.dataset.combinedSort;state.combinedDirection=state.combinedSort===key?-state.combinedDirection:-1;state.combinedSort=key;render();document.querySelector(`[data-combined-sort="${key}"]`)?.focus();}if(el.hasAttribute('data-stats-toggle')){state.showAllStats=!state.showAllStats;render();document.querySelector('[data-stats-toggle]')?.focus();}if(el.dataset.combined)showCombined(el.dataset.combined);if(el.dataset.player)showPlayer(el.dataset.player,el.dataset.account);if(el.dataset.match)showMatch(el.dataset.match);if(el.dataset.record)showRecord(el.dataset.record);if(el.hasAttribute('data-more')){state.limit+=20;render();}if(el.dataset.sort){state.direction=state.sort===el.dataset.sort?-state.direction:-1;state.sort=el.dataset.sort;render();}});
document.addEventListener('input',e=>{if(e.target.id==='search'){const pos=e.target.selectionStart;state.search=e.target.value;state.limit=20;render();$('#search').focus();$('#search').setSelectionRange(pos,pos);}});
document.addEventListener('change',e=>{const controls={recordPlayer:'player',recordMap:'map',period:'period',minGames:'minGames'};if(controls[e.target.id]){state[controls[e.target.id]]=e.target.id==='minGames'?Number(e.target.value):e.target.value;state.limit=20;render();}if(e.target.id==='profileAccount')showPlayer(e.target.dataset.owner,e.target.value);if(e.target.id==='comparePlatform')fillCompare();if(['compareA','compareB'].includes(e.target.id))updateCompare();});
$('#closeDialog').addEventListener('click',()=>$('#detailDialog').close());$('#compareButton').addEventListener('click',showCompare);$('#squadButton').addEventListener('click',showSquad);window.addEventListener('hashchange',navigate);navigate();
