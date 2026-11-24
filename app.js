/* ================= 대경SCE 화면 스크립트 (자료는 앱스크립트 code.gs 가 보관) ================= */

/* ★ 배포한 웹 앱 주소를 아래 따옴표 안에 넣어 주세요 (예: https://script.google.com/macros/s/.../exec) */
var API_URL = 'https://script.google.com/macros/s/AKfycbwACs2hVQAvJuFy7NrUzp_h5dK2tmf5Q_XB9NubgtpqsoRSaNAMaJFxdyQL1LXUnvnDHg/exec';

var BOARDS={
  videos:{coll:'videos',title:'영상 게시판',hint:'유튜브 주소를 넣으면 행사 영상을 모읍니다.',titleField:true,fields:[{k:'url',label:'유튜브 주소',type:'url',req:true},{k:'desc',label:'설명',type:'textarea'}]},
  photos:{coll:'photos',title:'사진 게시판',hint:'캠프와 행사의 순간을 올려 주세요. 여러 장을 한꺼번에 올릴 수 있습니다.',titleField:true,image:true,fields:[{k:'desc',label:'설명',type:'textarea'}]},
  songs:{coll:'songs',title:'좋은 찬양',hint:'좋은 찬양을 함께 나눌 수 있습니다. 이미지나 유튜브 링크도 가능합니다.',titleField:true,image:true,fields:[{k:'singer',label:'가수/팀'},{k:'url',label:'유튜브 주소',type:'url'},{k:'desc',label:'설명',type:'textarea'}]},
  campsongs:{coll:'campsongs',title:'캠프 찬양',hint:'캠프 기간에 학생들이 함께 부를 곡을 올립니다.',titleField:true,image:true,fields:[{k:'singer',label:'가수/팀'},{k:'url',label:'유튜브 주소',type:'url'},{k:'desc',label:'설명',type:'textarea'}]},
  sheets:{coll:'sheets',title:'악보 파일 게시판',hint:'악보 파일을 통으로 올릴 수 있습니다. 파일당 최대 30MB.',titleField:true,file:true,fields:[{k:'desc',label:'설명',type:'textarea'}]},
  suggestions:{coll:'suggestions',titleField:true,title:'교회들의 소리함',hint:'건의 사항은 교회명·직분·연락처·내용을 모두 써야 등록됩니다. 연락처는 관리자만 볼 수 있습니다.',reply:true,requiredAll:true,fields:[{k:'church',label:'교회명',req:true},{k:'role',label:'직분',req:true},{k:'contact',label:'연락처',req:true},{k:'desc',label:'건의 내용',type:'textarea',req:true}]}
};
var LINKS=[{label:'대경SCE 페이스북',url:'https://www.facebook.com/p/%EB%8C%80%EA%B5%AC%EA%B2%BD%EB%B6%81-SCE-100092669511776/?locale=ko_KR'},{label:'대경SCE 유튜브',url:'https://www.youtube.com/@%EB%8C%80%EA%B5%AC%EA%B2%BD%EB%B6%81SCE-x7n'},{label:'대신대SCE',url:''},{label:'총회학지부',url:'http://scekorea.org/'},{label:'대신대학교',url:'https://www.daeshin.ac.kr/html/intro/'}];
var LEADERS=[{role:'위원장',name:'이관영 목사',church:'내일교회',cls:''},{role:'대구지역 총무',name:'김창범 목사',church:'',cls:'sun'},{role:'경북지역 총무',name:'백성현 목사',church:'',cls:'sun'},{role:'행정 총무',name:'윤경화 집사',church:'',cls:'sky'},{role:'회계',name:'최신효 장로',church:'',cls:'sky'}];
var state={data:{videos:[],photos:[],songs:[],campsongs:[],sheets:[],suggestions:[],events:[],regs:[],plans:[],cal:[],eventdocs:[]},homeTab:'videos',introTab:'',viewEventId:'',admin:false,adminPw:'',adminSet:true,route:'intro',songTab:'good',campTab:'event',eventId:localStorage.getItem('dgsce.event')||'',teamCount:5,roomDraft:null,modal:null};

var $=function(s){return document.querySelector(s);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmtDate(t){return t?new Date(t).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}):'';}
function fmtSize(n){return n>=1048576?(n/1048576).toFixed(1)+'MB':Math.max(1,Math.round(n/1024))+'KB';}
function val(f,name){var e=f.elements[name];return e&&e.value!=null?String(e.value).trim():'';}
function setErr(f,msg){var e=f.querySelector('.err');if(e)e.textContent=msg;}
function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show');},2400);}
function openModal(type,extra){state.modal=Object.assign({type:type},extra||{});renderModal();}
function closeModal(){state.modal=null;$('#overlay').classList.remove('open');$('#panel').innerHTML='';}

