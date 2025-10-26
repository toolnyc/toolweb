import type { SentimentResult } from './types';

const POSITIVE_KEYWORDS = [
  'excited', 'love', 'great', 'amazing', 'help', 'need', 'interested', 'want', 
  'looking forward', 'perfect', 'excellent', 'fantastic', 'wonderful', 'awesome',
  'brilliant', 'outstanding', 'superb', 'incredible', 'fabulous', 'terrific',
  'thrilled', 'delighted', 'pleased', 'satisfied', 'happy', 'glad', 'eager',
  'enthusiastic', 'optimistic', 'hopeful', 'confident', 'sure', 'definitely',
  'absolutely', 'certainly', 'definitely', 'yes', 'sounds good', 'perfect',
  'exactly', 'precisely', 'spot on', 'right on', 'correct', 'accurate'
];

const NEGATIVE_KEYWORDS = [
  'problem', 'issue', 'frustrated', 'difficult', 'struggling', 'concerned', 
  'worried', 'bad', 'terrible', 'awful', 'horrible', 'disappointed', 'upset',
  'angry', 'mad', 'annoyed', 'irritated', 'bothered', 'troubled', 'stressed',
  'anxious', 'nervous', 'scared', 'afraid', 'worried', 'concerned', 'doubtful',
  'skeptical', 'suspicious', 'hesitant', 'reluctant', 'unwilling', 'refuse',
  'reject', 'deny', 'disagree', 'dislike', 'hate', 'despise', 'loathe',
  'impossible', 'can\'t', 'cannot', 'won\'t', 'will not', 'never', 'no way'
];

export function analyzeSentiment(transcript: string): SentimentResult {
  // Handle edge cases
  if (!transcript || transcript.trim().length === 0) {
    return {
      sentiment: 'neutral',
      score: 0,
      keywords: []
    };
  }

  const words = transcript.toLowerCase().split(/\s+/);
  
  // Handle very short transcripts
  if (words.length < 5) {
    return {
      sentiment: 'neutral',
      score: 0,
      keywords: []
    };
  }

  let positiveCount = 0;
  let negativeCount = 0;
  const matchedKeywords: string[] = [];

  // Count positive keywords
  for (const keyword of POSITIVE_KEYWORDS) {
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    if (keywordWords.length === 1) {
      // Single word keyword
      if (words.includes(keywordWords[0])) {
        positiveCount++;
        matchedKeywords.push(keyword);
      }
    } else {
      // Multi-word keyword
      const keywordRegex = new RegExp(keywordWords.join('\\s+'), 'i');
      if (keywordRegex.test(transcript.toLowerCase())) {
        positiveCount++;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Count negative keywords
  for (const keyword of NEGATIVE_KEYWORDS) {
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    if (keywordWords.length === 1) {
      // Single word keyword
      if (words.includes(keywordWords[0])) {
        negativeCount++;
        matchedKeywords.push(keyword);
      }
    } else {
      // Multi-word keyword
      const keywordRegex = new RegExp(keywordWords.join('\\s+'), 'i');
      if (keywordRegex.test(transcript.toLowerCase())) {
        negativeCount++;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Calculate score
  const totalWords = words.length;
  const score = (positiveCount - negativeCount) / totalWords;

  // Determine sentiment
  let sentiment: 'positive' | 'neutral' | 'negative';
  if (score > 0.1) {
    sentiment = 'positive';
  } else if (score < -0.1) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  return {
    sentiment,
    score,
    keywords: matchedKeywords
  };
}
