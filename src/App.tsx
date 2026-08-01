import { useState, useEffect } from "react";
import { 
  Moon, 
  Feather, 
  Volume2, 
  BookMarked,
  Layout,
  Info,
  ExternalLink,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Bookmark
} from "lucide-react";
import { curatedDB } from "./data";
import { BagItem, HistoryItem } from "./types";
import ShadowingRoom from "./components/ShadowingRoom";
import CursivePad from "./components/CursivePad";
import HistoryLog from "./components/HistoryLog";

// Local Storage Keys
const BAG_STORAGE_KEY = "mindful_transcription_bag";

export default function App() {
  const [activeTab, setActiveTab] = useState<"weekday" | "weekend">("weekday");
  
  // Dynamic study text state
  const [currentText, setCurrentText] = useState<string>("");
  const [currentSource, setCurrentSource] = useState<string>("");
  
  // Persistent Transcription Bag state
  const [bag, setBag] = useState<BagItem[]>([]);
  
  // In-session temporary history log
  const [historyLog, setHistoryLog] = useState<HistoryItem[]>([]);

  // Load transcription bag on init
  useEffect(() => {
    try {
      const savedBag = localStorage.getItem(BAG_STORAGE_KEY);
      if (savedBag) {
        const parsed = JSON.parse(savedBag);
        if (Array.isArray(parsed)) {
          setBag(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse transcription bag storage:", e);
    }

    // Set initial greeting/sample text on load
    const greeting = curatedDB[Math.floor(Math.random() * curatedDB.length)];
    if (greeting) {
      setCurrentText(greeting.text);
      setCurrentSource(greeting.source);
    }
  }, []);

  // Save transcription bag when changed
  const saveBagToStorage = (updatedBag: BagItem[]) => {
    setBag(updatedBag);
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(updatedBag));
    } catch (e) {
      console.error("Failed to save transcription bag to storage:", e);
    }
  };

  // Add current active sentence to persistent bag
  const handleAddToBag = () => {
    if (!currentText) return;

    const isExist = bag.some((item) => item.sentence === currentText);
    if (isExist) {
      alert("💼 이미 가방에 추가된 구절입니다.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const newBagItem: BagItem = {
      sentence: currentText,
      source: currentSource || "Unknown",
      count: 0,
      stage: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: todayStr,
      collectedAt: todayStr
    };

    const updatedBag = [...bag, newBagItem];
    saveBagToStorage(updatedBag);
    alert("✒️ 지문이 필사 가방에 안전하게 추가되었습니다! 주말 필사 룸에서 확인하실 수 있습니다.");
  };

  // Remove item from transcription bag
  const handleRemoveFromBag = (index: number) => {
    const updatedBag = bag.filter((_, idx) => idx !== index);
    saveBagToStorage(updatedBag);
  };

  // Update specific item (SM-2 calculations)
  const handleUpdateBagItem = (index: number, updatedItem: BagItem) => {
    const updatedBag = [...bag];
    updatedBag[index] = updatedItem;
    saveBagToStorage(updatedBag);
  };

  // Add item to temporary dynamic parser history log
  const handleAddHistory = (item: HistoryItem) => {
    setHistoryLog((prev) => {
      const filtered = prev.filter((i) => i.text !== item.text);
      return [item, ...filtered].slice(0, 30); // Max 30 items
    });
  };

  // Load selected history item to training frame
  const handleLoadHistoryItem = (text: string, source: string) => {
    setCurrentText(text);
    setCurrentSource(source);
    setActiveTab("weekday"); // Go back to shadowing view
    alert("🔄 선택하신 문장이 쉐도잉 룸에 실시간으로 다시 로딩되었습니다.");
  };

  // SM-2 Overdue/Due items statistic count
  const todayStr = new Date().toISOString().split("T")[0];
  const dueItemsCount = bag.filter((item) => item.nextReviewDate <= todayStr).length;

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-accent-gold/20 selection:text-accent-gold">
      
      {/* HEADER BANNER */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Brand logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-white dark:text-slate-900 font-serif text-sm font-bold">ME</span>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-serif font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Mindful English
              </h1>
              <p className="text-[9px] text-slate-400 font-mono hidden sm:block">
                Personal OS v2.3
              </p>
            </div>
          </div>

          {/* Navigation Tab Menu */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-full border border-slate-200/50 dark:border-slate-900">
            {/* Weekday Tab */}
            <button
              onClick={() => setActiveTab("weekday")}
              className={`flex items-center gap-1.5 px-3 md:px-5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all select-none cursor-pointer ${
                activeTab === "weekday"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span><span className="hidden sm:inline">평일: </span>쉐도잉</span>
            </button>

            {/* Weekend Tab */}
            <button
              onClick={() => setActiveTab("weekend")}
              className={`flex items-center gap-1.5 px-3 md:px-5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all select-none relative cursor-pointer ${
                activeTab === "weekend"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span><span className="hidden sm:inline">주말: </span>필사</span>
              {dueItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#FAF7F0] dark:border-slate-950">
                  {dueItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-8">
        
        {/* Dynamic tabs render */}
        {activeTab === "weekday" ? (
          <ShadowingRoom
            currentText={currentText}
            currentSource={currentSource}
            setCurrentText={setCurrentText}
            setCurrentSource={setCurrentSource}
            onAddToBag={handleAddToBag}
            onAddHistory={handleAddHistory}
            historyLog={historyLog}
          />
        ) : (
          <CursivePad
            bag={bag}
            onRemoveFromBag={handleRemoveFromBag}
            onUpdateBagItem={handleUpdateBagItem}
          />
        )}

        {/* Dynamic history log & metadata details */}
        {activeTab === "weekday" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Realtime History Logs */}
            <div className="lg:col-span-7">
              <HistoryLog
                historyLog={historyLog}
                onLoadHistoryItem={handleLoadHistoryItem}
              />
            </div>

            {/* App features description */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Smartphone className="w-5 h-5 text-accent-gold" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Mindful English 최적화 안내
                </h3>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-3 leading-relaxed">
                <p>
                  본 어플리케이션은 데스크톱 모니터뿐만 아니라 <strong>모바일 브라우저 환경</strong>에서도 완벽하게 동작하도록 뷰포트 레이아웃 설계가 고도화되어 있습니다.
                </p>
                
                <div className="flex items-start gap-2.5 bg-[#FAF7F0] dark:bg-slate-950 p-3 rounded-xl border border-slate-250/20">
                  <TrendingUp className="w-4 h-4 text-accent-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">3:7 지문 배합 파서</span>
                    <span>BBC 실시간 RSS 뉴스 및 구텐베르크 대작 고전 명작을 비동기식으로 실시간 파싱 및 로딩하여 영어 쉐도잉 최적의 문장 밀도를 구성합니다.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-[#FAF7F0] dark:bg-slate-950 p-3 rounded-xl border border-slate-250/20">
                  <Bookmark className="w-4 h-4 text-accent-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">SM-2 Spaced Repetition</span>
                    <span>가방에 보관한 지문은 SuperMemo SM-2 지능형 알고리즘을 기반으로 망각곡선 스케줄이 계산되어 효율적으로 주말 복습을 완수할 수 있게 보조합니다.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
