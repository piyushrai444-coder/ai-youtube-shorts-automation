export interface ResearchResult {
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt?: Date;
  summary: string;
  category: string;
  score?: number;
  contentHash: string;
}

export interface ResearchProvider {
  name: string;
  search(query?: string, category?: string): Promise<ResearchResult[]>;
}

export type ContentFormat =
  | 'TOOL_DISCOVERY'
  | 'DEMONSTRATION'
  | 'PROBLEM_SOLUTION'
  | 'COMPARISON'
  | 'HIDDEN_FEATURE'
  | 'BEFORE_AFTER'
  | 'AI_NEWS'
  | 'CHALLENGE';

export type HookStyle =
  | 'CURIOSITY_GAP'
  | 'CONTRARIAN'
  | 'RESULT_FIRST'
  | 'PROBLEM_AGITATION'
  | 'RELATABLE_FRUSTRATION';

export type PerformanceClass =
  | 'TOP_PERFORMER'
  | 'ABOVE_AVERAGE'
  | 'AVERAGE'
  | 'BELOW_AVERAGE'
  | 'POOR';

export interface TopicScoreBreakdown {
  freshnessScore: number;
  trendScore: number;
  usefulnessScore: number;
  visualScore: number;
  demoScore: number;
  competitionPenalty: number;
  finalScore: number;
  company?: string;
  sourceCount: number;
}

export interface ScoredTopic extends ResearchResult, TopicScoreBreakdown {
  id?: string;
}

export interface HookVariantItem {
  hookText: string;
  patternType: string;
  clarityScore: number;
  curiosityScore: number;
  specificityScore: number;
  valueScore: number;
  totalScore: number;
  selected?: boolean;
}

export interface StrategyDecision {
  format: ContentFormat;
  hookStyle: HookStyle;
  targetAudienceAngle: string;
  experimentId?: string;
  rationale: string;
  visualTheme: 'PRODUCT_DEMO' | 'CYBERPUNK_HUD' | 'SPLIT_COMPARISON' | 'MINIMAL_TECH';
}

export interface ScriptInput {
  topicTitle: string;
  summary: string;
  sourceUrl: string;
  source: string;
  category: string;
  format?: ContentFormat;
  hookStyle?: HookStyle;
  targetDurationSeconds?: number;
  channelName?: string;
  defaultCta?: string;
  selectedHook?: string;
  strategyRationale?: string;
}

export interface GeneratedScript {
  title: string;
  hook: string;
  explanation: string;
  benefit: string;
  cta: string;
  fullScript: string;
  estimatedDurationSeconds: number;
  wordCount: number;
  tags: string[];
  description: string;
  category: string;
  format?: ContentFormat;
  hookStyle?: HookStyle;
  qualityScore?: number;
  viralityScore?: number;
}

export interface LLMProvider {
  name: string;
  generateScript(input: ScriptInput): Promise<GeneratedScript>;
  selectBestTopic(topics: ResearchResult[]): Promise<ResearchResult>;
}

export interface AudioResult {
  audioBuffer: Buffer;
  durationSeconds: number;
  format: 'mp3' | 'wav';
}

export interface TTSProvider {
  name: string;
  generateSpeech(text: string, voice?: string): Promise<AudioResult>;
}

export interface VisualScene {
  index: number;
  type: 'hook' | 'explanation' | 'benefit' | 'cta';
  headline: string;
  bodyText: string;
  bulletPoints?: string[];
  toolName?: string;
  category?: string;
  durationSeconds: number;
}

export interface VisualResult {
  sceneIndex: number;
  imageBuffer: Buffer;
  durationSeconds: number;
}

export interface VisualProvider {
  name: string;
  generateVisuals(scenes: VisualScene[]): Promise<VisualResult[]>;
}

export interface SubtitleItem {
  index: number;
  startTime: string; // "00:00:01,200"
  endTime: string;   // "00:00:03,500"
  text: string;
  rawStartSec: number;
  rawEndSec: number;
}

