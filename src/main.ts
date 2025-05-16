// src/main.ts

// Chart.js is loaded via the CDN in index.html.
// Let TypeScript know there's a global `Chart`:
declare const Chart: any;

interface InputValues {
  weight: number;       // kg
  rFactor: number;      // L/kg
  hours: number;        // drinking duration (h)
  drinks: number;       // number of pastis
  volCl: number;        // volume per pastis (cl)
  k: number;            // absorption rate constant (h⁻¹)
  beta: number;         // elimination rate (g/L·h)
}

function calcBACSeries(vals: InputValues) {
  const { weight, rFactor, hours, drinks, volCl, k, beta } = vals;
  const abv = 0.40;        // 40% alcohol
  const density = 0.789;   // g/ml ethanol

  // grams of ethanol per drink
  const gramsPerDrink = volCl * 10 * abv * density;

  // generate drink times so first is at t=0, last at t=hours
  const interval = drinks > 1 ? hours / (drinks - 1) : 0;
  const drinkTimes = Array.from({ length: drinks }, (_, i) => i * interval);

  const tEnd = hours + 8;  // extend 8h after last drink
  const dt = 0.1;          // time step (h)

  const series: { t: number; bac: number }[] = [];

  let prevAbsorbed = 0;    // track total grams absorbed at last step
  let currentBAC = 0;      // g/L

  for (let t = 0; t <= tEnd; t += dt) {
    // 1) compute cumulative absorbed grams at time t
    let totalAbsorbed = 0;
    for (const t_i of drinkTimes) {
      if (t >= t_i) {
        totalAbsorbed += gramsPerDrink * (1 - Math.exp(-k * (t - t_i)));
      }
    }

    // 2) incremental absorption in g → convert to BAC increment
    const dAbsGrams = totalAbsorbed - prevAbsorbed;
    const dAbsBAC = dAbsGrams / (rFactor * weight);
    prevAbsorbed = totalAbsorbed;

    // 3) elimination this interval (only if BAC>0)
    const dElim = currentBAC > 0 ? beta * dt : 0;

    // 4) update BAC
    currentBAC = Math.max(currentBAC + dAbsBAC - dElim, 0);

    series.push({ t: parseFloat(t.toFixed(2)), bac: parseFloat(currentBAC.toFixed(4)) });
  }

  return series;
}

let chart: any = null;

function drawChart(data: { t: number; bac: number }[]) {
  const ctx = (document.getElementById('bacChart') as HTMLCanvasElement)
    .getContext('2d')!;

  const labels = data.map(pt => pt.t.toString());
  const bacData = data.map(pt => pt.bac);

  const thresholds = [
    { label: '0.5 g/L', value: 0.5 },
    { label: '0.8 g/L', value: 0.8 },
    { label: '1.2 g/L', value: 1.2 },
  ];
  const thresholdDatasets = thresholds.map(th => ({
    label: th.label,
    data: Array(labels.length).fill(th.value),
    borderColor: 'orange',
    borderWidth: 1,
    borderDash: [5, 5] as number[],
    pointRadius: 0,
    fill: false,
    tension: 0,
  }));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'BAC (g/L)',
          data: bacData,
          borderColor: 'blue',
          borderWidth: 2,
          fill: 'start',
          tension: 0.1,
        },
        ...thresholdDatasets,
      ],
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Time (hours)' } },
        y: {
          beginAtZero: true,
          suggestedMax: 1.5,
          title: { display: true, text: 'Blood Alcohol Content (g/L)' },
        },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

document.getElementById('inputForm')!
  .addEventListener('submit', e => {
    e.preventDefault();

    const weight  = parseFloat((<HTMLInputElement>document.getElementById('weight')).value);
    const rFactor = parseFloat((<HTMLSelectElement>document.getElementById('rFactor')).value);
    const hours   = parseFloat((<HTMLInputElement>document.getElementById('hours')).value);
    const drinks  = parseFloat((<HTMLInputElement>document.getElementById('drinks')).value);
    const volCl   = parseFloat((<HTMLInputElement>document.getElementById('vol')).value);
    const k       = parseFloat((<HTMLSelectElement>document.getElementById('absRate')).value);
    const beta    = parseFloat((<HTMLSelectElement>document.getElementById('elimRate')).value);

    const inputs: InputValues = { weight, rFactor, hours, drinks, volCl, k, beta };
    const series = calcBACSeries(inputs);
    drawChart(series);
  });
