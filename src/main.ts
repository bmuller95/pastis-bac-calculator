// src/main.ts

// Widmark formula: BAC(t) = A(t)/(r·W) – β·t
// defaults
const β = 0.15; // g/L per hour elimination rate
const abv = 0.40; // 40% alcohol
const ethanolDensity = 0.789; // g/ml

interface InputValues {
  weight: number;
  rFactor: number;
  hours: number;
  drinks: number;
  volCl: number;
}

function calcBACSeries(vals: InputValues) {
  const { weight, rFactor, hours, drinks, volCl } = vals;
  const totalMl = drinks * volCl * 10;
  // assume absorption evenly over the entire drinking period:
  // absorption rate in g/hour:
  const totalGrams = totalMl * abv * ethanolDensity;
  const absorbRate = totalGrams / hours;
  const points = [];
  for (let t = 0; t <= hours; t += 0.1) {
    // grams absorbed by t:
    const absorbed = Math.min(absorbRate * t, totalGrams);
    const bac = absorbed / (rFactor * weight) - β * t;
    points.push({ t, bac: Math.max(bac, 0) });
  }
  return points;
}

document.getElementById('inputForm')!
  .addEventListener('submit', (e) => {
    e.preventDefault();
    const vals: InputValues = {
      weight: parseFloat((document.getElementById('weight') as HTMLInputElement).value),
      rFactor: parseFloat((document.getElementById('rFactor') as HTMLSelectElement).value),
      hours: parseFloat((document.getElementById('hours') as HTMLInputElement).value),
      drinks: parseFloat((document.getElementById('drinks') as HTMLInputElement).value),
      volCl: parseFloat((document.getElementById('vol') as HTMLInputElement).value),
    };
    const series = calcBACSeries(vals);
    drawChart(series);
  });

let chart: Chart | null = null;
function drawChart(data: { t: number; bac: number }[]) {
  const ctx = (document.getElementById('bacChart') as HTMLCanvasElement).getContext('2d')!;
  const labels = data.map(pt => pt.t.toFixed(1));
  const bacData = data.map(pt => pt.bac.toFixed(3));
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'BAC (g/L)',
        data: bacData,
        fill: 'start',
        borderWidth: 2,
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, suggestedMax: 1.5 }
      }
    }
  });
}
