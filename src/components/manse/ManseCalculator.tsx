"use client";

import React, { useEffect, useRef } from "react";
import { CalculatorMarkup } from "./CalculatorMarkup";
import { mountManseCalculator } from "./controller";

export function ManseCalculator() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    return mountManseCalculator(root.current);
  }, []);

  return (
    <div id="manse-calculator" ref={root}>
      <CalculatorMarkup />
      <noscript>만세력을 계산하려면 브라우저의 자바스크립트를 켜 주세요.</noscript>
    </div>
  );
}
