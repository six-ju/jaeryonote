// 계산기 공식. 브라우저에서는 window.calc, 테스트에서는 require로 쓴다.
(function (root) {
    // 2026-01-01 이후 매도분 증권거래세(코스피는 거래세 0.05% + 농어촌특별세 0.15%)
    const SELL_TAX = { KOSPI: 0.002, KOSDAQ: 0.002, KONEX: 0.001 };
    // 해외주식 양도소득세: 국내·해외 주식 통산 연 250만원 공제 후 20% + 지방소득세 2%
    const US_DEDUCTION = 2500000;
    const US_RATE = 0.22;

    const calc = {
        SELL_TAX,
        // 물타기: 기존 보유 + 추가 매수 → 새 평균 단가
        average: (qty, avg, addQty, addPrice) => {
            const total = qty + addQty;
            return total > 0 ? (qty * avg + addQty * addPrice) / total : 0;
        },
        // 목표 평단을 만들려면 지금 가격에 몇 주를 더 사야 하는지. 불가능하면 null
        sharesForTarget: (qty, avg, price, target) => {
            if (!(price < target && target < avg)) return null;
            return Math.ceil((qty * (avg - target)) / (target - price));
        },
        // 손절가까지 잃어도 되는 금액으로 살 수 있는 수량과 손익비
        position: (risk, entry, stop, target) => {
            const perShare = entry - stop;
            if (!(perShare > 0)) return null;
            const qty = Math.floor(risk / perShare);
            return { qty, amount: qty * entry, rr: target > entry ? (target - entry) / perShare : null };
        },
        // 국내 주식 한 번 사고팔 때 드는 돈. feeRate는 증권사 수수료율(매수·매도 각각)
        // 소수 오차로 1원이 깎이지 않게 절사 전에 아주 작은 값을 더한다
        roundTrip: (buyPrice, sellPrice, qty, feeRate, market) => {
            const buy = buyPrice * qty;
            const sell = sellPrice * qty;
            const floor = (x) => Math.floor(x + 1e-6);
            const fee = floor(buy * feeRate) + floor(sell * feeRate);
            const tax = floor(sell * (SELL_TAX[market] ?? 0.002));
            const profit = sell - buy - fee - tax;
            return { fee, tax, profit, rate: buy ? profit / buy : 0 };
        },
        // 해외주식 1년치 실현 손익(원화) → 낼 세금
        usTax: (gains, losses, costs) => {
            const base = Math.max(0, gains - losses - costs - US_DEDUCTION);
            return { base, tax: Math.floor(base * US_RATE) };
        },
    };

    if (typeof module !== 'undefined') module.exports = calc;
    else root.calc = calc;
}(this));
