# TTS 속도와 발음 처리 검토

2026-09-17. 원본 25개 전체의 영문 용어를 문자열로 추출하고, 후보의 등장 문맥을 확인하여 173개 명시적 발음 항목을 추가했다. 횟수는 Markdown 도식·메타데이터·중복 설명을 포함하는 원본 문자열 기준이며, 실제 낭독 횟수가 아니다.

## 적용 원칙

- 속도는 0.75~3.0배, 0.25 간격이다. 기존 저장값을 유지하며 새 속도도 페이지 이동 후 유지한다.
- 화면·원본 파일·문장 분할·하이라이트 좌표는 변경하지 않고 SpeechSynthesisUtterance에 전달하는 문자열만 바꾼다.
- 대소문자를 구분한 명시적 목록만 적용한다. 한국어 조사가 붙어도 처리하되 영문 단어·변수명 내부와 URL은 치환하지 않는다.
- V 모델은 브이 모델이다. 로마 숫자 전용 기호 Ⅰ~Ⅻ, ⅰ~ⅻ는 숫자로 전달한다. ASCII I, IV, V 등은 단독으로 숫자 변환하지 않는다.
- 일반 영어 문장 전체, 코드의 연산 의미, 문맥에 따라 뜻이 달라지는 약어의 풀이는 자동 번역하지 않는다.
- 브라우저 테스트는 음성 엔진에 전달한 텍스트·속도·저장·원문 강조를 검사한다. 실제 음성의 발음 품질은 기기 음성에 따라 달라지며 청취 검증과는 구분한다.

## 검사 원본

- output/markdown/book-01/book.md
- output/markdown/book-02/book.md
- output/markdown/book-03/book.md
- output/markdown/book-04/book.md
- output/markdown/IT비즈니스와윤리.md
- output/markdown/book-06/book.md
- practical/additional-content.mjs
- practical/content.mjs
- practical/expanded-notes.mjs
- practical/subject-introductions.mjs
- reading/cases/01.md
- reading/cases/02.md
- reading/cases/03.md
- reading/cases/04.md
- reading/cases/05-01.md
- reading/cases/05-02.md
- reading/cases/06-01.md
- reading/cases/06-02.md
- reading/expanded-cases.mjs
- reading/it-business-stories.md
- lec/content.mjs
- practice/data/business.json
- practice/data/data.json
- practice/data/software.json
- practice/data/systems-security.json

## 발음 목록

