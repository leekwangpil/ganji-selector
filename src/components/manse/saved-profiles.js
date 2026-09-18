import { createProfileStore, PROFILE_PREFIX } from '../../lib/manse/profile-store.js';

export function mountSavedProfiles(root, {listen,node,readDraft,applyProfile,resetForm,showInputError}) {
  const window=root.ownerDocument.defaultView;
  const q=id=>root.querySelector('#wm-'+id);
  const store=createProfileStore(()=>window.localStorage,{makeId:()=>window.crypto.randomUUID()});
  let active=null,dirty=false,records=[],lastDeleted=null;
  const message=(text,isError=false)=>{
    q('profile-message').textContent=text;q('profile-message').hidden=!text;
    q('profile-message').classList.toggle('manse-error',isError);
  };
  function updateActive() {
    q('profile-active').hidden=!active;
    q('profile-active').textContent=active?`불러온 정보: ${active.name}${dirty?' · 저장하지 않은 변경이 있습니다.':''}`:'';
    q('profile-save').textContent=active?'수정 내용 저장':'이 기기에 저장';
    q('profile-copy').hidden=!active;
  }
  function drawList() {
    q('profile-count').textContent=String(records.length);
    const search=q('profile-search').value.trim().toLocaleLowerCase();
    const matches=records.filter(record=>record.name.toLocaleLowerCase().includes(search));
    const list=q('profile-list');list.replaceChildren();
    for(const record of matches) {
      const item=node('li','manse-profile-item');item.dataset.profileId=record.id;
      const details=node('div','manse-profile-info');
      details.append(node('strong','',record.name));
      const i=record.input,pad=n=>String(n).padStart(2,'0');
      const date=`${i.calendar==='lunar'?'음력':'양력'} ${i.year}.${pad(i.month)}.${pad(i.day)}${i.intercalation?' (윤달)':''}`;
      details.append(node('p','manse-help',`${date} · ${i.unknown?'시간 모름':pad(i.hour)+':'+pad(i.minute)} · ${i.gender}`));
      const actions=node('div','manse-profile-item-actions');
      for(const [action,label] of [['load','불러오기'],['delete','삭제']]) {
        const button=node('button','manse-secondary',label);button.type='button';
        button.dataset.profileAction=action;button.dataset.profileId=record.id;
        button.setAttribute('aria-label',`${record.name} ${label}`);actions.append(button);
      }
      item.append(details,actions);list.append(item);
    }
    q('profile-empty').hidden=matches.length>0;
    q('profile-empty').textContent=records.length?'검색한 이름이 없습니다.':'아직 저장한 사람이 없습니다. 이름과 생일을 입력한 뒤 이 기기에 저장을 눌러 주세요.';
  }
  function refresh() {
    try {
      const result=store.list();records=result.profiles;
      q('profile-store-error').hidden=result.invalidCount===0;
      q('profile-store-error').textContent=result.invalidCount?`읽지 못한 저장 정보 ${result.invalidCount}개가 있습니다. 원본은 그대로 유지됩니다.`:'';
      drawList();
    } catch(error) {
      q('profile-store-error').hidden=false;q('profile-store-error').textContent=error.message||'저장 목록을 읽지 못했습니다.';
    }
  }
  function save(copy=false) {
    try {
      const draft=readDraft();
      const record=store.save(draft,copy?null:active);
      active=record;dirty=false;updateActive();q('profile-search').value='';q('profiles').open=true;refresh();
      message(`${record.name}님의 정보를 이 브라우저에 저장했습니다.`);
    } catch(error) {
      message(error.message||'저장하지 못했습니다. 다시 확인해 주세요.',true);
      if(error.field) showInputError(error);
    }
  }
  listen(q('profile-save'),'click',()=>save());
  listen(q('profile-copy'),'click',()=>save(true));
  listen(q('profile-new'),'click',()=>{
    resetForm();active=null;dirty=false;updateActive();message('새 사람의 정보를 입력해 주세요.');q('name').focus();
  });
  listen(q('profile-search'),'input',drawList);
  listen(q('profile-list'),'click',event=>{
    const button=event.target.closest('button[data-profile-action]');
    if(!button) return;
    const record=records.find(item=>item.id===button.dataset.profileId);
    if(!record) return;
    try {
      if(button.dataset.profileAction==='load') {
        const latest=store.get(record.id);
        if(!latest) throw new Error('이 정보가 다른 탭에서 삭제되었습니다.');
        applyProfile(latest);active=latest;dirty=false;updateActive();
        message(`${latest.name}님의 정보를 불러왔습니다. 변경한 내용은 수정 내용 저장을 눌러 보관해 주세요.`);q('name').focus();
      } else {
        lastDeleted=store.remove(record.id,record.revision);
        if(active?.id===record.id) {active=null;dirty=false;updateActive();}
        q('profile-undo').hidden=false;refresh();message(`${record.name}님의 정보를 목록에서 삭제했습니다. 이 페이지에서 마지막 삭제를 되돌릴 수 있습니다.`);
        q('profile-undo').focus();
      }
    } catch(error) {message(error.message||'저장 정보를 처리하지 못했습니다.',true);refresh();}
  });
  listen(q('profile-undo'),'click',()=>{
    if(!lastDeleted) return;
    try {
      const record=store.restore(lastDeleted);lastDeleted=null;q('profile-undo').hidden=true;refresh();
      message(`${record.name}님의 삭제를 되돌렸습니다.`);q('profile-search').focus();
    } catch(error) {message(error.message||'삭제를 되돌리지 못했습니다.',true);}
  });
  listen(window,'storage',event=>{if(event.key===null||event.key?.startsWith(PROFILE_PREFIX)) refresh();});
  refresh();updateActive();q('profile-save').disabled=false;q('profile-copy').disabled=false;q('profile-new').disabled=false;
  return {
    markChanged() {dirty=true;updateActive();message('');},
    cleanup() {q('profile-save').disabled=true;q('profile-copy').disabled=true;q('profile-new').disabled=true;}
  };
}
