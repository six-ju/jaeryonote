// 공시·내부자 매수를 모아 data/*.json에 이어 붙인다. 소스 하나가 실패해도 이전 데이터는 그대로 둔다.
const fs = require('fs');
const path = require('path');
const { classify, fetchRss, fetchList } = require('./dart');
const { fetchInsiderBuys } = require('./sec');

const DATA = path.join(__dirname, '..', 'data');
const KEEP_DAYS = 30;
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };
const write = (f, v) => fs.writeFileSync(path.join(DATA, f), `${JSON.stringify(v, null, 1)}\n`);
const ymd = (d) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');

const mergeDisclosures = (old, fresh, nowMs) => {
    const byId = new Map(old.map((d) => [d.rcpNo, d]));
    for (const d of fresh) {
        const c = classify(d.report);
        // RSS가 준 시각이 list.json의 날짜보다 정확하니 먼저 들어온 값을 지킨다
        if (c && !byId.has(d.rcpNo)) byId.set(d.rcpNo, { ...d, ...c });
    }
    const cutoff = nowMs - KEEP_DAYS * 86400000;
    return [...byId.values()].filter((d) => Date.parse(d.at) >= cutoff).sort((a, b) => b.at.localeCompare(a.at) || b.rcpNo.localeCompare(a.rcpNo));
};

const run = async () => {
    fs.mkdirSync(DATA, { recursive: true });
    const now = new Date();
    const status = read('status.json', {});
    status.lastRun = now.toISOString();
    status.errors = {};

    try {
        const key = process.env.DART_API_KEY;
        const fresh = [...await fetchRss(), ...(key ? await fetchList(key, ymd(new Date(now - 2 * 86400000)), ymd(now)) : [])];
        const merged = mergeDisclosures(read('disclosures.json', []), fresh, now.getTime());
        write('disclosures.json', merged);
        status.dart = { at: now.toISOString(), fetched: fresh.length, kept: merged.length, source: key ? 'OpenDART+RSS' : 'RSS' };
    } catch (e) {
        status.errors.dart = e.message;
    }

    // SEC가 2026-11-14 PC·GitHub 모두에서 403(Undeclared Automated Tool)을 줘서 기본 꺼 둔다. 풀리면 SEC_ENABLED=1
    if (process.env.SEC_ENABLED === '1') try {
        const insiders = read('insiders.json', []);
        const seenAcc = read('sec-seen.json', []);
        const rows = await fetchInsiderBuys(new Set(seenAcc));
        const cutoff = Date.now() - KEEP_DAYS * 86400000;
        const kept = [...rows.filter((r) => !r.skip), ...insiders].filter((r) => Date.parse(r.date) >= cutoff);
        write('insiders.json', [...new Map(kept.map((r) => [r.acc, r])).values()].sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value));
        // 이미 본 공시는 다시 받지 않는다(최근 3000건만 기억)
        write('sec-seen.json', [...rows.map((r) => r.acc), ...seenAcc].slice(0, 3000));
        status.sec = { at: now.toISOString(), checked: rows.length, buys: rows.filter((r) => !r.skip).length };
    } catch (e) {
        status.errors.sec = e.message;
    }

    write('status.json', status);
    console.log(JSON.stringify(status));
};

if (require.main === module) run();

module.exports = { mergeDisclosures };
