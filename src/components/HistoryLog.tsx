import { motion } from "motion/react";
import { Clock, RefreshCw } from "lucide-react";
import { HistoryItem } from "../types";

interface HistoryLogProps {
  historyLog: HistoryItem[];
  onLoadHistoryItem: (text: string, source: string) => void;
}

export default function HistoryLog({
  historyLog,
  onLoadHistoryItem
}: HistoryLogProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent-gold" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            ⏳ 실시간 지문 탐색 히스토리
          </h2>
        </div>
        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full">
          최근 {historyLog.length}개
        </span>
      </div>

      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
        {historyLog.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <p className="text-xs">실시간 파싱된 지문 히스토리가 비어 있습니다.</p>
          </div>
        ) : (
          historyLog.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    {log.timestamp}
                  </span>
                  <span className="text-[10px] font-medium text-accent-gold truncate max-w-[150px]">
                    {log.source}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold line-clamp-2 leading-relaxed">
                  {log.text}
                </p>
              </div>

              {/* Load item button */}
              <button
                onClick={() => onLoadHistoryItem(log.text, log.source)}
                className="flex-shrink-0 p-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 text-slate-400 hover:text-accent-gold hover:border-accent-gold rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="이 지문으로 연습하기"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
