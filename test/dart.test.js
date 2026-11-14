const test = require('node:test');
const assert = require('node:assert');
const { classify, parseRss, fromList } = require('../scripts/dart');
const { mergeDisclosures } = require('../scripts/collect');

test('보고서명으로 공시 종류를 붙인다', () => {
    assert.equal(classify('주요사항보고서(무상증자결정)').category, 'bonus');
    assert.equal(classify('주요사항보고서(자기주식취득결정)').category, 'buyback');
    assert.equal(classify('[기재정정]단일판매ㆍ공급계약체결').category, 'contract');
    assert.equal(classify('[기재정정]단일판매ㆍ공급계약체결').corrected, true);
    assert.equal(classify('주요사항보고서(전환사채권발행결정)').tone, 'warn');
    assert.equal(classify('주요사항보고서(유상증자결정)').category, 'rights');
    assert.equal(classify('연결재무제표기준영업(잠정)실적(공정공시)').category, 'earnings');
    assert.equal(classify('일괄신고추가서류(파생결합증권-상장지수증권)'), null);
});

test('DART RSS 항목을 읽고 상장사만 남긴다', () => {
    const xml = `<rss><channel>
<item><title>(코스닥)대주전자재료 - 주요사항보고서(전환사채권발행결정)</title><link>https://dart.fss.or.kr/api/link.jsp?rcpNo=20261014000462</link><pubDate>Wed, 14 Oct 2026 07:10:00 GMT</pubDate></item>
<item><title>(기타)씨에스씨2609유동화전문유한회사 - 자산양도등의등록신청서</title><link>https://dart.fss.or.kr/api/link.jsp?rcpNo=20261014000463</link><pubDate>Wed, 14 Oct 2026 07:11:00 GMT</pubDate></item>
<item><title><![CDATA[(유가)S&amp;T모티브 - 현금ㆍ현물배당결정]]></title><link>https://dart.fss.or.kr/api/link.jsp?rcpNo=20261014000464</link><pubDate>Wed, 14 Oct 2026 07:12:00 GMT</pubDate></item>
</channel></rss>`;
    const rows = parseRss(xml);
    assert.equal(rows.length, 2);
    assert.deepEqual([rows[0].market, rows[0].company, rows[0].rcpNo], ['KOSDAQ', '대주전자재료', '20261014000462']);
    assert.equal(rows[1].company, 'S&T모티브');
    assert.equal(rows[0].at, '2026-10-14T07:10:00.000Z');
});

test('OpenDART list 항목을 같은 모양으로 바꾼다', () => {
    const r = fromList({ rcept_no: '20261014000001', corp_cls: 'Y', corp_name: '삼성전자', report_nm: '주요사항보고서(자기주식취득결정) ', stock_code: '005930', rcept_dt: '20261014' });
    assert.deepEqual([r.market, r.stockCode, r.report, r.at], ['KOSPI', '005930', '주요사항보고서(자기주식취득결정)', '2026-10-14T00:00:00+09:00']);
});

test('합칠 때 분류 안 되는 공시와 30일 지난 공시는 버리고 먼저 받은 시각을 지킨다', () => {
    const now = Date.parse('2026-11-14T00:00:00Z');
    const old = [{ rcpNo: '1', at: '2026-11-13T05:00:00.000Z', report: '주요사항보고서(무상증자결정)', category: 'bonus' }, { rcpNo: '0', at: '2026-09-01T00:00:00.000Z', category: 'bonus' }];
    const fresh = [{ rcpNo: '1', at: '2026-11-13T00:00:00+09:00', report: '주요사항보고서(무상증자결정)' }, { rcpNo: '2', at: '2026-11-13T06:00:00.000Z', report: '감사보고서' }, { rcpNo: '3', at: '2026-11-13T07:00:00.000Z', report: '주요사항보고서(감자결정)' }];
    const out = mergeDisclosures(old, fresh, now);
    assert.deepEqual(out.map((d) => d.rcpNo), ['3', '1']);
    assert.equal(out[1].at, '2026-11-13T05:00:00.000Z');
    assert.equal(out[0].tone, 'warn');
});
