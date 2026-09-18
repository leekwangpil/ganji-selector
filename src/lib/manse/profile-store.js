export const PROFILE_PREFIX = 'manse.profile.v1.';
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);
const integer = (value,min,max) => Number.isInteger(value) && value >= min && value <= max;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = message => {throw new Error(message);};

export function profileVariantKey(variant) {
  return [variant.year.han,variant.month.han,variant.day.han,variant.hour?.han || '?',variant.natural].join('|');
}

function normalizeDraft(draft) {
  if (!object(draft) || typeof draft.name !== 'string' || !draft.name.trim() || draft.name.trim().length > 100) {
    fail('저장할 이름을 1~100자로 입력해 주세요.');
  }
  const i = draft.input;
  if (!object(i) || !['solar','lunar'].includes(i.calendar) || typeof i.intercalation !== 'boolean' ||
      !integer(i.year,1909,2050) || !integer(i.month,1,12) || !integer(i.day,1,31) ||
      typeof i.unknown !== 'boolean' || (!i.unknown && (!integer(i.hour,0,23) || !integer(i.minute,0,59))) ||
      !['남자','여자'].includes(i.gender) || !['korea','foreign'].includes(i.zone) ||
      !['standard','meridian','longitude'].includes(i.clock) || !['zi23','split','midnight'].includes(i.boundary) ||
      (i.zone === 'foreign' && (!Number.isFinite(i.offset) || i.offset < -12 || i.offset > 14 || !Number.isInteger(i.offset * 60) || typeof i.dst !== 'boolean')) ||
      (i.clock === 'longitude' && (!Number.isFinite(i.longitude) || Math.abs(i.longitude) > 180))) {
    fail('저장된 생년월일 또는 계산 기준을 확인해 주세요.');
  }
  if (!Array.isArray(draft.choices) || draft.choices.length > 16) fail('저장된 입춘·입추 선택을 확인해 주세요.');
  const seen = new Set();
  const choices = draft.choices.map(choice => {
    if (!object(choice) || typeof choice.key !== 'string' || !choice.key || choice.key.length > 120 || seen.has(choice.key) ||
        !['spring','autumn','undecided'].includes(choice.value) ||
        !(choice.todayRule === null || (typeof choice.todayRule === 'string' && choice.todayRule.length <= 80))) {
      fail('저장된 입춘·입추 선택을 확인해 주세요.');
    }
    seen.add(choice.key);
    return {key:choice.key,value:choice.value,todayRule:choice.todayRule};
  });
  return {
    name:draft.name.trim(),
    input:{calendar:i.calendar,intercalation:i.calendar === 'lunar' && i.intercalation,
      year:i.year,month:i.month,day:i.day,unknown:i.unknown,hour:i.unknown ? null : i.hour,minute:i.unknown ? null : i.minute,
      gender:i.gender,zone:i.zone,offset:i.zone === 'foreign' ? i.offset : null,dst:i.zone === 'foreign' && i.dst,
      clock:i.clock,longitude:i.clock === 'longitude' ? i.longitude : null,boundary:i.boundary},
    choices
  };
}

function decode(raw,id) {
  let record;
  try {record = JSON.parse(raw);} catch {fail('저장된 정보를 읽지 못했습니다. 원본은 그대로 유지됩니다.');}
  if (!object(record) || record.version !== 1 || record.id !== id || !validId(record.id) || !validId(record.revision) ||
      ![record.createdAt,record.updatedAt].every(value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)))) {
    fail('지원하지 않거나 손상된 저장 정보입니다. 원본은 그대로 유지됩니다.');
  }
  return {version:1,id,revision:record.revision,createdAt:record.createdAt,updatedAt:record.updatedAt,...normalizeDraft(record)};
}

// One atomic storage value per person: adding one record never rewrites another.
// No writes occur until save/delete/undo is explicitly requested.
export function createProfileStore(getStorage, {makeId, now = () => new Date().toISOString()}) {
  function access(callback) {
    try {return callback(getStorage());}
    catch (error) {
      if (error.name === 'QuotaExceededError') fail('브라우저 저장 공간이 부족해 저장하지 못했습니다. 기존 정보는 그대로 유지됩니다.');
      if (error.name === 'SecurityError') fail('이 브라우저에서 기기 저장을 사용할 수 없습니다. 브라우저의 사이트 데이터 허용 설정을 확인해 주세요.');
      throw error;
    }
  }
  function key(id) {if (!validId(id)) fail('저장 정보의 식별자가 올바르지 않습니다.');return PROFILE_PREFIX + id;}
  function get(id) {
    return access(storage => {const raw = storage.getItem(key(id));return raw === null ? null : decode(raw,id);});
  }
  function checkRevision(record,revision) {
    if (!record) fail('이 정보가 다른 탭에서 삭제되었습니다. 새 항목으로 저장하거나 목록에서 다시 불러와 주세요.');
    if (record.revision !== revision) fail('이 정보가 다른 탭에서 변경되었습니다. 덮어쓰지 않았으니 목록에서 다시 불러와 주세요.');
  }
  return {
    get,
    list() {
      return access(storage => {
        const keys = Array.from({length:storage.length}, (_,i) => storage.key(i)).filter(k => k?.startsWith(PROFILE_PREFIX));
        const profiles = [];let invalidCount = 0;
        for (const k of keys) {
          const raw = storage.getItem(k);
          if (raw === null) continue;
          try {profiles.push(decode(raw,k.slice(PROFILE_PREFIX.length)));} catch {invalidCount++;}
        }
        profiles.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name,'ko'));
        return {profiles,invalidCount};
      });
    },
    save(draft, existing = null) {
      const clean = normalizeDraft(draft);
      return access(storage => {
        const previous = existing ? get(existing.id) : null;
        if (existing) checkRevision(previous,existing.revision);
        const id = previous?.id || makeId();
        if (!previous && storage.getItem(key(id)) !== null) fail('저장 식별자가 겹쳤습니다. 다시 저장해 주세요.');
        const timestamp = now();
        const record = {version:1,id,revision:makeId(),createdAt:previous?.createdAt || timestamp,updatedAt:timestamp,...clean};
        const raw = JSON.stringify(record);decode(raw,id);
        storage.setItem(key(id),raw);
        return record;
      });
    },
    remove(id,revision) {
      return access(storage => {const record = get(id);checkRevision(record,revision);storage.removeItem(key(id));return record;});
    },
    restore(record) {
      return access(storage => {
        if (storage.getItem(key(record.id)) !== null) fail('같은 정보가 이미 존재해 덮어쓰지 않았습니다.');
        const restored = {...decode(JSON.stringify(record),record.id),revision:makeId(),updatedAt:now()};
        storage.setItem(key(record.id),JSON.stringify(restored));return restored;
      });
    }
  };
}
