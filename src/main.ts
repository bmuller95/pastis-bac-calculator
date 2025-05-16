// src/main.ts

// Chart.js loaded via CDN
declare const Chart: any;

interface InputValues {
  weight: number;
  rFactor: number;
  hours: number;
  drinks: number;
  volCl: number;
  k: number;
  beta: number;
}

function calcBACSeries(vals: InputValues) {
  const { weight, rFactor, hours, drinks, volCl, k, beta } = vals;
  const abv = 0.40, density = 0.789;
  const gramsPerDrink = volCl * 10 * abv * density;
  const interval = drinks > 1 ? hours / (drinks - 1) : 0;
  const drinkTimes = Array.from({ length: drinks }, (_, i) => i * interval);
  const tEnd = hours + 8, dt = 0.1;

  let prevAbs = 0;
  let currentBAC = 0;
  const series: { t: number; bac: number }[] = [];

  for (let t = 0; t <= tEnd; t += dt) {
    let totalAbs = 0;
    for (const t_i of drinkTimes) {
      if (t >= t_i) totalAbs += gramsPerDrink * (1 - Math.exp(-k * (t - t_i)));
    }
    const dAbsGrams = totalAbs - prevAbs;
    prevAbs = totalAbs;
    const dAbsBAC = dAbsGrams / (rFactor * weight);
    const dElim = currentBAC > 0 ? beta * dt : 0;
    currentBAC = Math.max(currentBAC + dAbsBAC - dElim, 0);
    series.push({ t: parseFloat(t.toFixed(2)), bac: parseFloat(currentBAC.toFixed(4)) });
  }
  return series;
}

let chart: any = null;

function drawChart(data: { t: number; bac: number }[]) {
  const ctx = (document.getElementById('bacChart') as HTMLCanvasElement).getContext('2d');
  const labels = data.map(pt => pt.t);
  const bacData = data.map(pt => pt.bac);

  const thresholds = [0.5, 0.8, 1.2];
  const thDatasets = thresholds.map(val => ({
    label: val + ' g/L', data: Array(labels.length).fill(val),
    borderColor: 'orange', borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false
  }));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'BAC (g/L)', data: bacData, borderColor: 'blue', fill: 'start' }, ...thDatasets]
    },
    options: {
      scales: {
        x: {
          title: { display: true, text: 'Time (hours)' },
          ticks: { stepSize: 1 }
        },
        y: { beginAtZero: true, suggestedMax: 1.5, title: { display: true, text: 'Blood Alcohol Content (g/L)' } }
      },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

document.getElementById('inputForm')!.addEventListener('submit', e => {
  e.preventDefault();
  const getVal = (id: string) => parseFloat((document.getElementById(id) as HTMLInputElement).value);
  const inputs: InputValues = {
    weight: getVal('weight'), rFactor: getVal('rFactor'), hours: getVal('hours'),
    drinks: getVal('drinks'), volCl: getVal('vol'),
    k: getVal('absRate'), beta: getVal('elimRate')
  };
  drawChart(calcBACSeries(inputs));
});