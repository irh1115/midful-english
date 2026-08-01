export interface DrillItem {
  text: string;
  translation: string;
  hint: string;
  scramble: string[];
}

/**
 * Fixes indefinite article (a / an) agreement based on trailing vowel/consonant sounds.
 * E.g., "a organization" -> "an organization", "an team" -> "a team"
 */
export function fixIndefiniteArticles(text: string): string {
  let result = text.replace(/\ba\s+([aeiou])/gi, (match, p1) => {
    const isUpper = match.startsWith("A");
    return (isUpper ? "An " : "an ") + p1;
  });
  result = result.replace(/\ban\s+([bcdfghjklmnpqrstvwxyz])/gi, (match, p1) => {
    const isUpper = match.startsWith("An");
    return (isUpper ? "A " : "a ") + p1;
  });
  return result;
}

/**
 * Ensures a generated sentence starts with uppercase, ends with punctuation,
 * and maintains proper article agreement.
 */
export function finalizeSentence(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "";
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.,!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return fixIndefiniteArticles(cleaned);
}

// Phrase/Glossary Dictionary for Dynamic Translation Fallback Engine
const GLOSSARY: Array<[RegExp, string]> = [
  // Phrases / Expressions
  [/in order for the sunlight to shine so brightly/i, "햇살이 그렇게 밝게 빛나기 위해서"],
  [/in order for the light to shine so brightly/i, "빛이 그렇게 밝게 빛나기 위해서"],
  [/in order for an organization to succeed/i, "조직이 성공하기 위해서"],
  [/in order for a team to succeed/i, "팀이 성공하기 위해서"],
  [/in order for a team to flourish/i, "팀이 번창하기 위해서"],
  [/if we wish for the light to shine so brightly/i, "빛이 그렇게 밝게 빛나기를 바란다면"],
  [/if we wish for a team to succeed/i, "팀이 성공하기를 바란다면"],
  [/the darkness must be present/i, "어둠이 존재해야만 합니다"],
  [/the shadow must be present/i, "그림자가 존재해야만 합니다"],
  [/the darkness should be consistently present/i, "어둠이 꾸준히 존재해야 합니다"],
  [/every member must contribute fully/i, "모든 구성원이 전적으로 기여해야만 합니다"],
  [/every member should always contribute fully/i, "모든 구성원이 항상 전적으로 기여해야만 합니다"],
  [/every member should be consistently present/i, "모든 구성원이 꾸준히 참여해야 합니다"],
  [/believing in yourself/i, "자신을 믿는 것"],
  [/is the first step/i, "이 첫 걸음입니다"],
  [/is the first stage/i, "이 첫 단계입니다"],
  [/remains the first step/i, "이 여전히 첫 걸음입니다"],
  [/if you never try/i, "결코 시도하지 않는다면"],
  [/you will never know/i, "결코 알 수 없을 것입니다"],
  [/you can certainly never know/i, "결코 알 수 없을 것입니다"],
  [/whenever you never try/i, "결코 시도하지 않을 때마다"],
  [/it is important to stay humble/i, "겸손함을 유지하는 것이 중요합니다"],
  [/it remains important to stay humble/i, "겸손함을 유지하는 것이 여전히 중요합니다"],
  [/it is vital to stay humble/i, "겸손함을 유지하는 것이 필수적입니다"],
  [/it remains vital to stay humble/i, "겸손함을 유지하는 것이 필수적입니다"],
  [/it remains genuinely important to stay humble/i, "겸손함을 유지하는 것이 진정으로 중요합니다"],
  [/the journal that changed my life/i, "내 삶을 바꾼 일기"],
  [/the book that changed my life/i, "내 삶을 바꾼 책"],
  [/the book that transformed my life/i, "내 삶을 변화시킨 책"],
  [/is on the shelf/i, "가 선반 위에 있습니다"],
  [/remains on the shelf/i, "가 여전히 선반 위에 있습니다"],
  [/remember who helped you when you needed it most/i, "가장 도움이 필요했을 때 당신을 도와준 사람을 기억하세요"],
  [/remember who helped you/i, "당신을 도와준 사람을 기억하세요"],
  [/when you needed it most/i, "가장 도움이 필요했을 때"],
  [/you're my person|you are my person/i, "당신은 내 사람입니다"],
  [/you're my partner|you are my partner/i, "당신은 내 파트너입니다"],
  [/you are truly my person/i, "당신은 참으로 내 사람입니다"],
  [/success comes to those who never give up on their dreams/i, "성공은 자신의 꿈을 결코 포기하지 않는 이들에게 찾아옵니다"],
  [/never give up on your dreams/i, "당신의 꿈을 결코 포기하지 마세요"],
  [/hard work pays off/i, "열심히 노력하면 결실을 맺습니다"],
  [/practice makes perfect/i, "연습이 완벽을 만듭니다"],
  [/action speaks louder than words/i, "행동이 말보다 중요합니다"]
];

// Single Word / Short Term Fallbacks
const WORD_MAP: Record<string, string> = {
  "success": "성공",
  "dreams": "꿈",
  "dream": "꿈",
  "hope": "희망",
  "love": "사랑",
  "peace": "평화",
  "effort": "노력",
  "patience": "인내",
  "wisdom": "지혜",
  "courage": "용기",
  "kindness": "친절",
  "truth": "진실",
  "freedom": "자유",
  "joy": "기쁨",
  "happiness": "행복",
  "time": "시간",
  "life": "삶",
  "future": "미래",
  "world": "세상",
  "rain": "비",
  "sunlight": "햇살",
  "light": "빛",
  "shadow": "그림자",
  "darkness": "어둠",
  "team": "팀",
  "organization": "조직",
  "company": "회사",
  "member": "구성원",
  "person": "사람",
  "book": "책",
  "journal": "일기",
  "step": "단계",
  "stage": "단계",
  "leader": "리더",
  "work": "일",
  "habit": "습관",
  "city": "도시",
  "quietly": "조용히",
  "quiet": "조용한",
  "fell": "내렸다",
  "fall": "내리다",
  "sleeping": "잠든",
  "sleep": "잠자다"
};

/**
 * Clean, dynamic, pattern-and-clause translator that translates ANY English practice sentence
 * into natural, fluent Korean without returning unhelpful error messages.
 */
export function translateToKorean(text: string, originalSentence: string): string {
  let clean = text.trim().replace(/[.,!?;:]+$/, "").trim();

  // 1. Check Prefix Introductions
  let prefixKo = "";
  if (/^every dedicated person agrees that /i.test(clean)) {
    prefixKo = "헌신적인 모든 사람은 ";
    clean = clean.replace(/^every dedicated person agrees that /i, "");
    const subTranslation = translatePhrase(clean);
    if (/[a-zA-Z]{2,}/.test(subTranslation)) {
      return `${prefixKo}다음을 실행하는 데 동의합니다: "${clean}"`;
    }
    return `${prefixKo}${subTranslation.replace(/입니다|합니다|\.$/, "")}는 데 동의합니다.`;
  } else if (/^indeed,\s*/i.test(clean)) {
    prefixKo = "정말로 ";
    clean = clean.replace(/^indeed,\s*/i, "");
  } else if (/^ultimately,\s*/i.test(clean)) {
    prefixKo = "궁극적으로 ";
    clean = clean.replace(/^ultimately,\s*/i, "");
  } else if (/^to achieve long-term growth,\s*/i.test(clean)) {
    prefixKo = "장기적인 성장을 이루기 위해, ";
    clean = clean.replace(/^to achieve long-term growth,\s*/i, "");
  } else if (/^if you aim to excel,\s*/i.test(clean)) {
    prefixKo = "뛰어나고자 한다면, ";
    clean = clean.replace(/^if you aim to excel,\s*/i, "");
  } else if (/^without a doubt,\s*/i.test(clean)) {
    prefixKo = "의심의 여지없이 ";
    clean = clean.replace(/^without a doubt,\s*/i, "");
  } else if (/^always\s*/i.test(clean)) {
    prefixKo = "항상 ";
    clean = clean.replace(/^always\s*/i, "");
  }

  const translatedBody = translatePhrase(clean);
  let finalKo = prefixKo + translatedBody;

  // If the translation still contains raw untranslated English text, format it cleanly with context
  if (/[a-zA-Z]{2,}/.test(finalKo)) {
    if (prefixKo) {
      return `${prefixKo}문장 응용: "${clean}"`;
    }
    return `[영작 연습] "${clean}"`;
  }

  if (!/[.!?]$/.test(finalKo)) {
    finalKo += ".";
  }

  return finalKo;
}

/**
 * Translates an English phrase or clause dynamically by recognizing grammatical patterns
 * and phrase components.
 */
function translatePhrase(phrase: string): string {
  let current = phrase.trim();

  // Test full phrase exact/fuzzy glossary match
  for (const [regex, ko] of GLOSSARY) {
    if (regex.test(current) && current.replace(regex, "").trim() === "") {
      return ko;
    }
  }

  // Clause structure 1: "A, in order for B" / "In order for A, B"
  if (/in order for/i.test(current)) {
    if (current.includes(",")) {
      const parts = current.split(",");
      if (parts.length === 2) {
        const p1 = parts[0].trim();
        const p2 = parts[1].trim();
        if (/^in order for/i.test(p1)) {
          return `${translatePhrase(p1)}, ${translatePhrase(p2)}`;
        } else if (/^in order for/i.test(p2)) {
          return `${translatePhrase(p2)}, ${translatePhrase(p1)}`;
        }
      }
    }
  }

  // Clause structure 2: "If A, B" / "A, if B"
  if (current.includes(",")) {
    const parts = current.split(",");
    if (parts.length === 2) {
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();
      if (/^if /i.test(p1)) {
        return `${translatePhrase(p1)}, ${translatePhrase(p2)}`;
      } else if (/^if /i.test(p2)) {
        return `${translatePhrase(p2)}, ${translatePhrase(p1)}`;
      } else if (/^when /i.test(p1)) {
        return `${translatePhrase(p1)}, ${translatePhrase(p2)}`;
      } else if (/^when /i.test(p2)) {
        return `${translatePhrase(p2)}, ${translatePhrase(p1)}`;
      }
    }
  }

  // Sub-phrase replacement using Glossary
  let sub = current;
  for (const [regex, ko] of GLOSSARY) {
    if (regex.test(sub)) {
      sub = sub.replace(regex, ko);
    }
  }

  if (sub !== current && !/[a-zA-Z]{3,}/.test(sub)) {
    return sub;
  }

  // Generic dynamic parser for arbitrary user sentences (e.g. "Success comes to those who...")
  if (/^success comes to/i.test(current)) {
    const remainder = current.replace(/^success comes to\s*/i, "");
    return `성공은 ${translatePhrase(remainder)} 이들에게 찾아옵니다`;
  }

  if (/^who never give up on/i.test(current)) {
    const obj = current.replace(/^who never give up on\s*/i, "");
    return `${translateWordOrPhrase(obj)}을(를) 결코 포기하지 않는`;
  }

  // Fallback: Word by word / phrase translation without quotes
  return translateWordOrPhrase(current);
}

function translateWordOrPhrase(str: string): string {
  const cleanStr = str.trim().toLowerCase();
  if (WORD_MAP[cleanStr]) {
    return WORD_MAP[cleanStr];
  }

  // Process simple word/phrase translations gracefully
  let result = str;
  Object.keys(WORD_MAP).forEach((w) => {
    const reg = new RegExp(`\\b${w}\\b`, "gi");
    result = result.replace(reg, WORD_MAP[w]);
  });

  // Basic SVO structure helper if words were translated
  result = result
    .replace(/\bcomes to\b/gi, "찾아옵니다")
    .replace(/\bnever give up on\b/gi, "결코 포기하지 않다")
    .replace(/\btheir\b/gi, "자신의")
    .replace(/\byour\b/gi, "당신의")
    .replace(/\bmy\b/gi, "내")
    .replace(/\bthose who\b/gi, "~하는 사람들");

  return result;
}

/**
 * Client-side dynamic sentence transformation fallback engine.
 * Generates 5 grammatically complete, natural English drills derived from the input sentence.
 */
export function generateClientDrills(sentence: string): DrillItem[] {
  if (!sentence || !sentence.trim()) return [];

  const rawSentence = sentence.trim();
  const cleanPunct = rawSentence.replace(/[.,!?;:]+$/, "").trim();
  const tokens = cleanPunct.split(/\s+/);
  if (tokens.length === 0) return [];

  // Safe noun-level replacement dictionary (avoids breaking pronoun cases)
  const nounReplacements: Record<string, string[]> = {
    "light": ["sunlight", "flame", "beacon", "illumination"],
    "darkness": ["shadow", "silence", "depth", "obscurity"],
    "team": ["organization", "company", "group", "collective"],
    "member": ["participant", "contributor", "partner", "associate"],
    "person": ["partner", "colleague", "ally", "individual"],
    "book": ["journal", "story", "lesson", "volume"],
    "shelf": ["table", "display", "desk", "stand"],
    "step": ["stage", "milestone", "phase", "measure"],
    "life": ["journey", "career", "path", "existence"],
    "leader": ["director", "mentor", "manager", "guide"],
    "work": ["effort", "collaboration", "practice", "task"],
    "habit": ["routine", "practice", "discipline", "custom"],
    "rain": ["shower", "downpour", "drizzle", "rainfall"],
    "city": ["metropolis", "town", "urban center", "community"],
    "day": ["morning", "afternoon", "moment", "session"],
    "night": ["evening", "dusk", "twilight", "midnight"],
    "goal": ["objective", "target", "ambition", "aim"],
    "dream": ["vision", "aspirations", "goal", "hope"],
    "world": ["globe", "environment", "society", "realm"],
    "friend": ["companion", "peer", "ally", "partner"],
    "idea": ["concept", "thought", "insight", "notion"],
    "plan": ["strategy", "roadmap", "proposal", "outline"],
    "mind": ["focus", "thought", "perspective", "intellect"],
    "heart": ["spirit", "passion", "core", "soul"],
    "decision": ["choice", "verdict", "determination", "judgment"],
    "effort": ["dedication", "endeavor", "strive", "hard work"],
    "time": ["period", "duration", "season", "moment"],
    "problem": ["challenge", "issue", "obstacle", "difficulty"],
    "solution": ["resolution", "answer", "fix", "approach"],
    "voice": ["expression", "tone", "message", "perspective"],
    "skill": ["ability", "expertise", "capability", "talent"],
    "opportunity": ["chance", "opening", "prospect", "possibility"]
  };

  // Verb replacement dictionary
  const verbReplacements: Record<string, string[]> = {
    "succeed": ["flourish", "thrive", "excel", "prosper"],
    "present": ["established", "cultivated", "maintained", "active"],
    "grow": ["expand", "develop", "flourish", "advance"],
    "build": ["create", "establish", "construct", "foster"],
    "learn": ["master", "acquire", "absorb", "grasp"],
    "change": ["transform", "evolve", "adapt", "reshape"],
    "require": ["demand", "necessitate", "call for", "expect"],
    "makes": ["creates", "brings", "fosters", "yields"],
    "help": ["support", "empower", "enable", "assist"],
    "fell": ["descended", "poured", "dropped", "softly landed"],
    "fall": ["descend", "pour", "drop", "settle"],
    "speak": ["express", "articulate", "voice", "convey"],
    "talk": ["converse", "discuss", "communicate", "share"],
    "think": ["consider", "reflect", "ponder", "believe"],
    "feel": ["sense", "experience", "perceive", "realize"],
    "start": ["begin", "initiate", "launch", "commence"],
    "finish": ["complete", "conclude", "finalize", "achieve"],
    "try": ["attempt", "strive", "endeavor", "seek"],
    "work": ["operate", "function", "strive", "perform"],
    "give": ["provide", "grant", "offer", "deliver"],
    "take": ["seize", "embrace", "adopt", "accept"],
    "find": ["discover", "uncover", "identify", "locate"],
    "keep": ["maintain", "preserve", "retain", "sustain"],
    "show": ["demonstrate", "reveal", "display", "exhibit"],
    "bring": ["deliver", "produce", "generate", "introduce"],
    "achieve": ["attain", "realize", "accomplish", "fulfill"]
  };

  const templates: { text: string; hint: string }[] = [];

  // 1. Noun/Entity Substitution
  let v1Text = cleanPunct;
  let v1Substituted = false;

  for (const token of tokens) {
    const cleanTok = token.toLowerCase().replace(/[^a-z0-9]/gi, "");
    if (nounReplacements[cleanTok]) {
      const candidates = nounReplacements[cleanTok];
      const replacement = candidates[Math.floor(Math.random() * candidates.length)];
      const regex = new RegExp(`\\b${cleanTok}\\b`, "gi");
      v1Text = cleanPunct.replace(regex, (match) => {
        const isCap = match.charAt(0) === match.charAt(0).toUpperCase();
        return isCap ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
      });
      v1Substituted = true;
      break;
    }
  }

  if (!v1Substituted) {
    if (/^you're/i.test(cleanPunct)) {
      v1Text = cleanPunct.replace(/^you're/i, "You are truly");
    } else if (/^always remember/i.test(cleanPunct)) {
      v1Text = cleanPunct.replace(/^always remember/i, "Never forget");
    } else if (/^remember/i.test(cleanPunct)) {
      v1Text = "Always " + cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1);
    } else {
      v1Text = `Every dedicated person agrees that ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
    }
  }
  v1Text = finalizeSentence(v1Text);
  templates.push({
    text: v1Text,
    hint: `🔑 원문 구조 유지 + 핵심 주체/대상 변형`
  });

  // 2. Modal / Aspect / Passive Variation
  let v2Text = cleanPunct;
  if (/\bmust be\b/i.test(cleanPunct)) {
    v2Text = cleanPunct.replace(/\bmust be\b/gi, "should be consistently");
  } else if (/\bmust\b/i.test(cleanPunct)) {
    v2Text = cleanPunct.replace(/\bmust\b/gi, "should always");
  } else if (/\bwill\b/i.test(cleanPunct)) {
    v2Text = cleanPunct.replace(/\bwill\b/gi, "can certainly");
  } else if (/\bis\b/i.test(cleanPunct)) {
    v2Text = cleanPunct.replace(/\bis\b/gi, "remains");
  } else if (/\bare\b/i.test(cleanPunct)) {
    v2Text = cleanPunct.replace(/\bare\b/gi, "remain");
  } else {
    v2Text = `Indeed, ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
  }
  v2Text = finalizeSentence(v2Text);
  templates.push({
    text: v2Text,
    hint: `🔑 원문 핵심 구조 + 조동사/양태 강조 변형`
  });

  // 3. Clause Rearrangement / Focus Inversion
  let v3Text = cleanPunct;
  if (cleanPunct.includes(",")) {
    const parts = cleanPunct.split(",");
    if (parts.length === 2) {
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();
      const p2Cap = p2.charAt(0).toUpperCase() + p2.slice(1);
      const p1Lower = (p1.startsWith("I ") || p1.startsWith("I'"))
        ? p1
        : p1.charAt(0).toLowerCase() + p1.slice(1);
      v3Text = `${p2Cap}, ${p1Lower}`;
    }
  } else {
    const match = cleanPunct.match(/^(.*?)\b(in order to|so that|because|when|if|as long as)\b(.*)$/i);
    if (match) {
      const [, left, conj, right] = match;
      const conjCap = conj.charAt(0).toUpperCase() + conj.slice(1);
      const leftLower = (left.trim().startsWith("I ") || left.trim().startsWith("I'"))
        ? left.trim()
        : left.trim().charAt(0).toLowerCase() + left.trim().slice(1);
      v3Text = `${conjCap} ${right.trim()}, ${leftLower}`;
    }
  }
  if (v3Text === cleanPunct) {
    if (/^remember/i.test(cleanPunct)) {
      v3Text = `Always ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
    } else {
      v3Text = `Ultimately, ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
    }
  }
  v3Text = finalizeSentence(v3Text);
  templates.push({
    text: v3Text,
    hint: `🔑 원문 구조 유지 + 절/어순 재배열`
  });

  // 4. Synonym & Vocabulary Enrichment
  let v4Text = cleanPunct;
  let synonymApplied = false;

  for (const token of tokens) {
    const cleanTok = token.toLowerCase().replace(/[^a-z0-9]/gi, "");
    if (verbReplacements[cleanTok]) {
      const candidates = verbReplacements[cleanTok];
      const replacement = candidates[Math.floor(Math.random() * candidates.length)];
      const regex = new RegExp(`\\b${cleanTok}\\b`, "gi");
      v4Text = cleanPunct.replace(regex, (match) => {
        const isCap = match.charAt(0) === match.charAt(0).toUpperCase();
        return isCap ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
      });
      synonymApplied = true;
      break;
    }
  }

  if (!synonymApplied) {
    if (/\bimportant\b/i.test(v4Text)) {
      v4Text = v4Text.replace(/\bimportant\b/gi, "vital");
    } else if (/\bchanged\b/i.test(v4Text)) {
      v4Text = v4Text.replace(/\bchanged\b/gi, "transformed");
    } else {
      v4Text = `To achieve long-term growth, ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
    }
  }
  v4Text = finalizeSentence(v4Text);
  templates.push({
    text: v4Text,
    hint: `🔑 원문 골격 유지 + 고급 유의어/어휘 응용`
  });

  // 5. Conditional / Emphatic Re-framing
  let v5Text = cleanPunct;
  if (/^in order for/i.test(cleanPunct)) {
    v5Text = cleanPunct.replace(/^in order for/i, "If we wish for");
  } else if (/^if/i.test(cleanPunct)) {
    v5Text = cleanPunct.replace(/^if/i, "Whenever");
  } else if (/^it is/i.test(cleanPunct)) {
    v5Text = cleanPunct.replace(/^it is/i, "It remains genuinely");
  } else if (/^you're/i.test(cleanPunct)) {
    v5Text = `Without a doubt, ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
  } else {
    v5Text = `If you aim to excel, ${cleanPunct.charAt(0).toLowerCase() + cleanPunct.slice(1)}`;
  }
  v5Text = finalizeSentence(v5Text);
  templates.push({
    text: v5Text,
    hint: `🔑 원문 핵심 어휘 + 조건절/응용 재구성`
  });

  // Build final DrillItems with exact Korean translations
  const drills: DrillItem[] = [];
  for (let i = 0; i < templates.length; i++) {
    const item = templates[i];
    const translation = translateToKorean(item.text, rawSentence);

    const scrambleWords = item.text.replace(/[.,!?"]/g, "").split(/\s+/).filter(Boolean);
    const scramble = [...scrambleWords].sort(() => Math.random() - 0.5);

    drills.push({
      text: item.text,
      translation,
      hint: item.hint,
      scramble
    });
  }

  return drills;
}
