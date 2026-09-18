/* User-defined model: one 60-year cycle, 24 equal steps of 2.5 years.
 * These are relative cycle positions, not birth ages or astronomical term dates.
 */
export function buildNaturalCycleCases(anchorGanji,birthYear) {
  const stems=['갑','을','병','정','무','기','경','신','임','계'];
  const branches=['자','축','인','묘','진','사','오','미','신','유','술','해'];
  const ganji=Array.from({length:60},(_,index)=>stems[index%10]+branches[index%12]);
  const terms=['입춘','우수','경칩','춘분','청명','곡우','입하','소만','망종','하지','소서','대서','입추','처서','백로','추분','한로','상강','입동','소설','대설','동지','소한','대한'];
  const anchorIndex=ganji.indexOf(anchorGanji);
  if(anchorIndex<0) throw new Error('60갑자에 해당하는 자연순환 결과가 필요합니다.');
  const includeYears=birthYear!==undefined;
  if(includeYears&&(!Number.isInteger(birthYear)||birthYear<1||birthYear>9999)) throw new Error('연도 표시에 사용할 양력 출생연도가 필요합니다.');
  return ['입춘','입추'].map((anchorTerm,caseIndex)=>{
    const startIndex=(anchorIndex-caseIndex*30+60)%60;
    return {
      anchorGanji,anchorTerm,
      springGanji:ganji[startIndex],
      autumnGanji:ganji[(startIndex+30)%60],
      rows:Array.from({length:25},(_,index)=>{
        const elapsedYears=index*2.5;
        const wholeYears=Math.floor(elapsedYears);
        const yearIndex=(startIndex+wholeYears)%60;
        // 1984 is a 갑자 year. Take the two occurrences of each ganji in
        // [birthYear, birthYear + 120); neither a selected epoch nor an age is inferred.
        const referenceYear=1984+yearIndex;
        const firstYear=includeYears?referenceYear+60*Math.ceil((birthYear-referenceYear)/60):null;
        return {
          term:terms[index%24],label:index===24?'다음 입춘':terms[index],
          elapsedYears,ganji:ganji[yearIndex],
          extraYears:elapsedYears-wholeYears,
          calendarYears:includeYears?[firstYear,firstYear+60]:[]
        };
      })
    };
  });
}
