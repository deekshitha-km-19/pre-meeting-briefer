export type StorageMode = 'supabase' | 'local';

export type BriefingTone =
  | 'Executive Concise'
  | 'Technical Deep-Dive'
  | 'Collaborative Workshop';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  defaultRole: string;
  organization: string;
  preferredTone: BriefingTone;
  avatarUrl: string;
  isDemo: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  focus?: string;
}

export type MeetingStatus = 'Draft' | 'Scheduled' | 'Briefing Ready' | 'Completed';

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  dateTime: string;
  durationMinutes: number;
  meetingType: string;
  participants: Participant[];
  agenda: string;
  objectives: string;
  backgroundInfo: string;
  previousNotes: string;
  personalizedRole: string;
  status: MeetingStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedDocument {
  id: string;
  meetingId: string;
  userId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  extractedText: string;
  wordCount: number;
  createdAt: string;
}

export interface BriefingObjectiveItem {
  id: string;
  objective: string;
  priority: 'Critical' | 'High' | 'Medium';
  clarityStatus: 'Clear' | 'Needs Clarification';
  sourceBasis: 'Provided' | 'AI Inferred';
}

export interface DiscussionPointItem {
  id: string;
  topic: string;
  agendaAlignment: string;
  priority: 'Critical' | 'High' | 'Medium';
  suggestedMinutes: number;
  keyQuestions: string[];
  sourceBasis: 'Provided' | 'AI Suggestion';
}

export interface ParticipantResponsibilityItem {
  id: string;
  name: string;
  role: string;
  primaryFocus: string;
  preMeetingPrep: string;
  inMeetingResponsibility: string;
  ownershipClarity: 'Defined' | 'Inferred' | 'Unassigned';
}

export interface SmartQuestionItem {
  id: string;
  question: string;
  targetRole: string;
  rationale: string;
  category: 'Clarifying' | 'Strategic' | 'Risk-Mitigation' | 'Decision-Forcing';
}

export interface RiskChallengeItem {
  id: string;
  risk: string;
  severity: 'High' | 'Medium' | 'Low';
  impact: string;
  mitigationStrategy: string;
  sourceBasis: 'Documented' | 'AI Risk Analysis';
}

export interface ExpectedDecisionItem {
  id: string;
  decision: string;
  owner: string;
  requiredInputs: string;
  urgency: 'Immediate' | 'This Meeting' | 'Follow-up';
  sourceBasis: 'Agenda-Driven' | 'AI Suggestion';
}

export interface ActionItem {
  id: string;
  action: string;
  suggestedOwner: string;
  timeframe: string;
  priority: 'High' | 'Medium' | 'Low';
  sourceBasis: 'Provided' | 'AI Suggestion';
}

export interface ChecklistItem {
  id: string;
  task: string;
  category: 'Read' | 'Verify' | 'Prepare' | 'Coordinate';
  estimatedMinutes: number;
  completed: boolean;
}

export interface AgendaTopicAssessment {
  agendaItem: string;
  status: 'Well-Defined' | 'Vague' | 'Missing Owner' | 'Overloaded';
  recommendation: string;
}

export interface SmartAgendaAnalysis {
  overallReadinessScore: number;
  agendaQualitySummary: string;
  topicCoverageAssessments: AgendaTopicAssessment[];
}

export interface MissingInfoItem {
  id: string;
  gap: string;
  whyItMatters: string;
  whoCanClarify: string;
  severity: 'Critical' | 'Recommended';
}

export interface PriorityAnalysis {
  primaryFocus: string;
  secondaryTopics: string[];
  deferrableTopics: string[];
  rationale: string;
}

export interface TimeSegment {
  id: string;
  segment: string;
  minutes: number;
  purpose: string;
  leadRole: string;
}

export interface TimeAllocation {
  totalMinutes: number;
  segments: TimeSegment[];
}

export interface PersonalizedBriefing {
  targetRole: string;
  focusSummary: string;
  talkingPoints: string[];
  watchouts: string[];
  personalPrepMinutes: number;
}

export interface BriefingContent {
  executiveSummary: {
    summary: string;
    meetingReadinessNote: string;
    sourceBasis: 'Grounded in Provided Inputs' | 'Mixed Facts & AI Synthesis';
  };
  meetingObjectives: BriefingObjectiveItem[];
  backgroundContext: {
    verifiedFacts: string[];
    inferredContext: string[];
    documentHighlights: Array<{ documentName: string; keyTakeaway: string }>;
  };
  discussionPoints: DiscussionPointItem[];
  participantResponsibilities: ParticipantResponsibilityItem[];
  smartQuestions: SmartQuestionItem[];
  risksAndChallenges: RiskChallengeItem[];
  expectedDecisions: ExpectedDecisionItem[];
  recommendedActionItems: ActionItem[];
  preparationChecklist: ChecklistItem[];
  smartAgendaAnalysis: SmartAgendaAnalysis;
  missingInformation: MissingInfoItem[];
  priorityAnalysis: PriorityAnalysis;
  timeAllocation: TimeAllocation;
  personalizedBriefing: PersonalizedBriefing;
  groundingDisclaimer: string;
}

export type BriefingSectionKey =
  | 'executiveSummary'
  | 'meetingObjectives'
  | 'backgroundContext'
  | 'discussionPoints'
  | 'participantResponsibilities'
  | 'smartQuestions'
  | 'risksAndChallenges'
  | 'expectedDecisions'
  | 'recommendedActionItems'
  | 'preparationChecklist'
  | 'smartAgendaAnalysis'
  | 'missingInformation'
  | 'priorityAnalysis'
  | 'timeAllocation'
  | 'personalizedBriefing';

export interface BriefingRecord {
  id: string;
  meetingId: string;
  userId: string;
  content: BriefingContent;
  personalizedRole: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  meetingId?: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalMeetings: number;
  briefingsGenerated: number;
  upcomingMeetings: number;
  checklistCompletionPct: number;
  storageMode: StorageMode;
}