/* 서버 호출: 앱스크립트 웹 앱에 요청을 보내고 결과를 받습니다 */
function call(fn){
  var args=[].slice.call(arguments,1);
  return fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:fn,args:args})})
    .then(function(r){return r.json();})
    .then(function(j){if(!j.ok)throw new Error(j.error||'서버 오류');return j.result;});
}
function readB64(file){return new Promise(function(res,rej){var r=new FileReader();r.onerror=function(){rej(new Error('파일을 읽지 못했습니다.'));};r.onload=function(){res(String(r.result).split(',')[1]);};r.readAsDataURL(file);});}
async function uploadFile(file,maxMB){
  if(file.size>maxMB*1048576)throw new Error(maxMB+'MB 이하만 올릴 수 있습니다.');
  return call('api_upload',file.name,file.type||'application/octet-stream',await readB64(file));
}
async function loadAll(){
  var r=await call('api_load',state.adminPw);
  state.data=r.data;state.adminSet=r.adminSet;state.admin=r.admin;
  refresh();
}
function isEditing(){var a=document.activeElement;return !!(a&&$('#view').contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName));}
function refresh(){if(!isEditing())render();}

/* ---------- 게시판 공통 ---------- */
var byDate=function(a,b){return (b.createdAt||0)-(a.createdAt||0);};
function excerpt(p){return (p.desc||'').replace(/\s+/g,' ').slice(0,80);}
function postCard(key,p){var cfg=BOARDS[key];var img=cfg.image&&p.image?'<img src="'+esc(p.image)+'" alt="">':'';var title=cfg.titleField?p.title:excerpt(p);return '<article class="card" tabindex="0" data-act="open" data-key="'+key+'" data-id="'+p.id+'">'+img+'<h3>'+esc(title||'(제목 없음)')+'</h3>'+(cfg.titleField&&p.desc?'<p class="excerpt">'+esc(excerpt(p))+'</p>':'')+'<p class="meta">'+esc(p.name)+' · '+fmtDate(p.createdAt)+' · 조회 '+(p.views||0)+' · 좋아요 '+(p.likes||0)+'</p></article>';}
function boardHTML(key){var cfg=BOARDS[key];var list=(state.data[cfg.coll]||[]).slice().sort(byDate);var btnLabel=key==='photos'?'사진 올리기':'글쓰기';return '<div class="bar"><h2>'+cfg.title+'</h2><button class="btn" data-act="write" data-key="'+key+'">'+btnLabel+'</button></div><p class="hint">'+esc(cfg.hint)+'</p><div class="cards">'+(list.map(function(p){return postCard(key,p);}).join('')||'<p class="empty">아직 올라온 글이 없습니다.</p>')+'</div>';}
function findPost(key,id){return (state.data[BOARDS[key].coll]||[]).find(function(p){return p.id===id;});}
function liked(key,id){try{return !!localStorage.getItem('lk:'+key+':'+id);}catch(e){return false;}}
function markLiked(key,id){try{localStorage.setItem('lk:'+key+':'+id,'1');}catch(e){}}

