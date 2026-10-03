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
  madeForKids?: boolean;
  contentMode?: string;
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

// ============================================================================
// NURSERY RHYMES & KIDS SONGS FACTORY TYPES
// ============================================================================

export type NurseryContentMode =
  | 'NURSERY_RHYME'
  | 'ACTION_SONG'
  | 'LEARNING_SONG'
  | 'COUNTING_SONG'
  | 'ABC_SONG'
  | 'ANIMAL_SONG'
  | 'BEDTIME_SONG'
  | 'GOOD_HABITS_SONG'
  | 'DANCE_SONG'
  | 'STORY_SONG'
  | 'SEASONAL_SONG'
  | 'FAMILY_SONG';

export type VideoLengthType = 'SHORT' | 'FULL_SONG' | 'COMPILATION';
export type AspectRatioType = '9:16' | '16:9' | '1:1';
export type PreschoolAgeGroup = '2-3' | '3-5' | '5-6';

export type ChoreographyAction =
  | 'CLAP'
  | 'JUMP'
  | 'HOP'
  | 'SPIN'
  | 'WAVE'
  | 'POINT'
  | 'STOMP'
  | 'MARCH'
  | 'NOD'
  | 'SHAKE'
  | 'TOUCH_HEAD'
  | 'TOUCH_SHOULDERS'
  | 'TOUCH_KNEES'
  | 'BOUNCE'
  | 'SWAY';

export type LipSyncViseme =
  | 'REST'
  | 'A'
  | 'E'
  | 'I'
  | 'O'
  | 'U'
  | 'MBP'
  | 'FV'
  | 'SZ'
  | 'L'
  | 'KG';

export interface LyricSectionItem {
  type: 'intro' | 'verse' | 'chorus' | 'action_break' | 'bridge' | 'outro';
  title?: string;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
  lyrics?: string;
  lines?: string[];
  singer?: string;
  leadCharacter?: string;
  actions?: ChoreographyAction[];
  choreography?: ChoreographyAction[];
  rhymeScheme?: string;
  callAndResponse?: {
    prompt: string;
    audienceResponse: string;
  };
  sfxCue?: string;
  index?: number;
}

export interface StructuredSongLyrics {
  title: string;
  theme: string;
  contentMode?: NurseryContentMode | string;
  targetAge?: PreschoolAgeGroup | string;
  learningObjective?: string;
  bpm: number;
  musicalKey: string;
  musicStyle: string;
  sections: LyricSectionItem[];
  totalDurationSeconds: number;
}

export interface SongIdeaInput {
  title: string;
  theme: string;
  contentMode?: NurseryContentMode | string;
  category?: string;
  targetAge?: PreschoolAgeGroup | string;
  targetAgeGroup?: PreschoolAgeGroup | string;
  learningObjective?: string;
  educationalConcept?: string;
  emotionalTone?: string;
  characters: string[];
  setting?: string;
  environment?: string;
  chorusConcept?: string;
  hookLyric?: string;
  visualConcept?: string;
  danceConcept?: string;
  actionMoves?: ChoreographyAction[];
  replayPotential?: string;
  musicalKey?: string;
  bpm?: number;
  musicStyle?: string;
  targetDurationSeconds?: number;
}

export interface SongScoreBreakdown {
  educationalValue: number;    // 0-10
  singAlongPotential: number;  // 0-10
  memorability: number;        // 0-10
  repetitionPotential: number; // 0-10
  visualPotential: number;     // 0-10
  characterAppeal: number;     // 0-10
  dancePotential: number;      // 0-10
  parentUsefulness: number;    // 0-10
  childParticipation: number;  // 0-10
  originality: number;         // 0-10 (Hard gate: must be >= 8)
  originalityScore?: number;
  earwormHookPotential?: number;
  movementImitationClarity?: number;
  toddlerComprehension?: number;
  trendRelevance?: number;     // 0-10
  replayPotential?: number;    // 0-10
  finalScore: number;          // 0-100
  rationale: string;
}

export interface ScoredSongIdea extends SongIdeaInput {
  id?: string;
  scores?: SongScoreBreakdown;
  scoreBreakdown?: SongScoreBreakdown | any;
  totalScore?: number;
  selected?: boolean;
}

export interface MusicAsset {
  audioBuffer: Buffer;
  durationSeconds: number;
  bpm: number;
  musicalKey: string;
  style: string;
  format: 'mp3' | 'wav';
  licenseInfo: string;
  audioPath?: string;
}

export interface KaraokeWordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface KaraokeSubtitleItem {
  index: number;
  startTime: string; // "00:00:01,200"
  endTime: string;   // "00:00:03,500"
  text: string;
  actionCallout?: string;
  words?: KaraokeWordTiming[];
}

export interface EnvironmentProfile {
  id: string;
  name: string;
  category: 'outdoor' | 'indoor' | 'fantasy';
  description: string;
  lighting: string;
  colorTheme: { primary: string; secondary: string; accent: string };
  props: string[];
}

export interface KidsCharacterProfile extends CharacterProfile {
  singingVoiceProfile: {
    voiceName: string;
    style: string;
    pitchOffset: string;
    vocalType: 'lead' | 'chorus' | 'call_response';
  };
  danceStyle: string;
  signatureMove: ChoreographyAction;
  expressions: {
    happy: string;
    sad: string;
    surprised: string;
    excited: string;
    singing: string;
  };
  poses: {
    dancing: string;
    jumping: string;
    clapping: string;
    spinning: string;
    marching: string;
  };
}

export interface NurseryQualityCheckResult {
  passed: boolean;
  melodyComplete: boolean;
  lyricsClear: boolean;
  choreographySynced: boolean;
  characterConsistencyScore: number;
  durationSeconds: number;
  targetDurationSeconds: number;
  originalityVerified: boolean;
  madeForKidsCompliant: boolean;
  issues: string[];
  warnings: string[];
}



