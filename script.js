function toggleFaq(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

function fmt(n) {
  if (n >= 1e7) return '₹' + (n/1e7).toFixed(1) + ' Cr';
  if (n >= 1e5) return '₹' + (n/1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + (n/1e3).toFixed(0) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.floor(n));
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

(function() {
  const saved = localStorage.getItem('urb-theme');
  const theme = saved ? saved : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const k = document.getElementById('toggleKnob');
  if (k) k.textContent = theme === 'dark' ? '🌙' : '☀️';
})();

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('urb-theme', next);
  document.getElementById('toggleKnob').textContent = next === 'dark' ? '🌙' : '☀️';
  if (lastChartData) {
    requestAnimationFrame(() => drawChart(lastChartData.pts, lastChartData.zone, lastChartData.fm, lastChartData.fa));
  }
}

function updateGrowth() {
  const v = document.getElementById('growthSlider').value;
  document.getElementById('growthDisplay').textContent = (v > 0 ? '+' : '') + v + '%';
}

function updateFundraiseMonths() {
  const v = document.getElementById('fundraiseMonths').value;
  document.getElementById('fundraisemonthsDisplay').textContent = v + ' mo';
}

let _raf = null, _lastNum = 0;
function animateCounter(target, el) {
  if (_raf) cancelAnimationFrame(_raf);
  const from = _lastNum;
  const isMax = target >= 120;
  const to = isMax ? 24 : target;
  const dur = 750;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const cur = Math.round(from + (to - from) * ease);
    el.textContent = (isMax && p >= 1) ? '24+' : cur;
    if (p < 1) _raf = requestAnimationFrame(tick);
    else { el.textContent = isMax ? '24+' : to; _lastNum = to; }
  }
  _raf = requestAnimationFrame(tick);
}

