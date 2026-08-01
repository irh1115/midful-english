import { useState } from "react";
import { motion } from "motion/react";
import { 
  Trash2, 
  BookOpen, 
  Maximize2, 
  Settings, 
  Calendar, 
  Award,
  BookMarked,
  Sparkles,
  Info
} from "lucide-react";
import { BagItem } from "../types";

interface CursivePadProps {
  bag: BagItem[];
  onRemoveFromBag: (index: number) => void;
  onUpdateBagItem: (index: number, updatedItem: BagItem) => void;
}

export default function CursivePad({
  bag,
  onRemoveFromBag,
  onUpdateBagItem
}: CursivePadProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<number>(26);
  const [cursiveFont, setCursiveFont] = useState<string>("cedarville");

  const todayStr = new Date().toISOString().split("T")[0];

  // SM-2 Spaced Repetition Logic implementation
  const handleSRSReview = (originalIndex: number, quality: number) => {
    const item = { ...bag[originalIndex] };
    
    if (quality >= 3) {
      if (item.stage === 0) {
        item.interval = 1;
      } else if (item.stage === 1) {
        item.interval = 4;
      } else {
        item.interval = Math.round(item.interval * item.easeFactor);
      }
      item.stage++;
    } else {
      item.stage = 0;
      item.interval = 1;
    }

    // Adjust ease factor
    item.easeFactor = item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (item.easeFactor < 1.3) item.easeFactor = 1.3;

    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + item.interval);
    item.nextReviewDate = nextDate.toISOString().split("T")[0];
    item.count++;

    onUpdateBagItem(originalIndex, item);
  };

  // Sort transcription bag: Due items first, then by lower ease factor (hardest first)
  const sortedBagWithOriginalIdx = bag
    .map((item, idx) => ({ item, originalIndex: idx }))
    .sort((a, b) => {
      const aDue = a.item.nextReviewDate <= todayStr;
      const bDue = b.item.nextReviewDate <= todayStr;

      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;

      // Secondary sort: harder items (lower ease factor) first
      return a.item.easeFactor - b.item.easeFactor;
    });

  const activeItem = selectedIdx !== null ? bag[selectedIdx] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Spaced Repetition Cursive Bag (Responsive Sidebar) */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-accent-gold" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              💼 아날로그 학습 가방 ({bag.length})
            </h2>
          </div>
          <span className="text-[10px] text-accent-gold font-bold uppercase tracking-wider bg-accent-gold/10 px-2 py-0.5 rounded">
            SRS SM-2
          </span>
        </div>

        {/* Bag list */}
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {sortedBagWithOriginalIdx.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">
                가방이 비어 있습니다. 평일 쉐도잉 룸에서 인상 깊은 영어 구절을 보관해 주세요!
              </p>
            </div>
          ) : (
            sortedBagWithOriginalIdx.map(({ item, originalIndex }) => {
              const isDue = item.nextReviewDate <= todayStr;
              const isSelected = selectedIdx === originalIndex;

              return (
                <div
                  key={originalIndex}
                  onClick={() => setSelectedIdx(originalIndex)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col gap-2 relative overflow-hidden ${
                    isSelected
                      ? "bg-accent-gold/5 dark:bg-accent-gold/5 border-accent-gold"
                      : "bg-slate-50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {/* Left indicator bar for Due items */}
                  {isDue && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                  )}

                  {/* Sentence */}
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed truncate">
                    {item.sentence}
                  </p>

                  {/* Metadata */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                    <span>🎬 {item.source}</span>
                  </div>

                  {/* Spaced repetition parameters */}
                  <div className="flex justify-between items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] font-medium">
                    <span className="text-slate-500">
                      🔥 {item.count}회차 복습
                    </span>
                    {isDue ? (
                      <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        오늘 복습 대상!
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        다음: {item.nextReviewDate}
                      </span>
                    )}
                  </div>

                  {/* Multi-tier feedback buttons inside the card */}
                  {isSelected && (
                    <div className="flex gap-1.5 mt-2 justify-end items-center">
                      <span className="text-[9px] text-slate-400 mr-auto">평가:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSRSReview(originalIndex, 3);
                        }}
                        className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-2 py-1 rounded text-[9px] font-bold transition-all cursor-pointer"
                        title="어려웠음 (간격 재시작)"
                      >
                        어려움
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSRSReview(originalIndex, 4);
                        }}
                        className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-2 py-1 rounded text-[9px] font-bold transition-all cursor-pointer"
                        title="보통 (원활한 일정 연장)"
                      >
                        보통
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSRSReview(originalIndex, 5);
                        }}
                        className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-1 rounded text-[9px] font-bold transition-all cursor-pointer"
                        title="매우 쉬움 (간격 가속도 반영)"
                      >
                        쉬움
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromBag(originalIndex);
                          if (selectedIdx === originalIndex) setSelectedIdx(null);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-all ml-1 cursor-pointer"
                        title="가방에서 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Visual guided Cursive Practice Pad */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-accent-gold" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              ✒️ Lazy Dog 영문 필기체 교정 가이드 패드
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-accent-gold" />
            <span>노트나 패드에 직접 펜으로 따라 써보세요</span>
          </div>
        </div>

        {/* Dynamic Cursive Display Screen */}
        <div className="relative bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-xl p-8 min-h-[260px] flex items-center justify-center overflow-hidden">
          {activeItem ? (
            <p
              style={{ fontSize: `${fontSize}px` }}
              className={`text-center font-normal tracking-normal leading-relaxed select-none break-words w-full text-slate-800 dark:text-slate-100 ${
                cursiveFont === "cedarville" ? "cursive-cedarville" :
                cursiveFont === "greatvibes" ? "cursive-greatvibes" :
                cursiveFont === "allura" ? "cursive-allura" :
                cursiveFont === "guides" ? "cursive-guided" : "cursive-normal"
              }`}
            >
              {activeItem.sentence}
            </p>
          ) : (
            <div className="text-center flex flex-col items-center gap-2 max-w-sm text-slate-400">
              <Sparkles className="w-8 h-8 text-accent-gold/40 animate-pulse" />
              <p className="text-xs font-semibold">
                왼쪽 가방 리스트에서 문장을 선택하시면, 이곳에 필기체 보조선 교정 뷰가 활성화됩니다.
              </p>
            </div>
          )}
        </div>

        {/* Notepad Config Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900 rounded-xl">
          {/* Style Selector */}
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-semibold">폰트 스타일:</span>
            <select
              value={cursiveFont}
              onChange={(e) => setCursiveFont(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="cedarville">✍️ 손글씨형 자연스러운 필기체 (Cedarville)</option>
              <option value="greatvibes">✨ 클래식 우아한 필기체 (Great Vibes)</option>
              <option value="allura">📏 부드럽고 깔끔한 정석 필기체 (Allura)</option>
              <option value="standard">✏️ 일반 교육용 필기체 (Playwrite)</option>
              <option value="guides">📏 가이드 가로선 포함 필기체 (Playwrite Guides)</option>
            </select>
          </div>

          {/* Size slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-semibold">가이드 크기:</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold">20</span>
              <input
                type="range"
                min="20"
                max="44"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-28 accent-accent-gold cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-bold">44</span>
              <span className="text-xs bg-accent-gold/10 text-accent-gold font-bold px-1.5 py-0.5 rounded">
                {fontSize}px
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
