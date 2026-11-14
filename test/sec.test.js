const test = require('node:test');
const assert = require('node:assert');
const { parseFeed, parseForm4 } = require('../scripts/sec');

test('피드에서 발행사 항목의 공시 폴더만 뽑는다', () => {
    const atom = `<feed><entry><title>4 - Kieser Brian (0002133654) (Reporting)</title><link href="https://www.sec.gov/Archives/edgar/data/2133654/000149315226051920/0001493152-26-051920-index.htm"/></entry>
<entry><title>4 - NEXGEL, INC. (0001468929) (Issuer)</title><link href="https://www.sec.gov/Archives/edgar/data/1468929/000149315226051920/0001493152-26-051920-index.htm"/></entry></feed>`;
    assert.deepEqual(parseFeed(atom), ['https://www.sec.gov/Archives/edgar/data/1468929/000149315226051920/']);
});

const form = (code, ad = 'A') => `<ownershipDocument><issuer><issuerName>NEXGEL, INC.</issuerName><issuerTradingSymbol>nxgl</issuerTradingSymbol></issuer>
<reportingOwner><reportingOwnerId><rptOwnerName>Kieser Brian Joseph</rptOwnerName></reportingOwnerId><reportingOwnerRelationship><isDirector>1</isDirector><isOfficer>1</isOfficer><isTenPercentOwner>0</isTenPercentOwner><officerTitle>Interim CEO</officerTitle></reportingOwnerRelationship></reportingOwner>
<nonDerivativeTable><nonDerivativeTransaction><transactionDate><value>2026-11-10</value></transactionDate><transactionCoding><transactionCode>${code}</transactionCode></transactionCoding>
<transactionAmounts><transactionShares><value>1000</value></transactionShares><transactionPricePerShare><value>5.50</value><footnoteId id="F1"/></transactionPricePerShare><transactionAcquiredDisposedCode><value>${ad}</value></transactionAcquiredDisposedCode></transactionAmounts></nonDerivativeTransaction>
<nonDerivativeTransaction><transactionDate><value>2026-11-11</value></transactionDate><transactionCoding><transactionCode>${code}</transactionCode></transactionCoding>
<transactionAmounts><transactionShares><value>500</value></transactionShares><transactionPricePerShare><value>6</value></transactionPricePerShare><transactionAcquiredDisposedCode><value>${ad}</value></transactionAcquiredDisposedCode></transactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>`;

test('Form 4에서 장내 매수(P)만 합산한다', () => {
    const r = parseForm4(form('P'));
    assert.deepEqual([r.ticker, r.role, r.shares, r.value, r.date], ['NXGL', '이사, Interim CEO', 1500, 8500, '2026-11-11']);
    assert.equal(parseForm4(form('S', 'D')), null);
    assert.equal(parseForm4(form('A')), null);
});
