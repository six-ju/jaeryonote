// data/*.json + content → dist/ 정적 사이트. 사용: node scripts/build.js --site https://도메인
const fs = require('fs');
const path = require('path');
const { CATEGORIES } = require('./dart');
const guides = require('../content/guides');
const config = require('../config.json');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const argSite = process.argv.indexOf('--site');
const SITE = (argSite > 0 ? process.argv[argSite + 1] : config.site).replace(/\/$/, '');
const BASE = new URL(SITE).pathname.replace(/\/$/, '');
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')); } catch { return d; } };

// XML(rss·sitemap)이 깨지지 않게 제어문자도 지운다
const esc = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (p) => `${BASE}${p}`;
const KST = { timeZone: 'Asia/Seoul' };
const dayKey = (iso) => new Date(iso).toLocaleDateString('sv-SE', KST);
const dayLabel = (key) => new Date(`${key}T12:00:00+09:00`).toLocaleDateString('ko-KR', { ...KST, month: 'long', day: 'numeric', weekday: 'short' });
const hm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { ...KST, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const stamp = (iso) => (iso ? new Date(iso).toLocaleString('ko-KR', { ...KST, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '아직 없음');
const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const dartLink = (rcpNo) => `https://dart.fss.or.kr/api/link.jsp?rcpNo=${encodeURIComponent(rcpNo)}`;
const TONE = { good: '호재성', warn: '주의', info: '참고' };

// 데이터가 없는 화면은 메뉴와 사이트맵에서 뺀다(빈 페이지가 검색·광고 심사에 걸리지 않게)
const hasInsiders = read('insiders.json', []).length > 0;
const NAV = [
    ['/', '오늘의 재료'],
    ['/market/', '미국 시장'],
    ...(hasInsiders ? [['/us-insiders/', '미국 내부자 매수']] : []),
    ['/tools/', '계산기'],
    ['/guide/', '공시 공부'],
];

// 광고는 자동 광고 스크립트 하나로 시작한다. shortcut: 수동 광고 단위는 애드센스 승인 뒤 config.adsenseSlots에 넣으면 adSlot이 그린다
const adSlot = (name) => {
    const slot = config.adsenseSlots?.[name];
    if (!config.adsense || !slot) return '';
    return `<aside class="ad" aria-label="광고"><span class="ad-label">광고</span><ins class="adsbygoogle" style="display:block" data-ad-client="${config.adsense}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></aside>`;
};

const layout = ({ path: p, title, description, body, scripts = '' }) => {
    const canonical = `${SITE}${p}`;
    const full = p === '/' ? `${config.name} · ${config.tagline}` : `${title} · ${config.name}`;
    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE}/assets/og.png">
<meta name="theme-color" content="#f7f5f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">
${config.naverVerification ? `<meta name="naver-site-verification" content="${esc(config.naverVerification)}">` : ''}
<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(config.name)} 공시 피드" href="${url('/rss.xml')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@600;800&display=swap">
<link rel="stylesheet" href="${url('/assets/style.css')}">
${config.adsense ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsense}" crossorigin="anonymous"></script>` : ''}
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="${url('/')}">재료<b>노트</b></a>
    <nav aria-label="주 메뉴"><ul>${NAV.map(([href, label]) => `<li><a href="${url(href)}"${href === p ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul></nav>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <p>${esc(config.name)}는 공개된 공시를 종류별로 정리해 보여 줍니다. 투자 권유가 아니며, 종목 추천이나 주가 예측을 하지 않습니다. 투자 판단과 책임은 본인에게 있습니다.</p>
    <p>자료: 금융감독원 전자공시시스템(DART), 미국 증권거래위원회(SEC) EDGAR. 시세 화면은 TradingView가 제공합니다.</p>
    <ul class="foot-links"><li><a href="${url('/about/')}">소개</a></li><li><a href="${url('/terms/')}">이용 안내</a></li><li><a href="${url('/privacy/')}">개인정보처리방침</a></li><li><a href="${url('/contact/')}">문의</a></li></ul>
  </div>
</footer>
${scripts}
</body>
</html>
`;
};

const page = (p, opts) => {
    const file = path.join(OUT, p === '/404.html' ? '404.html' : path.join(p, 'index.html'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, layout({ path: p, ...opts }));
    return p;
};

const feedRow = (d) => `<li class="row" data-cat="${d.category}" data-tone="${d.tone}" data-name="${esc(d.company)}">
  <time datetime="${esc(d.at)}">${d.at.endsWith('T00:00:00+09:00') ? '' : hm(d.at)}</time>
  <div class="row-main">
    <p class="row-title"><span class="mkt">${esc(d.market)}</span> <strong>${esc(d.company)}</strong> <span class="tag t-${d.tone}">${esc(d.label)}</span></p>
    <p class="row-sub"><a href="${dartLink(d.rcpNo)}" rel="nofollow noopener" target="_blank">${esc(d.report)}<span class="sr-only"> (DART 원문, 새 창)</span></a></p>
  </div>
</li>`;

const feed = (items, { adAfter = 12 } = {}) => {
    if (!items.length) return '<p class="empty">아직 모인 공시가 없어요. 장이 열리는 평일에 다시 확인해 주세요.</p>';
    const groups = new Map();
    for (const d of items) {
        const k = dayKey(d.at);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(d);
    }
    let n = 0;
    return [...groups].map(([k, rows]) => `<section class="day"><h2 class="day-h">${dayLabel(k)} <span>${rows.length}건</span></h2><ol class="feed">${rows.map((d) => {
        n += 1;
        // 광고는 목록 사이에 한 번만, 앞쪽 콘텐츠를 밀어내지 않게 12번째 뒤에 둔다
        return feedRow(d) + (n === adAfter ? `</ol>${adSlot('feed')}<ol class="feed">` : '');
    }).join('')}</ol></section>`).join('');
};

const chips = (items) => {
    const count = (fn) => items.filter(fn).length;
    const used = CATEGORIES.filter((c) => items.some((d) => d.category === c.key));
    return `<div class="chips" role="group" aria-label="공시 종류 거르기">
  <button type="button" class="chip" data-filter="all" aria-pressed="true">전체 <span>${items.length}</span></button>
  <button type="button" class="chip" data-filter="tone:good" aria-pressed="false">호재성 <span>${count((d) => d.tone === 'good')}</span></button>
  <button type="button" class="chip" data-filter="tone:warn" aria-pressed="false">주의 <span>${count((d) => d.tone === 'warn')}</span></button>
  ${used.map((c) => `<button type="button" class="chip" data-filter="cat:${c.key}" aria-pressed="false">${c.label} <span>${count((d) => d.category === c.key)}</span></button>`).join('\n  ')}
</div>`;
};

// 다크 모드에 맞춰 테마를 고르려고 위젯 스크립트는 app.js가 넣는다
const tvWidget = (script, cfg, height) => `<div class="tv" style="min-height:${height}px" data-tv="${script}" data-cfg="${esc(JSON.stringify({ ...cfg, locale: 'kr', isTransparent: true, width: '100%', height }))}"><noscript>TradingView 화면을 보려면 자바스크립트를 켜 주세요.</noscript></div>`;

const build = () => {
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.cpSync(path.join(ROOT, 'site'), OUT, { recursive: true });
    const disclosures = read('disclosures.json', []);
    const insiders = read('insiders.json', []);
    const status = read('status.json', {});
    const pages = [];
    const appJs = `<script src="${url('/assets/calc.js')}" defer></script><script src="${url('/assets/app.js')}" defer></script>`;

    const recent = disclosures.filter((d) => Date.parse(d.at) >= Date.now() - 7 * 86400000).slice(0, 400);
    pages.push(page('/', {
        title: '오늘의 재료',
        description: '오늘 나온 무상증자, 자사주 취득, 공급계약, 유상증자 같은 주식 재료 공시를 종류별로 한눈에 봅니다.',
        body: `<div class="head">
  <h1>오늘 나온 재료</h1>
  <p class="lede">주가를 움직일 만한 공시만 골라 종류별로 묶었어요. 가격은 보여 주지 않고, 무슨 일이 생겼는지만 정리합니다.</p>
  <p class="meta">마지막 확인 ${stamp(status.dart?.at)} · 최근 7일 ${recent.length}건 · 출처 DART</p>
</div>
<div class="finder"><label for="q">회사 이름으로 찾기</label><input id="q" type="search" autocomplete="off" placeholder="예: 삼성전자"></div>
${chips(recent)}
<div class="filter-empty" hidden><p>조건에 맞는 공시가 없어요.</p><button type="button" class="reset">거르기 풀기</button></div>
<div class="layout">
  <div class="col-main">${feed(recent)}</div>
  <aside class="col-side" aria-label="시장 지표">
    <h2 class="side-h">환율·미국 시장</h2>
    ${tvWidget('embed-widget-market-quotes.js', { symbolsGroups: [{ name: '환율·미국 ETF', symbols: [{ name: 'FX_IDC:USDKRW', displayName: '원·달러' }, { name: 'AMEX:SPY', displayName: 'S&P500 ETF' }, { name: 'NASDAQ:QQQ', displayName: '나스닥100 ETF' }, { name: 'NASDAQ:SOXX', displayName: '반도체 ETF' }, { name: 'AMEX:GLD', displayName: '금 ETF' }] }], showSymbolLogo: false }, 330)}
    <p class="note">호재성·주의 표시는 공시 종류의 일반적인 성격일 뿐, 그 종목이 오르거나 내린다는 뜻이 아니에요. <a href="${url('/guide/')}">공시 읽는 법</a></p>
  </aside>
</div>
${adSlot('bottom')}`,
        scripts: appJs,
    }));

    for (const c of CATEGORIES) {
        const items = disclosures.filter((d) => d.category === c.key);
        const g = guides.find((x) => x.category === c.key);
        pages.push(page(`/c/${c.key}/`, {
            title: `${c.label} 공시 모음`,
            description: `최근 30일 동안 나온 ${c.label} 공시를 날짜순으로 모았어요.`,
            body: `<div class="head"><p class="crumb"><a href="${url('/')}">오늘의 재료</a></p><h1>${c.label} 공시 모음</h1><p class="lede">최근 30일 동안 나온 ${c.label} 관련 공시 ${items.length}건이에요. <span class="tag t-${c.tone}">${TONE[c.tone]}</span></p>${g ? `<p class="meta">읽어 보기: <a href="${url(`/guide/${g.slug}/`)}">${esc(g.title)}</a></p>` : ''}</div>${feed(items)}${adSlot('bottom')}`,
        }));
    }

    pages.push(page('/market/', {
        title: '미국 시장 움직임',
        description: '미국 주식 상승률 상위, 거래량 급증, 52주 신고가 종목을 TradingView 화면으로 확인합니다.',
        body: `<div class="head"><h1>미국 시장 움직임</h1><p class="lede">미국 주식 중 많이 오른 종목, 평소보다 거래가 몰린 종목, 신고가를 쓴 종목이에요. 화면과 숫자는 TradingView가 제공하고, 지연된 시세일 수 있어요.</p><p class="meta">국내 주식 시세는 거래소 라이선스 때문에 외부 사이트에서 보여 줄 수 없어요. 국내는 <a href="${url('/')}">오늘의 재료</a>에서 공시로 확인하세요.</p></div>
<div class="tabs" role="tablist" aria-label="화면 고르기">
  <button type="button" role="tab" aria-selected="true" data-screen="top_gainers">상승률 상위</button>
  <button type="button" role="tab" aria-selected="false" data-screen="unusual_volume">거래량 급증</button>
  <button type="button" role="tab" aria-selected="false" data-screen="above_52wk_high">52주 신고가</button>
  <button type="button" role="tab" aria-selected="false" data-screen="volume_leaders">거래량 상위</button>
</div>
<div id="screener">${tvWidget('embed-widget-screener.js', { market: 'america', defaultColumn: 'overview', defaultScreen: 'top_gainers', showToolbar: true }, 620)}</div>
<p class="note">급하게 오른 종목은 그만큼 급하게 내릴 수도 있어요. 같은 회사 임원이 최근 주식을 샀는지 <a href="${url('/us-insiders/')}">미국 내부자 매수</a>에서 확인해 보세요.</p>
${adSlot('bottom')}`,
        scripts: appJs,
    }));

    (hasInsiders ? pages : []).push(page('/us-insiders/', {
        title: '미국 내부자 매수',
        description: '미국 상장사 임원과 대주주가 자기 돈으로 회사 주식을 장내에서 산 기록(SEC Form 4, 거래 코드 P)을 모았어요.',
        body: `<div class="head"><h1>미국 내부자 매수</h1><p class="lede">임원·이사·10% 이상 주주가 시장에서 직접 산 기록만 모았어요(SEC Form 4, 코드 P, ${usd(50000)} 이상). 보상으로 받은 주식이나 옵션 행사는 뺐어요.</p><p class="meta">마지막 확인 ${stamp(status.sec?.at)} · 최근 30일 ${insiders.length}건 · 출처 SEC EDGAR</p></div>
${insiders.length ? `<div class="table-wrap"><table class="data"><caption class="sr-only">미국 내부자 장내 매수 목록</caption><thead><tr><th scope="col">거래일</th><th scope="col">종목</th><th scope="col">산 사람</th><th scope="col" class="num">매수 금액</th><th scope="col" class="num">주식 수</th></tr></thead><tbody>${insiders.slice(0, 300).map((r) => `<tr><td>${esc(r.date)}</td><td>${String(r.url).startsWith('https://www.sec.gov/') ? `<a href="${esc(r.url)}" rel="nofollow noopener" target="_blank"><strong>${esc(r.ticker)}</strong></a>` : `<strong>${esc(r.ticker)}</strong>`} <span class="muted">${esc(r.company)}</span></td><td>${esc(r.owner)} <span class="muted">${esc(r.role)}</span></td><td class="num">${usd(r.value)}</td><td class="num">${r.shares.toLocaleString('en-US')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">아직 모인 기록이 없어요.</p>'}
<p class="note"><a href="${url('/guide/form4/')}">Form 4 읽는 법</a> · 내부자 매수가 주가 상승을 약속하지는 않아요.</p>
${adSlot('bottom')}`,
    }));

    const tools = [
        ['avg', '물타기 평단 계산기', '추가로 사면 평균 단가가 얼마가 되는지, 목표 평단까지 몇 주가 더 필요한지 계산해요.'],
        ['risk', '손절 기준 매수 수량 계산기', '한 번에 잃어도 되는 금액과 손절가로 살 수 있는 주식 수와 손익비를 계산해요.'],
        ['fee', '국내 주식 수수료·세금 계산기', '사고팔 때 드는 증권사 수수료와 증권거래세(2026년 세율)를 빼고 남는 돈을 계산해요.'],
        ['us-tax', '해외주식 양도소득세 계산기', '1년 동안 해외주식으로 번 돈에서 250만 원을 빼고 22%로 세금을 계산해요.'],
    ];
    pages.push(page('/tools/', {
        title: '주식 계산기',
        description: '물타기 평단, 손절 기준 수량, 국내 주식 수수료·세금, 해외주식 양도세 계산기를 모았어요.',
        body: `<div class="head"><h1>계산기</h1><p class="lede">매매 전에 숫자부터 맞춰 보세요. 입력한 값은 이 브라우저 밖으로 나가지 않아요.</p></div><ul class="list">${tools.map(([k, t, d]) => `<li><a href="${url(`/tools/${k}/`)}"><strong>${t}</strong><span>${d}</span></a></li>`).join('')}</ul>${adSlot('bottom')}`,
    }));
    const forms = {
        avg: `<div class="fields"><label>지금 가진 주식 수<input name="qty" type="number" inputmode="decimal" min="0" required></label><label>지금 평균 단가(원)<input name="avg" type="number" inputmode="decimal" min="0" required></label><label>더 살 주식 수<input name="addQty" type="number" inputmode="decimal" min="0" value="0"></label><label>더 살 가격(원)<input name="addPrice" type="number" inputmode="decimal" min="0" required></label><label>목표 평단(원, 선택)<input name="target" type="number" inputmode="decimal" min="0"></label></div>`,
        risk: `<div class="fields"><label>이번에 잃어도 되는 금액(원)<input name="risk" type="number" inputmode="decimal" min="0" required></label><label>살 가격(원)<input name="entry" type="number" inputmode="decimal" min="0" required></label><label>손절할 가격(원)<input name="stop" type="number" inputmode="decimal" min="0" required></label><label>목표 가격(원, 선택)<input name="target" type="number" inputmode="decimal" min="0"></label></div>`,
        fee: `<div class="fields"><label>시장<select name="market"><option value="KOSPI">코스피 (0.20%)</option><option value="KOSDAQ">코스닥 (0.20%)</option><option value="KONEX">코넥스 (0.10%)</option></select></label><label>산 가격(원)<input name="buy" type="number" inputmode="decimal" min="0" required></label><label>판 가격(원)<input name="sell" type="number" inputmode="decimal" min="0" required></label><label>주식 수<input name="qty" type="number" inputmode="decimal" min="0" required></label><label>증권사 수수료율(%)<input name="feePct" type="number" inputmode="decimal" min="0" step="0.001" value="0.015"></label></div>`,
        'us-tax': `<div class="fields"><label>올해 판 해외주식 이익 합계(원)<input name="gains" type="number" inputmode="decimal" min="0" required></label><label>올해 판 해외주식 손실 합계(원)<input name="losses" type="number" inputmode="decimal" min="0" value="0"></label><label>매매 수수료 등 비용(원)<input name="costs" type="number" inputmode="decimal" min="0" value="0"></label></div>`,
    };
    const toolNotes = {
        fee: '증권거래세는 2026년 1월 1일 이후 매도분 기준이에요. 코스피는 거래세 0.05%와 농어촌특별세 0.15%를 더한 값이에요. 수수료율은 증권사와 이벤트마다 달라요.',
        'us-tax': '국내·해외 주식 손익을 합쳐 연 250만 원을 공제하고, 소득세 20%와 지방소득세 2%를 더해 계산했어요. 중소기업 주식, 외국납부세액공제, 환율 차이는 반영하지 않았어요. 신고 전에는 홈택스나 세무사와 확인하세요.',
        avg: '수수료와 세금은 빼고 계산해요.',
        risk: '수수료, 세금, 손절가보다 낮게 체결되는 경우(슬리피지)는 빠져 있어요.',
    };
    for (const [k, t, d] of tools) {
        pages.push(page(`/tools/${k}/`, {
            title: t,
            description: d,
            body: `<div class="head"><p class="crumb"><a href="${url('/tools/')}">계산기</a></p><h1>${t}</h1><p class="lede">${d}</p></div><form class="calc" data-calc="${k}" novalidate>${forms[k]}<button type="submit">계산하기</button><output class="result" aria-live="polite"></output></form><p class="note">${toolNotes[k]}</p>${adSlot('bottom')}`,
            scripts: appJs,
        }));
    }

    pages.push(page('/guide/', {
        title: '공시 공부',
        description: '무상증자, 자사주, 유상증자, 공급계약, VI, 상한가, 미국 내부자 매수를 공시 기준으로 쉽게 정리했어요.',
        body: `<div class="head"><h1>공시 공부</h1><p class="lede">공시 제목만 보고 판단하지 않도록, 자주 나오는 공시에서 무엇을 봐야 하는지 정리했어요.</p></div><ul class="list">${guides.map((g) => `<li><a href="${url(`/guide/${g.slug}/`)}"><strong>${esc(g.title)}</strong><span>${esc(g.description)}</span></a></li>`).join('')}</ul>${adSlot('bottom')}`,
    }));
    for (const g of guides) {
        const related = g.category ? disclosures.filter((d) => d.category === g.category).slice(0, 8) : [];
        pages.push(page(`/guide/${g.slug}/`, {
            title: g.title,
            description: g.description,
            body: `<article class="prose"><p class="crumb"><a href="${url('/guide/')}">공시 공부</a></p><h1>${esc(g.title)}</h1>${g.body}</article>${adSlot('article')}${related.length ? `<section class="related"><h2>최근 나온 같은 종류 공시</h2><ol class="feed">${related.map(feedRow).join('')}</ol><p><a href="${url(`/c/${g.category}/`)}">더 보기 →</a></p></section>` : ''}`,
        }));
    }

    const simple = (p, title, description, html) => pages.push(page(p, { title, description, body: `<article class="prose"><h1>${title}</h1>${html}</article>` }));
    simple('/about/', '재료노트 소개', '재료노트가 무엇을 보여 주고 무엇을 하지 않는지 소개합니다.', `
<p>재료노트는 주가를 움직이는 "재료", 그중에서도 회사가 직접 낸 공시를 종류별로 정리해 보여 주는 사이트예요. 매일 수백 건씩 쏟아지는 공시 가운데 무상증자, 자사주 취득, 공급계약, 유상증자, 전환사채처럼 주주가 알아야 할 것만 골라 묶습니다.</p>
<h2>하는 일</h2><ul><li>전자공시시스템(DART)의 공시를 모아 종류를 붙여요.</li><li>미국 상장사 임원·대주주의 장내 매수 기록(SEC Form 4)을 모아요.</li><li>공시를 읽는 법과 매매 계산기를 제공해요.</li></ul>
<h2>하지 않는 일</h2><ul><li>종목을 추천하거나 주가를 예측하지 않아요. "호재성", "주의"는 공시 종류의 일반적인 성격이에요.</li><li>유료 회원, 리딩방, 1:1 상담을 운영하지 않아요.</li><li>시세를 직접 모으거나 다시 배포하지 않아요. 시세 화면은 TradingView 위젯이에요.</li></ul>
<h2>업데이트</h2><p>평일 장 시간 동안 자동으로 확인해요. 마지막 확인 시각은 각 화면 위에 적혀 있어요.</p>`);
    simple('/terms/', '이용 안내', '재료노트의 자료 출처, 분류 기준, 면책 사항을 안내합니다.', `
<h2>자료 출처</h2><ul><li>국내 공시: 금융감독원 전자공시시스템(DART) 최근공시 RSS${status.dart?.source === 'OpenDART+RSS' ? '와 OpenDART API' : ''}</li><li>미국 내부자 매수: 미국 증권거래위원회(SEC) EDGAR Form 4</li><li>시세 화면: TradingView 위젯(지연 시세일 수 있음)</li></ul>
<h2>분류 기준</h2><p>공시 제목(보고서명)에 들어 있는 말로 종류를 붙여요. 예를 들어 "무상증자결정"이 있으면 무상증자, "유상증자결정"이 있으면 유상증자예요. 같은 종류라도 내용에 따라 의미가 달라질 수 있으니 반드시 원문을 확인하세요.</p>
<table class="data"><thead><tr><th scope="col">표시</th><th scope="col">종류</th></tr></thead><tbody>${['good', 'info', 'warn'].map((t) => `<tr><td><span class="tag t-${t}">${TONE[t]}</span></td><td>${CATEGORIES.filter((c) => c.tone === t).map((c) => c.label).join(', ')}</td></tr>`).join('')}</tbody></table>
<h2>면책</h2><p>재료노트의 정보는 참고용이에요. 정확성과 완전성을 보장하지 않으며, 이 정보를 바탕으로 한 투자 결과에 책임지지 않아요. 투자 판단은 본인이 하고, 공시 원문과 증권사 자료를 함께 확인하세요.</p>`);
    simple('/privacy/', '개인정보처리방침', '재료노트의 개인정보 처리 방침입니다.', `
<p>재료노트는 회원가입이 없고, 이름·연락처 같은 개인정보를 직접 모으지 않아요.</p>
<h2>쿠키와 광고</h2><p>이 사이트는 Google 애드센스 광고를 보여 줍니다. Google을 포함한 제3자 광고 사업자는 쿠키를 사용해 이 사이트와 다른 사이트 방문 기록을 바탕으로 광고를 보여 줄 수 있어요. 맞춤 광고는 <a href="https://adssettings.google.com/" rel="noopener" target="_blank">Google 광고 설정</a>에서 끌 수 있고, <a href="https://www.aboutads.info/" rel="noopener" target="_blank">aboutads.info</a>에서 다른 사업자의 쿠키 사용도 끌 수 있어요.</p>
<h2>외부 화면과 글꼴</h2><p>시장 지표와 종목 화면은 TradingView 위젯이라, 해당 화면 안에서는 TradingView의 개인정보 정책이 적용돼요. 제목 글꼴은 Google Fonts에서 받아 와서, 글꼴을 받을 때 접속 정보가 Google에 전달될 수 있어요.</p>
<h2>계산기</h2><p>계산기에 넣은 숫자는 브라우저 안에서만 계산하고 서버로 보내지 않아요.</p>
<h2>문의</h2><p><a href="${url('/contact/')}">문의 페이지</a>로 연락해 주세요.</p><p class="meta">시행일 2026년 11월 14일</p>`);
    simple('/contact/', '문의', '재료노트에 오류 제보나 의견을 보내는 방법입니다.', `
<p>잘못 분류된 공시, 고장 난 화면, 더 보고 싶은 공시 종류가 있으면 알려 주세요.</p>
<p>메일: <a href="mailto:${esc(config.contact)}">${esc(config.contact)}</a></p>
<p class="meta">종목 추천이나 개별 투자 상담에는 답하지 않아요.</p>`);
    page('/404.html', { title: '페이지를 찾을 수 없어요', description: '없는 페이지입니다.', body: `<div class="head"><h1>페이지를 찾을 수 없어요</h1><p class="lede">주소가 바뀌었거나 지워진 페이지예요. <a href="${url('/')}">오늘의 재료</a>로 돌아가세요.</p></div>` });

    const now = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${SITE}${p}</loc><lastmod>${now}</lastmod></url>`).join('\n')}\n</urlset>\n`);
    fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
    fs.writeFileSync(path.join(OUT, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(config.name)} · 오늘의 재료</title><link>${SITE}/</link><description>${esc(config.tagline)}</description><language>ko</language>\n${recent.slice(0, 50).map((d) => `<item><title>${esc(`[${d.label}] ${d.company} - ${d.report}`)}</title><link>${dartLink(d.rcpNo)}</link><guid isPermaLink="false">${esc(d.rcpNo)}</guid><pubDate>${new Date(d.at).toUTCString()}</pubDate></item>`).join('\n')}\n</channel></rss>\n`);
    if (config.adsense) fs.writeFileSync(path.join(OUT, 'ads.txt'), `google.com, ${config.adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
    if (config.domain && SITE.includes(config.domain)) fs.writeFileSync(path.join(OUT, 'CNAME'), `${config.domain}\n`);
    fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
    console.log(`built ${pages.length} pages → ${SITE}`);
};

if (require.main === module) build();
