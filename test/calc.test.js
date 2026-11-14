const test = require('node:test');
const assert = require('node:assert');
const calc = require('../site/assets/calc');

test('물타기 평단과 목표 평단까지 필요한 수량', () => {
    assert.equal(calc.average(10, 10000, 10, 8000), 9000);
    assert.equal(calc.sharesForTarget(10, 10000, 8000, 9000), 10);
    assert.equal(calc.sharesForTarget(10, 10000, 9500, 9000), null);
});

test('손절 기준 수량과 손익비', () => {
    assert.deepEqual(calc.position(100000, 10000, 9500, 11000), { qty: 200, amount: 2000000, rr: 2 });
    assert.equal(calc.position(100000, 10000, 10000, 0), null);
});

test('국내 매매 비용은 2026년 세율 0.20%를 매도 금액에만 매긴다', () => {
    const r = calc.roundTrip(10000, 11000, 100, 0.00015, 'KOSDAQ');
    assert.deepEqual([r.fee, r.tax, r.profit], [150 + 165, 2200, 100000 - 315 - 2200]);
    assert.equal(calc.roundTrip(10000, 10000, 100, 0, 'KONEX').tax, 1000);
});

test('해외주식 양도세는 250만원 공제 뒤 22%', () => {
    assert.deepEqual(calc.usTax(10000000, 2000000, 500000), { base: 5000000, tax: 1100000 });
    assert.deepEqual(calc.usTax(2000000, 0, 0), { base: 0, tax: 0 });
});
