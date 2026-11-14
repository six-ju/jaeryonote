// DART 공시 목록. 인증키(DART_API_KEY)가 있으면 OpenDART list.json, 없으면 공식 RSS(최근 50건)를 쓴다.
const UA = 'JaeryoNoteBot/1.0 (+https://github.com/six-ju/jaeryonote)';

// 공시 종류 → 분류. tone: good 호재성, warn 주의, info 참고. 주가 예측이 아니라 공시 종류의 일반적인 성격이다.
const CATEGORIES = [
    { key: 'bonus', label: '무상증자', tone: 'good', re: /무상증자결정/ },
    { key: 'buyback', label: '자사주 취득', tone: 'good', re: /자기주식취득(신탁계약체결)?결정/ },
    { key: 'retire', label: '자사주 소각', tone: 'good', re: /주식소각결정/ },
    { key: 'contract', label: '공급계약', tone: 'good', re: /단일판매.공급계약/ },
    { key: 'dividend', label: '배당', tone: 'good', re: /현금.현물배당결정|분기배당|중간배당/ },
    { key: 'tender', label: '공개매수', tone: 'good', re: /공개매수신고서|공개매수설명서/ },
    { key: 'insider', label: '임원·주요주주 지분', tone: 'info', re: /임원.주요주주특정증권등소유상황보고서|최대주주등소유주식변동신고서/ },
    { key: 'earnings', label: '실적 발표', tone: 'info', re: /영업\(잠정\)실적|매출액또는손익구조/ },
    { key: 'control', label: '최대주주 변경', tone: 'info', re: /최대주주(의)?변경/ },
    { key: 'mna', label: '인수·합병', tone: 'info', re: /타법인주식및출자증권취득결정|회사합병결정|회사분할|영업양수/ },
    { key: 'rights', label: '유상증자', tone: 'warn', re: /유상증자결정/ },
    { key: 'bond', label: '전환사채 등', tone: 'warn', re: /(전환사채권|신주인수권부사채권|교환사채권)발행결정/ },
    { key: 'reduce', label: '감자', tone: 'warn', re: /감자결정/ },
    { key: 'risk', label: '거래정지·관리', tone: 'warn', re: /매매거래정지|관리종목|불성실공시법인지정|상장폐지|회생절차|감사의견|횡령|배임/ },
];

const MARKETS = { 유가: 'KOSPI', 코스닥: 'KOSDAQ', 코넥스: 'KONEX' };
const CORP_CLS = { Y: 'KOSPI', K: 'KOSDAQ', N: 'KONEX' };

const classify = (reportName) => {
    const name = reportName.replace(/\s/g, '');
    const hit = CATEGORIES.find((c) => c.re.test(name));
    if (!hit) return null;
    return { category: hit.key, label: hit.label, tone: hit.tone, corrected: /\[기재정정\]|\[정정/.test(reportName) };
};

const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();

// RSS 제목은 "(코스닥)회사명 - 보고서명"
const parseRss = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, b]) => {
    const g = (tag) => decode((b.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [, ''])[1]);
    const m = g('title').match(/^\((.+?)\)(.+?) - (.+)$/);
    const rcpNo = (g('link').match(/rcpNo=(\d{14})/) || [])[1];
    if (!m || !rcpNo) return null;
    return { rcpNo, market: MARKETS[m[1]] || null, company: m[2].trim(), report: m[3].trim(), stockCode: null, at: new Date(g('pubDate')).toISOString() };
}).filter((x) => x && x.market);

const fetchRss = async () => {
    const res = await fetch('https://dart.fss.or.kr/api/todayRSS.xml', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`DART RSS ${res.status}`);
    return parseRss(await res.text());
};

// 접수번호 앞 8자리가 접수일. list.json은 시각을 주지 않아 날짜만 쓴다
const fromList = (r) => ({
    rcpNo: r.rcept_no,
    market: CORP_CLS[r.corp_cls] || null,
    company: r.corp_name,
    report: r.report_nm.trim(),
    stockCode: r.stock_code || null,
    at: `${r.rcept_dt.slice(0, 4)}-${r.rcept_dt.slice(4, 6)}-${r.rcept_dt.slice(6, 8)}T00:00:00+09:00`,
});

const fetchList = async (key, fromYmd, toYmd, maxPages = 10) => {
    const out = [];
    for (let page = 1; page <= maxPages; page += 1) {
        const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${key}&bgn_de=${fromYmd}&end_de=${toYmd}&page_no=${page}&page_count=100`;
        const body = await (await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) })).json();
        // 013 = 조회 결과 없음, 020 = 하루 한도 초과(멈춘다)
        if (body.status === '013') break;
        if (body.status !== '000') throw new Error(`OpenDART ${body.status} ${body.message}`);
        out.push(...body.list.map(fromList).filter((x) => x.market));
        if (page >= body.total_page) break;
        await new Promise((r) => setTimeout(r, 300));
    }
    return out;
};

module.exports = { CATEGORIES, classify, parseRss, fetchRss, fetchList, fromList };
