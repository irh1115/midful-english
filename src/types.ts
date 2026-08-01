export interface CuratedItem {
  text: string;
  source: string;
  type?: string;
}

export interface GutenbergSource {
  repo: string;
  file: string;
  title: string;
  author: string;
}

export interface BagItem {
  sentence: string;
  source: string;
  count: number;       // 복습 횟수
  stage: number;       // SRS 단계
  interval: number;    // 복습 간격 (일)
  easeFactor: number;  // SM-2 쉬움 지수
  nextReviewDate: string; // YYYY-MM-DD
  collectedAt: string;    // YYYY-MM-DD
}

export interface HistoryItem {
  text: string;
  source: string;
  timestamp: string;
}
