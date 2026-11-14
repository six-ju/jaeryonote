# 재료노트 운영 문서

## 구조
- `scripts/collect.js`: DART 최근공시 RSS(+ `DART_API_KEY`가 있으면 OpenDART list.json)와 SEC Form 4를 모아 `data/*.json`에 이어 붙인다. 소스 하나가 실패해도 이전 데이터를 지운다는 일은 없다.
- `scripts/build.js`: `data/` + `content/guides.js` + `site/` → `dist/` 정적 사이트. `--site`로 주소를 꼭 넘긴다.
- `.github/workflows/site.yml`: 평일 07~21시 20분마다 수집 → `data` 브랜치에 저장 → 빌드 → GitHub Pages 배포. main에 푸시하면 수집 없이 빌드만 한다.
- 설정은 `config.json` 하나(사이트 이름, 도메인, 애드센스 ID와 광고 단위, 네이버 인증, 문의 메일).

## 비밀값
- `DART_API_KEY`: 저장소 Settings → Secrets → Actions. 코드·채팅에 쓰지 않는다.
- 사이트 주소를 바꾸면 Settings → Variables → `SITE_URL`.

## 다시 빌드만 하기
Actions → 수집·빌드·배포 → Run workflow → "수집 없이 다시 빌드만" 체크. 외부 호출 0회.

## 데이터와 약관
- 국내 시세는 쓰지 않는다. 토스 오픈API(제5조③)와 공공데이터포털 주식시세(공공누리 4유형)는 제3자 제공·상업 이용 금지, TradingView 위젯도 KRX 시세는 외부 표시가 막혀 있다.
- DART: 금융감독원 공시. 인증키 제3자 사용 금지, 하루 20,000회. RSS는 최근 50건만 준다.
- SEC: 초당 10회 이하, UA에 서비스명과 메일. 403(Undeclared Automated Tool)이 오면 그 회차는 멈춘다(우회 금지).
- TradingView 위젯: 출처 표시를 지우지 않는다. 미국 시세만 쓴다.

## 장애 대응
- 공시가 안 늘면 Actions 로그의 `status.json` 출력(`errors.dart`)을 본다. DART가 해외 IP를 막으면 OpenDART 키로 바꾸거나 수집을 내 PC로 옮긴다.
- 배포가 안 되면 Settings → Pages → Source가 "GitHub Actions"인지 확인한다.

## 광고
- `config.adsense`에 게시자 ID가 있으면 모든 공개 페이지 head에 자동 광고 스크립트가 들어가고 `ads.txt`가 생긴다.
- 승인 뒤 광고 단위를 만들면 `adsenseSlots`에 `feed`(목록 12번째 뒤), `bottom`, `article` 슬롯 ID를 넣는다. 채워지지 않은 자리는 접힌다.
- 애드센스는 자기 도메인이 있어야 사이트로 추가할 수 있다(github.io 하위 경로 불가).
