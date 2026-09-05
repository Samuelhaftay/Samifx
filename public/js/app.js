(function () {
  const loginScreen = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  const loginName = document.getElementById('loginName');
  const loginBtn = document.getElementById('loginBtn');
  const userChip = document.getElementById('userChip');

  let currentUser = localStorage.getItem('samifx_user') || '';
  let trades = [];
  let currentShotData = null;
  let editingId = null;

  function initAuth() {
    if (currentUser) {
      showApp();
    } else {
      loginScreen.style.display = 'flex';
      app.style.display = 'none';
    }
  }

  function showApp() {
    loginScreen.style.display = 'none';
    app.style.display = 'block';
    userChip.textContent = currentUser;
    loadTrades();
  }

  loginBtn.addEventListener('click', () => {
    const name = loginName.value.trim();
    if (!name) return;
    currentUser = name.toLowerCase().replace(/[^a-z0-9_-]/gi, '');
    localStorage.setItem('samifx_user', currentUser);
    showApp();
  });

  userChip.addEventListener('click', () => {
    if (confirm('Switch journal / log out?')) {
      localStorage.removeItem('samifx_user');
      currentUser = '';
      initAuth();
    }
  });

  async function loadTrades() {
    const res = await fetch(`/api/trades?user=${encodeURIComponent(currentUser)}`);
    const data = await res.json();
    trades = data.trades || [];
    renderStats();
    renderLedger();
  }

  function renderStats() {
    const count = trades.length;
    const wins = trades.filter((t) => t.result === 'Win').length;
    const decided = trades.filter((t) => t.result === 'Win' || t.result === 'Loss').length;
    const winrate = decided ? Math.round((wins / decided) * 100) : 0;
    const pnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    const grades = trades.map((t) => t.grade).filter(Boolean);
    const gradeScore = { 'A+': 105, A: 95, B: 85, C: 75 };
    const avgGrade = grades.length
      ? Math.round(grades.reduce((s, g) => s + (gradeScore[g] || 0), 0) / grades.length)
      : 0;

    document.getElementById('statCount').textContent = count;
    document.getElementById('statWinrate').textContent = winrate + '%';
    const pnlEl = document.getElementById('statPnl');
    pnlEl.textContent = (pnl >= 0 ? '$' : '-$') + Math.abs(pnl).toFixed(0);
    pnlEl.className = 'stat-value' + (pnl < 0 ? ' neg' : '');
    document.getElementById('statAvgR').textContent = avgGrade ? avgGrade + '%' : '—';
  }

  function renderLedger() {
    const ledger = document.getElementById('ledger');
    if (!trades.length) {
      ledger.innerHTML = `<div class="empty-state"><div class="icon">◇</div>No trades yet. Tap the gold button to log your first one.</div>`;
      return;
    }
    ledger.innerHTML = trades
      .map((t) => {
        const d = t.date ? new Date(t.date) : null;
        const dateStr = d
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';
        const pnlNum = parseFloat(t.pnl) || 0;
        const pnlClass = pnlNum > 0 ? 'pos' : pnlNum < 0 ? 'neg' : '';
        const pnlStr = t.pnl ? (pnlNum >= 0 ? '+$' : '-$') + Math.abs(pnlNum) : '—';
        return `
        <div class="trade-row" data-id="${t.id}">
          <div class="t-date">${dateStr}</div>
          <div class="t-main">
            <div class="t-pair">
              <span class="badge ${t.direction === 'Sell' ? 'sell' : 'buy'}">${t.direction || 'Buy'}</span>
              ${escapeHtml(t.pair || '—')}
            </div>
            <div class="t-meta">${t.result || 'Open'}${t.riskPct ? ' · Risk ' + t.riskPct + '%' : ''}</div>
          </div>
          <div class="t-pnl ${pnlClass}">${pnlStr}</div>
          <div class="t-grade">${t.grade || ''}</div>
          <div class="chev">›</div>
        </div>`;
      })
      .join('');

    ledger.querySelectorAll('.trade-row').forEach((row) => {
      row.addEventListener('click', () => openDetail(row.dataset.id));
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---- Trade modal ----
  const tradeModal = document.getElementById('tradeModal');
  const tradeForm = document.getElementById('tradeForm');
  const fabAdd = document.getElementById('fabAdd');
  const closeModal = document.getElementById('closeModal');
  const dirSeg = document.getElementById('dirSeg');
  let selectedDir = 'Buy';

  dirSeg.querySelectorAll('.dir-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedDir = btn.dataset.val;
      dirSeg.querySelectorAll('.dir-btn').forEach((b) => b.classList.remove('active', 'buy', 'sell'));
      btn.classList.add('active', selectedDir.toLowerCase());
    });
  });

  fabAdd.addEventListener('click', () => openTradeModal());
  closeModal.addEventListener('click', () => tradeModal.classList.remove('open'));

  function openTradeModal(trade) {
    editingId = trade ? trade.id : null;
    document.getElementById('modalTitle').textContent = trade ? 'Edit Trade' : 'Log a Trade';
    document.getElementById('deleteTradeBtn').style.display = trade ? 'block' : 'none';
    tradeForm.reset();
    currentShotData = trade ? trade.screenshot || null : null;
    updateShotPreview();

    selectedDir = trade ? trade.direction || 'Buy' : 'Buy';
    dirSeg.querySelectorAll('.dir-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === selectedDir);
      b.classList.toggle('buy', b.dataset.val === selectedDir && selectedDir === 'Buy');
      b.classList.toggle('sell', b.dataset.val === selectedDir && selectedDir === 'Sell');
    });

    document.getElementById('fPair').value = trade ? trade.pair || '' : '';
    document.getElementById('fDate').value = trade ? trade.date || '' : new Date().toISOString().slice(0, 10);
    document.getElementById('fEntry').value = trade ? trade.entry || '' : '';
    document.getElementById('fSL').value = trade ? trade.sl || '' : '';
    document.getElementById('fTP').value = trade ? trade.tp || '' : '';
    document.getElementById('fRisk').value = trade ? trade.riskPct || '' : '';
    document.getElementById('fGrade').value = trade ? trade.grade || '' : '';
    document.getElementById('fResult').value = trade ? trade.result || 'Open' : 'Open';
    document.getElementById('fPnl').value = trade ? trade.pnl || '' : '';
    document.getElementById('fReason').value = trade ? trade.reason || '' : '';
    document.getElementById('fNotes').value = trade ? trade.notes || '' : '';

    tradeModal.classList.add('open');
  }

  const shotDrop = document.getElementById('shotDrop');
  const fShot = document.getElementById('fShot');
  shotDrop.addEventListener('click', () => fShot.click());
  fShot.addEventListener('change', () => {
    const file = fShot.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentShotData = e.target.result;
      updateShotPreview();
    };
    reader.readAsDataURL(file);
  });

  function updateShotPreview() {
    const label = document.getElementById('shotLabel');
    const existingImg = shotDrop.querySelector('img');
    if (existingImg) existingImg.remove();
    if (currentShotData) {
      label.textContent = 'Tap to replace screenshot';
      const img = document.createElement('img');
      img.src = currentShotData;
      shotDrop.appendChild(img);
    } else {
      label.textContent = 'Tap to attach chart screenshot';
    }
  }

  tradeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trade = {
      direction: selectedDir,
      pair: document.getElementById('fPair').value.trim().toUpperCase(),
      date: document.getElementById('fDate').value,
      entry: document.getElementById('fEntry').value,
      sl: document.getElementById('fSL').value,
      tp: document.getElementById('fTP').value,
      riskPct: document.getElementById('fRisk').value,
      grade: document.getElementById('fGrade').value,
      result: document.getElementById('fResult').value,
      pnl: document.getElementById('fPnl').value,
      reason: document.getElementById('fReason').value,
      notes: document.getElementById('fNotes').value,
      screenshot: currentShotData
    };

    if (editingId) {
      await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, id: editingId, trade })
      });
    } else {
      await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, trade })
      });
    }
    tradeModal.classList.remove('open');
    loadTrades();
  });

  document.getElementById('deleteTradeBtn').addEventListener('click', async () => {
    if (!editingId) return;
    if (!confirm('Delete this trade permanently?')) return;
    await fetch(`/api/trades?user=${encodeURIComponent(currentUser)}&id=${editingId}`, { method: 'DELETE' });
    tradeModal.classList.remove('open');
    loadTrades();
  });

  // ---- Detail modal ----
  const detailModal = document.getElementById('detailModal');
  const detailBody = document.getElementById('detailBody');
  document.getElementById('closeDetail').addEventListener('click', () => detailModal.classList.remove('open'));

  let detailTrade = null;

  function openDetail(id) {
    detailTrade = trades.find((t) => t.id === id);
    if (!detailTrade) return;
    document.getElementById('detailTitle').textContent = detailTrade.pair || 'Trade';
    detailBody.innerHTML = `
      <div class="detail-row"><span>Direction</span><span>${detailTrade.direction || '—'}</span></div>
      <div class="detail-row"><span>Date</span><span>${detailTrade.date || '—'}</span></div>
      <div class="detail-row"><span>Entry</span><span>${detailTrade.entry || '—'}</span></div>
      <div class="detail-row"><span>Stop Loss</span><span>${detailTrade.sl || '—'}</span></div>
      <div class="detail-row"><span>Take Profit</span><span>${detailTrade.tp || '—'}</span></div>
      <div class="detail-row"><span>Risk</span><span>${detailTrade.riskPct ? detailTrade.riskPct + '%' : '—'}</span></div>
      <div class="detail-row"><span>Setup Grade</span><span>${detailTrade.grade || '—'}</span></div>
      <div class="detail-row"><span>Result</span><span>${detailTrade.result || '—'}</span></div>
      <div class="detail-row"><span>P&L</span><span>${detailTrade.pnl ? '$' + detailTrade.pnl : '—'}</span></div>
      ${detailTrade.reason ? `<div class="detail-note"><h4>Reason / Confluence</h4>${escapeHtml(detailTrade.reason)}</div>` : ''}
      ${detailTrade.notes ? `<div class="detail-note"><h4>Notes / Lessons</h4>${escapeHtml(detailTrade.notes)}</div>` : ''}
      ${detailTrade.screenshot ? `<img src="${detailTrade.screenshot}" alt="Trade screenshot" />` : ''}
    `;
    detailModal.classList.add('open');
  }

  document.getElementById('editFromDetail').addEventListener('click', () => {
    detailModal.classList.remove('open');
    openTradeModal(detailTrade);
  });

  initAuth();

  // If arriving from the checklist with a pending grade, auto-open the trade modal prefilled
  const params = new URLSearchParams(window.location.search);
  if (params.get('newTrade') === '1' && currentUser) {
    const pending = localStorage.getItem('samifx_pending_grade');
    if (pending) {
      const { grade, risk } = JSON.parse(pending);
      setTimeout(() => {
        openTradeModal();
        document.getElementById('fGrade').value = grade && grade !== 'No Setup' ? grade : '';
        document.getElementById('fRisk').value = risk || '';
      }, 50);
      localStorage.removeItem('samifx_pending_grade');
    }
    window.history.replaceState({}, '', '/index.html');
  }
})();
