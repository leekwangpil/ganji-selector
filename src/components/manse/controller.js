import lunarLibrary from "lunar-javascript";
import KoreanCalendarClass from "korean-lunar-calendar";
import { createCalendarAdapter } from "../../lib/manse/calendar-adapter.js";
import { createManseEngine } from "../../lib/manse/engine.js";
import { buildNaturalCycleCases } from "../../lib/manse/natural-cycles.js";
import { buildCurrentCycles, CURRENT_CYCLE_RULE } from "../../lib/manse/current-cycles.js";
import { profileVariantKey } from "../../lib/manse/profile-store.js";
import { mountSavedProfiles } from "./saved-profiles.js";
import timezoneData from "../../lib/manse/timezone.json";

// Keep the approved native-input behavior independent of React re-renders.
// Every event listener and pending focus transition belongs to this mount.
export function mountManseCalculator(root) {
  const document=root.ownerDocument;
  const window=document.defaultView;
  const controller=new window.AbortController();
  const timers=new Set();
  function listen(target,type,handler) {
    target.addEventListener(type,handler,{signal:controller.signal});
  }
  function schedule(callback,delay) {
    const timer=window.setTimeout(()=>{
      timers.delete(timer);
      if(!controller.signal.aborted) callback();
    },delay);
    timers.add(timer);
  }
  const calendarAdapter=createCalendarAdapter(KoreanCalendarClass);
  const engine=createManseEngine(lunarLibrary,timezoneData,calendarAdapter);
  const q=id=>root.querySelector('#wm-'+id);
  const form=q('form'), year=q('year'), month=q('month'), day=q('day');
  const monthOptions=q('month-options'), dayOptions=q('day-options'), intercalation=q('intercalation');
  const hour=q('hour'), minute=q('minute'), unknown=q('unknown');
  const error=q('error'), status=q('status'), summary=q('summary'), variants=q('variants');
  let rememberedTime={hour:'',minute:''};
  let resultShown=false;
  let currentResult=null;
  let currentCycleTimer=null;
  const currentCycleEnabled=new Set();
  let calendarMode='solar';
  let profileManager=null;
  const dateDrafts={solar:{year:'',month:'',day:'',intercalation:false},lunar:{year:'',month:'',day:'',intercalation:false}};

  function option(list,value,label) {
    const o=document.createElement('option');o.value=String(value);o.label=label;list.appendChild(o);
  }
  function updateMonths() {
    monthOptions.replaceChildren();
    if(calendarMode==='lunar') {
      const y=Number(year.value), choices=/^[0-9]{4}$/.test(year.value.trim())?calendarAdapter.lunarMonths(y):[];
      for(const choice of choices) {
        if(choice.intercalation===intercalation.checked) option(monthOptions,choice.month,choice.label);
      }
    } else {
      for(let n=1;n<=12;n++) option(monthOptions,n,n+'월');
    }
  }
  function updateDays() {
    const y=Number(year.value), m=parseDigits(month.value,12,2);
    let choices;
    if(calendarMode==='lunar') {
      const lunarMonth=calendarAdapter.lunarMonths(y).find(choice=>choice.month===m&&choice.intercalation===intercalation.checked);
      choices=lunarMonth?lunarMonth.days:[];
    } else {
      const knownYear=/^[0-9]{4}$/.test(year.value.trim())&&y>=1910&&y<=2050;
      const limit=Number.isInteger(m)&&m>=1?engine.daysInMonth(knownYear?y:2000,m):month.value.trim()===''?31:0;
      choices=Array.from({length:limit},(_,n)=>n+1);
    }
    dayOptions.replaceChildren();
    for(const n of choices) option(dayOptions,n,n+'일');
    // Changing a related field must never rewrite or erase a typed birth date.
  }
  updateMonths();updateDays();
  for(const type of ['input','change']) {
    listen(year,type,()=>{updateMonths();updateDays();});
    listen(month,type,updateDays);
  }
  // Native input + datalist uses the input value for both typing and selection.
  // There is no second form control, selected-value state, or confirmation step.
  listen(intercalation,'change',()=>{updateMonths();updateDays();});
  function updateCalendarFields() {
    intercalation.disabled=calendarMode!=='lunar';q('intercalation-field').hidden=calendarMode!=='lunar';
    updateMonths();updateDays();
    q('date-legend').textContent=(calendarMode==='lunar'?'음력':'양력')+' 생년월일';
    q('calendar-help').textContent=calendarMode==='lunar'
      ?`한국 음력 ${calendarAdapter.format(calendarAdapter.lunarMinimum)}~${calendarAdapter.format(calendarAdapter.lunarMaximum)} · 윤달 생일은 ‘윤달’에 표시`
      :'양력 1910.01.01~2050.12.31';
  }
  for(const radio of form.querySelectorAll('input[name="calendar"]')) {
    listen(radio,'change',()=>{
      if(!radio.checked||radio.value===calendarMode) return;
      dateDrafts[calendarMode]={year:year.value,month:month.value,day:day.value,intercalation:intercalation.checked};
      calendarMode=radio.value;
      const saved=dateDrafts[calendarMode];
      year.value=saved.year;month.value=saved.month;day.value=saved.day;intercalation.checked=saved.intercalation;
      updateCalendarFields();
    });
  }

  function parseDigits(raw,max,length) {
    const s=raw.trim();
    if(!s || !new RegExp('^[0-9]{1,'+length+'}$').test(s) || Number(s)>max) return NaN;
    return Number(s);
  }
  const dateEntrySteps=[
    {field:year,next:month,digits:4,max:2050},
    {field:month,next:day,digits:2,max:12},
    {field:day,next:hour,digits:2,max:31},
    {field:hour,next:minute,digits:2,max:23}
  ];
  const composingFields=new WeakSet();
  function validEntry(step) {
    const raw=step.field.value.trim(),value=parseDigits(raw,step.max,step.digits);
    if(!Number.isInteger(value)) return false;
    if(step.field===year) return raw.length===4&&value>=(calendarMode==='lunar'?calendarAdapter.lunarMinimum.year:1910);
    if(step.field===hour) return value>=0;
    if(value<1) return false;
    if(step.field===month) {
      return calendarMode!=='lunar'||!/^\d{4}$/.test(year.value.trim())||[...monthOptions.options].some(o=>Number(o.value)===value);
    }
    if(calendarMode==='lunar'&&value>30) return false;
    const m=parseDigits(month.value,12,2);
    if(/^\d{4}$/.test(year.value.trim())&&m>=1) {
      try {
        calendarAdapter.resolveDate({calendar:calendarMode,year:Number(year.value),month:m,day:value,intercalation:intercalation.checked});
      } catch {return false;}
    }
    return true;
  }
  function advanceEntry(step,committed=false) {
    const {field,next,digits,max}=step;
    if(document.activeElement!==field||field.disabled||next.disabled||composingFields.has(field)||!validEntry(step)) return;
    const raw=field.value.trim();
    // Keep prefixes such as month 1, day 3 and hour 2 available for a second digit.
    const complete=raw.length===digits||(digits===2&&raw.length===1&&Number(raw)>Math.floor(max/10));
    if(!committed&&!complete) return;
    // Editing the beginning or middle of an existing value is not completion.
    if(!committed&&(field.selectionStart!==field.value.length||field.selectionEnd!==field.value.length)) return;
    next.focus();
    next.select();
  }
  for(const step of dateEntrySteps) {
    const field=step.field;
    let revision=0;
    function advanceAfterCommit() {
      const value=field.value,version=revision;
      // A blur-triggered change must not pull focus away from the user's click or Tab.
      schedule(()=>{
        if(field.value===value&&revision===version) advanceEntry(step,true);
      },0);
    }
    listen(field,'input',event=>{
      revision++;
      if(event.isComposing||composingFields.has(field)||/^(delete|history)/.test(event.inputType||'')) return;
      const fromList=event.inputType==='insertReplacementText'&&field.list&&[...field.list.options].some(o=>o.value===field.value);
      advanceEntry(step,Boolean(fromList));
    });
    listen(field,'change',advanceAfterCommit);
    listen(field,'compositionstart',()=>{composingFields.add(field);revision++;});
    listen(field,'compositionend',()=>{
      composingFields.delete(field);
      const value=field.value,version=++revision;
      schedule(()=>{if(field.value===value&&revision===version) advanceEntry(step);},0);
    });
  }
  for(const [field,max] of [[hour,23],[minute,59]]) {
    listen(field,'blur',()=>{
      const n=parseDigits(field.value,max,2);
      if(Number.isFinite(n)) field.value=String(n).padStart(2,'0');
    });
  }
  function updateTimeFields() {
    for(const field of [hour,minute]) {
      field.disabled=unknown.checked;field.required=!unknown.checked;
      field.placeholder=unknown.checked?'모름':field===hour?'0~23':'0~59';
    }
  }
  listen(unknown,'change',()=>{
    if(unknown.checked) {rememberedTime={hour:hour.value,minute:minute.value};hour.value='';minute.value='';}
    else {hour.value=rememberedTime.hour;minute.value=rememberedTime.minute;}
    updateTimeFields();
  });
  function updateZoneFields() {
    const foreign=q('zone').value==='foreign';
    q('foreign-fields').hidden=!foreign;
    q('offset').disabled=!foreign;q('dst').disabled=!foreign;q('offset').required=foreign;
  }
  listen(q('zone'),'change',updateZoneFields);
  function updateClockFields() {
    const longitude=q('clock').value==='longitude';
    q('longitude-field').hidden=!longitude;
    q('longitude').disabled=!longitude;q('longitude').required=longitude;
  }
  listen(q('clock'),'change',updateClockFields);
  const boundaryHelp={
    zi23:'보정된 시각의 23시부터 일주와 자시의 천간을 다음 날 기준으로 계산합니다.',
    split:'보정된 시각의 23~24시는 일주를 당일로, 시주 천간을 다음 날 기준으로 계산합니다.',
    midnight:'보정된 시각의 0시에 날짜가 바뀌며, 시주 천간도 해당 날짜의 일간으로 계산합니다.'
  };
  function updateBoundaryHelp() {
    q('boundary-help').textContent=boundaryHelp[q('boundary').value]||'';
    q('boundary-help').hidden=!q('boundary').value;
  }
  listen(q('boundary'),'change',updateBoundaryHelp);
  updateBoundaryHelp();
  function clearError() {
    error.hidden=true;error.textContent='';
    for(const field of form.querySelectorAll('[aria-invalid="true"]')) field.removeAttribute('aria-invalid');
  }
  function markDirty(event) {
    clearError();
    profileManager?.markChanged();
    if(!resultShown) return;
    // Renaming a saved person does not change the birth calculation or its choices.
    if(event?.target===q('name')) {
      const name=q('name').value.trim();q('result-title').textContent=name?`${name}님의 사주 결과`:'사주 결과';
      return;
    }
    // Never leave stale calculated pillars visible underneath changed birth data.
    resultShown=false;variants.replaceChildren();q('notices').replaceChildren();q('notices').hidden=true;
    clearCurrentCycles();
    q('result-title').textContent='사주 결과';
    q('calculation-details').hidden=true;summary.hidden=true;q('converted').hidden=true;q('empty').hidden=false;
    q('empty').textContent='입력이 변경되었습니다. 다시 계산해 주세요.';status.textContent='다시 계산 필요';
  }
  listen(form,'input',markDirty);
  listen(form,'change',markDirty);
  function node(tag,className,text) {
    const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;
  }
  function fact(label,value) {q('facts').append(node('dt','',label),node('dd','',value));}
  function addNotice(text) {q('notices').append(node('p','',text));q('notices').hidden=false;}
  function naturalCyclesTable(anchorGanji,birthYear) {
    const cases=buildNaturalCycleCases(anchorGanji,birthYear);
    const table=node('table','manse-cycle-table');table.dataset.anchor=anchorGanji;table.dataset.birthYear=birthYear;
    const caption=node('caption');
    caption.append(node('span','manse-cycle-title','입춘·입추 두 경우의 사이클'),node('span','manse-cycle-scale','24절기 · 한 절기 2.5년 · 60년 간격의 두 연도'),node('span','manse-cycle-scale',`연도 표시: ${birthYear}~${birthYear+119}년 · 출생연도부터 120년`));
    const columns=node('colgroup');
    for(const className of ['manse-cycle-term-column','manse-cycle-years-column','manse-cycle-case-column','manse-cycle-case-column']) columns.append(node('col',className));
    const head=node('thead'),header=node('tr');
    const termHeader=node('th','','절기');termHeader.scope='col';
    const yearsHeader=node('th');yearsHeader.scope='col';yearsHeader.append(node('span','','입춘 후'),node('span','manse-cycle-case-label','경과(년)'));
    header.append(termHeader,yearsHeader);
    for(const scenario of cases) {
      const th=node('th');th.scope='col';th.dataset.anchorTerm=scenario.anchorTerm;
      th.append(node('span','manse-cycle-ganji',anchorGanji+'년'),node('span','manse-cycle-case-label',scenario.anchorTerm+'인 경우'));
      header.append(th);
    }
    head.append(header);
    const body=node('tbody');
    // Each of the 24 terms lists its two occurrences; a duplicate closing
    // spring row would repeat the same pair of years and suggest a third cycle.
    cases[0].rows.slice(0,24).forEach((entry,index)=>{
      const tr=node('tr',index%12===0?'manse-cycle-key':'');tr.dataset.term=entry.term;tr.dataset.elapsed=entry.elapsedYears;
      const termCell=node('th','',entry.label);termCell.scope='row';
      tr.append(termCell,node('td','manse-cycle-years',String(entry.elapsedYears)));
      for(const scenario of cases) {
        const item=scenario.rows[index],cell=node('td');
        cell.dataset.ganji=item.ganji;cell.dataset.extraYears=item.extraYears;
        const calendarYears=node('div','manse-cycle-calendar-years');
        item.calendarYears.forEach((year,index)=>{
          if(index) calendarYears.append(document.createTextNode(' '));
          const yearLabel=node('span','manse-cycle-calendar-year',year+'년');yearLabel.dataset.year=year;
          calendarYears.append(yearLabel);
        });
        const value=node('span','manse-cycle-value');value.append(node('span','manse-cycle-ganji',item.ganji+'년'));
        if(item.extraYears) value.append(node('span','manse-cycle-half',' +0.5년'));
        cell.append(calendarYears,value);tr.append(cell);
      }
      body.append(tr);
    });
    table.append(caption,columns,head,body);
    return table;
  }
  function naturalCycleChoice(anchorGanji,variantIndex) {
    const group=node('fieldset','manse-cycle-choice');
    group.id=root.id+'-cycle-choice-'+variantIndex;
    group.dataset.anchor=anchorGanji;
    group.dataset.variantIndex=variantIndex;
    group.append(node('legend','',anchorGanji+'년이'));
    const options=node('div','manse-cycle-choice-options');
    for(const [value,text] of [
      ['spring','입춘인 경우가 더 적합'],
      ['autumn','입추인 경우가 더 적합'],
      ['undecided','아직 판단 불가능']
    ]) {
      const label=node('label','manse-cycle-choice-option');
      const input=node('input');
      input.type='radio';input.name=group.id;input.value=value;
      input.id=group.id+'-'+value;
      label.htmlFor=input.id;
      label.append(input,node('span','',text));options.append(label);
    }
    group.append(options);
    return group;
  }
  function clearCurrentCycles() {
    currentResult=null;currentCycleEnabled.clear();
    if(currentCycleTimer!==null) {
      window.clearTimeout(currentCycleTimer);timers.delete(currentCycleTimer);currentCycleTimer=null;
    }
  }
  function currentCyclesPanel(index) {
    const panel=node('section','manse-current-cycles');panel.dataset.variantIndex=index;
    const title=node('h4','','오늘의 연·월·일 절기');title.id=root.id+'-current-title-'+index;
    panel.setAttribute('aria-labelledby',title.id);
    const rule=node('p','manse-help','적용 기준: 연은 입춘부터 다음 입춘까지, 월은 절입부터 다음 절입까지입니다. 반년·반달은 각 기간의 중간 시점으로 계산하고, 일은 선택한 시간 보정·날짜 변경 기준을 따릅니다.');
    rule.id=root.id+'-current-rule-'+index;
    const button=node('button','manse-current-button','오늘의 절기 보기');button.type='button';button.disabled=true;
    button.setAttribute('aria-describedby',rule.id);
    const message=node('p','manse-current-message','위에서 입춘 또는 입추를 선택해 주세요.');
    const result=node('div','manse-current-result');result.hidden=true;result.setAttribute('role','status');
    panel.append(rule,button,message,result);
    panel.prepend(title);
    return panel;
  }
  function updateCurrentCycles(section,index,instant=Date.now()) {
    if(!currentResult) return;
    const panel=section.querySelector('.manse-current-cycles');
    const choice=section.querySelector('.manse-cycle-choice input:checked')?.value;
    const ready=choice==='spring'||choice==='autumn';
    const button=panel.querySelector('button'),message=panel.querySelector('.manse-current-message'),result=panel.querySelector('.manse-current-result');
    button.disabled=!ready;result.replaceChildren();result.hidden=true;message.hidden=false;
    button.textContent=currentCycleEnabled.has(index)?'현재 시각으로 새로고침':'오늘의 절기 보기';
    if(!ready) {
      message.textContent=choice==='undecided'?'아직 판단 불가능을 선택했습니다. 기준을 정하면 오늘의 절기를 볼 수 있습니다.':'위에서 입춘 또는 입추를 선택해 주세요.';
      return;
    }
    if(!currentCycleEnabled.has(index)) {
      message.textContent='계산 기준을 확인한 뒤 오늘의 절기 보기를 눌러 주세요.';
      return;
    }
    try {
      const value=buildCurrentCycles(engine,{anchorGanji:currentResult.variants[index].natural,choice,input:currentResult.input,instant,rule:CURRENT_CYCLE_RULE});
      const stamp=node('p','manse-current-stamp',`${value.timestamp} 기준 · ${value.offset} · ${value.anchorGanji}년이 ${choice==='spring'?'입춘':'입추'}`);
      const cards=node('dl','manse-current-grid');
      for(const item of value.periods) {
        const labels={year:['연 절기','60년', '년'],month:['월 절기','60개월','월'],day:['일 절기','60일','일']};
        const [label,cycle,suffix]=labels[item.unit];
        const card=node('div','manse-current-card');card.dataset.unit=item.unit;card.dataset.term=item.term;
        card.append(node('dt','',label),node('dd','manse-current-term',item.term),node('dd','manse-current-scale',`${cycle} 주기 · ${item.ganji}${suffix}`));cards.append(card);
      }
      result.append(stamp,cards,node('p','manse-help','선택한 기준에 따른 자연순환 절기입니다. 하루 중 절기가 바뀔 수 있어 현재 시각을 기준으로 표시합니다.'));
      panel.dataset.choice=choice;message.hidden=true;result.hidden=false;
    } catch(e) {
      message.textContent=e.message||'오늘의 절기를 계산하지 못했습니다. 다시 확인해 주세요.';
    }
  }
  function refreshCurrentCycles() {
    if(!currentResult) return;
    const instant=Date.now();
    [...variants.querySelectorAll('.manse-variant')].forEach((section,index)=>updateCurrentCycles(section,index,instant));
  }
  function scheduleCurrentCycles() {
    if(currentCycleTimer!==null||!currentCycleEnabled.size) return;
    const timer=window.setTimeout(()=>{
      timers.delete(timer);currentCycleTimer=null;
      if(controller.signal.aborted||!currentResult||!currentCycleEnabled.size) return;
      refreshCurrentCycles();scheduleCurrentCycles();
    },60000);
    currentCycleTimer=timer;timers.add(timer);
  }
  listen(variants,'change',event=>{
    const group=event.target.closest('.manse-cycle-choice');
    if(group&&event.target.matches('input[type="radio"]')) {
      updateCurrentCycles(group.closest('.manse-variant'),Number(group.dataset.variantIndex));profileManager?.markChanged();
    }
  });
  listen(variants,'click',event=>{
    const button=event.target.closest('.manse-current-button');
    if(!button||button.disabled||!currentResult) return;
    const panel=button.closest('.manse-current-cycles'),index=Number(panel.dataset.variantIndex);
    const firstUse=!currentCycleEnabled.has(index);
    currentCycleEnabled.add(index);updateCurrentCycles(panel.closest('.manse-variant'),index);scheduleCurrentCycles();
    if(firstUse) profileManager?.markChanged();
  });
  listen(window,'focus',refreshCurrentCycles);
  listen(document,'visibilitychange',()=>{if(!document.hidden) refreshCurrentCycles();});
  function render(r) {
    clearCurrentCycles();currentResult=r;
    resultShown=true;variants.replaceChildren();q('facts').replaceChildren();q('notices').replaceChildren();q('notices').hidden=true;
    const name=q('name').value.trim();
    q('result-title').textContent=name?`${name}님의 사주 결과`:'사주 결과';
    q('empty').hidden=true;summary.hidden=false;
    const i=r.input;
    const isLunar=r.dates.calendar==='lunar';
    const enteredDate=isLunar?r.dates.lunar:r.dates.solar;
    summary.textContent=`${isLunar?'음력':'양력'} ${calendarAdapter.format(enteredDate,isLunar)} · ${i.unknown?'시간 모름':String(i.hour).padStart(2,'0')+':'+String(i.minute).padStart(2,'0')} · ${i.gender}`;
    q('converted').textContent=isLunar?`계산에 사용한 양력 ${calendarAdapter.format(r.dates.solar)}`:`한국 음력 ${calendarAdapter.format(r.dates.lunar,true)}`;
    q('converted').hidden=false;
    status.textContent=r.variants.length>1?`가능한 명식 ${r.variants.length}개`:'계산 완료';
    r.variants.forEach((v,index)=>{
      const section=node('div','manse-variant');
      if(r.variants.length>1) section.append(node('div','manse-variant-title',`가능한 명식 ${index+1}`));
      const grid=node('div','manse-pillars');grid.setAttribute('aria-label','사주팔자 · 시주 일주 월주 연주 순서');
      for(const [key,label] of [['hour','시주'],['day','일주'],['month','월주'],['year','연주']]) {
        const p=v[key];const col=node('div','manse-pillar');col.dataset.pillar=key;
        col.append(node('div','manse-pillar-title',label));
        for(const half of ['gan','ji']) {
          const row=node('div','manse-half');
          row.append(node('h2','',p?(half==='gan'?p.hanGan:p.hanJi):'—'),node('span','',p?p[half]:'미정'));col.append(row);
        }
        grid.append(col);
      }
      section.append(grid);
      const natural=node('div','manse-natural');natural.append(node('span','manse-muted','자연순환 결과'),node('strong','',v.natural+'년이 입춘 또는 입추입니다.'));
      section.append(natural,naturalCyclesTable(v.natural,i.year),node('p','manse-cycle-note','+0.5년은 해당 간지 기준점에서 반년 뒤입니다.'),naturalCycleChoice(v.natural,index),currentCyclesPanel(index));variants.append(section);
    });
    if(r.unknown) addNotice('출생 시각을 몰라 시주는 미정입니다.'+(r.variants.length>1?' 날짜·절입 경계에서 가능한 명식을 함께 표시합니다.':''));
    else if(r.variants.length>1) addNotice('입력한 시각에 경계가 있어 결과가 둘 이상입니다. 정확한 출생 초 또는 당시의 시간 기록을 확인해 주세요.');
    if(r.duplicate) addNotice('표준시·서머타임 변경으로 같은 시각이 두 번 존재합니다. 두 경우를 모두 계산했습니다.');
    if(r.nearTerm) addNotice('절입 경계에 가깝습니다. 원광의 절입 시각과 대조가 필요합니다.');
    q('calculation-details').hidden=false;
    fact('출생 시간대',i.zone==='korea'?'한국 · 당시 표준시·서머타임 자동':`${engine.formatOffset(i.offset*60)} · 서머타임 ${i.dst?'적용':'미적용'}`);
    if(!i.unknown) {
      fact('일주·시주 적용 시각',engine.formatWall(r.first.correctedWall,true)+(r.duplicate?' · 중복 시각 두 경우 반영':''));
      fact('시간 보정',`${r.first.correction===0?'0':r.first.correction>0?'+'+Number(r.first.correction.toFixed(3)):Number(r.first.correction.toFixed(3))}분 · 서머타임 ${r.first.zone.dst?'−'+r.first.zone.dst+'분 반영':'해당 없음'}`);
    }
    fact('시간 기준',q('clock').selectedOptions[0].textContent);
    fact('날짜 변경',q('boundary').selectedOptions[0].textContent);
    if(!i.unknown && !r.duplicate) {
      fact('직전 절입',engine.termLabel(r.first.previous,i));
      fact('다음 절입',engine.termLabel(r.first.next,i));
    }
    fact('절입 자료','천문 라이브러리 계산값 · 원광 역서와 전체 대조 전');
    fact('시간 보정 범위','경도 보정은 평태양시 기준 · 균시차 미적용');
    fact('생일 변환','한국 음력 기준 · 변환한 양력 날짜로 사주 계산');
    fact('계산 범위','양력 1910.01.01–2050.12.31 · 연·월주는 절입 순간으로 계산');
  }
  function readBirthInput() {
    const selectedGender=form.querySelector('input[name="gender"]:checked');
    const parseDecimal=id=>q(id).value.trim()===''?NaN:Number(q(id).value);
    return {
        calendar:calendarMode,intercalation:calendarMode==='lunar'&&intercalation.checked,
        year:parseDigits(year.value,2050,4),month:parseDigits(month.value,12,2),day:parseDigits(day.value,31,2),
        hour:parseDigits(hour.value,23,2),minute:parseDigits(minute.value,59,2),unknown:unknown.checked,
        gender:selectedGender?selectedGender.value:'',zone:q('zone').value,
        offset:parseDecimal('offset'),dst:q('dst').checked,
        clock:q('clock').value,longitude:parseDecimal('longitude'),boundary:q('boundary').value
    };
  }
  function showInputError(e) {
    error.textContent=e.message||'계산하지 못했습니다. 입력값을 확인해 주세요.';error.hidden=false;
    const field=e.field==='gender'?form.querySelector('input[name="gender"]'):e.field==='calendar'?q('calendar-solar'):q(e.field||'year');
    if(field) {field.setAttribute('aria-invalid','true');field.focus();}
  }
  function calculateForm() {
    const input=readBirthInput(),result=engine.calculate(input);
    if(!unknown.checked) {hour.value=String(input.hour).padStart(2,'0');minute.value=String(input.minute).padStart(2,'0');}
    render(result);
    return result;
  }
  listen(form,'submit',event=>{
    event.preventDefault();clearError();
    try {calculateForm();profileManager?.markChanged();}
    catch(e) {showInputError(e);}
  });

  function cancelPendingFormWork() {
    clearCurrentCycles();
    for(const timer of timers) window.clearTimeout(timer);
    timers.clear();
  }
  function readProfileDraft() {
    clearError();
    const name=q('name').value.trim();
    if(!name||name.length>100) {
      const e=new Error('저장할 이름을 1~100자로 입력해 주세요.');e.field='name';throw e;
    }
    if(!currentResult) calculateForm();
    const groups=[...variants.querySelectorAll('.manse-cycle-choice')];
    const choices=currentResult.variants.flatMap((variant,index)=>{
      const value=groups[index].querySelector('input:checked')?.value;
      return value?[{key:profileVariantKey(variant),value,todayRule:currentCycleEnabled.has(index)?CURRENT_CYCLE_RULE:null}]:[];
    });
    return {name,input:readBirthInput(),choices};
  }
  function applyProfile(record) {
    // Validate and calculate first, so a damaged record never replaces a valid draft.
    const result=engine.calculate(record.input),i=record.input;
    cancelPendingFormWork();clearError();
    calendarMode=i.calendar;
    for(const mode of ['solar','lunar']) dateDrafts[mode]={year:'',month:'',day:'',intercalation:false};
    const pad=n=>String(n).padStart(2,'0');
    q('name').value=record.name;year.value=String(i.year);month.value=pad(i.month);day.value=pad(i.day);
    dateDrafts[calendarMode]={year:year.value,month:month.value,day:day.value,intercalation:i.intercalation};
    for(const radio of form.querySelectorAll('input[name="calendar"]')) radio.checked=radio.value===calendarMode;
    intercalation.checked=i.intercalation;unknown.checked=i.unknown;
    rememberedTime={hour:i.unknown?'':pad(i.hour),minute:i.unknown?'':pad(i.minute)};
    hour.value=rememberedTime.hour;minute.value=rememberedTime.minute;
    for(const radio of form.querySelectorAll('input[name="gender"]')) radio.checked=radio.value===i.gender;
    q('zone').value=i.zone;q('offset').value=i.offset===null?'':String(i.offset);q('dst').checked=i.dst;
    q('clock').value=i.clock;q('longitude').value=i.longitude===null?'':String(i.longitude);q('boundary').value=i.boundary;
    updateCalendarFields();updateTimeFields();updateZoneFields();updateClockFields();updateBoundaryHelp();
    render(result);
    const choices=new Map(record.choices.map(choice=>[choice.key,choice]));
    const groups=[...variants.querySelectorAll('.manse-cycle-choice')];
    result.variants.forEach((variant,index)=>{
      const saved=choices.get(profileVariantKey(variant));
      if(!saved) return;
      for(const input of groups[index].querySelectorAll('input')) input.checked=input.value===saved.value;
      if(saved.todayRule===CURRENT_CYCLE_RULE) currentCycleEnabled.add(index);
    });
    refreshCurrentCycles();scheduleCurrentCycles();
  }
  function resetProfileForm() {
    markDirty();cancelPendingFormWork();form.reset();calendarMode='solar';rememberedTime={hour:'',minute:''};
    for(const mode of ['solar','lunar']) dateDrafts[mode]={year:'',month:'',day:'',intercalation:false};
    updateCalendarFields();updateTimeFields();updateZoneFields();updateClockFields();updateBoundaryHelp();
    q('empty').textContent='계산하면 사주팔자와 입춘·입추 두 경우의 사이클, 절기별 연도 두 개를 확인할 수 있습니다.';status.textContent='입력 대기';
  }
  profileManager=mountSavedProfiles(root,{listen,node,readDraft:readProfileDraft,applyProfile,resetForm:resetProfileForm,showInputError});

  q('submit').disabled=false;
  return () => {
    controller.abort();
    profileManager.cleanup();
    for(const timer of timers) window.clearTimeout(timer);
    timers.clear();
    q('submit').disabled=true;
  };
}