/* ---------- 화면 ---------- */
/* 메인 화면: 위쪽에 사역계획(왼쪽)과 포스터(오른쪽), 가운데 게시판 뷰어, 아래에 소개 */
function pinnedEvent(){return (state.data.cal||[]).find(function(c){return c.pinned;})||null;}
function posterOf(ev){
  if(ev.image)return ev.image;
  if(ev.mainPoster&&ev.mainPoster.url)return ev.mainPoster.url;
  var docs=(state.data.eventdocs||[]).filter(function(d){return d.eventId===ev.id&&d.kind==='poster'&&d.image;}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
  return docs[0]?docs[0].image:(ev.image||'');
}
/* 앞으로 다가올 사역: 사역계획 + 사역달력의 일정 (지난 일정은 제외), 1번 고정 행사가 맨 위 */
function upcomingItems(){
  var t=todayISO();
  var items=(state.data.plans||[]).filter(function(p){return String(p.date)>=t;}).map(function(p){return {date:p.date||'',title:p.title,desc:p.desc,ev:false,id:p.id};})
    .concat((state.data.cal||[]).filter(function(c){return String(c.date)>=t;}).map(function(c){return {date:c.date||'',title:c.title,desc:(c.time?c.time+' · ':'')+(c.name||''),ev:true,id:c.id,pinned:!!c.pinned};}));
  items.sort(function(a,b){
    if(!!a.pinned!==!!b.pinned)return a.pinned?-1:1;
    return String(a.date).localeCompare(String(b.date))||String(a.title).localeCompare(String(b.title));
  });
  return items;
}
function pitemHTML(it){
  var del=(state.admin&&!it.ev)?'<button class="btn ghost small" data-act="planDel" data-id="'+it.id+'">삭제</button>':'';
  return '<div class="pitem"><span class="pdate">'+esc(it.date||'날짜 미정')+'</span><div class="pbody"><h3>'+esc(it.title)+(it.pinned?' <span class="role sun">1번</span>':'')+'</h3>'+(it.desc?'<p class="meta">'+esc(it.desc)+'</p>':'')+
    '<div class="pactions">'+(it.ev?'<button class="btn small" data-act="viewEvent" data-id="'+it.id+'" aria-pressed="'+(state.viewEventId===it.id)+'">뷰어로 보이기</button>':'')+del+'</div></div></div>';
}
function planPanelHTML(){
  var list=upcomingItems();var pages=Math.max(1,Math.ceil(list.length/3));
  var pg=Math.min(Math.max(0,state.homePage||0),pages-1);state.homePage=pg;
  var html=list.slice(pg*3,pg*3+3).map(pitemHTML).join('')||'<p class="empty">앞으로 예정된 사역이 없습니다.</p>';
  var nav=list.length>3?'<div class="evnav"><button class="btn ghost small" data-act="homePg" data-d="-1" '+(pg===0?'disabled':'')+'>◀ 이전</button><span class="meta">'+(pg+1)+' / '+pages+'</span><button class="btn ghost small" data-act="homePg" data-d="1" '+(pg>=pages-1?'disabled':'')+'>다음 ▶</button></div>':'';
  return '<div class="col"><div class="panel-head"><h2>사역계획</h2><a class="meta" href="#plan">전체 보기 →</a></div><div class="plist-wrap"><div class="plist">'+html+'</div>'+nav+'</div></div>';
}
function posterPanelHTML(){
  var ev=(state.viewEventId&&(state.data.cal||[]).find(function(c){return c.id===state.viewEventId;}))||pinnedEvent();
  if(!ev)return '<div class="col"><div class="panel-head"><h2>포스터</h2></div><div class="poster-box empty-box"><p>청소년 캠프에서 행사를 1번으로 고정하면 여기에 이미지가 나타납니다.</p></div></div>';
  var poster=posterOf(ev);
  if(!poster)return '<div class="col"><div class="panel-head"><h2 class="ell">'+esc(ev.title)+'</h2></div><div class="poster-box empty-box"><p>이 행사의 이미지가 아직 없습니다. 청소년 캠프 &gt; 행사안내 &gt; 편집하기에서 올려 주세요.</p></div></div>';
  return '<div class="col"><div class="panel-head"><h2 class="ell">'+esc(ev.title)+'</h2></div><div class="poster-box" data-act="posterGo" data-id="'+ev.id+'" role="button" tabindex="0"><img src="'+esc(poster)+'" alt="'+esc(ev.title)+'"></div></div>';
}
function homeViewerHTML(){
  var tab=state.homeTab||'videos';
  var tabs=[['videos','영상'],['photos','사진'],['songs','찬양']];
  return '<div class="tabs">'+tabs.map(function(t){return '<button aria-pressed="'+(tab===t[0])+'" data-act="homeTab" data-tab="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div><div class="viewer">'+boardHTML(tab)+'</div>';
}
/* SCE소개: 소개글 상자 + 세 개의 버튼(뺏지 설명·강령·운동가) + 함께 하는 단체 */
var INTRO_TABS={badge:'SCE 뺏지 설명',creed:'SCE 강령',song:'SCE운동가'};
function introDetailHTML(){
  var k=state.introTab;if(!k||!INTRO_TABS[k])return '';
  return '<section class="introbox"><div class="bar"><h2>'+INTRO_TABS[k]+'</h2><button class="btn ghost small" data-act="introTab" data-tab="'+k+'">닫기</button></div><p class="empty" style="margin:0">'+INTRO_TABS[k]+'의 내용은 아직 준비 중입니다. 내용을 알려 주시면 이 자리에 넣겠습니다.</p></section>';
}
function vIntro(){
  var btns=Object.keys(INTRO_TABS).map(function(k){return '<button class="ibtn" aria-pressed="'+(state.introTab===k)+'" data-act="introTab" data-tab="'+k+'">'+INTRO_TABS[k]+'</button>';}).join('');
  return '<section class="hero"><p class="kicker">DAEGYEONG SCE</p><h2>장소가 아니라 사람을 세우는 청소년 사역</h2><p>대구·경북 지역 청소년들과 함께 예수님을 만나고 자라도록 섬기는 사역단체입니다. <small>(소개 문구는 초안이므로 수정해 주세요)</small></p><div class="ibtns">'+btns+'</div></section>'+
    introDetailHTML()+
    '<section><h2>함께 하는 단체</h2><div class="linkgrid">'+LINKS.map(function(l){return l.url?'<a href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.label)+' ↗</a>':'<span class="off">'+esc(l.label)+'<br><small>주소 준비 중</small></span>';}).join('')+'</div></section>';
}
/* 메인: 위쪽 사역계획 · 포스터, 아래 영상 · 사진 · 찬양 게시판 */
function homeBoardSec(key){
  var cfg=BOARDS[key];var list=(state.data[cfg.coll]||[]).slice().sort(byDate).slice(0,3);
  return '<section><div class="bar"><h2>'+cfg.title+'</h2><a class="meta" href="#'+key+'">더보기 →</a></div><div class="cards">'+(list.map(function(p){return postCard(key,p);}).join('')||'<p class="empty">아직 올라온 글이 없습니다.</p>')+'</div></section>';
}
function vHome(){
  return '<section><div class="homeTop">'+planPanelHTML()+posterPanelHTML()+'</div></section>'+homeBoardSec('videos')+homeBoardSec('photos')+homeBoardSec('songs');
}
function vPeople(){return '<section><h2>섬기는 분들</h2><div class="cards">'+LEADERS.map(function(l){return '<article class="card"><span class="role '+l.cls+'">'+esc(l.role)+'</span><h3>'+esc(l.name)+'</h3>'+(l.church?'<p class="meta">'+esc(l.church)+'</p>':'')+'</article>';}).join('')+'</div></section>';}
function vPlan(){
  var addBtn=state.admin?'<button class="btn small" data-act="planNew">일정 추가</button>':'';
  var left=upcomingItems().map(pitemHTML).join('')||'<p class="empty">앞으로 예정된 사역이 없습니다.</p>';
  return '<section><div class="split"><div class="col"><div class="bar"><h2>계획 중인 사역</h2>'+addBtn+'</div>'+left+'</div><div class="col"><h2>사역달력</h2><p class="hint">날짜를 누르면 그날의 일정이 보입니다. 시간을 정해 행사를 남길 수 있습니다.</p>'+calHTML()+'</div></div></section>';
}
function vBoard(key){return '<section>'+boardHTML(key)+'</section>';}
function vSongs(){
  var tabs=[['good','좋은 찬양'],['sheet','악보 파일']];
  var key={good:'songs',sheet:'sheets'}[state.songTab]||'songs';
  return '<section><div class="tabs">'+tabs.map(function(t){return '<button aria-pressed="'+(state.songTab===t[0])+'" data-act="songTab" data-tab="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'+boardHTML(key)+'</section>';
}
/* 교회들의 소리함: 게시판 목록 + 답글이 달린 글은 바로 아래에 답글 줄이 보입니다 */
function vVoice(){
  var cfg=BOARDS.suggestions;
  var list=(state.data.suggestions||[]).slice().sort(byDate);
  var rows=list.map(function(p,i){
    var n=list.length-i;var has=!!p.reply;
    var main='<tr class="brow" data-act="open" data-key="suggestions" data-id="'+p.id+'" tabindex="0"><td class="num">'+n+'</td><td class="ttl">'+(has?'<span class="rbadge">답글</span>':'')+esc(p.title||excerpt(p)||'(제목 없음)')+'</td><td>'+esc(p.church)+'</td><td>'+esc(p.role)+'</td><td>'+esc(p.name)+'</td><td>'+fmtDate(p.createdAt)+'</td><td>'+(p.views||0)+'</td><td>'+(p.likes||0)+'</td></tr>';
    var reply=has?'<tr class="rrow" data-act="open" data-key="suggestions" data-id="'+p.id+'"><td></td><td colspan="7"><span class="rtag">↳ 관리자 답글</span> '+esc(String(p.reply).replace(/\s+/g,' ').slice(0,120))+' <span class="meta">· '+fmtDate(p.replyAt)+'</span></td></tr>':'';
    return main+reply;
  }).join('');
  return '<section><div class="bar"><h2>'+cfg.title+'</h2><button class="btn" data-act="write" data-key="suggestions">글쓰기</button></div><p class="hint">'+esc(cfg.hint)+'</p>'+
    '<div class="table-wrap"><table class="board"><tr><th>번호</th><th>제목</th><th>교회</th><th>직분</th><th>작성자</th><th>날짜</th><th>조회</th><th>좋아요</th></tr>'+(rows||'<tr><td colspan="8" class="nil">아직 올라온 글이 없습니다.</td></tr>')+'</table></div></section>';
}
var VIEWS={home:vHome,intro:vIntro,people:vPeople,plan:vPlan,videos:function(){return vBoard('videos');},photos:function(){return vBoard('photos');},songs:vSongs,camp:function(){return vCamp();},voice:vVoice};
function render(){
  $('#view').innerHTML=VIEWS[state.route]();
  renderModal(true);
}
function renderAdminState(){
  var b=$('#adminBtn');b.textContent=state.admin?'관리자 로그아웃':'관리자';b.dataset.act=state.admin?'adminLogout':'adminOpen';
  render();
}
function route(){
  var h=location.hash.replace('#','');
  state.route=['home','intro','people','plan','videos','photos','songs','camp','voice'].indexOf(h)>=0?h:'home';
  document.querySelectorAll('#nav a').forEach(function(a){a.setAttribute('aria-current',a.dataset.route===state.route?'page':'false');});
  render();window.scrollTo({top:0});
}
window.addEventListener('hashchange',route);

/* ---------- 모달 ---------- */
function renderModal(keep){
  var m=state.modal;
  if(!m){$('#overlay').classList.remove('open');return;}
  if(keep&&['write','photos','cal','plan','event','reg','edoc','evinfo'].indexOf(m.type)>=0)return;
  $('#overlay').classList.add('open');
  $('#panel').innerHTML='<button class="x" data-act="close" aria-label="닫기">×</button>'+modalBody(m);
}
function modalBody(m){
  if(m.type==='detail')return detailHTML(m.key,findPost(m.key,m.id));
  if(m.type==='pw')return '<form data-form="pw"><h3>비밀번호 확인</h3><p class="hint">'+(m.then==='del'?'삭제':'수정')+'하려면 글을 쓸 때 정한 비밀번호를 입력하세요.</p><label>비밀번호<input type="password" name="pw" required></label><p class="err"></p><div class="actions"><button type="button" class="btn ghost" data-act="close">취소</button><button class="btn '+(m.then==='del'?'dark':'')+'">'+(m.then==='del'?'삭제하기':'수정하기')+'</button></div></form>';
  if(m.type==='write')return writeFormHTML(m);
  if(m.type==='photos')return photosFormHTML();
  if(m.type==='cal')return calFormHTML(m.date);
  if(m.type==='admin')return adminFormHTML();
  if(m.type==='event')return '<form data-form="event"><h3>행사 만들기</h3><label>행사 제목<input name="title" required></label><div class="row2"><label>날짜<input type="date" name="date"></label><label>장소<input name="place"></label></div><p class="err"></p><div class="actions"><button class="btn">만들기</button></div></form>';
  if(m.type==='plan')return '<form data-form="plan"><h3>일정 추가</h3><div class="row2"><label>날짜<input type="date" name="date" required></label><label>제목<input name="title" required></label></div><label>내용<textarea name="desc"></textarea></label><p class="err"></p><div class="actions"><button class="btn">추가</button></div></form>';
  if(m.type==='reg')return regFormHTML(m.id);
  if(m.type==='edoc')return edocFormHTML(m);
  if(m.type==='evinfo')return evinfoFormHTML(m);
  return '';
}
function detailHTML(key,p){
  if(!p)return '<p class="empty">글이 삭제되었거나 찾을 수 없습니다.</p>';
  var cfg=BOARDS[key];var isLiked=liked(key,p.id);var b='';
  if(p.image)b+='<img class="shot" src="'+esc(p.image)+'" alt="">';
  if(cfg.titleField)b+='<h2>'+esc(p.title)+'</h2>';
  if(key==='suggestions')b+='<p class="meta">'+esc(p.church)+' · '+esc(p.role)+(state.admin?' · '+esc(p.contact):'')+'</p>';
  else b+='<p class="meta">'+esc(p.singer||'')+'</p>';
  if(p.url)b+='<p><a class="btn ghost small" href="'+esc(p.url)+'">유튜브에서 보기 ↗</a></p>';
  b+='<p class="desc">'+esc(p.desc).replace(/\n/g,'<br>')+'</p>';
  if(p.file)b+='<p><a class="btn" href="'+esc(p.file.url)+'">'+esc(p.file.name)+' 받기 ('+fmtSize(p.file.size||0)+')</a></p>';
  if(cfg.reply){
    if(p.reply)b+='<div class="reply"><b>관리자 답글</b><br>'+esc(p.reply).replace(/\n/g,'<br>')+'<div class="meta">'+fmtDate(p.replyAt)+'</div></div>';
    if(state.admin)b+='<form data-form="reply" data-key="'+key+'" data-id="'+p.id+'"><label>답글 작성<textarea name="reply">'+esc(p.reply||'')+'</textarea></label><div class="actions"><button class="btn small">답글 저장</button></div></form>';
  }
  b+='<p class="meta" style="margin-top:14px">'+esc(p.name)+' · '+fmtDate(p.createdAt)+' · 조회 '+(p.views||0)+'</p>';
  b+='<div class="actions"><button class="btn '+(isLiked?'dark':'ghost')+' small" data-act="like" data-key="'+key+'" data-id="'+p.id+'" '+(isLiked?'disabled':'')+'>좋아요 '+(p.likes||0)+'</button><button class="btn ghost small" data-act="edit" data-key="'+key+'" data-id="'+p.id+'">수정</button><button class="btn ghost small" data-act="del" data-key="'+key+'" data-id="'+p.id+'">삭제</button></div>';
  return b;
}
function writeFormHTML(m){
  var cfg=BOARDS[m.key];var p=m.post||{};var isEdit=!!m.post;
  var fields=cfg.fields.map(function(f){var req=f.req?' required':'';return f.type==='textarea'?'<label>'+f.label+'<textarea name="'+f.k+'"'+req+'>'+esc(p[f.k]||'')+'</textarea></label>':'<label>'+f.label+'<input name="'+f.k+'" '+(f.type==='url'?'type="url"':'')+' value="'+esc(p[f.k]||'')+'"'+req+'></label>';}).join('');
  var title=cfg.titleField?'<label>제목<input name="title" value="'+esc(p.title||'')+'" required></label>':'';
  var file=cfg.file?'<label>파일 선택 (30MB 이하)<input type="file" name="file"'+(isEdit?'':' required')+'></label>':(cfg.image?'<label>사진 선택 (선택)<input type="file" name="image" accept="image/*"></label>':'');
  var auth=isEdit?'':'<div class="row2"><label>이름<input name="name" required></label><label>비밀번호<input type="password" name="pw" required placeholder="수정·삭제에 쓰입니다"></label></div>';
  return '<form data-form="write" data-key="'+m.key+'" data-id="'+(p.id||'')+'" data-pw="'+esc(m.pw||'')+'"><h3>'+(isEdit?'글 수정':'글쓰기')+' · '+cfg.title+'</h3>'+title+fields+file+auth+'<p class="err"></p><div class="actions"><button type="button" class="btn ghost" data-act="close">취소</button><button class="btn">'+(isEdit?'저장':'등록')+'</button></div></form>';
}
function photosFormHTML(){return '<form data-form="photos"><h3>사진 여러 장 올리기</h3><p class="hint">사진을 한꺼번에 고르면 장마다 하나의 글로 등록됩니다. 장당 10MB 이하.</p><label>설명<textarea name="desc"></textarea></label><label>사진 파일 (여러 장 선택)<input type="file" name="files" accept="image/*" multiple required></label><div class="row2"><label>이름<input name="name" required></label><label>비밀번호<input type="password" name="pw" required></label></div><p class="err"></p><div class="actions"><button type="button" class="btn ghost" data-act="close">취소</button><button class="btn">올리기</button></div></form>';}
function calFormHTML(date){return '<form data-form="calEvent"><h3>행사 남기기</h3><div class="row2"><label>날짜<input type="date" name="date" value="'+esc(date)+'" required></label><label>시간<input type="time" name="time" required></label></div><label>행사 제목<input name="title" required></label><label>내용<textarea name="memo"></textarea></label><div class="row2"><label>이름<input name="name" required></label><label>비밀번호<input type="password" name="pw" required placeholder="삭제할 때 필요합니다"></label></div><p class="err"></p><div class="actions"><button type="button" class="btn ghost" data-act="close">취소</button><button class="btn">등록</button></div></form>';}
function adminFormHTML(){
  if(!state.adminSet)return '<form data-form="adminSetup"><h3>관리자 비밀번호 처음 설정</h3><p class="hint">사용할 비밀번호를 정해 주세요 (4자 이상). 저장된 값은 암호화됩니다.</p><label>새 비밀번호<input type="password" name="pw" required minlength="4"></label><p class="err"></p><div class="actions"><button class="btn">설정</button></div></form>';
  return '<form data-form="adminLogin"><h3>관리자 로그인</h3><label>비밀번호<input type="password" name="pw" required></label><p class="err"></p><div class="actions"><button class="btn">로그인</button></div></form>';
}

/* ---------- 사역달력 ---------- */
function todayISO(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});}
function calInit(){if(!state.calDay)state.calDay=todayISO();if(!state.calYM)state.calYM=state.calDay.slice(0,7);}
function calHTML(){
  calInit();var parts=state.calYM.split('-').map(Number);var y=parts[0],mo=parts[1];
  var lead=new Date(Date.UTC(y,mo-1,1)).getUTCDay();var days=new Date(Date.UTC(y,mo,0)).getUTCDate();
  var cells='';for(var i=0;i<lead;i++)cells+='<span></span>';
  for(var d=1;d<=days;d++){
    var iso=state.calYM+'-'+String(d).padStart(2,'0');
    var np=state.data.plans.filter(function(p){return p.date===iso;}).length;
    var ne=state.data.cal.filter(function(c){return c.date===iso;}).length;
    cells+='<button class="calday" aria-pressed="'+(iso===state.calDay)+'" data-act="calDay" data-iso="'+iso+'">'+d+((np||ne)?'<i>'+(np?'<b class="p"></b>':'')+(ne?'<b class="e"></b>':'')+'</i>':'')+'</button>';
  }
  var dayPlans=state.data.plans.filter(function(p){return p.date===state.calDay;});
  var dayEvs=state.data.cal.filter(function(c){return c.date===state.calDay;}).sort(function(a,b){return String(a.time).localeCompare(String(b.time));});
  var dow=new Date(state.calDay+'T00:00:00+09:00').toLocaleDateString('ko-KR',{weekday:'long',timeZone:'Asia/Seoul'});
  var evHTML=dayEvs.map(function(c){return '<div class="person"><b>'+esc(c.time)+'</b> '+esc(c.title)+' · '+esc(c.name)+(c.memo?'<br><span class="meta">'+esc(c.memo)+'</span>':'')+' <button class="btn ghost small" data-act="calDel" data-id="'+c.id+'">삭제</button></div>';}).join('');
  return '<div class="calbar"><button class="btn ghost small" data-act="calMove" data-d="-1">이전달</button><b>'+y+'년 '+mo+'월</b><button class="btn ghost small" data-act="calMove" data-d="1">다음달</button></div>'+
    '<div class="calhead">'+['일','월','화','수','목','금','토'].map(function(w){return '<span>'+w+'</span>';}).join('')+'</div><div class="calgrid">'+cells+'</div>'+
    '<div class="legend"><span><b class="p"></b>사역 계획</span><span><b class="e"></b>행사 일정</span></div>'+
    '<div class="calday-panel"><div class="bar"><h3>'+state.calDay+' '+dow+'</h3><button class="btn small" data-act="calNew">이 날 행사 남기기</button></div>'+
    dayPlans.map(function(p){return '<div class="person"><b>사역 계획</b> '+esc(p.title)+'</div>';}).join('')+
    (evHTML||(dayPlans.length?'':'<p class="empty">이 날 남겨진 일정이 없습니다.</p>'))+'</div>';
}

/* ---------- 이벤트: 클릭 · 제출 ---------- */
var ACT={
  close:function(){closeModal();},
  adminOpen:function(){openModal('admin');},
  adminLogout:function(){state.admin=false;state.adminPw='';toast('로그아웃했습니다.');loadAll();renderAdminState();},
  write:function(d){openModal(d.key==='photos'?'photos':'write',{key:d.key,post:null});},
  open:function(d){var k='v:'+d.key+':'+d.id;try{if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');call('api_bump',BOARDS[d.key].coll,d.id,'views').then(loadAll).catch(function(){});}}catch(e){}openModal('detail',{key:d.key,id:d.id});},
  like:function(d){if(liked(d.key,d.id))return;markLiked(d.key,d.id);call('api_bump',BOARDS[d.key].coll,d.id,'likes').then(loadAll).catch(function(){toast('좋아요를 저장하지 못했습니다.');});},
  edit:function(d){if(state.admin)openModal('write',{key:d.key,id:d.id,post:findPost(d.key,d.id),pw:state.adminPw});else openModal('pw',{key:d.key,id:d.id,then:'edit'});},
  del:function(d){openModal('pw',{key:d.key,id:d.id,then:'del'});},
  songTab:function(d){state.songTab=d.tab;render();},
  campTab:function(d){state.campTab=d.tab;render();},
  calDay:function(d){state.calDay=d.iso;render();},
  calMove:function(d){calInit();var p=state.calYM.split('-').map(Number);var t=new Date(Date.UTC(p[0],p[1]-1+Number(d.d),1));state.calYM=t.getUTCFullYear()+'-'+String(t.getUTCMonth()+1).padStart(2,'0');render();},
  calNew:function(){calInit();openModal('cal',{date:state.calDay});},
  calDel:function(d){if(state.admin)call('api_delete','cal',d.id,state.adminPw).then(loadAll).catch(function(e){toast(e.message);});else openModal('pw',{key:'cal',id:d.id,then:'del'});},
  introTab:function(d){state.introTab=state.introTab===d.tab?'':d.tab;render();},
  homePg:function(d){state.homePage=Math.max(0,(state.homePage||0)+Number(d.d));render();},
  homeTab:function(d){state.homeTab=d.tab;render();},
  viewEvent:function(d){state.viewEventId=d.id;render();},
  posterGo:function(d){state.eventId=d.id;state.campTab='event';state.roomDraft=null;localStorage.setItem('dgsce.event',d.id);if(location.hash==='#camp')route();else location.hash='#camp';},
  planNew:function(){if(state.admin)openModal('plan');},
  planDel:function(d){if(state.admin)call('api_delete','plans',d.id,state.adminPw).then(loadAll).catch(function(e){toast(e.message);});}
};
document.addEventListener('click',function(e){
  if(e.target.id==='overlay'){closeModal();return;}
  var el=e.target.closest('[data-act]');if(!el)return;
  var fn=ACT[el.dataset.act];if(!fn)return;
  if(el.dataset.act==='open'&&e.target.closest('a'))return;
  fn(el.dataset);
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
document.addEventListener('submit',function(e){
  var f=e.target;var k=f.dataset.form;if(!k)return;e.preventDefault();
  if(SUBMIT[k])SUBMIT[k](f).catch(function(err){setErr(f,err.message||String(err));});
});
document.addEventListener('change',function(e){if(e.target.dataset.bind)bindInput(e.target);});
document.addEventListener('input',function(e){if(e.target.dataset.bind)bindInput(e.target);});
function bindInput(t){
  var b=t.dataset.bind;
  if(b==='teamCount'){state.teamCount=Math.max(1,+t.value||1);return;}
  var m=b.match(/^room:(\d+):(\w+)$/);
  if(m){var r=draftRooms()[+m[1]];if(r)r[m[2]]=m[2]==='gender'?t.value:Math.max(1,+t.value||1);}
}

async function saveBoard(f){
  var key=f.dataset.key,cfg=BOARDS[key],id=f.dataset.id,editing=!!id;
  var pw=editing?(f.dataset.pw||state.adminPw):val(f,'pw');
  var name=editing?'':val(f,'name');
  var data={};
  if(cfg.titleField)data.title=val(f,'title');
  cfg.fields.forEach(function(x){data[x.k]=val(f,x.k);});
  var missing=(cfg.titleField&&!data.title)||cfg.fields.some(function(x){return x.req&&!data[x.k];})||(!editing&&(!name||!pw));
  if(missing){setErr(f,cfg.requiredAll?'빈칸이 있습니다. 모두 채워주세요.':'필수 항목을 입력해 주세요.');return;}
  if(data.url&&!/^https?:\/\//.test(data.url)){setErr(f,'유튜브 주소는 https://로 시작해야 합니다.');return;}
  var btn=f.querySelector('button:not([data-act])');if(btn)btn.disabled=true;
  try{
    var img=f.elements.image&&f.elements.image.files[0];
    if(img)data.image=(await uploadFile(img,10)).url;
    var file=f.elements.file&&f.elements.file.files[0];
    if(file)data.file=await uploadFile(file,30);
    if(editing){await call('api_update',cfg.coll,id,data,pw);toast('수정되었습니다.');}
    else{data.name=name;data.pw=pw;await call('api_create',cfg.coll,data,'');toast('등록되었습니다.');}
    closeModal();await loadAll();
  }catch(e){setErr(f,e.message);if(btn)btn.disabled=false;}
}
async function submitPw(f){
  var m=state.modal;var pw=val(f,'pw');
  try{
    if(m.then==='del'){await call('api_delete',BOARDS[m.key].coll,m.id,pw);toast('삭제되었습니다.');closeModal();await loadAll();}
    else{await call('api_checkPost',BOARDS[m.key].coll,m.id,pw);state.modal={type:'write',key:m.key,id:m.id,post:findPost(m.key,m.id),pw:pw};renderModal();}
  }catch(e){setErr(f,e.message);}
}
var SUBMIT={
  edoc:async function(f){
    var kind=val(f,'kind'),title=val(f,'title'),desc=val(f,'desc'),id=f.dataset.id,eventId=f.dataset.event;
    var file=f.elements.file.files[0];var isImg=file&&/^image\//.test(file.type);
    if(!title){setErr(f,'제목을 입력해 주세요.');return;}
    if(!id&&kind==='poster'&&!file){setErr(f,'포스터 이미지를 골라 주세요.');return;}
    if(kind==='poster'&&file&&!isImg){setErr(f,'포스터는 이미지 파일이어야 합니다.');return;}
    var btn=f.querySelector('button:not([data-act])');btn.disabled=true;
    try{
      var data={kind:kind,title:title,desc:desc};
      if(file){var s=await uploadFile(file,isImg?10:30);if(isImg)data.image=s.url;else{data.file=s.url;data.fileName=file.name;}}
      if(id)await call('api_update','eventdocs',id,data,state.adminPw);
      else{data.eventId=eventId;await call('api_create','eventdocs',data,state.adminPw);}
      closeModal();toast(id?'수정되었습니다.':'올렸습니다.');await loadAll();
    }catch(e){setErr(f,e.message);btn.disabled=false;}
  },
  write:saveBoard,
  pw:submitPw,
  photos:async function(f){
    var files=[].slice.call(f.elements.files.files||[]);var name=val(f,'name'),pw=val(f,'pw'),desc=val(f,'desc');
    if(!files.length||!name||!pw){setErr(f,'사진, 이름, 비밀번호를 입력해 주세요.');return;}
    var btn=f.querySelector('button:not([data-act])');btn.disabled=true;var done=0;
    try{
      for(var i=0;i<files.length;i++){
        setErr(f,(i+1)+'/'+files.length+'장 올리는 중...');
        var s=await uploadFile(files[i],10);
        await call('api_create','photos',{title:files[i].name.replace(/\.[^.]+$/,''),desc:desc,image:s.url,name:name,pw:pw},'');
        done++;
      }
      closeModal();toast(done+'장을 올렸습니다.');await loadAll();
    }catch(e){setErr(f,done+'장까지 올라갔습니다. '+(e.message||''));btn.disabled=false;loadAll();}
  },
  calEvent:async function(f){
    var date=val(f,'date'),time=val(f,'time'),title=val(f,'title'),name=val(f,'name'),pw=val(f,'pw');
    if(!date||!time||!title||!name||!pw){setErr(f,'날짜, 시간, 제목, 이름, 비밀번호를 모두 입력해 주세요.');return;}
    await call('api_create','cal',{date:date,time:time,title:title,memo:val(f,'memo'),name:name,pw:pw},'');
    state.calDay=date;state.calYM=date.slice(0,7);closeModal();toast('행사가 달력에 남겨졌습니다.');await loadAll();
  },
  adminSetup:async function(f){
    var pw=val(f,'pw');if(pw.length<4){setErr(f,'4자 이상 입력해 주세요.');return;}
    await call('api_setupAdmin',pw);state.adminPw=pw;state.adminSet=true;closeModal();toast('관리자 설정이 완료되었습니다.');await loadAll();renderAdminState();
  },
  adminLogin:async function(f){
    var pw=val(f,'pw');
    var ok=await call('api_checkAdmin',pw);
    if(!ok){setErr(f,'비밀번호가 맞지 않습니다.');return;}
    state.adminPw=pw;closeModal();toast('관리자로 로그인했습니다.');await loadAll();renderAdminState();
  },
  reply:async function(f){await call('api_update',BOARDS[f.dataset.key].coll,f.dataset.id,{reply:val(f,'reply'),replyAt:Date.now()},state.adminPw);toast('답글을 저장했습니다.');await loadAll();},
  event:async function(f){
    var title=val(f,'title');if(!title){setErr(f,'행사 제목을 입력해 주세요.');return;}
    var id=await call('api_create','events',{title:title,date:val(f,'date'),place:val(f,'place')},state.adminPw);
    state.eventId=id;localStorage.setItem('dgsce.event',id);closeModal();toast('행사가 등록되었습니다.');await loadAll();
  },
  plan:async function(f){
    var date=val(f,'date'),title=val(f,'title');if(!date||!title){setErr(f,'날짜와 제목을 입력해 주세요.');return;}
    await call('api_create','plans',{date:date,title:title,desc:val(f,'desc')},state.adminPw);closeModal();toast('일정이 추가되었습니다.');await loadAll();
  }
};

/* ---------- 시작 ---------- */
window.addEventListener('load',function(){
  route();
  loadAll().catch(function(e){$('#dbNotice').innerHTML='<div class="notice">서버에서 자료를 불러오지 못했습니다: '+esc(e.message)+'</div>';});
  setInterval(function(){if(!isEditing()&&!state.modal)loadAll().catch(function(){});},30000);
});
