import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  Mic, 
  Square, 
  Play, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  Radio, 
  RotateCcw,
  Gauge,
  BookOpen,
  Filter,
  PlusCircle,
  FileText,
  CheckCircle2,
  HelpCircle,
  Trophy,
  ArrowRight,
  Lock,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { CuratedItem, HistoryItem } from "../types";
import { curatedDB, gutenbergSources } from "../data";
import { generateClientDrills } from "../lib/drillGenerator";
import { calculateLCSScore } from "../lib/scoring";

interface ShadowingRoomProps {
  currentText: string;
  currentSource: string;
  setCurrentText: (text: string) => void;
  setCurrentSource: (source: string) => void;
  onAddToBag: () => void;
  onAddHistory: (item: HistoryItem) => void;
  historyLog: HistoryItem[];
}

export default function ShadowingRoom({
  currentText,
  currentSource,
  setCurrentText,
  setCurrentSource,
  onAddToBag,
  onAddHistory,
  historyLog
}: ShadowingRoomProps) {
  // TTS State
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Speech Recognition State
  const [isAiListening, setIsAiListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [evaluationActive, setEvaluationActive] = useState(false);

  // Native Voice Recorder State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [voiceBlobUrl, setVoiceBlobUrl] = useState<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Category and Shortcut Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Custom Sentence Dump State
  const [customText, setCustomText] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [customList, setCustomList] = useState<CuratedItem[]>([]);

  // Gutenberg Book Specific Selection State
  const [selectedBookIdx, setSelectedBookIdx] = useState<number>(0);

  // Gutenberg cache
  const gutenbergCacheRef = useRef<{ [key: string]: string[] }>({});
  const recentTextsRef = useRef<string[]>([]);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);

  // SpeechRecognition Instance Ref
  const recognitionRef = useRef<any>(null);

  // Difficulty and Drills State
  const [difficultyLevel, setDifficultyLevel] = useState<number>(1);
  const [drills, setDrills] = useState<any[]>([]);
  const [currentDrillIdx, setCurrentDrillIdx] = useState<number>(0);
  const [isLoadingDrills, setIsLoadingDrills] = useState<boolean>(false);
  const [drillSource, setDrillSource] = useState<string>("");
  const [selectedScrambleWords, setSelectedScrambleWords] = useState<string[]>([]);
  const [scrambledPool, setScrambledPool] = useState<string[]>([]);
  const [drillCompleted, setDrillCompleted] = useState<boolean[]>([]);
  const [drillSpeakSuccess, setDrillSpeakSuccess] = useState<boolean[]>([]);
  const [isDrillListening, setIsDrillListening] = useState<boolean>(false);
  const [drillTranscript, setDrillTranscript] = useState<string>("");
  const [drillMatchScore, setDrillMatchScore] = useState<number | null>(null);
  const [showDrillAnswer, setShowDrillAnswer] = useState<boolean>(false);

  // 5-Round 15-Minute Optimized Speaking Trainer States
  // For the Main Active Sentence
  const [mainStepRound, setMainStepRound] = useState<number>(1);
  const [mainStepScores, setMainStepScores] = useState<(number | null)[]>([null, null, null, null, null]);
  const [mainStepTranscripts, setMainStepTranscripts] = useState<string[]>(["", "", "", "", ""]);
  const [isMainRoundListening, setIsMainRoundListening] = useState<boolean>(false);

  // For the Pattern Drill (5-Step Systematic Practice)
  const [drillStepRound, setDrillStepRound] = useState<number>(1);
  const [drillStepScores, setDrillStepScores] = useState<(number | null)[]>([null, null, null, null, null]);
  const [drillStepTranscripts, setDrillStepTranscripts] = useState<string[]>(["", "", "", "", ""]);
  const [isDrillRoundListening, setIsDrillRoundListening] = useState<boolean>(false);

  // Helper to generate pedagogical masking for words in 5-round flow
  const getMaskedSentence = (text: string, round: number): string => {
    if (!text) return "";
    if (round <= 2) return text;

    const words = text.split(/\s+/);
    
    if (round === 3) {
      // 50% mask (odd word indices masked, keeping first character)
      return words.map((word, idx) => {
        if (idx % 2 === 1) {
          const firstChar = word[0];
          const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
          if (cleanWord.length <= 1) return "__";
          const punctuation = word.slice(cleanWord.length + (word.indexOf(cleanWord) === -1 ? 0 : word.indexOf(cleanWord)));
          return firstChar + "_".repeat(Math.max(1, cleanWord.length - 1)) + punctuation;
        }
        return word;
      }).join(" ");
    }

    if (round === 4) {
      // 90% mask (all except first word masked, keeping only first character)
      return words.map((word, idx) => {
        if (idx === 0) return word;
        const firstChar = word[0];
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
        if (cleanWord.length <= 1) return "_";
        const punctuation = word.slice(cleanWord.length + (word.indexOf(cleanWord) === -1 ? 0 : word.indexOf(cleanWord)));
        return firstChar + "_".repeat(Math.max(1, cleanWord.length - 1)) + punctuation;
      }).join(" ");
    }

    if (round === 5) {
      // 100% blind (only show blank spaces / shapes)
      return words.map(word => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
        const punctuation = word.slice(cleanWord.length + (word.indexOf(cleanWord) === -1 ? 0 : word.indexOf(cleanWord)));
        return "_".repeat(Math.max(3, cleanWord.length)) + punctuation;
      }).join(" ");
    }

    return text;
  };

  // Helper: Sentence Level Calculator (Word count based)
  const getSentenceLevel = (text: string): number => {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 6) return 1;       // Level 1: 3-6 words
    if (wordCount <= 10) return 2;      // Level 2: 7-10 words
    if (wordCount <= 15) return 3;      // Level 3: 11-15 words
    if (wordCount <= 21) return 4;      // Level 4: 16-21 words
    return 5;                           // Level 5: 22+ words
  };

  // Stop active recording and recognition helper
  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current || mediaRecorder;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (e) {
        console.warn("Error stopping MediaRecorder:", e);
      }
    }
    mediaRecorderRef.current = null;
    setMediaRecorder(null);
    setIsRecordingVoice(false);
  };

  const stopAllActiveRecognitionAndRecording = () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    stopVoiceRecording();
    setIsMainRoundListening(false);
    setIsDrillRoundListening(false);
    setIsAiListening(false);
    setIsDrillListening(false);
  };

  // Play Recorded Voice and Native TTS simultaneously
  const playSimultaneousAudio = () => {
    if (!voiceBlobUrl || !currentText) return;
    stopAllActiveRecognitionAndRecording();

    // 1. Play user recorded voice audio
    try {
      const userAudio = new Audio(voiceBlobUrl);
      userAudio.volume = 1.0;
      userAudio.play().catch(e => console.warn("User voice play warning:", e));
    } catch (e) {
      console.warn("User voice audio creation error:", e);
    }

    // 2. Play native TTS at the exact same instant
    window.speechSynthesis.cancel();
    const speed = mainStepRound === 1 ? 0.7 : 1.0;
    const utterance = new SpeechSynthesisUtterance(currentText);
    utterance.lang = "en-US";
    utterance.rate = speed;
    utterance.volume = 1.0;

    const usVoice = voices.find(
      (v) => v.lang.includes("en-US") && (v.name.includes("Google") || v.name.includes("Natural"))
    );
    if (usVoice) utterance.voice = usVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Fetch Drills when currentText changes
  useEffect(() => {
    if (!currentText) return;

    let isMounted = true;
    const fetchDrills = async () => {
      setIsLoadingDrills(true);
      setDrills([]);
      setCurrentDrillIdx(0);
      setDrillCompleted([]);
      setDrillSpeakSuccess([]);
      setSelectedScrambleWords([]);
      setScrambledPool([]);
      setShowDrillAnswer(false);
      setDrillTranscript("");
      setDrillMatchScore(null);

      // Reset main sentence speaking round state
      setMainStepRound(1);
      setMainStepScores([null, null, null, null, null]);
      setMainStepTranscripts(["", "", "", "", ""]);
      setIsMainRoundListening(false);

      try {
        const response = await fetch("/api/generate-drills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence: currentText }),
        });
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.drills && data.drills.length > 0) {
            setDrills(data.drills);
            setDrillSource(data.source || "AI 분석");
            setDrillCompleted(new Array(data.drills.length).fill(false));
            setDrillSpeakSuccess(new Array(data.drills.length).fill(false));
            
            if (data.drills[0] && data.drills[0].scramble) {
              setScrambledPool([...data.drills[0].scramble]);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch drills from server endpoint, using client-side generator fallback:", err);
      } finally {
        if (isMounted) {
          setDrills((prev) => {
            if (prev.length === 0) {
              const localDrills = generateClientDrills(currentText);
              if (localDrills && localDrills.length > 0) {
                setDrillSource("클라이언트 내장 스마트 인공지능 분석기");
                setDrillCompleted(new Array(localDrills.length).fill(false));
                setDrillSpeakSuccess(new Array(localDrills.length).fill(false));
                if (localDrills[0] && localDrills[0].scramble) {
                  setScrambledPool([...localDrills[0].scramble]);
                }
                return localDrills;
              }
            }
            return prev;
          });
          setIsLoadingDrills(false);
        }
      }
    };

    fetchDrills();
    return () => {
      isMounted = false;
    };
  }, [currentText]);

  // Sync scramble pool and speech recognition when currentDrillIdx changes
  useEffect(() => {
    if (drills && drills[currentDrillIdx]) {
      setScrambledPool([...drills[currentDrillIdx].scramble]);
      setSelectedScrambleWords([]);
      setShowDrillAnswer(false);
      setDrillTranscript("");
      setDrillMatchScore(null);

      // Reset drill speaking round state
      setDrillStepRound(1);
      setDrillStepScores([null, null, null, null, null]);
      setDrillStepTranscripts(["", "", "", "", ""]);
      setIsDrillRoundListening(false);
    }
  }, [currentDrillIdx, drills]);

  const handleWordClickFromPool = (word: string, index: number) => {
    const newPool = [...scrambledPool];
    newPool.splice(index, 1);
    setScrambledPool(newPool);

    const newSelected = [...selectedScrambleWords, word];
    setSelectedScrambleWords(newSelected);

    if (newPool.length === 0) {
      checkDrillAnswer(newSelected);
    }
  };

  const handleWordClickFromSelected = (word: string, index: number) => {
    const newSelected = [...selectedScrambleWords];
    newSelected.splice(index, 1);
    setSelectedScrambleWords(newSelected);

    setScrambledPool([...scrambledPool, word]);
  };

  const checkDrillAnswer = (selected: string[]) => {
    if (!drills || !drills[currentDrillIdx]) return;
    const targetText = drills[currentDrillIdx].text;
    
    const normalize = (text: string) => 
      text.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
          .replace(/\s+/g, " ")
          .trim();

    const normalizedTarget = normalize(targetText);
    const normalizedUser = normalize(selected.join(" "));

    if (normalizedTarget === normalizedUser) {
      const updated = [...drillCompleted];
      updated[currentDrillIdx] = true;
      setDrillCompleted(updated);
      setShowDrillAnswer(true);
    }
  };

  const handleSkipOrCheat = () => {
    if (!drills || !drills[currentDrillIdx]) return;
    const targetWords = drills[currentDrillIdx].text.replace(/[.,?]/g, "").split(/\s+/).filter(Boolean);
    setSelectedScrambleWords(targetWords);
    setScrambledPool([]);
    
    const updated = [...drillCompleted];
    updated[currentDrillIdx] = true;
    setDrillCompleted(updated);
    setShowDrillAnswer(true);
  };

  const handleResetDrillLevel = () => {
    setDifficultyLevel(1);
    alert("학습 탐색 난이도가 다시 Level 1(가장 쉬움)로 완벽하게 초기화되었습니다!");
  };

  const playCustomTTS = (text: string, speed: number) => {
    if (!text) return;
    stopAllActiveRecognitionAndRecording();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = speed;

    const usVoice = voices.find(
      (v) => v.lang.includes("en-US") && (v.name.includes("Google") || v.name.includes("Natural"))
    );
    if (usVoice) utterance.voice = usVoice;
    window.speechSynthesis.speak(utterance);
  };

  const playMainRoundTTS = (round: number) => {
    if (!currentText) return;
    if (round === 5) return; // Round 5 has no TTS help in 5-step flow
    stopAllActiveRecognitionAndRecording();
    const speed = round === 1 ? 0.7 : 1.0;
    playCustomTTS(currentText, speed);
  };

  const playDrillRoundTTS = (round: number) => {
    if (!drills || !drills[currentDrillIdx]) return;
    if (round === 5) return; // Round 5 has no TTS help in 5-step flow
    stopAllActiveRecognitionAndRecording();
    const speed = round === 1 ? 0.7 : 1.0;
    playCustomTTS(drills[currentDrillIdx].text, speed);
  };

  const toggleMainRoundRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 웹 음성 인식을 지원하지 않습니다. Chrome 브라우저 사용을 추천합니다.");
      return;
    }

    if (isMainRoundListening) {
      stopAllActiveRecognitionAndRecording();
    } else {
      stopAllActiveRecognitionAndRecording();

      const roundIdx = mainStepRound - 1;
      const updatedTranscripts = [...mainStepTranscripts];
      updatedTranscripts[roundIdx] = "말씀하시는 중...";
      setMainStepTranscripts(updatedTranscripts);

      setIsMainRoundListening(true);
      let sessionTranscript = "";
      let lastErrorCode = "";

      try {
        const rec = new SpeechRecognition();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        rec.onresult = (event: any) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i] && event.results[i][0]) {
              accumulated += event.results[i][0].transcript + " ";
            }
          }
          const transcript = accumulated.trim();
          if (transcript) {
            sessionTranscript = transcript;
            const score = calculateLCSScore(currentText, transcript);
            
            setMainStepScores((prev) => {
              const finalScores = [...prev];
              finalScores[roundIdx] = score;
              return finalScores;
            });

            setMainStepTranscripts((prev) => {
              const finalTranscripts = [...prev];
              finalTranscripts[roundIdx] = transcript;
              return finalTranscripts;
            });
          }
        };

        rec.onerror = (err: any) => {
          const code = err?.error || String(err || "");
          console.warn("Main Round Recognition Error:", code);
          if (code) lastErrorCode = code;
        };

        rec.onend = () => {
          stopVoiceRecording();
          if (!sessionTranscript) {
            setMainStepTranscripts((prev) => {
              const finalTranscripts = [...prev];
              if (!finalTranscripts[roundIdx] || finalTranscripts[roundIdx] === "말씀하시는 중...") {
                const codeText = lastErrorCode ? ` (오류 코드: ${lastErrorCode})` : "";
                finalTranscripts[roundIdx] = `(음성이 인식되지 않았습니다${codeText})`;
              }
              return finalTranscripts;
            });
            setMainStepScores((prev) => {
              const finalScores = [...prev];
              if (finalScores[roundIdx] === null) {
                finalScores[roundIdx] = 0;
              }
              return finalScores;
            });
          }
          setIsMainRoundListening(false);
        };

        rec.start();

        startVoiceRecording().catch((e) => {
          console.warn("Native voice recording start skipped:", e);
        });

      } catch (e: any) {
        console.warn("Speech recognition start warning:", e);
        stopVoiceRecording();
        const codeText = e?.error || e?.name || e?.message || "start-failed";
        setMainStepTranscripts((prev) => {
          const finalTranscripts = [...prev];
          finalTranscripts[roundIdx] = `(음성이 인식되지 않았습니다 [오류 코드: ${codeText}])`;
          return finalTranscripts;
        });
        setIsMainRoundListening(false);
      }
    }
  };

  const toggleDrillRoundRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 웹 음성 인식을 지원하지 않습니다. Chrome 브라우저 사용을 추천합니다.");
      return;
    }
    if (!drills || !drills[currentDrillIdx]) return;

    if (isDrillRoundListening) {
      stopAllActiveRecognitionAndRecording();
    } else {
      stopAllActiveRecognitionAndRecording();

      const roundIdx = drillStepRound - 1;
      const updatedTranscripts = [...drillStepTranscripts];
      updatedTranscripts[roundIdx] = "말씀하시는 중...";
      setDrillStepTranscripts(updatedTranscripts);

      setIsDrillRoundListening(true);
      let sessionTranscript = "";
      let lastErrorCode = "";

      try {
        const rec = new SpeechRecognition();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        const targetText = drills[currentDrillIdx].text;

        rec.onresult = (event: any) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i] && event.results[i][0]) {
              accumulated += event.results[i][0].transcript + " ";
            }
          }
          const transcript = accumulated.trim();
          if (transcript) {
            sessionTranscript = transcript;
            const score = calculateLCSScore(targetText, transcript);

            setDrillStepScores((prev) => {
              const finalScores = [...prev];
              finalScores[roundIdx] = score;
              return finalScores;
            });

            setDrillStepTranscripts((prev) => {
              const finalTranscripts = [...prev];
              finalTranscripts[roundIdx] = transcript;
              return finalTranscripts;
            });
          }
        };

        rec.onerror = (err: any) => {
          const code = err?.error || String(err || "");
          console.warn("Drill Round Recognition Error:", code);
          if (code) lastErrorCode = code;
        };

        rec.onend = () => {
          stopVoiceRecording();
          if (!sessionTranscript) {
            setDrillStepTranscripts((prev) => {
              const finalTranscripts = [...prev];
              if (!finalTranscripts[roundIdx] || finalTranscripts[roundIdx] === "말씀하시는 중...") {
                const codeText = lastErrorCode ? ` (오류 코드: ${lastErrorCode})` : "";
                finalTranscripts[roundIdx] = `(음성이 인식되지 않았습니다${codeText})`;
              }
              return finalTranscripts;
            });
            setDrillStepScores((prev) => {
              const finalScores = [...prev];
              if (finalScores[roundIdx] === null) {
                finalScores[roundIdx] = 0;
              }
              return finalScores;
            });
          }
          setIsDrillRoundListening(false);
        };

        rec.start();

        startVoiceRecording().catch((e) => {
          console.warn("Native voice recording start skipped:", e);
        });

      } catch (e: any) {
        console.warn("Speech recognition already running:", e);
        stopVoiceRecording();
        const codeText = e?.error || e?.name || e?.message || "start-failed";
        setDrillStepTranscripts((prev) => {
          const finalTranscripts = [...prev];
          finalTranscripts[roundIdx] = `(음성이 인식되지 않았습니다 [오류 코드: ${codeText}])`;
          return finalTranscripts;
        });
        setIsDrillRoundListening(false);
      }
    }
  };

  const playDrillTTS = (text: string) => {
    if (!text) return;
    stopAllActiveRecognitionAndRecording();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = ttsSpeed;

    const usVoice = voices.find(
      (v) => v.lang.includes("en-US") && (v.name.includes("Google") || v.name.includes("Natural"))
    );
    if (usVoice) utterance.voice = usVoice;

    window.speechSynthesis.speak(utterance);
  };

  const toggleDrillRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 웹 음성 인식을 지원하지 않습니다. Chrome 브라우저 사용을 추천합니다.");
      return;
    }

    if (isDrillListening) {
      stopAllActiveRecognitionAndRecording();
    } else {
      stopAllActiveRecognitionAndRecording();

      setDrillTranscript("말씀하시는 중...");
      setDrillMatchScore(null);
      setIsDrillListening(true);
      let sessionTranscript = "";
      let lastErrorCode = "";

      try {
        const rec = new SpeechRecognition();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        const targetText = drills[currentDrillIdx]?.text || "";

        rec.onresult = (event: any) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i] && event.results[i][0]) {
              accumulated += event.results[i][0].transcript + " ";
            }
          }
          const transcript = accumulated.trim();
          if (transcript) {
            sessionTranscript = transcript;
            setDrillTranscript(transcript);

            const score = calculateLCSScore(targetText, transcript);
            setDrillMatchScore(score);

            if (score >= 75) {
              setDrillSpeakSuccess((prev) => {
                const updated = [...prev];
                updated[currentDrillIdx] = true;
                return updated;
              });
            }
          }
        };

        rec.onerror = (err: any) => {
          const code = err?.error || String(err || "");
          console.warn("Drill Speech Recognition Error:", code);
          if (code) lastErrorCode = code;
        };

        rec.onend = () => {
          stopVoiceRecording();
          if (!sessionTranscript) {
            const codeText = lastErrorCode ? ` (오류 코드: ${lastErrorCode})` : "";
            setDrillTranscript(`(음성이 인식되지 않았습니다${codeText})`);
            setDrillMatchScore(0);
          }
          setIsDrillListening(false);
        };

        rec.start();

        startVoiceRecording().catch((e) => {
          console.warn("Native voice recording start skipped:", e);
        });

      } catch (e: any) {
        console.warn("Speech recognition already running:", e);
        stopVoiceRecording();
        const codeText = e?.error || e?.name || e?.message || "start-failed";
        setDrillTranscript(`(음성이 인식되지 않았습니다 [오류 코드: ${codeText}])`);
        setDrillMatchScore(0);
        setIsDrillListening(false);
      }
    }
  };

  // Load Saved Custom Sentences from LocalStorage on mount
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem("mindful_custom_sentences");
      if (savedCustom) {
        setCustomList(JSON.parse(savedCustom));
      }
    } catch (e) {
      console.error("Failed to parse custom sentences:", e);
    }
  }, []);

  // Save Custom list to LocalStorage
  const saveCustomList = (updated: CuratedItem[]) => {
    setCustomList(updated);
    localStorage.setItem("mindful_custom_sentences", JSON.stringify(updated));
  };

  // Initialize SpeechSynthesis Voices
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;

      rec.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setUserTranscript(transcript);
          calculateLCSScore(currentText, transcript);
        } else {
          setUserTranscript("(음성이 인식되지 않았습니다)");
          setMatchScore(0);
        }
        setIsAiListening(false);
      };

      rec.onerror = (err: any) => {
        console.warn("Speech Recognition Error:", err.error);
        setIsAiListening(false);
      };

      rec.onend = () => {
        setIsAiListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [currentText]);

  // Korean Translation States
  const [translation, setTranslation] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);

  // Background Translation Fetcher
  useEffect(() => {
    if (!currentText) {
      setTranslation("");
      setShowTranslation(false);
      return;
    }

    setShowTranslation(false);
    setTranslation("");
    setIsTranslating(true);

    let isMounted = true;

    const fetchTranslation = async () => {
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(currentText)}&langpair=en|ko`
        );
        if (!res.ok) throw new Error("Translation request failed");
        const data = await res.json();
        if (isMounted) {
          if (data && data.responseData && data.responseData.translatedText) {
            let translated = data.responseData.translatedText;
            translated = translated
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
            setTranslation(translated);
          } else {
            setTranslation("번역을 불러오지 못했습니다. 클릭하여 다시 시도해 주세요.");
          }
        }
      } catch (err) {
        console.error("Translation error:", err);
        if (isMounted) {
          setTranslation("번역을 불러오지 못했습니다. 클릭하여 다시 시도해 주세요.");
        }
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    };

    fetchTranslation();

    return () => {
      isMounted = false;
    };
  }, [currentText]);

  const handleRetryTranslation = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentText) return;
    setIsTranslating(true);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(currentText)}&langpair=en|ko`
      );
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        let translated = data.responseData.translatedText;
        translated = translated
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        setTranslation(translated);
      } else {
        setTranslation("번역을 불러오지 못했습니다. 클릭하여 다시 시도해 주세요.");
      }
    } catch (err) {
      setTranslation("번역을 불러오지 못했습니다. 클릭하여 다시 시도해 주세요.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Clean up recording URL
  useEffect(() => {
    return () => {
      if (voiceBlobUrl) {
        URL.revokeObjectURL(voiceBlobUrl);
      }
    };
  }, [voiceBlobUrl]);

  // TTS Player
  const playTTS = () => {
    if (!currentText) return;
    stopAllActiveRecognitionAndRecording();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentText);
    utterance.lang = "en-US";
    utterance.rate = ttsSpeed;

    const usVoice = voices.find(
      (v) => v.lang.includes("en-US") && (v.name.includes("Google") || v.name.includes("Natural"))
    );
    if (usVoice) utterance.voice = usVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Cycle speed values
  const cycleTtsSpeed = () => {
    stopAllActiveRecognitionAndRecording();
    const nextSpeed = ttsSpeed === 1.0 ? 0.8 : ttsSpeed === 0.8 ? 1.2 : 1.0;
    setTtsSpeed(nextSpeed);
    
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentText);
      utterance.lang = "en-US";
      utterance.rate = nextSpeed;
      const usVoice = voices.find((v) => v.lang.includes("en-US") && v.name.includes("Google"));
      if (usVoice) utterance.voice = usVoice;
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  // Toggle AI speech analysis
  const toggleAiRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 웹 음성 인식을 지원하지 않습니다. Chrome 브라우저 사용을 추천합니다.");
      return;
    }

    if (isAiListening) {
      stopAllActiveRecognitionAndRecording();
    } else {
      stopAllActiveRecognitionAndRecording();

      setUserTranscript("말씀하시는 중...");
      setMatchScore(null);
      setEvaluationActive(true);
      setIsAiListening(true);
      let sessionTranscript = "";
      let lastErrorCode = "";

      try {
        const rec = new SpeechRecognition();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        rec.onresult = (event: any) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i] && event.results[i][0]) {
              accumulated += event.results[i][0].transcript + " ";
            }
          }
          const transcript = accumulated.trim();
          if (transcript) {
            sessionTranscript = transcript;
            setUserTranscript(transcript);
            setMatchScore(calculateLCSScore(currentText, transcript));
          }
        };

        rec.onerror = (err: any) => {
          const code = err?.error || String(err || "");
          console.warn("Main AI Speech Recognition Error:", code);
          if (code) lastErrorCode = code;
        };

        rec.onend = () => {
          stopVoiceRecording();
          if (!sessionTranscript) {
            const codeText = lastErrorCode ? ` (오류 코드: ${lastErrorCode})` : "";
            setUserTranscript(`(음성이 인식되지 않았습니다${codeText})`);
            setMatchScore(0);
          }
          setIsAiListening(false);
        };

        rec.start();

        startVoiceRecording().catch((e) => {
          console.warn("Native voice recording start skipped:", e);
        });

      } catch (e: any) {
        console.warn("Speech recognition already running:", e);
        stopVoiceRecording();
        const codeText = e?.error || e?.name || e?.message || "start-failed";
        setUserTranscript(`(음성이 인식되지 않았습니다 [오류 코드: ${codeText}])`);
        setMatchScore(0);
        setIsAiListening(false);
      }
    }
  };

  // BBC News RSS Loader via proxy
  const fetchBBCNews = async (targetLevel: number): Promise<CuratedItem> => {
    const channels = ["world", "technology", "science_and_environment"];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const rssUrl = `https://feeds.bbci.co.uk/news/${channel}/rss.xml`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("News proxy error");
    
    const data = await response.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    if (items.length === 0) throw new Error("Empty news list");
    
    const candidates: CuratedItem[] = [];
    items.forEach((item) => {
      const description = item.querySelector("description")?.textContent || "";
      const cleanText = description.replace(/<[^>]*>/g, "").trim();
      if (cleanText) {
        candidates.push({
          text: cleanText,
          source: `BBC News — ${channel.toUpperCase()}`
        });
      }
    });

    const filtered = filterByDifficulty(candidates, targetLevel);
    return getNonRepeatedItem(filtered);
  };

  // Specific Gutenberg Book Parser (Infinite Access)
  const fetchGutenbergBookSentence = async (bookIdx: number, targetLevel: number): Promise<CuratedItem> => {
    const src = gutenbergSources[bookIdx];
    const cacheKey = src.repo;

    let pool: string[] = [];
    if (gutenbergCacheRef.current[cacheKey] && gutenbergCacheRef.current[cacheKey].length > 0) {
      pool = gutenbergCacheRef.current[cacheKey];
    } else {
      const url = `https://raw.githubusercontent.com/GITenberg/${src.repo}/master/${src.file}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gutenberg stream error");

      const text = await response.text();
      let clean = text.replace(/\r\n/g, " ").replace(/\s+/g, " ");

      const abbreviations = [
        "Mr.", "Mrs.", "Dr.", "St.", "U.S.", "Lt.", "Capt.", "Esq.", "V.",
        "Prof.", "Rev.", "Gen.", "Col.", "Vol.", "v.", "e.g.", "i.e.", "U.K.", "U.N.", "Mlle.", "Mme.",
        "Jan.", "Feb.", "Mar.", "No.", "vs.", "etc."
      ];

      abbreviations.forEach((abbr) => {
        const escaped = abbr.replace(/\./g, "\\.");
        const regex = new RegExp(escaped, "g");
        const placeholder = abbr.replace(/\./g, "___");
        clean = clean.replace(regex, placeholder);
      });

      const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z"'])/);
      pool = parts.filter((s) => {
        const words = s.trim().split(" ").length;
        return words >= 3 && words <= 35 && !s.includes("_") && !s.includes("[");
      }).map((s) => {
        let restored = s.trim();
        abbreviations.forEach((abbr) => {
          const placeholder = abbr.replace(/\./g, "___");
          restored = restored.replace(new RegExp(placeholder, "g"), abbr);
        });
        return restored;
      });

      gutenbergCacheRef.current[cacheKey] = pool;
    }

    if (pool.length === 0) throw new Error("No sentences match size parameters");

    const candidates: CuratedItem[] = pool.map((sentence) => ({
      text: sentence,
      source: `${src.title} (${src.author})`
    }));

    const filtered = filterByDifficulty(candidates, targetLevel);
    return getNonRepeatedItem(filtered);
  };

  const filterByDifficulty = (items: CuratedItem[], level: number): CuratedItem[] => {
    const matched = items.filter(item => getSentenceLevel(item.text) === level);
    if (matched.length > 0) return matched;
    // Fallback: search other levels
    for (let diff = 1; diff <= 4; diff++) {
      const lower = items.filter(item => getSentenceLevel(item.text) === Math.max(1, level - diff));
      if (lower.length > 0) return lower;
      const upper = items.filter(item => getSentenceLevel(item.text) === Math.min(5, level + diff));
      if (upper.length > 0) return upper;
    }
    return items;
  };

  const getNonRepeatedItem = (items: CuratedItem[]): CuratedItem => {
    if (items.length === 0) return curatedDB[0];
    
    // Filter out items that have been recently shown
    let available = items.filter(item => !recentTextsRef.current.includes(item.text));
    
    // If all items are filtered out, purge the oldest half of the history
    if (available.length === 0) {
      const halfLen = Math.floor(recentTextsRef.current.length / 2);
      recentTextsRef.current = recentTextsRef.current.slice(halfLen);
      available = items.filter(item => !recentTextsRef.current.includes(item.text));
    }
    
    const selected = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)]
      : items[Math.floor(Math.random() * items.length)];
      
    // Cache to prevent immediate repetitions
    recentTextsRef.current.push(selected.text);
    if (recentTextsRef.current.length > 25) {
      recentTextsRef.current.shift();
    }
    
    return selected;
  };

  // Main Dynamic Sentence Loader with category logic
  const loadNextSentence = async () => {
    setIsLoadingSentence(true);
    setEvaluationActive(false);
    setMatchScore(null);
    setUserTranscript("");
    
    if (voiceBlobUrl) {
      URL.revokeObjectURL(voiceBlobUrl);
      setVoiceBlobUrl(null);
    }

    let result: CuratedItem | null = null;

    try {
      if (selectedCategory === "news") {
        result = await fetchBBCNews(difficultyLevel);
      } else if (selectedCategory === "gutenberg") {
        result = await fetchGutenbergBookSentence(selectedBookIdx, difficultyLevel);
      } else if (selectedCategory === "custom") {
        if (customList.length === 0) {
          alert("등록된 커스텀 대사가 없습니다. 하단 덤프 영역에서 나만의 드라마 대사를 추가해 보세요!");
          const filtered = filterByDifficulty(curatedDB, difficultyLevel);
          result = getNonRepeatedItem(filtered);
        } else {
          const filtered = filterByDifficulty(customList, difficultyLevel);
          result = getNonRepeatedItem(filtered);
        }
      } else if (selectedCategory !== "all") {
        // Filter by source or type
        const catFiltered = curatedDB.filter(
          (item) => item.source.toLowerCase().includes(selectedCategory.toLowerCase()) || 
                    item.type === selectedCategory
        );
        if (catFiltered.length > 0) {
          const filtered = filterByDifficulty(catFiltered, difficultyLevel);
          result = getNonRepeatedItem(filtered);
        } else {
          const filtered = filterByDifficulty(curatedDB, difficultyLevel);
          result = getNonRepeatedItem(filtered);
        }
      } else {
        // "all" -> Strict 1:9 mix ratio (10% News, 90% Content)
        const rand = Math.random();
        if (rand < 0.10) {
          result = await fetchBBCNews(difficultyLevel);
        } else {
          // 90% Content (split between Classic books, Drama DB, and Famous Quotes)
          const contentRand = Math.random();
          if (contentRand < 0.25) {
            // Gutenberg Classics (25% of the 90% Content)
            result = await fetchGutenbergBookSentence(Math.floor(Math.random() * gutenbergSources.length), difficultyLevel);
          } else if (contentRand < 0.85) {
            // Drama/Media/TED Series Database (60% of the 90% Content)
            const dramaTEDDB = curatedDB.filter(item => item.type !== "quotes");
            const filtered = filterByDifficulty(dramaTEDDB, difficultyLevel);
            result = getNonRepeatedItem(filtered);
          } else {
            // Famous Quotes (15% of the 90% Content)
            const quotes = curatedDB.filter(item => item.type === "quotes");
            if (quotes.length > 0) {
              const filtered = filterByDifficulty(quotes, difficultyLevel);
              result = getNonRepeatedItem(filtered);
            } else {
              const filtered = filterByDifficulty(curatedDB, difficultyLevel);
              result = getNonRepeatedItem(filtered);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Dynamic API fetch delayed -> loading fallback from local curatedDB:", err);
      const filtered = filterByDifficulty(curatedDB, difficultyLevel);
      result = getNonRepeatedItem(filtered);
    }

    if (result) {
      setCurrentText(result.text);
      setCurrentSource(result.source);
      
      onAddHistory({
        text: result.text,
        source: result.source,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false })
      });

      // 점진적 난이도 상승 (Level 최대 5)
      setDifficultyLevel((prev) => (prev < 5 ? prev + 1 : 5));
    }
    setIsLoadingSentence(false);
  };

  // Immediate specific Gutenberg load helper
  const handleLoadGutenbergSpecially = async () => {
    setIsLoadingSentence(true);
    setEvaluationActive(false);
    setMatchScore(null);
    setUserTranscript("");
    
    try {
      const result = await fetchGutenbergBookSentence(selectedBookIdx, difficultyLevel);
      setCurrentText(result.text);
      setCurrentSource(result.source);
      setSelectedCategory("gutenberg"); // Switch category to Gutenberg to continue in this book
      onAddHistory({
        text: result.text,
        source: result.source,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false })
      });
    } catch (e) {
      alert("고전 소설 로딩 중 통신 지연이 발생했습니다. 다시 한 번 시도해 주세요.");
    }
    setIsLoadingSentence(false);
  };

  // Register Custom Sentence from user dump
  const handleAddCustomSentence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) {
      alert("문장을 입력해 주세요.");
      return;
    }

    const newItem: CuratedItem = {
      text: customText.trim(),
      source: customSource.trim() || "나의 수집 대사",
      type: "custom"
    };

    const updated = [newItem, ...customList];
    saveCustomList(updated);
    
    // Instantly set as current study text
    setCurrentText(newItem.text);
    setCurrentSource(newItem.source);
    
    setCustomText("");
    setCustomSource("");
    alert("✨ 나만의 취향 대사가 실시간 등록되어 쉐도잉 룸에 바로 반영되었습니다!");
  };

  // Native Mic Recording Handlers
  const startVoiceRecording = async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioUrl = URL.createObjectURL(audioBlob);
          setVoiceBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return audioUrl;
          });
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecordingVoice(true);
      return recorder;
    } catch (err) {
      console.warn("Microphone access failed for MediaRecorder:", err);
      return null;
    }
  };

  const playRecordedVoice = () => {
    if (voiceBlobUrl) {
      const audio = new Audio(voiceBlobUrl);
      audio.play();
    }
  };

  // Define curated categories for shortcut filtering
  const categories = [
    { id: "all", label: "🌟 전체 랜덤 (1:9 믹스)" },
    { id: "ted", label: "🎤 TED 강연" },
    { id: "9-1-1", label: "🚨 9-1-1" },
    { id: "white collar", label: "💼 화이트 칼라" },
    { id: "will trent", label: "🔍 윌 트렌트" },
    { id: "once upon a time", label: "🍎 원스 어폰 어 타임" },
    { id: "quotes", label: "💡 명언" },
    { id: "criminal minds", label: "📺 크리미널 마인즈" },
    { id: "other_dramas", label: "🍿 기타 해외 드라마" },
    { id: "disney", label: "🏰 디즈니" },
    { id: "film", label: "🎬 영화 명대사" },
    { id: "musical", label: "🎶 뮤지컬" },
    { id: "play", label: "🎭 연극" },
    { id: "news", label: "📰 BBC 뉴스" },
    { id: "gutenberg", label: "📚 고전소설" },
    { id: "custom", label: "✏️ 수집 대사" },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Compact Top Banner for Mobile & Desktop */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-slate-900/60 dark:to-slate-900/30 border border-amber-200/60 dark:border-slate-800 p-3 sm:p-4 rounded-xl flex items-center gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-accent-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            ☕ 무선택 1:9 전체 랜덤 (TED·드라마 90% + 뉴스 10%)
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
            원하는 테마를 고르거나 [다음 대사 탐색]을 눌러 바로 학습하세요.
          </p>
        </div>
      </div>

      {/* SECTION 1: Works Shortcut Filter Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Filter className="w-4 h-5 text-accent-gold" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            🎬 대사 장르 및 작품별 퀵 숏컷 필터
          </h3>
          <span className="text-[10px] text-slate-400 font-medium ml-auto">원하는 테마만 모아 공부하세요</span>
        </div>
        
        {/* Category buttons flow */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none cursor-pointer border ${
                selectedCategory === cat.id
                  ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              }`}
            >
              {cat.label}
              {cat.id === "custom" && customList.length > 0 && (
                <span className="ml-1.5 bg-accent-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {customList.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Integrated Gutenberg Book Selector Dropdown */}
        {selectedCategory === "gutenberg" && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <BookOpen className="w-4 h-4 text-accent-gold" />
              <span>학습할 고전 도서 지정:</span>
            </div>
            <select
              value={selectedBookIdx}
              onChange={(e) => setSelectedBookIdx(parseInt(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer flex-1"
            >
              {gutenbergSources.map((book, idx) => (
                <option key={book.repo} value={idx}>
                  📖 {book.title} — {book.author}
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadGutenbergSpecially}
              disabled={isLoadingSentence}
              className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              해당 도서에서 문장 즉시 추출
            </button>
          </motion.div>
        )}
      </div>

      {/* SECTION 2: Shadowing room core practice pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: 1. Target Sentence (원문) + 2. Original Sentence Practice (원문 연습) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* CARD 1: Current Target Sentence Card (원문) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-accent-gold animate-pulse" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  📋 오늘의 실시간 쉐도잉 문장
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent-gold">
                  필터: {categories.find(c => c.id === selectedCategory)?.label || "전체"}
                </span>
              </div>
            </div>

            {/* Difficulty Level Indicator & Quick Level Switcher */}
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-900 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-gold" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">현재 학습 난이도:</span>
                  <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-md text-[11px]">
                    Level {difficultyLevel} / 5
                  </span>
                </div>
                <button
                  onClick={handleResetDrillLevel}
                  type="button"
                  className="text-[10px] font-bold text-slate-500 hover:text-accent-gold flex items-center gap-1 cursor-pointer transition-colors"
                  title="난이도를 가장 쉬운 Level 1로 리셋합니다."
                >
                  <RefreshCw className="w-3 h-3" />
                  1단계로 초기화
                </button>
              </div>

              {/* Interactive Level Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                {[
                  { lvl: 1, label: "Lv.1 (3~6단어)" },
                  { lvl: 2, label: "Lv.2 (7~10단어)" },
                  { lvl: 3, label: "Lv.3 (11~15단어)" },
                  { lvl: 4, label: "Lv.4 (16~21단어)" },
                  { lvl: 5, label: "Lv.5 (22단어+)" }
                ].map(({ lvl, label }) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setDifficultyLevel(lvl);
                    }}
                    className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                      difficultyLevel === lvl
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Active Sentence */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-900 rounded-xl p-6 min-h-[160px] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {isLoadingSentence ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2 items-center justify-center py-8"
                  >
                    <RotateCcw className="w-6 h-6 text-accent-gold animate-spin" />
                    <span className="text-xs text-slate-400">명대사 원문 구절을 파싱하고 있습니다...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sentence"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col gap-4"
                  >
                    <p className="text-lg md:text-xl font-serif text-slate-800 dark:text-slate-100 leading-relaxed font-semibold italic text-center">
                      "{currentText || "영어 공부를 시작하기 위해 [다음 문장 탐색]을 클릭해 주세요."}"
                    </p>
                    <div className="flex justify-center">
                      <span className="bg-accent-gold/10 text-accent-gold text-xs px-3 py-1 rounded-full font-semibold">
                        📍 {currentSource || "Source Pending"}
                      </span>
                    </div>

                    {currentText && (
                      <div 
                        onClick={() => setShowTranslation(!showTranslation)}
                        className="mt-2 pt-3 border-t border-slate-150 dark:border-slate-850 cursor-pointer group select-none text-center"
                      >
                        {showTranslation ? (
                          <motion.div
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-1 items-center"
                          >
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">한국어 뜻 해석</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed max-w-md mx-auto">
                              {isTranslating ? (
                                <span className="text-slate-400 flex items-center justify-center gap-1.5 text-xs">
                                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-accent-gold" /> 번역을 가져오고 있습니다...
                                </span>
                              ) : (
                                translation || "번역을 가져오지 못했습니다. 클릭하여 다시 시도해 주세요."
                              )}
                            </p>
                          </motion.div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <span className="text-xs text-accent-gold/90 dark:text-accent-gold/70 font-bold flex items-center gap-1.5 group-hover:text-accent-gold transition-colors">
                              💡 터치하여 한글 뜻 해석 보기
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              (스스로 먼저 직독직해를 해본 후 터치하여 정답을 확인하세요!)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CARD 2: Original Sentence Practice (원문 연습 - AI Voice Trainer & 6-step Trainer) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-gold" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  🎙️ 원문 실시간 스피킹 & AI 음성 판독 트레이너
                </h2>
              </div>
            </div>

            {/* Guided Step-by-Step Trainer UI */}
            <div className="flex flex-col gap-5">
              {/* 5단계 입체 감각 쉐도잉 훈련기 */}
              <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent-gold animate-pulse" />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      🔥 원문 5단계 15분 최적화 훈련기 (듣기 ➔ 원스톱 채점&녹음 ➔ 즉시 대조)
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                    ⚡ Daily 15m Focus
                  </span>
                </div>

                {/* Round Selection Pills */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((r) => {
                    const score = mainStepScores[r - 1];
                    const isActive = mainStepRound === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setMainStepRound(r)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer border ${
                          isActive
                            ? "bg-accent-gold text-white border-accent-gold shadow-xs"
                            : score !== null
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-800/40"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent"
                        }`}
                      >
                        <span className="text-[9px] uppercase opacity-75">Round {r}</span>
                        {score !== null && (
                          <span className="text-[9px] font-mono mt-0.5 bg-emerald-500 text-white px-1 rounded leading-none">
                            {score}점
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Round Integrated Practice Container */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-850 flex flex-col gap-3.5">
                  
                  {/* Round Description & Target Masked Display */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                        {mainStepRound === 1 && "🐌 Round 1: 0.7배속 저속 정밀 청취 & 발음 입문"}
                        {mainStepRound === 2 && "🚶 Round 2: 1.0배속 표준속도 원음 싱크 발성"}
                        {mainStepRound === 3 && "🌗 Round 3: 1.0배속 + 단어 50% 가리기 연상 발성"}
                        {mainStepRound === 4 && "🌘 Round 4: 1.0배속 + 단어 90% 가리기 (첫 글자 힌트)"}
                        {mainStepRound === 5 && "🌑 Round 5: TTS 없음 + 빈 화면 완창 백지 회상"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {mainStepRound}/5 단계
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {mainStepRound === 1 && "천천히 흘러나오는 원어민 목소리를 들으며 모든 단어를 정확하게 발음해 보세요."}
                      {mainStepRound === 2 && "표준 속도로 매끄럽게 문장의 호흡과 박자를 맞추며 따라해 보세요."}
                      {mainStepRound === 3 && "단어 절반이 가려진 상태입니다. 귀로 들으면서 머릿속 연상력을 동원해 말해보세요!"}
                      {mainStepRound === 4 && "거의 모든 단어가 가려졌고, 첫 알파벳만 보입니다. 앞 글자 힌트만 보고 발성해 보세요."}
                      {mainStepRound === 5 && "가이드 음성도, 텍스트도 없습니다. 오직 머릿속에 완성된 소리와 형태의 감각으로 완창하세요!"}
                    </p>

                    {/* Target Masked Text Box */}
                    <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-800 text-center">
                      <p className="font-serif italic font-semibold text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed">
                        "{getMaskedSentence(currentText, mainStepRound)}"
                      </p>
                    </div>
                  </div>

                  {/* Integrated Action Flow for this Round */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    
                    {/* 1. Listen (원어민 발음 청취) */}
                    <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex flex-col justify-between gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          🎧 1. 원어민 가이드음 청취
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full">
                          {mainStepRound === 1 ? "0.7x 저속" : mainStepRound === 5 ? "Mute 암기" : "1.0x 표준"}
                        </span>
                      </div>
                      <button
                        onClick={() => playMainRoundTTS(mainStepRound)}
                        disabled={!currentText || mainStepRound === 5}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        <Volume2 className="w-4 h-4" />
                        {mainStepRound === 5 ? "R5는 백지 회상 (TTS 끔)" : `Round ${mainStepRound} 가이드 음성 듣기`}
                      </button>
                    </div>

                    {/* 2. Speak & AI Score & Auto-Record (원스톱 마이크: 발음 채점 + 실제 음성 동시 저장) */}
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl flex flex-col justify-between gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          🎤 2. 발음 채점 & 오디오 자동 녹음
                        </span>
                        {mainStepScores[mainStepRound - 1] !== null && (
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full font-mono ${mainStepScores[mainStepRound - 1]! >= 75 ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"}`}>
                            {mainStepScores[mainStepRound - 1]}점
                          </span>
                        )}
                      </div>
                      <button
                        onClick={toggleMainRoundRecognition}
                        disabled={!currentText}
                        className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          isMainRoundListening
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        <Mic className="w-4 h-4 text-white" />
                        {isMainRoundListening ? "🔴 말하는 중... (클릭 시 완료)" : "🎙️ 마이크 켜고 말하기 (채점+녹음 동시)"}
                      </button>
                    </div>

                  </div>

                  {/* One-Stop Result & Side-by-Side Audio Review Panel */}
                  {(mainStepTranscripts[mainStepRound - 1] || voiceBlobUrl) && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
                      {mainStepTranscripts[mainStepRound - 1] && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center font-bold text-slate-500 text-[10px]">
                            <span>🤖 AI 음성 인식 결과:</span>
                            {mainStepScores[mainStepRound - 1] !== null && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                유사도 매칭률 {mainStepScores[mainStepRound - 1]}%
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                            "{mainStepTranscripts[mainStepRound - 1]}"
                          </p>
                        </div>
                      )}

                      {/* Side-by-Side Audio Comparison Controls */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          🎧 방금 말한 내 음성과 원어민 대조 청취:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {voiceBlobUrl ? (
                            <>
                              <button
                                onClick={playRecordedVoice}
                                className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all flex items-center gap-1.5 text-xs cursor-pointer border border-indigo-200 dark:border-indigo-700 shadow-xs"
                              >
                                <Play className="w-3.5 h-3.5 fill-current text-indigo-600 dark:text-indigo-300" />
                                ▶️ 내 음성만 듣기
                              </button>

                              <button
                                onClick={playSimultaneousAudio}
                                disabled={!currentText}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 text-xs cursor-pointer border border-purple-500/50 shadow-xs"
                                title="내 녹음 음성과 원어민 TTS 음성을 동시에 포개어 재생하여 리듬과 억양 차이를 극명하게 대조합니다."
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                ⚡🎧 동시 비교 듣기 (내 음성 + 원문)
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              (마이크 채점 시 내 실제 음성도 함께 자동 저장됩니다)
                            </span>
                          )}

                          <button
                            onClick={() => playMainRoundTTS(mainStepRound)}
                            disabled={!currentText || mainStepRound === 5}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all flex items-center gap-1.5 text-xs cursor-pointer border border-amber-200/60 dark:border-amber-900/40 shadow-xs"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            🔊 원어민 가이드음
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <button
              onClick={onAddToBag}
              disabled={!currentText}
              className="w-full h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:bg-slate-850 dark:hover:bg-slate-200 transition-all flex items-center justify-center gap-2 select-none text-sm cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              이 지문 주말 필사 가방에 보관하기
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 3. Pattern Learning Drills (패턴 학습) + Next Sentence Action */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* CARD 3: Pattern Practice Drills Panel (패턴 학습) */}
          {currentText && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent-gold animate-bounce" />
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    🧩 핵심 구조 패턴 & 단어 반복 학습 훈련실
                  </h3>
                </div>
                {drillSource && (
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border shadow-2xs ${
                    drillSource.includes("Gemini") || drillSource.includes("AI")
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800"
                  }`}>
                    {drillSource.includes("Gemini") || drillSource.includes("AI") ? (
                      <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                    ) : (
                      <RefreshCw className="w-3 h-3 text-amber-500" />
                    )}
                    <span>엔진: {drillSource}</span>
                  </span>
                )}
              </div>

              {isLoadingDrills ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 text-center leading-relaxed">
                    AI가 원문 문장 구조 및 핵심 단어를 분석하여<br />
                    <strong>5~10가지 반복 학습 드릴</strong>을 실시간 설계하는 중입니다...
                  </p>
                </div>
              ) : drills.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Step Indicators */}
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                    <span>훈련 {currentDrillIdx + 1} / {drills.length} 단계</span>
                    <span className="text-accent-gold">
                      완료 상태: {drillCompleted.filter(Boolean).length} / {drills.length} 클리어
                    </span>
                  </div>
                  
                  {/* Step Dots Progress Bar */}
                  <div className="flex gap-1.5 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    {drills.map((_, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 transition-all duration-300 ${
                          idx === currentDrillIdx
                            ? "bg-accent-gold"
                            : drillCompleted[idx]
                            ? "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Active Drill Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex flex-col gap-3 relative shadow-xs">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        DRILL {currentDrillIdx + 1}
                      </span>
                      <button
                        onClick={() => playDrillTTS(drills[currentDrillIdx].text)}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
                        title="TTS 원어민 발음으로 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-center py-1">
                      <span className="text-[10px] text-accent-gold font-bold bg-accent-gold/10 px-2.5 py-0.5 rounded-full">
                        🔑 구조 패턴: {drills[currentDrillIdx].hint}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">
                        "{drills[currentDrillIdx].translation}"
                      </p>
                    </div>

                    {/* Word Scramble Interactive Area */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-3">
                      <div className="text-[10px] text-slate-400 font-bold text-center">
                        👇 아래 단어들을 올바른 순서대로 클릭하여 영어 문장을 완성하세요! (어순 감각 기르기)
                      </div>

                      {/* User's Assembled Sentence Canvas */}
                      <div className="min-h-[50px] p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-center">
                        {selectedScrambleWords.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">조립된 단어가 이곳에 표시됩니다.</span>
                        ) : (
                          selectedScrambleWords.map((word, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleWordClickFromSelected(word, idx)}
                              className="px-2.5 py-1 bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-700 dark:hover:bg-slate-300 transition-all cursor-pointer flex items-center gap-1"
                            >
                              {word}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Remaining Scramble Pool */}
                      {scrambledPool.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center py-1">
                          {scrambledPool.map((word, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleWordClickFromPool(word, idx)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Result feedback */}
                      {drillCompleted[currentDrillIdx] && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg flex flex-col items-center gap-1 text-center"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            영작에 성공하셨습니다! 정답입니다! 🎉
                          </div>
                          <p className="text-xs font-serif italic font-semibold text-slate-800 dark:text-slate-100">
                            "{drills[currentDrillIdx].text}"
                          </p>
                        </motion.div>
                      )}
                    </div>

                     {/* Speaking Repetition Interactive Area */}
                     <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-3">
                       <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-2">
                         <div className="text-[10px] text-slate-800 dark:text-slate-200 font-extrabold flex items-center gap-1.5">
                           <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
                           🎙️ 패턴 드릴 5단계 체득 스피킹 훈련기
                         </div>
                         {(drillSpeakSuccess[currentDrillIdx] || (drillStepScores[4] !== null && drillStepScores[4]! >= 75)) && (
                           <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded flex items-center gap-1">
                             <CheckCircle2 className="w-3 h-3" /> 완벽 마스터 (75점 이상)
                           </span>
                         )}
                       </div>

                       {/* Drill Round Selection Pills */}
                       <div className="grid grid-cols-5 gap-1.5">
                         {[1, 2, 3, 4, 5].map((r) => {
                           const score = drillStepScores[r - 1];
                           const isActive = drillStepRound === r;
                           return (
                             <button
                               key={r}
                               type="button"
                               onClick={() => setDrillStepRound(r)}
                               className={`py-1.5 rounded-lg text-[10px] font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer border ${
                                 isActive
                                   ? "bg-accent-gold text-white border-accent-gold shadow-xs"
                                   : score !== null
                                   ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-800/40"
                                   : "bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent"
                               }`}
                             >
                               <span className="text-[9px] font-extrabold">Round {r}</span>
                               {score !== null && (
                                 <span className="text-[8px] font-mono mt-0.5 bg-emerald-500 text-white px-1 rounded leading-none">
                                   {score}점
                                 </span>
                               )}
                             </button>
                           );
                         })}
                       </div>

                       {/* Drill Round Guide Card */}
                       <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-150 dark:border-slate-850 text-xs flex flex-col gap-2">
                         <div className="flex justify-between items-center">
                           <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px] sm:text-[11px]">
                             {drillStepRound === 1 && "🐌 R1: 0.7배속 저속 따라하기"}
                             {drillStepRound === 2 && "🚶 R2: 1.0배속 표준속도 싱크 스피킹"}
                             {drillStepRound === 3 && "🌗 R3: 단어 50% 가리기 연상 발성"}
                             {drillStepRound === 4 && "🌘 R4: 단어 90% 가리기 (첫 글자 힌트)"}
                             {drillStepRound === 5 && "🌑 R5: 백지 무시각 완창 회상"}
                           </span>
                           {drillStepRound < 5 && (
                             <button
                               type="button"
                               onClick={() => playDrillRoundTTS(drillStepRound)}
                               className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded text-[9px] flex items-center gap-1 cursor-pointer transition-all"
                             >
                               <Volume2 className="w-2.5 h-2.5" />
                               듣기
                             </button>
                           )}
                         </div>

                         {/* Masked Drill Sentence */}
                         <div className="py-2 bg-white dark:bg-slate-900 rounded border border-slate-150 dark:border-slate-800 text-center px-1.5">
                           <p className="font-serif italic font-semibold text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                             "{getMaskedSentence(drills[currentDrillIdx].text, drillStepRound)}"
                           </p>
                         </div>

                         {/* Speak buttons & Mic */}
                         <div className="mt-0.5">
                           <button
                             type="button"
                             onClick={toggleDrillRoundRecognition}
                             className={`w-full py-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                               isDrillRoundListening
                                 ? "bg-rose-500 text-white animate-pulse"
                                 : "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:opacity-90"
                             }`}
                           >
                             <Mic className="w-3 h-3" />
                             {isDrillRoundListening ? "음성 인식 중... (정지하려면 클릭)" : "마이크 켜고 발음 연습 시작"}
                           </button>
                         </div>

                         {/* Transcript Results */}
                         {drillStepTranscripts[drillStepRound - 1] && (
                           <div className="mt-1.5 p-2 bg-white dark:bg-slate-900 rounded border border-slate-150 dark:border-slate-800 text-[10px] flex flex-col gap-1">
                             <div className="flex justify-between items-center font-bold text-slate-400 text-[9px]">
                               <span>인식 녹취:</span>
                               {drillStepScores[drillStepRound - 1] !== null && (
                                 <span className={`px-1 rounded font-mono ${drillStepScores[drillStepRound - 1]! >= 75 ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"}`}>
                                   일치도: {drillStepScores[drillStepRound - 1]}점
                                 </span>
                               )}
                             </div>
                             <p className="font-mono text-slate-700 dark:text-slate-300 italic">
                               "{drillStepTranscripts[drillStepRound - 1]}"
                             </p>
                           </div>
                         )}
                       </div>
                     </div>

                    {/* Navigation Buttons for Drills */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                      <button
                        onClick={handleSkipOrCheat}
                        className="text-[10px] font-bold text-slate-400 hover:text-accent-gold cursor-pointer"
                      >
                        치트키: 영작 정답 자동 완성
                      </button>

                      <div className="flex gap-2">
                        <button
                          disabled={currentDrillIdx === 0}
                          onClick={() => setCurrentDrillIdx(prev => prev - 1)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                        >
                          이전 단계
                        </button>
                        <button
                          disabled={currentDrillIdx === drills.length - 1 || (!drillCompleted[currentDrillIdx] && !drillSpeakSuccess[currentDrillIdx])}
                          onClick={() => setCurrentDrillIdx(prev => prev + 1)}
                          className="px-4 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-30 cursor-pointer flex items-center gap-1"
                        >
                          다음 단계
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {(drillCompleted.every(Boolean) || drillSpeakSuccess.every(Boolean)) && (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-yellow-500 animate-bounce flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          ⭐ 구조 패턴 반복 트레이닝 완수!
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          핵심 문장 구조의 어순 완성 및 스피킹 반복 연습을 완벽히 정복했습니다. 이 기세를 몰아 다음 지문도 도전해 보세요!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <p className="text-xs text-slate-400 italic">
                    반복 학습 데이터가 준비되지 않았습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const localDrills = generateClientDrills(currentText);
                      if (localDrills && localDrills.length > 0) {
                        setDrills(localDrills);
                        setDrillSource("클라이언트 즉시 생성 드릴");
                        setDrillCompleted(new Array(localDrills.length).fill(false));
                        setDrillSpeakSuccess(new Array(localDrills.length).fill(false));
                        if (localDrills[0] && localDrills[0].scramble) {
                          setScrambledPool([...localDrills[0].scramble]);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-accent-gold text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    클라이언트 드릴 데이터 즉시 생성하기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Learning steps guide */}
          <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl text-[11px] md:text-xs text-slate-500 font-medium border border-slate-100 dark:border-slate-900">
            <div className="flex flex-col items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span>원음 청취</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-l border-slate-200 dark:border-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <span>AI 발음 피드백</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-l border-slate-200 dark:border-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <span>목소리 비교</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-l border-slate-200 dark:border-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">4</span>
              <span>필사 보관</span>
            </div>
          </div>

          {/* Action Button: Next Sentence */}
          <button
            onClick={loadNextSentence}
            disabled={isLoadingSentence}
            className="w-full h-12 rounded-xl bg-accent-gold text-white font-semibold hover:bg-accent-gold-hover transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 select-none text-sm md:text-base cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
            선택 테마에서 다음 대사 탐색 로딩
          </button>
        </div>

      </div>

      {/* SECTION 3: Deep Customizers (Direct Sentence/Quote Dump Area) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <PlusCircle className="w-5 h-5 text-accent-gold" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            ✍️ 취향 드라마·영화·명언·뮤지컬 대사 직접 추가 등록
          </h3>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          인터넷이나 다른 책에서 발견한 나만의 취향 명대사, 역사적 명언, 소중한 한 줄 지문을 등록해 보세요. 즉시 쉐도잉 룸의 학습 풀에 등록되며 바로 화면에 로딩되어 연습할 수 있습니다.
        </p>

        <form onSubmit={handleAddCustomSentence} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="영문 지문을 입력하세요 (예: To love another person is to see the face of God.)"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400"
            />
            <input
              type="text"
              placeholder="작품 출처/인물 이름 (예: Les Misérables / Steve Jobs)"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-accent-gold text-white text-xs font-bold hover:bg-accent-gold-hover transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            나만의 취향 대사/명언 등록 및 즉시 로딩
          </button>
        </form>
      </div>

    </div>
  );
}
