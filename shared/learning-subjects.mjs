// 교재를 제외한 학습 메뉴의 공통 분류. 공식 출제기준과 구분한다.
export const learningSubjects = [
  { id: '01', bookId: '01', title: '소프트웨어 개발', description: '필요한 동작을 정확히 만들고 안전하게 바꿉니다.' },
  { id: '02', bookId: '02', title: '데이터 이해와 활용', description: '데이터를 믿을 수 있는 판단에 사용합니다.' },
  { id: '03', bookId: '03', title: '시스템아키텍처 이해와 활용', description: '업무에 필요한 시스템을 설계하고 운영합니다.' },
  { id: '04', bookId: '04', title: '정보보안 이해와 활용', description: '정보와 업무를 보호하고 사고에 대응합니다.' },
  { id: '05-01', bookId: '05', title: 'IT 비즈니스', description: '비즈니스 목표와 업무 문제를 IT로 연결합니다.' },
  { id: '05-02', bookId: '05', title: '윤리', description: '기술이 사람에게 미치는 영향을 살피고 책임집니다.' },
  { id: '06-01', bookId: '06', title: '프로젝트 관리', description: '목표·범위·일정·비용·품질과 위험을 관리합니다.' },
  { id: '06-02', bookId: '06', title: '테크니컬 커뮤니케이션', description: '상대가 이해하고 행동할 수 있게 기술을 전달합니다.' }
];
export function questionSubject(q) {
  if (q.area === 'business') {
    const section = Number(q.syllabus.split('.')[1]);
    if (section === 3) return '05-02';
    if (section < 4) return '05-01';
    // 프로젝트 문서 문항의 학습 주제만 분류한다. 공식 코드와 원문은 유지한다.
    return q.syllabus === '4.4.2.2' ? '06-02' : '06-01';
  }
  return q.syllabus === '3.1.1.3' || Number(q.syllabus.split('.')[1]) >= 6 ? '04' : '03';
}
