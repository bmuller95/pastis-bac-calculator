// Chart.js is loaded via CDN
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

// Background‐zones plugin
const thresholdPlugin = {
  id: 'thresholdPlugin',
  beforeDraw(chart: any) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const maxY = y.max ?? y._max;
    const zones = [
      { from: 0, to: 0.5,   color: 'rgba(0,255,0,0.1)' },
      { from: 0.5, to: 2.0, color: 'rgba(255,255,0,0.1)' },
      { from: 2.0, to: 3.0, color: 'rgba(255,165,0,0.1)' },
      { from: 3.0, to: 4.0, color: 'rgba(255,0,0,0.1)' },
      { from: 4.0, to: maxY, color: 'rgba(139,0,0,0.1)' }
    ];
    zones.forEach(z => {
      const y1 = y.getPixelForValue(z.from);
      const y2 = y.getPixelForValue(z.to);
      ctx.fillStyle = z.color;
      ctx.fillRect(left, y2, right - left, y1 - y2);
    });
  }
};
Chart.register(thresholdPlugin);

function calcBACSeries(vals: InputValues) {
  const { weight, rFactor, hours, drinks, volCl, k, beta } = vals;
  const abv = 0.40, density = 0.789;
  const gramsPerDrink = volCl * 10 * abv * density;
  const interval = drinks > 1 ? hours / (drinks - 1) : 0;
  const drinkTimes = Array.from({ length: drinks }, (_, i) => i * interval);

  const tEnd = hours + 8;
  const dt = 0.1;
  let prevAbs = 0;
  let currentBAC = 0;
  const series: { t: number; bac: number }[] = [];

  for (let t = 0; t <= tEnd; t += dt) {
    // absorption
    let totalAbs = 0;
    for (const t_i of drinkTimes) {
      if (t >= t_i) {
        totalAbs += gramsPerDrink * (1 - Math.exp(-k * (t - t_i)));
      }
    }
    const dAbs = (totalAbs - prevAbs) / (rFactor * weight);
    prevAbs = totalAbs;

    // **continuous realistic elimination whenever BAC > 0**
    const dElim = currentBAC > 0 ? beta * dt : 0;

    currentBAC = Math.max(currentBAC + dAbs - dElim, 0);
    series.push({ t: parseFloat(t.toFixed(2)), bac: parseFloat(currentBAC.toFixed(4)) });
  }

  return series;
}

let chart: any = null;
function drawChart(data: { t: number; bac: number }[]) {
  const ctx = (document.getElementById('bacChart') as HTMLCanvasElement)
    .getContext('2d');
  const labels = data.map(pt => pt.t);
  const bacData = data.map(pt => pt.bac);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'BAC (g/L)', data: bacData, borderColor: 'blue', borderWidth: 2, fill: 'start', tension: 0.1 }] },
    options: {
      scales: {
        x: { title: { display: true, text: 'Time (hours)' }, ticks: { stepSize: 1 } },
        y: { beginAtZero: true, suggestedMax: 5, title: { display: true, text: 'BAC (g/L)' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

document.getElementById('inputForm')!.addEventListener('submit', e => {
  e.preventDefault();
  const getNum = (id: string) => parseFloat((document.getElementById(id) as HTMLInputElement).value);
  const inputs: InputValues = {
    weight: getNum('weight'), rFactor: getNum('rFactor'), hours: getNum('hours'), drinks: getNum('drinks'),
    volCl: getNum('vol'), k: getNum('absRate'), beta: getNum('elimRate')
  };
  drawChart(calcBACSeries(inputs));
});
