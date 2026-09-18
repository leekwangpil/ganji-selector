const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createProfileStore,PROFILE_PREFIX} = require('../src/lib/manse/profile-store.js');
const {createCalculatorDom} = require('./helpers.cjs');

const base = {calendar:'solar',intercalation:false,year:2026,month:2,day:9,hour:12,minute:0,unknown:false,gender:'남자',zone:'korea',offset:null,dst:false,clock:'standard',longitude:null,boundary:'zi23'};
const draft = (name='확인용',input={}) => ({name,input:{...base,...input},choices:[]});
class MemoryStorage {
  data = new Map();
  failWrites = false;
  get length() {return this.data.size;}
  key(i) {return [...this.data.keys()][i] ?? null;}
  getItem(key) {return this.data.get(key) ?? null;}
  setItem(key,value) {if(this.failWrites) throw new DOMException('Full','QuotaExceededError');this.data.set(key,String(value));}
  removeItem(key) {this.data.delete(key);}
}
let nextId=0;
const makeStore = storage => createProfileStore(()=>storage,{makeId:()=>`test-${++nextId}`,now:()=> '2026-09-18T12:00:00.000Z'});
function setup(storage = new MemoryStorage()) {
  const fixture=createCalculatorDom({url:'https://manse.test/',beforeMount:window=>Object.defineProperty(window,'localStorage',{value:storage})});
  const {dom}=fixture,d=dom.window.document,q=id=>d.getElementById('wm-'+id);
  const event=(element,type)=>element.dispatchEvent(new dom.window.Event(type,{bubbles:true,cancelable:true}));
  const fill=(id,value,type='input')=>{q(id).value=value;event(q(id),type);};
  const submit=()=>{event(q('form'),'submit');assert.equal(q('error').hidden,true,q('error').textContent);};
  const enter=(name='저장 확인')=>{
    q('submit').focus();
    for(const [id,value] of [['name',name],['year','2026'],['month','02'],['day','09'],['hour','12'],['minute','00']]) fill(id,value);
    d.querySelector('input[name=gender][value="남자"]').click();
  };
  return {...fixture,storage,d,q,event,fill,submit,enter,close(){fixture.cleanup();dom.window.close();}};
}

test('independent profile records support duplicate names, explicit updates, conflicts and undo', () => {
  const storage=new MemoryStorage(),a=makeStore(storage),b=makeStore(storage);
  storage.setItem('unrelated','keep');
  const first=a.save(draft('동명이인')),second=b.save(draft('동명이인',{day:10}));
  assert.notEqual(first.id,second.id);assert.equal(a.list().profiles.length,2);
  const updated=b.save(draft('수정한 이름'),first);
  assert.equal(updated.id,first.id);assert.notEqual(updated.revision,first.revision);
  assert.throws(()=>a.save(draft('오래된 탭'),first),/다른 탭에서 변경/);
  assert.throws(()=>a.remove(first.id,first.revision),/다른 탭에서 변경/);
  assert.equal(a.get(first.id).name,'수정한 이름');
  const removed=a.remove(first.id,updated.revision);assert.equal(a.get(first.id),null);
  assert.throws(()=>a.save(draft(),updated),/삭제/);
  a.restore(removed);assert.equal(a.get(first.id).name,'수정한 이름');
  assert.throws(()=>a.restore(removed),/이미 존재/);
  assert.equal(storage.getItem('unrelated'),'keep');assert.equal(a.get(second.id).input.day,10);
});

test('storage errors and damaged entries preserve previous records; invalid drafts never write', () => {
  const storage=new MemoryStorage(),store=makeStore(storage);
  const saved=store.save(draft());const original=storage.getItem(PROFILE_PREFIX+saved.id);
  storage.failWrites=true;
  assert.throws(()=>store.save(draft('수정'),saved),/저장 공간/);
  assert.equal(storage.getItem(PROFILE_PREFIX+saved.id),original);
  storage.failWrites=false;
  storage.setItem(PROFILE_PREFIX+'broken','{');
  storage.setItem(PROFILE_PREFIX+'future',JSON.stringify({...saved,id:'future',version:2}));
  assert.equal(store.list().invalidCount,2);assert.equal(store.list().profiles.length,1);
  assert.equal(storage.getItem(PROFILE_PREFIX+'broken'),'{');
  for(const invalid of [draft(''),draft('x'.repeat(101)),draft('a',{month:13}),draft('a',{unknown:'yes'}),draft('a',{zone:'foreign',offset:99})]) {
    assert.throws(()=>store.save(invalid));
  }
  assert.equal(storage.length,3);
  const blocked=createProfileStore(()=>{throw new DOMException('Blocked','SecurityError');},{makeId:()=> 'never'});
  assert.throws(()=>blocked.list(),/기기 저장을 사용할 수 없습니다/);
  assert.throws(()=>blocked.save(draft()),/기기 저장을 사용할 수 없습니다/);
});

