# TOPCIT 교재 6권

교재 원본 PDF와 텍스트 서재를 모은 독립 저장소입니다. 보관본을 최신 개정판으로 표시하지 않습니다. 교재의 저작권은 원저작권자에게 있습니다.

| 번호 | 교재 | PDF 쪽수 | 열기 |
| --- | --- | ---: | --- |
| 01 | 소프트웨어 개발 | 139 | [PDF 뷰어](viewer/index.html?book=01&page=1) · [텍스트](output/markdown/reader.html?book=01) |
| 02 | 데이터 이해와 활용 | 159 | [PDF 뷰어](viewer/index.html?book=02&page=1) · [텍스트](output/markdown/reader.html?book=02) |
| 03 | 시스템아키텍처 이해와 활용 | 221 | [PDF 뷰어](viewer/index.html?book=03&page=1) · [텍스트](output/markdown/reader.html?book=03) |
| 04 | 정보보안 이해와 활용 | 124 | [PDF 뷰어](viewer/index.html?book=04&page=1) · [텍스트](output/markdown/reader.html?book=04) |
| 05 | IT비즈니스와 윤리 | 213 | [PDF 뷰어](viewer/index.html?book=05&page=1) · [텍스트](output/markdown/reader.html?book=05) |
| 06 | 프로젝트 관리 및 테크니컬 커뮤니케이션 | 139 | [PDF 뷰어](viewer/index.html?book=06&page=1) · [텍스트](output/markdown/reader.html?book=06) |

PDF 페이지와 책의 인쇄 쪽수는 다릅니다. 텍스트 변환본은 인식·전사 오류가 있을 수 있으므로 PDF 뷰어에서 대조하세요.

## 시험 영역과 교재 이동

카드와 두 뷰어 상단에서 교재가 연결되는 시험 영역을 확인할 수 있습니다. 01은 소프트웨어 개발, 02는 데이터 관리, 03·04는 시스템아키텍처 및 정보보안, 05·06은 IT비즈니스에 대응합니다. [공식 자료와 교재 대조 근거](notes/exam-mapping.md).

텍스트·PDF 뷰어 상단의 6권 메뉴에서 원하는 책을 바로 선택합니다. 현재 책은 색으로 구분하며 모바일에서도 메뉴가 표시됩니다.

## 열람

저장소 폴더에서 `python -m http.server 4173`을 실행한 뒤 [교재 서재](http://localhost:4173/)를 엽니다. 위의 HTML 링크는 웹서버에서 열 때 동작합니다. GitHub 파일 화면은 뷰어를 실행하지 않습니다.

PDF 뷰어는 포함된 파일로 동작합니다. 텍스트 서재는 Markdown·도식 렌더링 라이브러리를 CDN에서 불러오므로 인터넷 연결이 필요합니다. [공개 교재 서재](https://jhs512.github.io/topcit2/)에서 바로 열람할 수 있습니다.

## 유지보수

`viewer/`는 PDF 뷰어, `sources/`는 PDF 6권, `output/markdown/`은 전사본·공통 서재·대조 기록입니다. 원본 `jhs512/topcit`에서 교재 관련 파일만 복사했습니다. 원본 저장소는 변경하지 않았습니다.

`npm install` 후 `npm test`로 6권의 페이지 순서를, `npx playwright install chromium` 후 `npm run test:viewer`로 PDF 뷰어를 확인합니다. 교재 참고 링크는 이 저장소의 `viewer/index.html?book=번호&page=PDF페이지`를 사용합니다.

`npm run serve`로 서버를 실행한 상태에서 `npm run test:navigation`으로 PC·모바일의 6권 이동과 시험 영역 표시를 확인합니다.