let lastChartData = null;
function drawChart(pts, zone, fm, fa) {
  const canvas = document.getElementById('cashChart');
  if (!canvas || !pts || pts.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.offsetWidth || 260;
  const H = 88;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const P = { t:8, r:8, b:22, l:8 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const maxV = pts[0], rng = maxV || 1;
  const xp = i => P.l + (i / (pts.length-1)) * cW;
  const yp = v => P.t + cH - (v / rng) * cH;
  const palette = {
    safe:    { line:'#2ECC71', grad0:'rgba(46,204,113,0.18)',  grad1:'rgba(46,204,113,0)' },
    warning: { line:'#F1C40F', grad0:'rgba(241,196,15,0.18)',  grad1:'rgba(241,196,15,0)' },
    danger:  { line:'#E74C3C', grad0:'rgba(231,76,60,0.18)',   grad1:'rgba(231,76,60,0)' },
  };
  const col = palette[zone] || palette.safe;
  const grad = ctx.createLinearGradient(0, P.t, 0, P.t + cH);
  grad.addColorStop(0, col.grad0); grad.addColorStop(1, col.grad1);
  ctx.beginPath();
  ctx.moveTo(xp(0), yp(pts[0]));
  for (let i=1;i<pts.length;i++) ctx.lineTo(xp(i), yp(pts[i]));
  ctx.lineTo(xp(pts.length-1), P.t+cH); ctx.lineTo(xp(0), P.t+cH);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(xp(0), yp(pts[0]));
  for (let i=1;i<pts.length;i++) ctx.lineTo(xp(i), yp(pts[i]));
  ctx.strokeStyle = col.line; ctx.lineWidth = 2; ctx.lineJoin='round'; ctx.stroke();
  if (fm > 0 && fm < pts.length) {
    ctx.save();
    ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(xp(fm), P.t); ctx.lineTo(xp(fm), P.t+cH);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
    ctx.font = '9px DM Sans,sans-serif';
    ctx.fillText('↑ Raise', xp(fm)+3, P.t+10);
  }
  ctx.beginPath(); ctx.arc(xp(0), yp(pts[0]), 4, 0, Math.PI*2);
  ctx.fillStyle = col.line; ctx.fill();
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.28)';
  ctx.font = '9px DM Sans,sans-serif';
  ctx.textAlign = 'left'; ctx.fillText('Now', P.l, H-5);
  ctx.textAlign = 'right'; ctx.fillText((pts.length-1)+' mo', W-P.r, H-5);
}

function calculate() {
  const cash      = parseFloat(document.getElementById('cashInput').value) || 0;
  const burnGross = parseFloat(document.getElementById('burnInput').value) || 0;
  const growthRate = parseFloat(document.getElementById('growthSlider').value) / 100;
  const revenue   = parseFloat(document.getElementById('revenueInput').value) || 0;
  const fundraise = parseFloat(document.getElementById('fundraiseInput').value) || 0;
  const fMonths   = parseInt(document.getElementById('fundraiseMonths').value);
  const result = document.getElementById('calcResult');
  const empty  = document.getElementById('resultEmpty');
  const cont   = document.getElementById('resultContent');
  if (!cash && !burnGross) {
    result.className = 'calc-result';
    empty.style.display = 'flex'; cont.style.display = 'none';
    return;
  }
  const netBurn = Math.max(0, burnGross - revenue);
  let rem = cash, months = 0, mb = netBurn;
  const MAX = 120;
  const pts = [cash];
  if (netBurn <= 0) {
    months = MAX;
    for (let i=1;i<=24;i++) pts.push(cash);
  } else {
    while (rem > 0 && months < MAX) {
      if (months === fMonths && fundraise > 0) rem += fundraise;
      rem -= mb; months++;
      mb *= (1 + growthRate);
      pts.push(Math.max(0, rem));
    }
  }
  const chartPts = pts.slice(0, 25);
  let fundRunway = 0;
  if (fundraise > 0 && netBurn > 0) fundRunway = Math.min((cash+fundraise)/netBurn, MAX);
  let zone='danger', label='⚠️ Danger Zone';
  if (months >= 12) { zone='safe'; label='✦ Safe Zone'; }
  else if (months >= 6) { zone='warning'; label='◉ Caution Zone'; }
  result.className = 'calc-result ' + zone;
  empty.style.display = 'none'; cont.style.display = 'flex';
  document.getElementById('statusText').textContent = label;
  animateCounter(months, document.getElementById('mainNum'));
  document.getElementById('rb-cash').textContent  = fmt(cash);
  document.getElementById('rb-burn').textContent  = fmt(netBurn)+'/mo';
  document.getElementById('rb-date').textContent  = months >= MAX ? 'Default-proof' : addMonths(new Date(), months);
  const revRow = document.getElementById('rb-rev-row');
  if (revenue > 0) { revRow.style.display='flex'; document.getElementById('rb-rev').textContent=fmt(revenue)+'/mo'; }
  else revRow.style.display='none';
  const fundRow = document.getElementById('rb-fund-row');
  if (fundraise > 0) { fundRow.style.display='flex'; document.getElementById('rb-fund').textContent=Math.min(Math.floor(fundRunway),MAX)+' months'; }
  else fundRow.style.display='none';
  document.getElementById('runwayFill').style.width = Math.min((months/24)*100,100)+'%';
  lastChartData = { pts:chartPts, zone, fm:fundraise>0?fMonths:0, fa:fundraise };
  requestAnimationFrame(() => drawChart(chartPts, zone, fundraise>0?fMonths:0, fundraise));
}

function toggleAdvanced() {
  const f = document.getElementById('advancedFields');
  const t = document.getElementById('advToggle');
  f.classList.toggle('show'); t.classList.toggle('open');
  calculate();
}

function loadScenario(el, cash, burn, growth, rev) {
  document.querySelectorAll('.scenario-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('cashInput').value    = cash;
  document.getElementById('burnInput').value    = burn;
  document.getElementById('growthSlider').value = growth;
  document.getElementById('revenueInput').value = rev;
  updateGrowth();
  if (rev > 0) {
    const f=document.getElementById('advancedFields'),t=document.getElementById('advToggle');
    if (!f.classList.contains('show')) { f.classList.add('show'); t.classList.add('open'); }
  }
  _lastNum = 0;
  calculate();
  document.getElementById('calculator').scrollIntoView({ behavior:'smooth', block:'start' });
}

function activateStep(el) {
  document.querySelectorAll('.how-step').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
}

function toggleMenu() { document.getElementById('mobileMenu').classList.toggle('open'); }

const calcEl = document.getElementById('calculator');
const ctaEl  = document.getElementById('stickyCta');
const mq = window.matchMedia('(max-width:900px)');
const ctaObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!mq.matches) return;
    if (e.isIntersecting) ctaEl.classList.remove('visible');
    else ctaEl.classList.add('visible');
  });
}, { threshold: 0.1 });
ctaObs.observe(calcEl);

const fadeObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => fadeObs.observe(el));

window.addEventListener('resize', () => {
  if (lastChartData) drawChart(lastChartData.pts, lastChartData.zone, lastChartData.fm, lastChartData.fa);
});

updateGrowth();
updateFundraiseMonths();
