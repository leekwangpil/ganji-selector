import React from "react";

export function CalculatorMarkup() {
  return (
<section className="manse-app" aria-label="양력·음력 만세력 계산">
    <header className="manse-bar">
      <span className="manse-brand"><span className="manse-mark" aria-hidden="true"></span>사주 분석</span>
      <span className="manse-muted">원광 결과 대조 전</span>
    </header>
    <div className="manse-content">
      <div className="manse-heading">
        <div><h1>만세력</h1><p className="manse-muted">양력·음력을 선택하고 생년월일시를 입력해 주세요.</p></div>
        <span className="manse-tag">양력 · 한국 음력</span>
      </div>
      <details id="wm-profiles" className="manse-panel manse-profiles">
        <summary>저장한 사람 <span id="wm-profile-count">0</span>명</summary>
        <p className="manse-help">이 사이트를 연 현재 브라우저에만 저장됩니다. 다른 기기와 동기화되지 않으며 브라우저의 사이트 데이터를 지우면 목록도 삭제됩니다.</p>
        <label className="manse-field manse-profile-search" htmlFor="wm-profile-search"><span>저장한 이름 검색</span><input id="wm-profile-search" type="search" placeholder="이름으로 찾기" autoComplete="off" /></label>
        <p id="wm-profile-store-error" className="manse-error" role="alert" hidden></p>
        <p id="wm-profile-empty" className="manse-help">아직 저장한 사람이 없습니다.</p>
        <ul id="wm-profile-list" className="manse-profile-list"></ul>
        <button id="wm-profile-undo" className="manse-secondary" type="button" hidden>마지막 삭제 되돌리기</button>
      </details>
      <form id="wm-form" className="manse-panel" noValidate>
        <div className="manse-profile-toolbar"><p id="wm-profile-active" className="manse-help" hidden></p><button id="wm-profile-new" className="manse-secondary" type="button" disabled>새 사람 입력</button></div>
        <label className="manse-field manse-name" htmlFor="wm-name">
          <span>이름 <span className="manse-muted">(선택)</span></span>
          <input id="wm-name" name="name" type="text" placeholder="분석할 사람의 이름" maxLength={100} autoComplete="off" spellCheck="false" />
        </label>
        <fieldset>
          <legend>생일 기준</legend>
          <div className="manse-calendars">
            <label className="manse-calendar"><input id="wm-calendar-solar" type="radio" name="calendar" value="solar" defaultChecked />양력</label>
            <label className="manse-calendar"><input id="wm-calendar-lunar" type="radio" name="calendar" value="lunar" />음력</label>
          </div>
        </fieldset>
        <div className="manse-fields">
          <fieldset>
            <legend id="wm-date-legend">양력 생년월일</legend>
            <div className="manse-date">
              <label className="manse-field manse-year" htmlFor="wm-year"><span>연도</span><input id="wm-year" name="year" type="text" inputMode="numeric" pattern="[0-9]{4}" placeholder="YYYY" autoComplete="off" aria-describedby="wm-date-help" required /></label>
              <div className="manse-field">
                <label htmlFor="wm-month">월</label>
                <input id="wm-month" name="month" type="text" inputMode="numeric" pattern="[0-9]{1,2}" list="wm-month-options" placeholder="MM" autoComplete="off" spellCheck="false" aria-describedby="wm-date-help" required />
                <datalist id="wm-month-options"></datalist>
              </div>
              <div className="manse-field">
                <label htmlFor="wm-day">일</label>
                <input id="wm-day" name="day" type="text" inputMode="numeric" pattern="[0-9]{1,2}" list="wm-day-options" placeholder="DD" autoComplete="off" spellCheck="false" aria-describedby="wm-date-help" required />
                <datalist id="wm-day-options"></datalist>
              </div>
            </div>
            <p id="wm-date-help" className="manse-help">연도 4자리 · 월/일/시 2자리(예: 01) → 다음 칸 자동 이동</p>
            <label id="wm-intercalation-field" className="manse-check" hidden><input id="wm-intercalation" name="intercalation" type="checkbox" disabled />윤달</label>
            <p id="wm-calendar-help" className="manse-help">양력 1910.01.01~2050.12.31</p>
            <div className="manse-genders" role="group" aria-label="성별">
              <label className="manse-check"><input type="radio" name="gender" value="남자" required />남자</label>
              <label className="manse-check"><input type="radio" name="gender" value="여자" required />여자</label>
            </div>
          </fieldset>
          <fieldset>
            <legend>태어난 시간 · 24시간제</legend>
            <div className="manse-time">
              <label className="manse-field" htmlFor="wm-hour"><span>시</span><input id="wm-hour" name="hour" type="text" inputMode="numeric" pattern="[0-9]{1,2}" placeholder="0~23" autoComplete="off" spellCheck="false" aria-describedby="wm-date-help" required /></label>
              <label className="manse-field" htmlFor="wm-minute"><span>분</span><input id="wm-minute" name="minute" type="text" inputMode="numeric" pattern="[0-9]{1,2}" placeholder="0~59" autoComplete="off" spellCheck="false" required /></label>
            </div>
            <label className="manse-check"><input id="wm-unknown" name="unknown" type="checkbox" />태어난 시간을 몰라요</label>
            <p className="manse-help">오후 3시 = 15:00 · 자정 = 00:00</p>
          </fieldset>
        </div>
        <fieldset className="manse-settings">
          <legend>계산 기준</legend>
          <label className="manse-field" htmlFor="wm-zone"><span>출생 시간대</span><select id="wm-zone" name="zone" defaultValue="korea" required><option value="korea">한국 · 과거 표준시·서머타임 자동 반영</option><option value="foreign">해외 · UTC 시차 직접 입력</option></select></label>
          <div id="wm-foreign-fields" className="manse-setting-row" hidden>
            <label className="manse-field" htmlFor="wm-offset"><span>출생 당시 표준 UTC 시차</span><input id="wm-offset" name="offset" type="text" inputMode="decimal" placeholder="예: 9 또는 -5" disabled /></label>
            <label className="manse-check"><input id="wm-dst" name="dst" type="checkbox" disabled />출생 당시 서머타임 +1시간 적용</label>
          </div>
          <div className="manse-setting-row">
            <label className="manse-field" htmlFor="wm-clock"><span>일주·시주 시간 기준</span><select id="wm-clock" name="clock" defaultValue="standard" required><option value="standard">당시 표준시 · 서머타임 제외</option><option value="meridian">동경 127.5° 기준 보정</option><option value="longitude">출생지 경도 보정 · 평태양시</option></select></label>
            <label className="manse-field" htmlFor="wm-boundary"><span>날짜 변경 기준</span><select id="wm-boundary" name="boundary" defaultValue="zi23" required><option value="zi23">23시부터 다음 날</option><option value="split">야자시·조자시 분리</option><option value="midnight">0시부터 다음 날</option></select></label>
          </div>
          <div id="wm-longitude-field" className="manse-setting-row" hidden>
            <label className="manse-field" htmlFor="wm-longitude"><span>출생지 경도 · 동경 + / 서경 −</span><input id="wm-longitude" name="longitude" type="text" inputMode="decimal" placeholder="예: 127.5" disabled /></label>
          </div>
          <p id="wm-boundary-help" className="manse-help" hidden></p>
        </fieldset>
        <p id="wm-error" className="manse-error" role="alert" hidden></p>
        <div className="manse-actions"><button id="wm-submit" className="manse-submit" type="submit" disabled>만세력 계산</button><button id="wm-profile-save" className="manse-secondary" type="button" disabled>이 기기에 저장</button><button id="wm-profile-copy" className="manse-secondary" type="button" hidden disabled>새 항목으로 저장</button></div>
        <p id="wm-profile-message" className="manse-help" role="status" hidden></p>
        <p className="manse-help">저장하려면 이름을 입력해 주세요. 입춘·입추 선택을 바꾼 뒤에도 저장 버튼을 눌러 주세요.</p>
        <p className="manse-muted">원광 기본 설정은 아직 확인되지 않았습니다.</p>
      </form>
      <section id="wm-result" className="manse-panel manse-result" aria-label="사주 계산 결과" aria-live="polite" aria-atomic="true">
        <div className="manse-result-header"><h3 id="wm-result-title">사주 결과</h3><span id="wm-status" className="manse-muted">입력 대기</span></div>
        <p id="wm-summary" className="manse-summary" hidden></p>
        <p id="wm-converted" className="manse-converted" hidden></p>
        <div id="wm-empty" className="manse-empty">계산하면 사주팔자와 입춘·입추 두 경우의 사이클, 절기별 연도 두 개를 확인할 수 있습니다.</div>
        <div id="wm-variants"></div>
        <div id="wm-notices" className="manse-notices" hidden></div>
        <details id="wm-calculation-details" hidden><summary>적용 시간·절입 시각 확인</summary><dl id="wm-facts" className="manse-facts"></dl></details>
      </section>
      <p className="manse-footer">저장 버튼을 누른 정보만 현재 브라우저에 보관합니다. 입력한 정보는 서버로 전송하지 않습니다.</p>
    </div>
  </section>
  );
}
