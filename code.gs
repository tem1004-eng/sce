/**
 * 대경SCE 청소년 사역 홈페이지 - 서버 (Google Apps Script)
 *
 * 데이터: 이 스크립트가 처음 실행될 때 만들어지는 구글 스프레드시트 '대경SCE 데이터'
 * 파일(사진·악보): 구글 드라이브의 '대경SCE 업로드' 폴더
 *
 * 배포: 편집기 > 배포 > 새 배포 > 유형 '웹 앱'
 *       실행 사용자: 나 / 액세스 권한: 링크가 있는 모든 사용자
 */

var SHEET_PROP = 'DGSCE_SHEET_ID';
var FOLDER_PROP = 'DGSCE_FOLDER_ID';
var COLLECTIONS = ['videos', 'photos', 'songs', 'campsongs', 'sheets', 'suggestions', 'events', 'regs', 'plans', 'cal', 'eventdocs'];
var ADMIN_ONLY = ['events', 'regs', 'plans', 'eventdocs'];
var SALT = 'dgsce:';
var MAX_FILE_MB = 30;
/* ---------- 웹 앱 입구 ----------
   화면(index.html 등)은 깃허브 페이지에 있고, 이 스크립트는 자료만 주고받습니다.
   화면에서 보내는 요청: { fn: '함수이름', args: [...] } (이름은 api_ 로 시작하는 것만 허용) */
function doGet() {
  return ContentService.createTextOutput('대경SCE 서버가 작동 중입니다.');
}

function doPost(e) {
  var out = { ok: false, error: '' };
  try {
    var body = JSON.parse(e.postData.contents);
    var name = String(body.fn || '');
    var fn = globalThis[name];
    if (name.indexOf('api_') !== 0 || typeof fn !== 'function') throw new Error('잘못된 요청입니다.');
    out.result = fn.apply(null, body.args || []);
    out.ok = true;
  } catch (err) {
    out.error = err && err.message ? err.message : String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 저장소 (스프레드시트 · 드라이브) ---------- */
function ss_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SHEET_PROP);
  if (!id) {
    id = SpreadsheetApp.create('대경SCE 데이터').getId();
    props.setProperty(SHEET_PROP, id);
  }
  return SpreadsheetApp.openById(id);
}

function folder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(FOLDER_PROP);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* 폴더가 없으면 새로 만듭니다 */ }
  }
  var f = DriveApp.createFolder('대경SCE 업로드');
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  props.setProperty(FOLDER_PROP, f.getId());
  return f;
}

/* 컬렉션 하나 = 시트 하나. A열 id, B열 JSON */
function sheet_(name) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(['id', 'json']);
  }
  return sh;
}

function readAll_(name) {
  var sh = sheet_(name);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) { var o = JSON.parse(r[1]); o.id = String(r[0]); return o; });
}

function rowOf_(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function getOne_(name, id) {
  var sh = sheet_(name);
  var row = rowOf_(sh, id);
  if (row < 0) return null;
  var o = JSON.parse(sh.getRange(row, 2).getValue());
  o.id = String(id);
  return o;
}

function put_(name, id, obj) {
  var sh = sheet_(name);
  var row = rowOf_(sh, id);
  var rec = [String(id), JSON.stringify(obj)];
  if (row < 0) sh.appendRow(rec);
  else sh.getRange(row, 1, 1, 2).setValues([rec]);
}

function remove_(name, id) {
  var sh = sheet_(name);
  var row = rowOf_(sh, id);
  if (row > 0) sh.deleteRow(row);
}

/* 동시에 여러 사람이 쓰는 것을 막기 위한 잠금 */
function locked_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- 비밀번호 · 권한 (모두 서버에서 확인) ---------- */
function hash_(pw) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + String(pw));
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length < 2 ? '0' + v : v;
  }).join('');
}

function adminHash_() {
  var s = getOne_('settings', 'admin');
  return s ? s.hash : null;
}

function isAdmin_(pw) {
  var h = adminHash_();
  return !!h && !!pw && hash_(pw) === h;
}

function canEdit_(rec, pw) {
  if (isAdmin_(pw)) return true;
  return !!(rec && rec.pwHash && pw && hash_(pw) === rec.pwHash);
}

function uid_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function omit_(o, keys) {
  var r = {};
  Object.keys(o || {}).forEach(function (k) { if (keys.indexOf(k) < 0) r[k] = o[k]; });
  return r;
}

/* ---------- 화면에 필요한 자료 한 번에 읽기 ---------- */
function api_load(pw) {
  var admin = isAdmin_(pw);
  var data = {};
  COLLECTIONS.forEach(function (c) {
    data[c] = readAll_(c).map(function (r) {
      var o = omit_(r, ['pwHash']);
      if (c === 'suggestions' && !admin) delete o.contact; /* 연락처는 관리자만 */
      return o;
    });
  });
  return { data: data, adminSet: !!adminHash_(), admin: admin };
}

