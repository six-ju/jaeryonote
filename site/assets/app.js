// 공시 거르기, TradingView 위젯, 계산기
(() => {
    const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;

    const renderTv = (box) => {
        const cfg = { ...JSON.parse(box.dataset.cfg), colorTheme: dark ? 'dark' : 'light' };
        box.innerHTML = '<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';
        const s = document.createElement('script');
        s.src = `https://s3.tradingview.com/external-embedding/${box.dataset.tv}`;
        s.async = true;
        s.textContent = JSON.stringify(cfg);
        box.firstChild.append(s);
    };
    document.querySelectorAll('[data-tv]').forEach(renderTv);

    // 시장 움직임 탭: 같은 스크리너를 다른 기본 화면으로 다시 그린다
    document.querySelectorAll('.tabs [data-screen]').forEach((tab, _, all) => tab.addEventListener('click', () => {
        all.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
        const box = document.querySelector('#screener [data-tv]');
        box.dataset.cfg = JSON.stringify({ ...JSON.parse(box.dataset.cfg), defaultScreen: tab.dataset.screen });
        renderTv(box);
    }));

    // 종류 칩과 회사 이름 검색을 함께 적용한다. 결과가 0건이면 풀기 버튼을 보인다
    const chipsEl = document.querySelectorAll('.chips .chip');
    const q = document.getElementById('q');
    const applyFilter = () => {
        const [kind, value] = (document.querySelector('.chip[aria-pressed="true"]')?.dataset.filter || 'all').split(':');
        const text = (q?.value || '').trim().toLowerCase();
        let shown = 0;
        document.querySelectorAll('.col-main .row').forEach((row) => {
            const okKind = kind === 'all' || row.dataset[kind === 'tone' ? 'tone' : 'cat'] === value;
            row.hidden = !(okKind && row.dataset.name.toLowerCase().includes(text));
            if (!row.hidden) shown += 1;
        });
        document.querySelectorAll('.col-main .day').forEach((day) => { day.hidden = !day.querySelector('.row:not([hidden])'); });
        const empty = document.querySelector('.filter-empty');
        if (empty) empty.hidden = shown > 0 || !document.querySelector('.col-main .row');
    };
    chipsEl.forEach((chip) => chip.addEventListener('click', () => {
        chipsEl.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        applyFilter();
    }));
    q?.addEventListener('input', applyFilter);
    document.querySelector('.filter-empty .reset')?.addEventListener('click', () => {
        q.value = '';
        chipsEl.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === 'all')));
        applyFilter();
        q.focus();
    });

    const out = (form, rows) => {
        form.querySelector('.result').innerHTML = typeof rows === 'string'
            ? `<p class="err">${rows}</p>`
            : `<dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    };
    const CALCS = {
        avg: (v) => {
            if (!(v.qty >= 0 && v.avg > 0 && v.addPrice > 0)) return '가진 수량, 평균 단가, 살 가격을 넣어 주세요.';
            const rows = [['새 평균 단가', won(calc.average(v.qty, v.avg, v.addQty || 0, v.addPrice))], ['총 보유 수량', `${(v.qty + (v.addQty || 0)).toLocaleString('ko-KR')}주`], ['추가 매수 금액', won((v.addQty || 0) * v.addPrice)]];
            if (v.target) {
                const need = calc.sharesForTarget(v.qty, v.avg, v.addPrice, v.target);
                rows.push(['목표 평단까지 필요한 수량', need === null ? '이 가격으로는 만들 수 없어요' : `${need.toLocaleString('ko-KR')}주 (${won(need * v.addPrice)})`]);
            }
            return rows;
        },
        risk: (v) => {
            const r = calc.position(v.risk, v.entry, v.stop, v.target || 0);
            if (!r) return '손절 가격은 살 가격보다 낮아야 해요.';
            return [['살 수 있는 수량', `${r.qty.toLocaleString('ko-KR')}주`], ['필요한 금액', won(r.amount)], ['손절 시 손실', won(r.qty * (v.entry - v.stop))], ['손익비', r.rr === null ? '목표 가격을 넣으면 보여요' : `1 : ${r.rr.toFixed(2)}`]];
        },
        fee: (v) => {
            if (!(v.buy > 0 && v.sell > 0 && v.qty > 0)) return '산 가격, 판 가격, 수량을 넣어 주세요.';
            const r = calc.roundTrip(v.buy, v.sell, v.qty, (v.feePct || 0) / 100, v.market);
            return [['수수료(사고팔 때 합계)', won(r.fee)], ['증권거래세', won(r.tax)], ['남는 돈', won(r.profit)], ['수익률', `${(r.rate * 100).toFixed(2)}%`]];
        },
        'us-tax': (v) => {
            if (!(v.gains >= 0)) return '이익 합계를 넣어 주세요.';
            const r = calc.usTax(v.gains, v.losses || 0, v.costs || 0);
            return [['세금을 매기는 금액', won(r.base)], ['낼 세금(22%)', won(r.tax)]];
        },
    };
    document.querySelectorAll('form.calc').forEach((form) => form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = {};
        for (const [k, val] of new FormData(form)) v[k] = k === 'market' ? val : (val === '' ? 0 : Number(val));
        out(form, CALCS[form.dataset.calc](v));
    }));
})();
