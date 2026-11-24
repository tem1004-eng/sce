/* ================= 청소년 캠프: 행사 · 등록 · 현황 · 조편성 · 숙소배정 ================= */
var CAMP_TABS=[['event','행사안내'],['reg','등록'],['status','등록현황'],['churchView','교회 담당자 조회'],['teams','조편성(관리자)'],['rooms','숙소배정(관리자)'],['search','학생 검색(관리자)']];
var ADMIN_TABS=['teams','rooms','search'];
function curEvent(){return state.data.events.find(function(e){return e.id===state.eventId;})||null;}
function evRegs(){return state.data.regs.filter(function(r){return r.eventId===state.eventId;});}
function draftRooms(){
  if(!state.roomDraft){var ev=curEvent();state.roomDraft=(ev&&ev.rooms)?ev.rooms.map(function(r){return Object.assign({},r);}):[{gender:'남',capacity:4,count:3},{gender:'여',capacity:4,count:3}];}
  return state.roomDraft;
}
function allRooms(d){
  var out=[];['남','여'].forEach(function(g){var n=0;d.filter(function(x){return x.gender===g;}).forEach(function(t){for(var k=0;k<+t.count;k++){n++;out.push({label:g+'자 '+n+'번방',gender:g,capacity:+t.capacity});}});});
  return out;
}
function regRow(r,extra){return '<tr><td>'+esc(r.church)+'</td><td>'+esc(r.role)+'</td><td>'+esc(r.school||'-')+'</td><td>'+esc(r.grade?r.grade+'학년':'-')+'</td><td>'+esc(r.gender)+'</td><td>'+esc(r.name)+'</td>'+(extra||'')+'</tr>';}
function regFormHTML(id){
  var r=id?(state.data.regs.find(function(x){return x.id===id;})||{}):{};var role=r.role||'학생';
  var opt=function(list,cur){return list.map(function(o){return '<option '+(o===cur?'selected':'')+'>'+o+'</option>';}).join('');};
  return '<form data-form="reg" data-id="'+(id||'')+'"><div class="row2"><label>교회명<input name="church" value="'+esc(r.church||'')+'" required></label><label>구분<select name="role">'+opt(['목회자','교사','학생'],role)+'</select></label></div>'+
    '<div class="row3"><label>학교<select name="school"><option value="">-</option>'+opt(['중학교','고등학교'],r.school||'')+'</select></label><label>학년<select name="grade"><option value="">-</option>'+opt(['1','2','3'],r.grade||'')+'</select></label><label>성별<select name="gender">'+opt(['남','여'],r.gender||'남')+'</select></label></div>'+
    '<label>이름<input name="name" value="'+esc(r.name||'')+'" required></label><p class="hint">목회자·교사는 학교·학년을 비워 두세요. 학생만 조편성에 들어갑니다.</p><p class="err"></p>'+
    '<div class="actions">'+(id?'<button type="button" class="btn ghost" data-act="regDel" data-id="'+id+'">삭제</button>':'')+'<button class="btn">'+(id?'저장':'등록')+'</button></div></form>';
}
function campEventBar(){
  var evs=state.data.events.slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
  return '<div class="bar"><h2>청소년 캠프</h2>'+(state.admin?'<button class="btn" data-act="eventNew">행사 만들기</button>':'')+'</div><div class="evbar">'+(evs.map(function(e){return '<button class="evbtn" aria-pressed="'+(e.id===state.eventId)+'" data-act="pickEvent" data-id="'+e.id+'">'+esc(e.title)+'</button>';}).join('')||'<span class="hint">등록된 행사가 없습니다. 관리자가 행사 제목을 정하면 여기에 새로 나타납니다.</span>')+'</div>';
}
function vCamp(){
  var ev=curEvent();var tabs=CAMP_TABS.filter(function(t){return ADMIN_TABS.indexOf(t[0])<0||state.admin;});
  if(!state.admin&&ADMIN_TABS.indexOf(state.campTab)>=0)state.campTab='event';
  var body='';
  if(!ev){body='<p class="empty">행사를 선택하면 등록·현황을 볼 수 있습니다.</p>';}
  else if(state.campTab==='event'){body='<div class="card" style="cursor:default"><h3>'+esc(ev.title)+'</h3><p class="meta">'+esc(ev.date||'')+' '+esc(ev.place||'')+'</p><p>교회별로 목사·교사·학생을 등록합니다. 관리자가 조편성과 숙소를 정하면 자동으로 배정됩니다.</p><button class="btn" data-act="regNew">등록하기</button></div>'+docsHTML(ev);}
  else if(state.campTab==='reg'){body='<div class="card" style="cursor:default"><h3>'+esc(ev.title)+' 등록</h3><p class="hint">교회명, 구분(목회자·교사·학생), 성별, 이름을 입력하세요. 학생은 학교와 학년도 고릅니다.</p>'+regFormHTML(null)+'</div>';}
  else if(state.campTab==='status'){
    var rs=evRegs();var churches={};
    rs.forEach(function(r){var c=churches[r.church]||(churches[r.church]={t:0,m:0,f:0,pastor:0,teacher:0,student:0});c.t++;if(r.role==='학생')c.student++;else if(r.role==='교사')c.teacher++;else c.pastor++;if(r.gender==='남')c.m++;else c.f++;});
    var cnt=function(k){return rs.filter(function(r){return r.role===k;}).length;};
    body='<div class="stat"><div><b>'+rs.length+'</b>합계</div><div><b>'+cnt('목회자')+'</b>목회자</div><div><b>'+cnt('교사')+'</b>교사</div><div><b>'+cnt('학생')+'</b>학생</div></div><div class="table-wrap"><table><tr><th>교회</th><th>목회자</th><th>교사</th><th>학생</th><th>남</th><th>여</th></tr>'+(Object.keys(churches).map(function(k){var c=churches[k];return '<tr><td>'+esc(k)+'</td><td>'+c.pastor+'</td><td>'+c.teacher+'</td><td>'+c.student+'</td><td>'+c.m+'</td><td>'+c.f+'</td></tr>';}).join('')||'<tr><td colspan="6">등록자가 없습니다.</td></tr>')+'</table></div>';
  }
  else if(state.campTab==='churchView'){body='<p class="hint">교회명을 입력하고 검색하면 우리 교회의 조와 숙소를 볼 수 있습니다.</p><form data-form="churchSearch" class="row2" style="align-items:end"><label>교회명<input name="q" required value="'+esc(state.churchQ||'')+'"></label><button class="btn" style="margin-bottom:12px">검색</button></form><div>'+(state.churchQ?churchResultHTML(state.churchQ):'')+'</div>';}
  else if(state.campTab==='teams'){body=teamsHTML();}
  else if(state.campTab==='rooms'){body=roomsHTML();}
  else if(state.campTab==='search'){body='<form data-form="nameSearch" class="row2" style="align-items:end"><label>학생 이름<input name="q" required value="'+esc(state.nameQ||'')+'"></label><button class="btn" style="margin-bottom:12px">검색</button></form><div>'+(state.nameQ?nameResultHTML(state.nameQ):'')+'</div>';}
  return '<section>'+campEventBar()+'<div class="tabs">'+tabs.map(function(t){return '<button aria-pressed="'+(state.campTab===t[0])+'" data-act="campTab" data-tab="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'+body+'</section>';
}
/* ---------- 행사안내: 포스터 · 안내 공문 · 공지사항 ---------- */
var EDOC_KINDS=[['poster','포스터'],['letter','안내 공문'],['notice','공지사항']];
function docsHTML(ev){
  var kinds={};EDOC_KINDS.forEach(function(k){kinds[k[0]]=k[1];});
  var docs=(state.data.eventdocs||[]).filter(function(d){return d.eventId===ev.id;}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
  var top='<div class="bar"><h2 style="font-size:20px">행사 안내 자료</h2>'+(state.admin?'<button class="btn small" data-act="edocNew" data-event="'+ev.id+'">포스터·공문·공지 올리기</button>':'')+'</div>';
  var list=docs.map(function(d){
    var shown=ev.mainPoster&&d.image&&ev.mainPoster.url===d.image?'<span class="role sun">메인창에 표시 중</span>':'';
    var media=(d.image?'<img src="'+esc(d.image)+'" alt="'+esc(d.title)+'" style="max-width:100%;border-radius:8px;margin:8px 0">':'')+(d.file?'<p><a href="'+esc(d.file)+'" target="_blank" rel="noopener">📎 '+esc(d.fileName||'첨부 파일 내려받기')+'</a></p>':'');
    var tools=state.admin?'<div class="actions">'+(d.kind==='poster'&&d.image?'<button class="btn small" data-act="edocMain" data-id="'+d.id+'">메인창으로 전송</button>':'')+'<button class="btn ghost small" data-act="edocEdit" data-id="'+d.id+'">수정</button><button class="btn ghost small" data-act="edocDel" data-id="'+d.id+'">삭제</button></div>':'';
    return '<article class="card" style="cursor:default"><span class="role">'+esc(kinds[d.kind]||'자료')+'</span>'+shown+'<h3>'+esc(d.title)+'</h3>'+(d.desc?'<p style="white-space:pre-line;margin:0">'+esc(d.desc)+'</p>':'')+media+'<p class="meta">'+fmtDate(d.createdAt)+'</p>'+tools+'</article>';
  }).join('');
  return '<section style="margin-top:24px">'+top+'<div class="cards">'+(list||'<p class="empty">아직 올라온 포스터·공문·공지가 없습니다.</p>')+'</div></section>';
}
function edocFormHTML(m){
  var d=m.id?((state.data.eventdocs||[]).find(function(x){return x.id===m.id;})||{}):{};
  var kind=d.kind||'poster';
  return '<form data-form="edoc" data-id="'+(m.id||'')+'" data-event="'+(m.eventId||'')+'"><h3>'+(m.id?'안내 자료 수정':'안내 자료 올리기')+'</h3>'+
    '<label>종류<select name="kind">'+EDOC_KINDS.map(function(k){return '<option value="'+k[0]+'" '+(k[0]===kind?'selected':'')+'>'+k[1]+'</option>';}).join('')+'</select></label>'+
    '<label>제목<input name="title" value="'+esc(d.title||'')+'" required></label><label>내용<textarea name="desc">'+esc(d.desc||'')+'</textarea></label>'+
    '<label>파일'+(m.id?' (새로 고를 때만 바꿉니다)':'')+'<input type="file" name="file" accept="image/*,.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"></label>'+
    '<p class="hint">포스터는 이미지 파일(10MB 이하)로 올리세요. 공문·공지 첨부는 30MB 이하입니다.</p><p class="err"></p>'+
    '<div class="actions"><button type="button" class="btn ghost" data-act="close">취소</button><button class="btn">'+(m.id?'저장':'올리기')+'</button></div></form>';
}
function churchResultHTML(q){
  var rs=evRegs().filter(function(r){return r.church.indexOf(q)>=0;});
  if(!rs.length)return '<p class="empty">일치하는 교회가 없습니다.</p>';
  return '<div class="table-wrap"><table><tr><th>교회</th><th>구분</th><th>학교</th><th>학년</th><th>성별</th><th>이름</th><th>조</th><th>숙소</th></tr>'+rs.map(function(r){return regRow(r,'<td>'+(r.team?r.team+'조':'미편성')+'</td><td>'+esc(r.room||'미배정')+'</td>');}).join('')+'</table></div>';
}
function nameResultHTML(q){
  if(!state.admin)return '<p class="empty">관리자 전용 메뉴입니다.</p>';
  var rs=evRegs().filter(function(r){return r.name.indexOf(q)>=0;});
  if(!rs.length)return '<p class="empty">일치하는 학생이 없습니다.</p>';
  return '<div class="table-wrap"><table><tr><th>교회</th><th>구분</th><th>학교</th><th>학년</th><th>성별</th><th>이름</th><th>조</th><th>숙소</th><th></th></tr>'+rs.map(function(r){return regRow(r,'<td>'+(r.team?r.team+'조':'미편성')+'</td><td>'+esc(r.room||'미배정')+'</td><td><button class="btn ghost small" data-act="regEdit" data-id="'+r.id+'">수정</button></td>');}).join('')+'</table></div>';
}
function teamsHTML(){
  if(!state.admin)return '<p class="empty">조편성은 관리자만 볼 수 있습니다.</p>';
  var ev=curEvent();var N=Math.max(1,+state.teamCount||1);var studs=evRegs().filter(function(r){return r.role==='학생';});
  var boxes=[];for(var t=1;t<=N;t++)boxes.push(studs.filter(function(s){return +s.team===t;}));
  var un=studs.filter(function(s){return !s.team;});
  return '<div class="row3" style="align-items:end"><label>조 개수<input type="number" min="1" max="30" value="'+N+'" data-bind="teamCount"></label><button class="btn" data-act="autoTeams">자동 편성 (학년·남녀 고르게)</button><span class="hint" style="margin:0 0 12px">수동 조정은 이름 아래 선택상자를 바꾸면 바로 저장됩니다.</span></div>'+
    (!ev?'':'<div class="team-grid">'+boxes.map(function(b,i){return '<div class="team-box"><h3>'+(i+1)+'조 ('+b.length+'명)</h3>'+(b.map(function(s){return '<div class="person">'+esc(s.name)+' · '+esc(s.church)+' · '+esc(s.school)+' '+esc(s.grade)+'학년 '+esc(s.gender)+'<br>'+teamSelect(s.id,N,i+1)+'</div>';}).join('')||'<span class="meta">빈 조</span>')+'</div>';}).join('')+(un.length?'<div class="team-box"><h3>미편성 ('+un.length+'명)</h3>'+un.map(function(s){return '<div class="person">'+esc(s.name)+' · '+esc(s.church)+'<br>'+teamSelect(s.id,N,0)+'</div>';}).join('')+'</div>':'')+'</div>');
}
function teamSelect(id,N,cur){var o='<option value="0">미편성</option>';for(var i=1;i<=N;i++)o+='<option value="'+i+'" '+(i===cur?'selected':'')+'>'+i+'조</option>';return '<select data-act="setTeam" data-id="'+id+'">'+o+'</select>';}
function roomsHTML(){
  if(!state.admin)return '<p class="empty">숙소배정은 관리자만 볼 수 있습니다.</p>';
  var ev=curEvent();var d=draftRooms();var rs=evRegs();var roomsList=allRooms(d);
  var rows=d.map(function(r,i){return '<div class="row3"><label>성별<select data-bind="room:'+i+':gender"><option '+(r.gender==='남'?'selected':'')+'>남</option><option '+(r.gender==='여'?'selected':'')+'>여</option></select></label><label>인원(명)<input type="number" min="1" value="'+r.capacity+'" data-bind="room:'+i+':capacity"></label><label>방 개수<input type="number" min="1" value="'+r.count+'" data-bind="room:'+i+':count"></label></div>';}).join('');
  var byRoom=roomsList.map(function(rm){return '<div class="team-box"><h3>'+esc(rm.label)+' ('+rm.capacity+'인실)</h3>'+(rs.filter(function(p){return p.room===rm.label;}).map(function(p){return '<div class="person">'+esc(p.name)+' · '+esc(p.church)+' · '+esc(p.role)+'<br><select data-act="setRoom" data-id="'+p.id+'">'+roomOptions(roomsList,p.room)+'</select></div>';}).join('')||'<span class="meta">빈 방</span>')+'</div>';}).join('');
  return '<p class="hint">성별·인원·방 수를 정하고 자동 배정하면, 같은 교회의 목사·교사·학생이 가능한 한 함께 배정됩니다.</p>'+rows+
    '<div class="actions"><button class="btn ghost small" data-act="roomAdd">방 종류 추가</button><button class="btn ghost small" data-act="roomDrop">마지막 종류 삭제</button><button class="btn" data-act="autoRooms"'+(ev?'':' disabled')+'>자동 배정</button></div><h2 style="margin-top:20px">방별 배정 현황</h2><div class="team-grid">'+(byRoom||'<p class="empty">방 정보가 없습니다.</p>')+'</div>';
}
function roomOptions(list,cur){var o='<option value="">미배정</option>';list.forEach(function(r){o+='<option value="'+esc(r.label)+'" '+(r.label===cur?'selected':'')+'>'+esc(r.label)+'</option>';});return o;}

/* ---------- 캠프 이벤트 ---------- */
Object.assign(ACT,{
  edocNew:function(d){if(state.admin)openModal('edoc',{eventId:d.event||state.eventId,id:null});},
  edocEdit:function(d){if(state.admin){var doc=(state.data.eventdocs||[]).find(function(x){return x.id===d.id;});openModal('edoc',{eventId:doc?doc.eventId:state.eventId,id:d.id});}},
  edocDel:function(d){if(state.admin&&confirm('이 자료를 삭제할까요?'))call('api_delete','eventdocs',d.id,state.adminPw).then(function(){toast('삭제되었습니다.');return loadAll();}).catch(function(e){toast(e.message);});},
  edocMain:function(d){
    if(!state.admin)return;
    var doc=(state.data.eventdocs||[]).find(function(x){return x.id===d.id;});if(!doc||!doc.image){toast('포스터 이미지가 없습니다.');return;}
    call('api_update','events',doc.eventId,{mainPoster:{url:doc.image,title:doc.title},mainAt:Date.now()},state.adminPw)
      .then(function(){toast('메인 화면에 포스터를 보냈습니다.');return loadAll();}).catch(function(e){toast(e.message);});
  },
  pickEvent:function(d){state.eventId=d.id;state.roomDraft=null;localStorage.setItem('dgsce.event',d.id);render();},
  eventNew:function(){if(state.admin)openModal('event');},
  regNew:function(){if(!state.eventId){toast('먼저 행사를 선택해 주세요.');return;}openModal('reg',{id:null});},
  regEdit:function(d){openModal('reg',{id:d.id});},
  regDel:function(d){if(state.admin)call('api_delete','regs',d.id,state.adminPw).then(function(){closeModal();toast('삭제되었습니다.');return loadAll();}).catch(function(e){toast(e.message);});},
  autoTeams:function(){if(!state.admin)return;call('api_assignTeams',state.eventId,state.teamCount,state.adminPw).then(function(n){toast(n+'명을 조에 나눴습니다.');return loadAll();}).catch(function(e){toast(e.message);});},
  roomAdd:function(){draftRooms().push({gender:'여',capacity:4,count:1});render();},
  roomDrop:function(){draftRooms().pop();render();},
  autoRooms:function(){if(!state.admin)return;call('api_assignRooms',state.eventId,draftRooms(),state.adminPw).then(function(){toast('숙소 배정이 완료되었습니다.');return loadAll();}).catch(function(e){toast(e.message);});}
});
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.dataset.act==='setTeam')call('api_update','regs',t.dataset.id,{team:+t.value||null},state.adminPw).then(loadAll).catch(function(err){toast(err.message);});
  else if(t.dataset.act==='setRoom')call('api_update','regs',t.dataset.id,{room:t.value||null},state.adminPw).then(loadAll).catch(function(err){toast(err.message);});
});
Object.assign(SUBMIT,{
  reg:async function(f){
    var v={church:val(f,'church'),role:val(f,'role'),school:val(f,'school'),grade:val(f,'grade'),gender:val(f,'gender'),name:val(f,'name')};
    if(!v.church||!v.name){setErr(f,'교회명과 이름을 입력해 주세요.');return;}
    if(v.role==='학생'&&(!v.school||!v.grade)){setErr(f,'학생은 학교와 학년을 선택해 주세요.');return;}
    if(v.role!=='학생'){v.school='';v.grade='';}
    var id=f.dataset.id;
    if(id)await call('api_update','regs',id,v,state.adminPw);
    else await call('api_create','regs',Object.assign({eventId:state.eventId},v),'');
    if(state.modal)closeModal();else f.reset();
    toast(id?'수정되었습니다.':'등록되었습니다.');await loadAll();
  },
  churchSearch:async function(f){state.churchQ=val(f,'q');render();},
  nameSearch:async function(f){state.nameQ=val(f,'q');render();}
});
/* 등록 탭에서 입력 중에는 화면을 다시 그리지 않도록 focusout 뒤에 한 번 맞춰 줍니다 */
$('#view').addEventListener('focusout',function(){setTimeout(function(){if(!isEditing())render();},150);});