/* ---------- 관리자 ---------- */
function api_setupAdmin(pw) {
  return locked_(function () {
    if (adminHash_()) throw new Error('이미 관리자 비밀번호가 설정되어 있습니다.');
    if (String(pw || '').length < 4) throw new Error('비밀번호는 4자 이상이어야 합니다.');
    put_('settings', 'admin', { hash: hash_(pw) });
    return true;
  });
}

function api_checkAdmin(pw) {
  return isAdmin_(pw);
}

/* 글 수정 전에 작성 비밀번호(또는 관리자 비밀번호)가 맞는지 확인 */
function api_checkPost(coll, id, pw) {
  var rec = getOne_(coll, id);
  if (!rec) throw new Error('글을 찾을 수 없습니다.');
  if (!canEdit_(rec, pw)) throw new Error('비밀번호가 맞지 않습니다.');
  return true;
}

/* ---------- 글·등록·일정 만들기 ---------- */
function api_create(coll, fields, pw) {
  return locked_(function () {
    if (COLLECTIONS.indexOf(coll) < 0) throw new Error('잘못된 게시판입니다.');
    var f = fields || {};
    var obj = omit_(f, ['pw', 'pwHash', 'id']);
    if (coll === 'regs') {
      /* 교회별 등록은 누구나 할 수 있습니다 (수정·삭제는 관리자만) */
    } else if (ADMIN_ONLY.indexOf(coll) >= 0) {
      if (!isAdmin_(pw)) throw new Error('관리자만 할 수 있습니다.');
    } else if (coll === 'suggestions' || coll === 'videos' || coll === 'photos' || coll === 'songs' || coll === 'campsongs' || coll === 'sheets' || coll === 'cal') {
      if (!f.name || !f.pw) throw new Error('이름과 비밀번호를 입력해 주세요.');
      obj.pwHash = hash_(f.pw);
    }
    obj.createdAt = Date.now();
    obj.views = 0;
    obj.likes = 0;
    var id = uid_();
    put_(coll, id, obj);
    return id;
  });
}

/* ---------- 글 수정 (작성 비밀번호 또는 관리자) ---------- */
function api_update(coll, id, fields, pw) {
  return locked_(function () {
    var rec = getOne_(coll, id);
    if (!rec) throw new Error('글을 찾을 수 없습니다.');
    var f = fields || {};
    if (ADMIN_ONLY.indexOf(coll) >= 0 || f.reply !== undefined) {
      if (!isAdmin_(pw)) throw new Error('관리자만 할 수 있습니다.');
    } else if (!canEdit_(rec, pw)) {
      throw new Error('비밀번호가 맞지 않습니다.');
    }
    Object.keys(f).forEach(function (k) {
      if (k !== 'pwHash' && k !== 'id' && k !== 'createdAt') rec[k] = f[k];
    });
    put_(coll, id, rec);
    return true;
  });
}

/* ---------- 삭제 (작성 비밀번호 또는 관리자) ---------- */
function api_delete(coll, id, pw) {
  return locked_(function () {
    var rec = getOne_(coll, id);
    if (!rec) return true;
    if (ADMIN_ONLY.indexOf(coll) >= 0) {
      if (!isAdmin_(pw)) throw new Error('관리자만 할 수 있습니다.');
    } else if (!canEdit_(rec, pw)) {
      throw new Error('비밀번호가 맞지 않습니다.');
    }
    remove_(coll, id);
    return true;
  });
}

/* ---------- 좋아요 · 조회수 ---------- */
function api_bump(coll, id, field) {
  return locked_(function () {
    if (field !== 'likes' && field !== 'views') throw new Error('잘못된 요청입니다.');
    var rec = getOne_(coll, id);
    if (!rec) return 0;
    rec[field] = (rec[field] || 0) + 1;
    put_(coll, id, rec);
    return rec[field];
  });
}