test('save is explicit; loading after remount restores name, choices and freshly calculated today terms', () => {
  const storage=new MemoryStorage();let f=setup(storage);
  const originalNow=Date.now;let now=Date.parse('2026-09-18T12:00:00Z');Date.now=()=>now;
  try {
    f.enter();f.submit();assert.equal(storage.length,0);
    f.d.querySelector('.manse-cycle-choice input[value=spring]').click();
    f.d.querySelector('.manse-current-button').click();
    const oldStamp=f.d.querySelector('.manse-current-stamp').textContent;
    f.q('profile-save').click();assert.equal(f.q('profile-count').textContent,'1');
    assert.equal(f.q('profile-save').textContent,'수정 내용 저장');
    const saved=makeStore(storage).list().profiles[0];
    assert.equal(saved.choices[0].value,'spring');assert.equal(saved.choices[0].todayRule,'manse-period-midpoint');
    f.close();now+=86400000;f=setup(storage);
    assert.equal(f.q('name').value,'');assert.equal(f.q('profile-count').textContent,'1');
    f.q('profile-list').querySelector('[data-profile-action=load]').click();
    assert.equal(f.q('name').value,'저장 확인');assert.equal(f.q('hour').value,'12');
    assert.equal(f.d.querySelector('.manse-cycle-choice input:checked').value,'spring');
    assert.equal(f.d.querySelectorAll('.manse-current-card').length,3);
    assert.notEqual(f.d.querySelector('.manse-current-stamp').textContent,oldStamp);
    assert.match(f.d.querySelector('.manse-current-stamp').textContent,/2026.09.19/);
    f.d.querySelector('.manse-cycle-choice input[value=autumn]').click();
    assert.equal(makeStore(storage).get(saved.id).choices[0].value,'spring','Unsaved choices do not persist');
    f.q('profile-save').click();assert.equal(makeStore(storage).get(saved.id).choices[0].value,'autumn');
    f.fill('name','새 이름');f.q('profile-save').click();assert.equal(makeStore(storage).get(saved.id).name,'새 이름');
    assert.equal(makeStore(storage).get(saved.id).choices[0].value,'autumn','Renaming preserves the analysis choice');
    assert.equal(f.q('result-title').textContent,'새 이름님의 사주 결과');
    assert.equal(storage.length,1);assert.equal(f.errors.length,0);
  } finally {Date.now=originalNow;f.close();}
});