export interface StoredFile {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  name: string;
  upload(file: Buffer, key: string, mimeType: string): Promise<StoredFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

export interface YouTubeUploadInput {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  categoryId?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
  status: string;
}

export interface ChannelInfo {
  id: string;
  title: string;
  description?: string;
  customUrl?: string;
  thumbnail?: string;
}

export interface ValidationResult {
  isValid: boolean;
  width?: number;
  height?: number;
  duration?: number;
  videoCodec?: string;
  audioCodec?: string;
  aspectRatio?: string;
  error?: string;
}

export interface VideoAnalyticsMetric {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  viewedVsSwiped?: number;
  avgViewDuration?: number;
  avgPercentageViewed?: number;
  estimatedRetentionRate?: number;
  rawAnalytics?: any;
}

export interface LearningInsightData {
  category: 'FORMAT' | 'HOOK' | 'TOPIC_CATEGORY' | 'PACING' | 'RETENTION';
  title: string;
  description: string;
  metric: string;
  impactScore: number;
  sampleSize: number;
  confidence: 'OBSERVATION' | 'HYPOTHESIS' | 'STRONG_PATTERN';
  actionableRule?: string;
}

// ============================================================================
// CARTOON FACTORY TYPES & INTERFACES
// ============================================================================

export type ContentMode = 'AI_TOOLS' | 'CARTOON' | 'HYBRID';

export type StoryFormat =
  | 'FUNNY_MISUNDERSTANDING'
  | 'UNEXPECTED_ENDING'
  | 'EMOTIONAL_RESCUE'
  | 'MINI_ADVENTURE'
  | 'PROBLEM_SOLVER'
  | 'CLEVER_UNDERDOG'
  | 'WHOLESOME_FRIENDSHIP'
  | 'WAIT_TILL_END'
  | 'DAILY_COMEDY';

export type StoryAudience = 'FAMILY' | 'KIDS_AND_PARENTS' | 'GENERAL_ANIMATION' | 'YOUNG_ADULTS';

export type StoryGenre = 'COMEDY' | 'ADVENTURE' | 'HEARTWARMING' | 'SUSPENSE_TWIST' | 'MORAL';

export interface CharacterProfile {
  id?: string;
  name: string;
  species: string;
  personality: string;
  visualStyle: string;
  signatureItem: string;
  colorPalette: string;
  catchphrase?: string;
  voicePersona: string;
  archetype?: string;
  appearanceCount?: number;
  avgRetentionRate?: number;
  isActive?: boolean;
}

export interface StoryScoreBreakdown {
  hookPower: number;          // 0-10: How compelling is the 0-2s visual/verbal hook?
  curiosityDrive: number;     // 0-10: Does it create an irresistible curiosity gap?
  emotionalArc: number;       // 0-10: Clear emotional progression (happy, shock, relief)?
  visualPotential: number;    // 0-10: Can this be visually dynamic and expressive?
  humorSurprise: number;      // 0-10: Punchline/twist strength?
  originalityScore: number;   // 0-10: 100% original, zero IP infringement risk?
  endingSatisfaction: number; // 0-10: Does the payoff satisfy the setup?
  replayabilityScore: number; // 0-10: Does the ending loop naturally into the hook?
  finalScore: number;         // Weighted aggregate 0-100
  rationale: string;
}

export interface StoryIdeaInput {
  title: string;
  concept: string;
  format: StoryFormat;
  genre: StoryGenre;
  audience: StoryAudience;
  suggestedCharacters: string[];
  hookSceneDescription: string;
  twistOrPayoff: string;
  moralLesson?: string;
}

export interface ScoredStoryIdea extends StoryIdeaInput {
  id?: string;
  scores: StoryScoreBreakdown;
  selected?: boolean;
}

export interface StoryboardSceneItem {
  sceneNumber: number;
  title: string;
  visualPrompt: string;
  characterName: string;
  dialogue: string;
  action: string;
  emotion: string;
  cameraAngle: 'WIDE' | 'CLOSE_UP' | 'OVER_SHOULDER' | 'DUTCH_ANGLE' | 'TOP_DOWN' | 'ZOOM_IN';
  sfxCue?: string;
  bgmState?: 'UPBEAT' | 'SUSPENSE' | 'FUNNY' | 'TRIUMPHANT' | 'WARM';
  durationSeconds: number;
}

export interface CartoonScript {
  title: string;
  logline: string;
  format: StoryFormat;
  genre: StoryGenre;
  targetDurationSeconds: number; // 30 - 45s
  characters: CharacterProfile[];
  scenes: StoryboardSceneItem[];
  moralLesson?: string;
  loopTransition: string; // How the last second flows back into scene 1
  totalEstimatedDuration: number;
  wordCount: number;
  tags: string[];
  description: string;
}

export interface CartoonQualityCheckResult {
  passed: boolean;
  durationSeconds: number;
  minDuration: number; // 30
  maxDuration: number; // 45
  targetDuration: number; // 38
  characterConsistencyScore: number; // 0 - 100
  audioSyncValid: boolean;
  captionsValid: boolean;
  originalityVerified: boolean;
  issues: string[];
  warnings: string[];
}