/* ---------- 파일 올리기 (사진·악보) ---------- */
function api_upload(name, mime, base64) {
  var bytes = Utilities.base64Decode(base64);
  if (bytes.length > MAX_FILE_MB * 1048576) {
    throw new Error('파일은 ' + MAX_FILE_MB + 'MB 이하만 올릴 수 있습니다.');
  }
  var file = folder_().createFile(Utilities.newBlob(bytes, mime, name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var isImage = /^image\//.test(mime);
  var url = isImage
    ? 'https://drive.google.com/thumbnail?sz=w1200&id=' + file.getId()
    : 'https://drive.google.com/uc?export=download&id=' + file.getId();
  return { url: url, name: name, size: bytes.length };
}

/* ---------- 조편성 (관리자): 학년·성별·학교별로 나눠 조에 고르게 배분 ---------- */
function gorder_(r) {
  return (r.school === '고등학교' ? 10 : 0) + (parseInt(r.grade, 10) || 0) * 2 + (r.gender === '여' ? 1 : 0);
}

function api_assignTeams(eventId, teamCount, pw) {
  return locked_(function () {
    if (!isAdmin_(pw)) throw new Error('관리자만 할 수 있습니다.');
    var N = Math.max(1, parseInt(teamCount, 10) || 1);
    var students = readAll_('regs').filter(function (r) {
      return r.eventId === eventId && r.role === '학생';
    });
    students.sort(function (a, b) {
      return gorder_(a) - gorder_(b) || a.church.localeCompare(b.church) || a.name.localeCompare(b.name);
    });
    students.forEach(function (s, i) {
      s.team = (i % N) + 1;
      put_('regs', s.id, s);
    });
    return students.length;
  });
}

/* ---------- 숙소배정 (관리자): 방 종류 목록을 받아 남·여를 나누고 같은 교회끼리 붙여 배정 ---------- */
function allRooms_(draft) {
  var out = [];
  ['남', '여'].forEach(function (g) {
    var n = 0;
    draft.filter(function (t) { return t.gender === g; }).forEach(function (t) {
      for (var k = 0; k < (parseInt(t.count, 10) || 0); k++) {
        n++;
        out.push({ label: g + '자 ' + n + '번방', gender: g, capacity: parseInt(t.capacity, 10) || 1 });
      }
    });
  });
  return out;
}

function api_assignRooms(eventId, draft, pw) {
  return locked_(function () {
    if (!isAdmin_(pw)) throw new Error('관리자만 할 수 있습니다.');
    var rooms = allRooms_(draft || []);
    var order = { '목회자': 0, '교사': 1, '학생': 2 };
    var regs = readAll_('regs').filter(function (r) { return r.eventId === eventId; });
    ['남', '여'].forEach(function (g) {
      var people = regs.filter(function (p) { return p.gender === g; }).sort(function (a, b) {
        return a.church.localeCompare(b.church) || (order[a.role] - order[b.role]) ||
          ((parseInt(a.grade, 10) || 0) - (parseInt(b.grade, 10) || 0)) || a.name.localeCompare(b.name);
      });
      var gr = rooms.filter(function (r) { return r.gender === g; });
      var ri = 0, used = 0;
      people.forEach(function (p) {
        while (ri < gr.length && used >= gr[ri].capacity) { ri++; used = 0; }
        p.room = ri < gr.length ? gr[ri].label : null;
        if (ri < gr.length) used++;
        put_('regs', p.id, p);
      });
    });
    var ev = getOne_('cal', eventId);
    if (ev) { ev.rooms = draft; put_('cal', eventId, ev); }
    return true;
  });
}

/* ---------- 1번 고정 (관리자): 한 번에 하나의 행사만 고정. id가 없으면 고정 해제 ---------- */
function api_pinEvent(id, pw) {
  return locked_(function () {
    if (!isAdmin_(pw)) throw new Error('관리자만 할 수 있습니다.');
    readAll_('cal').forEach(function (c) {
      var want = !!id && c.id === String(id);
      if (!!c.pinned !== want) {
        c.pinned = want;
        put_('cal', c.id, c);
      }
    });
    return true;
  });
}

/* ---------- 행사 정보 수정 (관리자 전용) ---------- */
function api_updateEvent(id, fields, pw) {
  return locked_(function () {
    if (!isAdmin_(pw)) throw new Error('관리자 비밀번호가 맞지 않습니다.');
    var rec = getOne_('cal', id);
    if (!rec) throw new Error('행사를 찾을 수 없습니다.');
    var keep = ['title', 'date', 'time', 'place', 'detail', 'image'];
    var f = fields || {};
    keep.forEach(function (k) { if (f[k] !== undefined) rec[k] = f[k]; });
    put_('cal', id, rec);
    return true;
  });
}

/* ---------- 단체 등록: 교회 한 곳의 여러 사람을 한 번에 등록 (누구나) ---------- */
function api_registerGroup(eventId, church, people) {
  return locked_(function () {
    if (!eventId || !getOne_('cal', eventId)) throw new Error('행사를 찾을 수 없습니다.');
    var c = String(church || '').trim();
    if (!c) throw new Error('교회명을 입력해 주세요.');
    if (!people || !people.length) throw new Error('등록할 사람을 한 명 이상 입력해 주세요.');
    var rows = people.map(function (p, i) {
      var no = (i + 1) + '번째 사람: ';
      var role = p.role;
      if (['목회자', '교사', '학생'].indexOf(role) < 0) throw new Error(no + '구분을 골라 주세요.');
      if (['남', '여'].indexOf(p.gender) < 0) throw new Error(no + '성별을 골라 주세요.');
      var name = String(p.name || '').trim();
      if (!name) throw new Error(no + '이름을 입력해 주세요.');
      var school = role === '학생' ? String(p.school || '') : '';
      var grade = role === '학생' ? String(p.grade || '') : '';
      if (role === '학생' && (!school || !grade)) throw new Error(no + '학생은 학교와 학년을 골라 주세요.');
      return { eventId: eventId, church: c, role: role, school: school, grade: grade, gender: p.gender, name: name, createdAt: Date.now(), views: 0, likes: 0 };
    });
    rows.forEach(function (r) { put_('regs', uid_(), r); });
    return rows.length;
  });
}
