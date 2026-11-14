// SEC EDGAR Form 4에서 미국 상장사 임원·대주주의 장내 매수(거래 코드 P)만 뽑는다. SEC 공개 자료, 초당 10회 이하·UA 필수.
// SEC 권장 형식: 회사(서비스)명 + 연락 메일
const UA = 'JaeryoNote yuk1479@naver.com';
const MIN_VALUE = 50000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const get = async (url) => {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
    // 차단 신호면 우회하지 않고 이번 수집을 멈춘다
    if (res.status === 403 || res.status === 429) throw Object.assign(new Error(`SEC ${res.status}`), { blocked: true });
    if (!res.ok) throw new Error(`SEC ${res.status} ${url}`);
    return res.text();
};

// 값은 <name>값</name> 또는 <name><value>값</value><footnoteId/></name> 꼴이다
const tag = (xml, name) => {
    const inner = (xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)) || [])[1] || '';
    const v = inner.includes('<value>') ? inner.match(/<value>([\s\S]*?)<\/value>/)[1] : inner;
    return v.replace(/&amp;/g, '&').trim();
};

// 발행사(Issuer) 항목의 공시 폴더만 쓴다(같은 공시가 보고자 항목으로 한 번 더 나온다)
const parseFeed = (atom) => [...atom.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    // 링크는 SEC 공시 폴더 주소만 받는다(피드 내용이 다른 서버를 가리키지 못하게)
    .map(([, e]) => ({ title: (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '', href: (e.match(/<link[^>]*href="(https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/[^"]+)"/) || [])[1] || '' }))
    .filter((e) => /\(Issuer\)$/.test(e.title) && e.href)
    .map((e) => e.href.replace(/[^/]+$/, ''));

const parseForm4 = (xml) => {
    const role = [];
    if (tag(xml, 'isDirector') === '1' || tag(xml, 'isDirector') === 'true') role.push('이사');
    const title = tag(xml, 'officerTitle');
    if (tag(xml, 'isOfficer') === '1' || tag(xml, 'isOfficer') === 'true') role.push(title || '임원');
    if (tag(xml, 'isTenPercentOwner') === '1' || tag(xml, 'isTenPercentOwner') === 'true') role.push('10% 이상 주주');
    const buys = [...xml.matchAll(/<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/g)].map(([, t]) => t)
        .filter((t) => tag(t, 'transactionCode') === 'P' && tag(t, 'transactionAcquiredDisposedCode') === 'A')
        .map((t) => ({ date: tag(t, 'transactionDate'), shares: Number(tag(t, 'transactionShares')), price: Number(tag(t, 'transactionPricePerShare')) }))
        .filter((b) => b.shares > 0 && b.price > 0);
    if (!buys.length) return null;
    const shares = buys.reduce((a, b) => a + b.shares, 0);
    const value = buys.reduce((a, b) => a + b.shares * b.price, 0);
    return {
        ticker: tag(xml, 'issuerTradingSymbol').toUpperCase(),
        company: tag(xml, 'issuerName'),
        owner: tag(xml, 'rptOwnerName'),
        role: role.join(', ') || '기타',
        date: buys.map((b) => b.date).sort().at(-1),
        shares,
        value: Math.round(value),
    };
};

const fetchInsiderBuys = async (seen = new Set(), limit = 100) => {
    const dirs = parseFeed(await get(`https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&owner=include&count=${limit}&output=atom`));
    const out = [];
    for (const dir of dirs) {
        const acc = dir.split('/').filter(Boolean).at(-1);
        if (seen.has(acc)) continue;
        await sleep(250);
        const index = JSON.parse(await get(`${dir}index.json`));
        const file = index.directory.item.map((i) => i.name).find((n) => n.endsWith('.xml'));
        if (!file) continue;
        await sleep(250);
        const row = parseForm4(await get(dir + file));
        out.push({ acc, url: dir, ...(row && row.value >= MIN_VALUE ? row : { skip: true }) });
    }
    return out;
};

module.exports = { parseFeed, parseForm4, fetchInsiderBuys, MIN_VALUE };
