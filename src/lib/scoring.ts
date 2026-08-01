/**
 * Calculates the Longest Common Subsequence (LCS) similarity score (0-100)
 * between a target English sentence and user speech transcript.
 */
export function calculateLCSScore(target: string, userText: string): number {
  if (!target || !userText) return 0;

  const tokenize = (s: string) => 
    s.toLowerCase()
     .replace(/[^a-z0-9\s]/g, "")
     .split(/\s+/)
     .filter(Boolean);

  const a1 = tokenize(target);
  const a2 = tokenize(userText);

  if (a1.length === 0) return 0;

  const n = a1.length;
  const m = a2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a1[i - 1] === a2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[n][m];
  return Math.round((lcsLength / n) * 100);
}
