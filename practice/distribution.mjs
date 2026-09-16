// Official weights apply to four exam areas; the eight subject targets are editorial allocations.
export const distribution = {
  basis: 'score',
  verified: '2026-09-16',
  total: 3000,
  source: 'https://www.topcit.or.kr/board/notice/detail.do?seq=842',
  verifiedCopy: 'https://swuniv.korea.ac.kr/bbs/swuniv/979/177637/download.do',
  areas: [
    {id:'software',title:'소프트웨어 개발',points:365,target:1095,subjects:['01']},
    {id:'data',title:'데이터 관리',points:265,target:795,subjects:['02']},
    {id:'systems-security',title:'시스템아키텍처 및 정보보안',points:235,target:705,subjects:['03','04']},
    {id:'business',title:'IT비즈니스',points:135,target:405,subjects:['05-01','05-02','06-01','06-02']},
  ],
  subjects: {'01':1095,'02':795,'03':360,'04':345,'05-01':190,'05-02':50,'06-01':125,'06-02':40},
};
