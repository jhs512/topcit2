// 2026-09-15: official evaluation contents compared with textbook contents. See notes/exam-mapping.md.
export const examSource = 'https://www.topcit.or.kr/introduction/question.do?language=ko';
export const examMapping = {
  '01': { subject: '소프트웨어 개발', focus: '개발·설계·테스트' },
  '02': { subject: '데이터 관리', focus: '데이터베이스·데이터 분석' },
  '03': { subject: '시스템아키텍처 및 정보보안', focus: '시스템아키텍처 부분' },
  '04': { subject: '시스템아키텍처 및 정보보안', focus: '정보보안 부분' },
  '05': { subject: 'IT비즈니스', focus: '비즈니스·윤리 부분' },
  '06': { subject: 'IT비즈니스', focus: '프로젝트 관리·의사소통 부분' },
};
export function examSummary(id) {
  const item = examMapping[id];
  return `시험 영역 · ${item.subject} — ${item.focus}`;
}
