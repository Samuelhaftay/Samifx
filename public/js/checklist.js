(function () {
  const currentUser = localStorage.getItem('samifx_user');
  document.getElementById('userChip').textContent = currentUser || '···';
  if (!currentUser) window.location.href = '/index.html';

  const SECTIONS = [
    {
      key: 'weekly',
      name: 'Weekly',
      weight: 10,
      items: [
        'Trend', 'AOI / Rejected', 'Touching EMA', 'Round Psychological Level',
        'Rejection From Last Structure', 'Candlestick Rejection AOI', 'Break And Retest', 'Head & Shoulder'
      ]
    },
    {
      key: 'daily',
      name: 'Daily',
      weight: 10,
      items: [
        'Trend', 'AOI / Rejected', 'Touching EMA', 'Round Psychological Level',
        'Rejection From Previous Structure', 'Candlestick Rejection', 'Break And Retest', 'Head & Shoulder'
      ]
    },
    {
      key: '4h',
      name: '4H',
      weight: 5,
      items: [
        'Trend', 'AOI Rejection', 'Touching EMA', 'Round Psychological Level',
        'Rejection From Last Structure', 'Candlestick Rejection', 'Break And Retest', 'Head And Shoulder'
      ]
    },
    {
      key: 'ltf',
      name: '2H / 1H / 30M',
      weight: 5,
      items: ['Trend', 'Touching EMA', 'Break And Retest', 'Head & Shoulder']
    },
    {
      key: 'entry',
      name: 'Entry Signal',
      weight: 20,
      items: ['Engulfing Candlestick (30M · 1H · 2H · 4H)', 'SOS — Shift Of Structure (30M · 1H · 2H · 4H)']
    }
  ];

  const STORAGE_KEY = 'samifx_checklist_' + (currentUser || 'anon');
  let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  const sectionsEl = document.getElementById('sections');

  function render() {
    sectionsEl.innerHTML = SECTIONS.map((sec) => {
      const items = sec.items
        .map((item, i) => {
          const id = `${sec.key}_${i}`;
          const checked = !!state[id];
          return `
          <div class="check-item">
            <input type="checkbox" id="${id}" data-weight="${sec.weight}" ${checked ? 'checked' : ''} />
            <label for="${id}">${item}</label>
            <span class="w-tag">${sec.weight}%</span>
          </div>`;
        })
        .join('');
      return `
      <div class="section-card">
        <div class="section-head">
          <h3>${sec.name}</h3>
          <span class="s-pct" id="pct_${sec.key}">0%</span>
        </div>
        <div class="section-body">${items}</div>
      </div>`;
    }).join('');

    sectionsEl.querySelectorAll('input[type=checkbox]').forEach((box) => {
      box.addEventListener('change', () => {
        state[box.id] = box.checked;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        updateTotals();
      });
    });

    updateTotals();
  }

  function updateTotals() {
    let total = 0;
    SECTIONS.forEach((sec) => {
      let secTotal = 0;
      sec.items.forEach((item, i) => {
        const id = `${sec.key}_${i}`;
        if (state[id]) secTotal += sec.weight;
      });
      const pctEl = document.getElementById(`pct_${sec.key}`);
      if (pctEl) pctEl.textContent = secTotal + '%';
      total += secTotal;
    });

    document.getElementById('totalPct').textContent = total + '%';
    document.getElementById('barFill').style.width = Math.min(total, 100) + '%';

    let grade = '—', risk = '0%', color = 'var(--grey)';
    if (total > 100) { grade = 'A+'; risk = '4%'; }
    else if (total >= 90) { grade = 'A'; risk = '2%'; }
    else if (total >= 80) { grade = 'B'; risk = '1%'; }
    else if (total >= 70) { grade = 'C'; risk = '0.5%'; }
    else { grade = 'No Setup'; risk = '0%'; }

    document.getElementById('gradeLetter').textContent = grade;
    document.getElementById('gradeRisk').textContent = risk;

    window._samifxTotal = total;
    window._samifxGrade = grade;
    window._samifxRisk = risk.replace('%', '');
  }

  document.getElementById('resetLink').addEventListener('click', () => {
    if (!confirm('Reset all checklist items?')) return;
    state = {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  });

  document.getElementById('useGradeBtn').addEventListener('click', () => {
    localStorage.setItem('samifx_pending_grade', JSON.stringify({
      grade: window._samifxGrade,
      risk: window._samifxRisk
    }));
    window.location.href = '/index.html?newTrade=1';
  });

  render();
})();