test('lunar leap dates and foreign time settings restore without converting the entered birthday', () => {
  const f=setup();
  try {
    f.q('calendar-lunar').click();
    for(const [id,value] of [['name','음력 윤달'],['year','2023'],['month','02'],['day','15'],['hour','00'],['minute','00']]) f.fill(id,value);
    f.q('intercalation').click();f.d.querySelector('input[name=gender][value="여자"]').click();
    f.fill('zone','foreign','change');f.fill('offset','-5');f.q('dst').click();
    f.fill('clock','longitude','change');f.fill('longitude','-74');f.fill('boundary','split','change');
    f.q('profile-save').click();assert.equal(f.q('profile-count').textContent,'1',f.q('profile-message').textContent);
    const before=f.q('summary').textContent,record=makeStore(f.storage).list().profiles[0];
    assert.equal(record.input.calendar,'lunar');assert.equal(record.input.intercalation,true);assert.equal(record.input.hour,0);
    f.q('profile-new').click();assert.equal(f.q('name').value,'');assert.equal(f.q('zone').value,'korea');
    f.q('profile-list').querySelector('[data-profile-action=load]').click();
    assert.equal(f.q('calendar-lunar').checked,true);assert.equal(f.q('intercalation').checked,true);assert.equal(f.q('intercalation').disabled,false);
    assert.equal(f.q('year').value,'2023');assert.equal(f.q('month').value,'02');assert.equal(f.q('day').value,'15');
    assert.equal(f.q('hour').value,'00');assert.equal(f.q('minute').value,'00');assert.equal(f.q('summary').textContent,before);
    assert.equal(f.q('offset').value,'-5');assert.equal(f.q('offset').disabled,false);assert.equal(f.q('dst').checked,true);
    assert.equal(f.q('longitude').value,'-74');assert.equal(f.q('longitude').disabled,false);assert.equal(f.q('boundary').value,'split');
    f.q('calendar-solar').click();assert.equal(f.q('year').value,'');f.q('calendar-lunar').click();assert.equal(f.q('day').value,'15');
    assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});

test('time unknown restores all matching variants and never stores a made-up birth time', () => {
  const f=setup();
  try {
    f.enter('시간 모름');f.fill('month','09');f.fill('day','13');f.q('unknown').click();f.submit();
    let groups=[...f.d.querySelectorAll('.manse-cycle-choice')];assert.equal(groups.length,2);
    groups[0].querySelector('input[value=spring]').click();groups[1].querySelector('input[value=undecided]').click();
    f.q('profile-save').click();const saved=makeStore(f.storage).list().profiles[0];
    assert.equal(saved.input.hour,null);assert.equal(saved.input.minute,null);
    f.q('profile-new').click();f.q('profile-list').querySelector('[data-profile-action=load]').click();
    assert.equal(f.q('unknown').checked,true);assert.equal(f.q('hour').disabled,true);assert.equal(f.q('hour').value,'');
    groups=[...f.d.querySelectorAll('.manse-cycle-choice')];
    assert.deepEqual(groups.map(group=>group.querySelector('input:checked').value),['spring','undecided']);
    f.q('unknown').click();assert.equal(f.q('hour').value,'');assert.equal(f.q('hour').disabled,false);
    assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});

test('search, copying, update conflicts, deletion and undo do not change other people', () => {
  const storage=new MemoryStorage(),f=setup(storage);
  try {
    f.enter('<img src=x onerror=alert(1)>');f.q('profile-save').click();
    assert.equal(f.q('profile-list').querySelector('img'),null,'Names are literal text');
    const first=makeStore(storage).list().profiles[0];
    f.fill('name','다른 사람');f.q('profile-copy').click();assert.equal(f.q('profile-count').textContent,'2');
    f.fill('profile-search','다른');assert.equal(f.q('profile-list').children.length,1);
    const second=makeStore(storage).list().profiles.find(record=>record.id!==first.id);
    makeStore(storage).save(draft('다른 탭 수정'),second);
    f.q('profile-save').click();assert.match(f.q('profile-message').textContent,/다른 탭에서 변경/);
    assert.equal(makeStore(storage).get(second.id).name,'다른 탭 수정');
    f.dom.window.dispatchEvent(new f.dom.window.StorageEvent('storage',{key:PROFILE_PREFIX+second.id}));
    assert.match(f.q('profile-list').textContent,/다른 탭 수정/);
    f.fill('profile-search','');
    f.q('profile-list').querySelector(`[data-profile-id="${first.id}"] [data-profile-action=delete]`).click();
    assert.equal(f.q('profile-count').textContent,'1');assert.equal(f.q('profile-undo').hidden,false);
    f.q('profile-undo').click();assert.equal(f.q('profile-count').textContent,'2');assert.equal(f.q('profile-undo').hidden,true);
    assert.equal(makeStore(storage).get(second.id).name,'다른 탭 수정');
    assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});

test('failed saving does not report success or break normal calculation; invalid records keep the draft', () => {
  const f=setup();
  try {
    f.enter('');f.q('profile-save').click();assert.equal(f.q('name').getAttribute('aria-invalid'),'true');assert.equal(f.storage.length,0);
    f.fill('name','공간 부족');f.storage.failWrites=true;f.q('profile-save').click();
    assert.match(f.q('profile-message').textContent,/저장 공간/);assert.equal(f.q('profile-count').textContent,'0');
    assert.equal(f.q('status').textContent,'계산 완료');assert.equal(f.q('profile-save').textContent,'이 기기에 저장');
    f.storage.failWrites=false;
    const bad=makeStore(f.storage).save(draft('잘못된 날짜',{month:2,day:30}));
    f.dom.window.dispatchEvent(new f.dom.window.StorageEvent('storage',{key:PROFILE_PREFIX+bad.id}));
    f.q('profile-list').querySelector('[data-profile-action=load]').click();
    assert.equal(f.q('name').value,'공간 부족');assert.equal(f.q('day').value,'09');
    assert.equal(f.q('status').textContent,'계산 완료');assert.equal(makeStore(f.storage).get(bad.id).input.day,30);
  } finally {f.close();}
  const blocked=createCalculatorDom();
  try {assert.equal(blocked.dom.window.document.getElementById('wm-profile-store-error').hidden,false);assert.equal(blocked.dom.window.document.getElementById('wm-submit').disabled,false);}
  finally {blocked.cleanup();blocked.dom.window.close();}
});
