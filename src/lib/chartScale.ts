function niceNumber(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

/** Round-number axis ticks from 0 to a "nice" max that comfortably fits `maxValue`. */
export function niceTicks(maxValue: number, tickCount = 5): { ticks: number[]; max: number } {
  if (maxValue <= 0) return { ticks: [0], max: 1 };
  const niceRange = niceNumber(maxValue, false);
  const niceStep = niceNumber(niceRange / Math.max(1, tickCount - 1), true);
  const niceMax = Math.ceil(maxValue / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + 1e-9; v += niceStep) ticks.push(Math.round(v));
  return { ticks, max: niceMax };
}
