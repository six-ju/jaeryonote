# 재료노트

오늘 나온 주식 재료(공시)를 종류별로 보여 주는 정적 사이트. 투자 권유나 주가 예측을 하지 않는다.

```bash
npm test
node scripts/collect.js                  # data/ 갱신 (DART_API_KEY 선택)
node scripts/build.js --site https://six-ju.github.io/jaeryonote
```

운영은 [docs/OPERATIONS.md](docs/OPERATIONS.md).
