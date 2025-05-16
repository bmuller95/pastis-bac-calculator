// Widmark‐based BAC calculator with first‐order absorption and selectable elimination
// src/main.ts

// Chart.js is loaded via <script> in index.html.
// Tell TS that a global `Chart` exists:
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
  const abv = 0.40;           // 40% alcohol by volume
  const density = 0.789;      // g/ml ethanol

  const gramsPerDrink = volCl * 10 * abv * density;
  const drinkTimes = Array.from(
    { length: drinks },
    (_, i) => i * (hours / drinks)
  );

  const tEnd = hours + 8;
  const dt = 0.1;
  const series: { t: number; bac: number }[] = [];

  for (let t = 0; t <= tEnd; t += dt) {
    let totalAbsorbed = 0;
    for (const t_i of drinkTimes) {
      if (t >= t_i) {
        totalAbsorbed += gramsPerDrink * (1 - Math.exp(-k * (t - t_i)));
      }
    }

    const raw = totalAbsorbed / (rFactor * weight) - beta * t;
    series.push({ t, bac: Math.max(raw, 0) });
  }

  return series;
}

let chart: any = null;

function drawChart(data: { t: number; bac: number }[]) {
  const ctx = (document.getElementById('bacChart') as HTMLCanvasElement)
    .getContext('2d')!;
  const labels = data.map(pt => pt.t.toFixed(1));
  const bacData = data.map(pt => pt.bac.toFixed(3));

  const thresholds = [
    { label: '0.5 g/L', value: 0.5 },
    { label: '0.8 g/L', value: 0.8 },
    { label: '1.2 g/L', value: 1.2 },
  ];

  const thresholdDatasets = thresholds.map(th => ({
    label: th.label,
    data: labels.map(() => th.value),
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
        ...thresholdDatasets
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
    const weight  = parseFloat((document.getElementById('weight') as HTMLInputElement).value);
    const rFactor = parseFloat((document.getElementById('rFactor') as HTMLSelectElement).value);
    const hours   = parseFloat((document.getElementById('hours') as HTMLInputElement).value);
    const drinks  = parseFloat((document.getElementById('drinks') as HTMLInputElement).value);
    const volCl   = parseFloat((document.getElementById('vol') as HTMLInputElement).value);
    const k       = parseFloat((document.getElementById('absRate') as HTMLSelectElement).value);
    const beta    = parseFloat((document.getElementById('elimRate') as HTMLSelectElement).value);

    const inputs: InputValues = { weight, rFactor, hours, drinks, volCl, k, beta };
    const series = calcBACSeries(inputs);
    drawChart(series);
  });