| 원문 | 음성 전달 | 원본 등장 수 | 등장 파일 예 |
| --- | --- | ---: | --- |
| IT | 아이티 | 1127 | output/markdown/book-01/book.md |
| ICT | 아이씨티 | 24 | output/markdown/book-01/book.md |
| AI | 에이아이 | 157 | output/markdown/book-01/book.md |
| IoT | 아이오티 | 103 | output/markdown/book-01/book.md |
| API | 에이피아이 | 142 | output/markdown/book-01/book.md |
| UI | 유아이 | 28 | output/markdown/book-01/book.md |
| UX | 유엑스 | 24 | output/markdown/book-01/book.md |
| IDE | 아이디이 | 12 | output/markdown/book-01/book.md |
| CPU | 씨피유 | 1083 | output/markdown/book-01/book.md |
| GPU | 지피유 | 27 | output/markdown/book-03/book.md |
| OS | 오에스 | 123 | output/markdown/book-01/book.md |
| SW | 에스더블유 | 126 | output/markdown/book-01/book.md |
| HW | 에이치더블유 | 18 | output/markdown/book-01/book.md |
| RAM | 램 | 9 | output/markdown/book-02/book.md |
| ROM | 롬 | 4 | output/markdown/book-03/book.md |
| HDD | 에이치디디 | 5 | output/markdown/book-01/book.md |
| SSD | 에스에스디 | 8 | output/markdown/book-03/book.md |
| USB | 유에스비 | 2 | output/markdown/book-04/book.md |
| DB | 디비 | 259 | output/markdown/book-01/book.md |
| DBMS | 디비엠에스 | 99 | output/markdown/book-01/book.md |
| RDB | 알디비 | 2 | output/markdown/book-02/book.md |
| RDBMS | 알디비엠에스 | 6 | output/markdown/book-02/book.md |
| SQL | 에스큐엘 | 3867 | output/markdown/book-01/book.md |
| NoSQL | 노에스큐엘 | 47 | output/markdown/book-02/book.md |
| SQLite | 에스큐엘라이트 | 1465 | output/markdown/book-02/book.md |
| NULL | 널 | 6197 | output/markdown/book-01/book.md |
| SELECT | 셀렉트 | 850 | output/markdown/book-02/book.md |
| FROM | 프롬 | 848 | output/markdown/book-02/book.md |
| WHERE | 웨어 | 3041 | output/markdown/book-02/book.md |
| GROUP | 그룹 | 1254 | output/markdown/book-02/book.md |
| BY | 바이 | 1747 | output/markdown/book-02/book.md |
| HAVING | 해빙 | 1177 | output/markdown/book-02/book.md |
| ORDER | 오더 | 492 | practice/data/data.json |
| COUNT | 카운트 | 1413 | output/markdown/book-02/book.md |
| SUM | 섬 | 1049 | output/markdown/book-02/book.md |
| AVG | 에이브이지 | 30 | output/markdown/book-02/book.md |
| MAX | 맥스 | 354 | practice/data/data.json |
| MIN | 민 | 61 | practice/data/data.json |
| DISTINCT | 디스팅트 | 123 | output/markdown/book-02/book.md |
| UNKNOWN | 언노운 | 124 | practice/data/data.json |
| INSERT | 인서트 | 7 | output/markdown/book-02/book.md |
| UPDATE | 업데이트 | 10 | output/markdown/book-02/book.md |
| DELETE | 딜리트 | 7 | output/markdown/book-02/book.md |
| JOIN | 조인 | 5 | output/markdown/book-02/book.md |
| COMMIT | 커밋 | 4 | output/markdown/book-02/book.md |
| ROLLBACK | 롤백 | 8 | output/markdown/book-02/book.md |
| DDL | 디디엘 | 11 | output/markdown/book-02/book.md |
| DML | 디엠엘 | 25 | output/markdown/book-02/book.md |
| DCL | 디씨엘 | 8 | output/markdown/book-02/book.md |
| TCL | 티씨엘 | 1 | output/markdown/book-02/book.md |
| DBA | 디비에이 | 23 | output/markdown/book-02/book.md |
| ERD | 이알디 | 23 | output/markdown/book-01/book.md |
| ER | 이알 | 37 | output/markdown/book-01/book.md |
| ETL | 이티엘 | 17 | output/markdown/book-02/book.md |
| OLTP | 오엘티피 | 13 | output/markdown/book-02/book.md |
| OLAP | 올랩 | 20 | output/markdown/book-02/book.md |
| XML | 엑스엠엘 | 97 | output/markdown/book-01/book.md |
| HTML | 에이치티엠엘 | 32 | output/markdown/book-01/book.md |
| CSS | 씨에스에스 | 5 | output/markdown/book-03/book.md |
| JSON | 제이슨 | 4 | output/markdown/book-02/book.md |
| DOM | 돔 | 7 | output/markdown/book-01/book.md |
| DTD | 디티디 | 30 | output/markdown/book-02/book.md |
| UML | 유엠엘 | 18 | output/markdown/book-01/book.md |
| MVC | 엠브이씨 | 10 | output/markdown/book-01/book.md |
| OOP | 오오피 | 1 | output/markdown/book-01/book.md |
| XP | 엑스피 | 25 | output/markdown/book-01/book.md |
| TDD | 티디디 | 1 | output/markdown/book-01/book.md |
| CI | 씨아이 | 22 | output/markdown/book-01/book.md |
| CD | 씨디 | 10 | output/markdown/book-01/book.md |
| VCS | 브이씨에스 | 1 | output/markdown/book-01/book.md |
| IP | 아이피 | 348 | output/markdown/book-03/book.md |
| IPv4 | 아이피 버전 사 | 70 | output/markdown/book-03/book.md |
| IPv6 | 아이피 버전 육 | 46 | output/markdown/book-03/book.md |
| TCP | 티씨피 | 234 | output/markdown/book-03/book.md |
| UDP | 유디피 | 90 | output/markdown/book-03/book.md |
| HTTP | 에이치티티피 | 96 | output/markdown/book-02/book.md |
| HTTPS | 에이치티티피에스 | 13 | output/markdown/book-04/book.md |
| FTP | 에프티피 | 78 | output/markdown/book-02/book.md |
| SMTP | 에스엠티피 | 32 | output/markdown/book-03/book.md |
| SNMP | 에스엔엠피 | 12 | output/markdown/book-03/book.md |
| DNS | 디엔에스 | 63 | output/markdown/book-03/book.md |
| DHCP | 디에이치씨피 | 35 | output/markdown/book-03/book.md |
| URL | 유알엘 | 39 | output/markdown/book-02/book.md |
| URI | 유알아이 | 13 | output/markdown/book-03/book.md |
| MAC | 맥 | 138 | output/markdown/book-03/book.md |
| LAN | 랜 | 49 | output/markdown/book-02/book.md |
| WAN | 더블유에이엔 | 7 | output/markdown/book-03/book.md |
| VLAN | 브이랜 | 18 | output/markdown/book-03/book.md |
| WLAN | 더블유랜 | 3 | output/markdown/book-03/book.md |
| VPN | 브이피엔 | 14 | output/markdown/book-04/book.md |
| NAT | 엔에이티 | 26 | output/markdown/book-03/book.md |
| ARP | 에이알피 | 39 | output/markdown/book-03/book.md |
| ICMP | 아이씨엠피 | 17 | output/markdown/book-03/book.md |
| OSI | 오에스아이 | 49 | output/markdown/book-01/book.md |
| CDN | 씨디엔 | 3 | output/markdown/book-03/book.md |
| SDN | 에스디엔 | 44 | output/markdown/book-03/book.md |
| NFV | 엔에프브이 | 41 | output/markdown/book-03/book.md |
| SAN | 에스에이엔 | 41 | output/markdown/book-02/book.md |
| NAS | 나스 | 10 | output/markdown/book-03/book.md |
| RAID | 레이드 | 62 | output/markdown/book-03/book.md |
| VM | 브이엠 | 37 | output/markdown/book-03/book.md |
| SaaS | 사스 | 26 | output/markdown/book-03/book.md |
| PaaS | 파스 | 20 | output/markdown/book-03/book.md |
| IaaS | 아이아스 | 27 | output/markdown/book-03/book.md |
| QoS | 큐오에스 | 24 | output/markdown/book-03/book.md |
| SSL | 에스에스엘 | 58 | output/markdown/book-04/book.md |
| TLS | 티엘에스 | 24 | output/markdown/book-03/book.md |
| SSH | 에스에스에이치 | 14 | output/markdown/book-03/book.md |
| AES | 에이이에스 | 10 | output/markdown/book-04/book.md |
| DES | 디이에스 | 10 | output/markdown/book-04/book.md |
| RSA | 알에스에이 | 9 | output/markdown/book-04/book.md |
| SHA | 에스에이치에이 | 44 | output/markdown/book-04/book.md |
| PKI | 피케이아이 | 13 | output/markdown/book-04/book.md |
| IDS | 아이디에스 | 11 | output/markdown/book-03/book.md |
| IPS | 아이피에스 | 12 | output/markdown/book-03/book.md |
| DDoS | 디도스 | 10 | output/markdown/book-03/book.md |
| DoS | 도스 | 10 | output/markdown/book-03/book.md |
| XSS | 엑스에스에스 | 6 | output/markdown/book-04/book.md |
| CSRF | 씨에스알에프 | 5 | output/markdown/book-04/book.md |
| MFA | 엠에프에이 | 823 | practice/data/systems-security.json |
| OTP | 오티피 | 17 | output/markdown/book-04/book.md |
| SSO | 에스에스오 | 3 | output/markdown/book-03/book.md |
| ACL | 에이씨엘 | 6 | output/markdown/book-04/book.md |
| ISMS | 아이에스엠에스 | 23 | output/markdown/book-04/book.md |
| GDPR | 지디피알 | 20 | output/markdown/book-04/book.md |
| DRM | 디알엠 | 7 | output/markdown/book-01/book.md |
| ERP | 이알피 | 94 | output/markdown/IT비즈니스와윤리.md |
| CRM | 씨알엠 | 78 | output/markdown/book-02/book.md |
| SCM | 에스씨엠 | 56 | output/markdown/book-01/book.md |
| PLM | 피엘엠 | 21 | output/markdown/IT비즈니스와윤리.md |
| BSC | 비에스씨 | 49 | output/markdown/IT비즈니스와윤리.md |
| KPI | 케이피아이 | 49 | output/markdown/IT비즈니스와윤리.md |
| ROI | 알오아이 | 11 | output/markdown/IT비즈니스와윤리.md |
| BPR | 비피알 | 28 | output/markdown/IT비즈니스와윤리.md |
| BPM | 비피엠 | 14 | output/markdown/IT비즈니스와윤리.md |
| ISP | 아이에스피 | 67 | output/markdown/book-01/book.md |
| EA | 이에이 | 67 | output/markdown/book-02/book.md |
| SLA | 에스엘에이 | 42 | output/markdown/book-03/book.md |
| SLM | 에스엘엠 | 20 | output/markdown/IT비즈니스와윤리.md |
| ITIL | 아이틸 | 38 | output/markdown/IT비즈니스와윤리.md |
| ITSM | 아이티에스엠 | 18 | output/markdown/IT비즈니스와윤리.md |
| PM | 피엠 | 35 | output/markdown/book-06/book.md |
| PMO | 피엠오 | 38 | output/markdown/IT비즈니스와윤리.md |
| WBS | 더블유비에스 | 74 | output/markdown/book-06/book.md |
| RFP | 알에프피 | 12 | output/markdown/IT비즈니스와윤리.md |
| RFI | 알에프아이 | 5 | output/markdown/IT비즈니스와윤리.md |
| PERT | 퍼트 | 9 | output/markdown/book-06/book.md |
| CPM | 씨피엠 | 3 | output/markdown/book-06/book.md |
| EVM | 이브이엠 | 5 | output/markdown/book-06/book.md |
| CPI | 씨피아이 | 33 | output/markdown/book-06/book.md |
| SPI | 에스피아이 | 19 | output/markdown/book-03/book.md |
| RTO | 알티오 | 18 | output/markdown/book-03/book.md |
| RPO | 알피오 | 15 | output/markdown/book-03/book.md |
| PDCA | 피디씨에이 | 12 | output/markdown/IT비즈니스와윤리.md |
| SWOT | 스왓 | 47 | output/markdown/IT비즈니스와윤리.md |
| BI | 비아이 | 32 | output/markdown/book-03/book.md |
| DW | 디더블유 | 12 | output/markdown/book-02/book.md |
| FIFO | 피포 | 50 | output/markdown/book-03/book.md |
| LRU | 엘알유 | 47 | output/markdown/book-03/book.md |
| LFU | 엘에프유 | 1 | output/markdown/book-03/book.md |
| FCFS | 에프씨에프에스 | 35 | output/markdown/book-03/book.md |
| SJF | 에스제이에프 | 35 | output/markdown/book-03/book.md |
| HRN | 에이치알엔 | 1 | output/markdown/book-03/book.md |
| PDF | 피디에프 | 1030 | output/markdown/book-01/book.md |
| ISO | 아이에스오 | 86 | output/markdown/book-01/book.md |
| IEEE | 아이 트리플 이 | 99 | output/markdown/book-01/book.md |
| FBI | 에프비아이 | 14 | reading/it-business-stories.md |
| VCF | 브이씨에프 | 4 | reading/it-business-stories.md |
| TOPCIT | 탑싯 | 67 | output/markdown/book-01/book.md |
| Java | 자바 | 36 | output/markdown/book-01/book.md |
| JavaScript | 자바스크립트 | 10 | output/markdown/book-01/book.md |
| Python | 파이썬 | 3162 | output/markdown/book-01/book.md |
| C++ | 씨 플러스 플러스 | 31 | output/markdown/book-01/book.md |

## 검증

- 단위 검사: 약어 경계, 한국어 조사, 긴 약어 우선, 일반 단어·URL 보존, V 모델/로마 기호 구분, 3배 엔진 전달.
- 브라우저 검사: PC·모바일 속도 변경·저장·이어읽기와 문장 하이라이트 원문 유지.
