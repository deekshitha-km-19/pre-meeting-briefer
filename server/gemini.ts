import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  BriefingContent,
  BriefingSectionKey,
  BriefingTone,
  Meeting,
  MissingInfoItem,
  SmartAgendaAnalysis,
  UploadedDocument,
} from '../src/types.ts';

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): Error {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('403') || lower.includes('401')) {
    return new Error(
      'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.'
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return new Error(
      'Gemini API rate limit or quota reached. Please wait a moment and try again.'
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new Error(
      `Gemini model (${MODEL_NAME}) was not found or is unavailable right now.`
    );
  }
  return new Error(`Gemini AI generation failed: ${rawMessage}`);
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('unavailable') ||
        msg.includes('timeout') ||
        msg.includes('econnreset');
      if (!isTransient || attempt === maxAttempts) {
        throw formatGeminiError(err);
      }
      const backoffMs = 600 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw formatGeminiError(lastError);
}

const SYSTEM_INSTRUCTION = `You are Pre-Meeting Briefer, an executive meeting intelligence analyst.
Your mission is to help professionals walk into every meeting deeply prepared by transforming raw agendas, notes, and uploaded documents into crisp, accurate, structured preparation briefs.

STRICT GROUNDING & ANTI-FABRICATION RULES:
1. NEVER fabricate facts, numbers, budgets, dates, customer quotes, technical specs, or past decisions that are not explicitly present in the provided meeting details or uploaded documents.
2. Clearly distinguish verified facts (provided in inputs/documents) from AI suggestions or inferred recommendations using the exact sourceBasis fields.
3. Whenever critical information is missing (e.g., unclear owner, undefined success metric, missing timeline, unattached baseline report, vague agenda item), explicitly surface it in Missing Information rather than inventing details to fill the gap.
4. Keep every point concrete, actionable, and tailored to the meeting type, duration, and participant roster.
5. Respect the requested briefing tone (Executive Concise, Technical Deep-Dive, or Collaborative Workshop).`;

function buildMeetingPromptContext(
  meeting: Meeting,
  documents: UploadedDocument[],
  targetRole: string,
  tone: BriefingTone
): string {
  const participantsText =
    meeting.participants.length > 0
      ? meeting.participants
          .map((p) => `- ${p.name || 'Unnamed'} (${p.role || 'Participant'})${p.focus ? ` — Focus: ${p.focus}` : ''}`)
          .join('\n')
      : 'No participants explicitly listed.';

  const docsText =
    documents.length > 0
      ? documents
          .map(
            (doc, idx) =>
              `### Document ${idx + 1}: ${doc.fileName} (${doc.fileType.toUpperCase()}, ${doc.wordCount} words)\n${doc.extractedText.slice(0, 18000)}`
          )
          .join('\n\n')
      : 'No supporting documents uploaded.';

  return `MEETING METADATA
- Title: ${meeting.title}
- Date & Time: ${meeting.dateTime || 'Not specified'}
- Planned Duration: ${meeting.durationMinutes} minutes
- Meeting Type: ${meeting.meetingType}
- Target Role for Personalized Briefing: ${targetRole || meeting.personalizedRole || 'Meeting Lead'}
- Preferred Briefing Tone: ${tone}

PARTICIPANTS & ROLES
${participantsText}

MEETING AGENDA
${meeting.agenda || 'No agenda provided.'}

MEETING OBJECTIVES
${meeting.objectives || 'No explicit objectives provided.'}

BACKGROUND INFORMATION
${meeting.backgroundInfo || 'No background information provided.'}

PREVIOUS MEETING NOTES
${meeting.previousNotes || 'No previous meeting notes provided.'}

UPLOADED DOCUMENTS CONTENT
${docsText}`;
}

const executiveSummarySchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: 'Clear 2-4 sentence executive overview grounded strictly in provided inputs.' },
    meetingReadinessNote: { type: Type.STRING, description: 'Assessment of whether the team has enough context to run an effective session.' },
    sourceBasis: { type: Type.STRING, enum: ['Grounded in Provided Inputs', 'Mixed Facts & AI Synthesis'] },
  },
  required: ['summary', 'meetingReadinessNote', 'sourceBasis'],
};

const meetingObjectivesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      objective: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ['Critical', 'High', 'Medium'] },
      clarityStatus: { type: Type.STRING, enum: ['Clear', 'Needs Clarification'] },
      sourceBasis: { type: Type.STRING, enum: ['Provided', 'AI Inferred'] },
    },
    required: ['id', 'objective', 'priority', 'clarityStatus', 'sourceBasis'],
  },
};

const backgroundContextSchema = {
  type: Type.OBJECT,
  properties: {
    verifiedFacts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Facts directly stated in the meeting inputs or uploaded documents.',
    },
    inferredContext: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Contextual connections or implications clearly marked as AI synthesis.',
    },
    documentHighlights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          documentName: { type: Type.STRING },
          keyTakeaway: { type: Type.STRING },
        },
        required: ['documentName', 'keyTakeaway'],
      },
    },
  },
  required: ['verifiedFacts', 'inferredContext', 'documentHighlights'],
};

const discussionPointsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      topic: { type: Type.STRING },
      agendaAlignment: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ['Critical', 'High', 'Medium'] },
      suggestedMinutes: { type: Type.INTEGER },
      keyQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      sourceBasis: { type: Type.STRING, enum: ['Provided', 'AI Suggestion'] },
    },
    required: ['id', 'topic', 'agendaAlignment', 'priority', 'suggestedMinutes', 'keyQuestions', 'sourceBasis'],
  },
};

const participantResponsibilitiesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      name: { type: Type.STRING },
      role: { type: Type.STRING },
      primaryFocus: { type: Type.STRING },
      preMeetingPrep: { type: Type.STRING },
      inMeetingResponsibility: { type: Type.STRING },
      ownershipClarity: { type: Type.STRING, enum: ['Defined', 'Inferred', 'Unassigned'] },
    },
    required: ['id', 'name', 'role', 'primaryFocus', 'preMeetingPrep', 'inMeetingResponsibility', 'ownershipClarity'],
  },
};

const smartQuestionsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      question: { type: Type.STRING },
      targetRole: { type: Type.STRING },
      rationale: { type: Type.STRING },
      category: { type: Type.STRING, enum: ['Clarifying', 'Strategic', 'Risk-Mitigation', 'Decision-Forcing'] },
    },
    required: ['id', 'question', 'targetRole', 'rationale', 'category'],
  },
};

const risksAndChallengesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      risk: { type: Type.STRING },
      severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
      impact: { type: Type.STRING },
      mitigationStrategy: { type: Type.STRING },
      sourceBasis: { type: Type.STRING, enum: ['Documented', 'AI Risk Analysis'] },
    },
    required: ['id', 'risk', 'severity', 'impact', 'mitigationStrategy', 'sourceBasis'],
  },
};

const expectedDecisionsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      decision: { type: Type.STRING },
      owner: { type: Type.STRING },
      requiredInputs: { type: Type.STRING },
      urgency: { type: Type.STRING, enum: ['Immediate', 'This Meeting', 'Follow-up'] },
      sourceBasis: { type: Type.STRING, enum: ['Agenda-Driven', 'AI Suggestion'] },
    },
    required: ['id', 'decision', 'owner', 'requiredInputs', 'urgency', 'sourceBasis'],
  },
};

const recommendedActionItemsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      action: { type: Type.STRING },
      suggestedOwner: { type: Type.STRING },
      timeframe: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
      sourceBasis: { type: Type.STRING, enum: ['Provided', 'AI Suggestion'] },
    },
    required: ['id', 'action', 'suggestedOwner', 'timeframe', 'priority', 'sourceBasis'],
  },
};

const preparationChecklistSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      task: { type: Type.STRING },
      category: { type: Type.STRING, enum: ['Read', 'Verify', 'Prepare', 'Coordinate'] },
      estimatedMinutes: { type: Type.INTEGER },
      completed: { type: Type.BOOLEAN },
    },
    required: ['id', 'task', 'category', 'estimatedMinutes', 'completed'],
  },
};

const smartAgendaAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallReadinessScore: {
      type: Type.INTEGER,
      description: '0 to 100 readiness score reflecting how well-defined the agenda, objectives, owners, and context are based strictly on provided inputs.',
    },
    agendaQualitySummary: { type: Type.STRING },
    topicCoverageAssessments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agendaItem: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['Well-Defined', 'Vague', 'Missing Owner', 'Overloaded'] },
          recommendation: { type: Type.STRING },
        },
        required: ['agendaItem', 'status', 'recommendation'],
      },
    },
  },
  required: ['overallReadinessScore', 'agendaQualitySummary', 'topicCoverageAssessments'],
};

const missingInformationSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      gap: { type: Type.STRING },
      whyItMatters: { type: Type.STRING },
      whoCanClarify: { type: Type.STRING },
      severity: { type: Type.STRING, enum: ['Critical', 'Recommended'] },
    },
    required: ['id', 'gap', 'whyItMatters', 'whoCanClarify', 'severity'],
  },
};

const priorityAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    primaryFocus: { type: Type.STRING },
    secondaryTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    deferrableTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    rationale: { type: Type.STRING },
  },
  required: ['primaryFocus', 'secondaryTopics', 'deferrableTopics', 'rationale'],
};

const timeAllocationSchema = {
  type: Type.OBJECT,
  properties: {
    totalMinutes: { type: Type.INTEGER },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          segment: { type: Type.STRING },
          minutes: { type: Type.INTEGER },
          purpose: { type: Type.STRING },
          leadRole: { type: Type.STRING },
        },
        required: ['id', 'segment', 'minutes', 'purpose', 'leadRole'],
      },
    },
  },
  required: ['totalMinutes', 'segments'],
};

const personalizedBriefingSchema = {
  type: Type.OBJECT,
  properties: {
    targetRole: { type: Type.STRING },
    focusSummary: { type: Type.STRING },
    talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    watchouts: { type: Type.ARRAY, items: { type: Type.STRING } },
    personalPrepMinutes: { type: Type.INTEGER },
  },
  required: ['targetRole', 'focusSummary', 'talkingPoints', 'watchouts', 'personalPrepMinutes'],
};

const FULL_BRIEFING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: executiveSummarySchema,
    meetingObjectives: meetingObjectivesSchema,
    backgroundContext: backgroundContextSchema,
    discussionPoints: discussionPointsSchema,
    participantResponsibilities: participantResponsibilitiesSchema,
    smartQuestions: smartQuestionsSchema,
    risksAndChallenges: risksAndChallengesSchema,
    expectedDecisions: expectedDecisionsSchema,
    recommendedActionItems: recommendedActionItemsSchema,
    preparationChecklist: preparationChecklistSchema,
    smartAgendaAnalysis: smartAgendaAnalysisSchema,
    missingInformation: missingInformationSchema,
    priorityAnalysis: priorityAnalysisSchema,
    timeAllocation: timeAllocationSchema,
    personalizedBriefing: personalizedBriefingSchema,
    groundingDisclaimer: { type: Type.STRING },
  },
  required: [
    'executiveSummary',
    'meetingObjectives',
    'backgroundContext',
    'discussionPoints',
    'participantResponsibilities',
    'smartQuestions',
    'risksAndChallenges',
    'expectedDecisions',
    'recommendedActionItems',
    'preparationChecklist',
    'smartAgendaAnalysis',
    'missingInformation',
    'priorityAnalysis',
    'timeAllocation',
    'personalizedBriefing',
    'groundingDisclaimer',
  ],
};

const SECTION_SCHEMAS: Record<BriefingSectionKey, object> = {
  executiveSummary: executiveSummarySchema,
  meetingObjectives: meetingObjectivesSchema,
  backgroundContext: backgroundContextSchema,
  discussionPoints: discussionPointsSchema,
  participantResponsibilities: participantResponsibilitiesSchema,
  smartQuestions: smartQuestionsSchema,
  risksAndChallenges: risksAndChallengesSchema,
  expectedDecisions: expectedDecisionsSchema,
  recommendedActionItems: recommendedActionItemsSchema,
  preparationChecklist: preparationChecklistSchema,
  smartAgendaAnalysis: smartAgendaAnalysisSchema,
  missingInformation: missingInformationSchema,
  priorityAnalysis: priorityAnalysisSchema,
  timeAllocation: timeAllocationSchema,
  personalizedBriefing: personalizedBriefingSchema,
};

function parseJsonSafe<T>(raw: string | undefined, fallbackMsg: string): T {
  if (!raw || !raw.trim()) {
    throw new Error(fallbackMsg);
  }
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

export async function generateFullBriefing(params: {
  meeting: Meeting;
  documents: UploadedDocument[];
  targetRole: string;
  tone: BriefingTone;
}): Promise<BriefingContent> {
  const ai = getGeminiClient();
  const context = buildMeetingPromptContext(
    params.meeting,
    params.documents,
    params.targetRole,
    params.tone
  );

  const prompt = `Analyze the following meeting inputs and uploaded documents, then generate a complete, structured Pre-Meeting Briefing JSON.

Ensure:
- All timeAllocation segments sum up closely to ${params.meeting.durationMinutes} minutes.
- Every checklist item has completed set to false initially.
- Do not fabricate facts not found in the inputs. Any gaps must be explicitly captured in missingInformation.
- Tailor personalizedBriefing specifically to the role "${params.targetRole}".

${context}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: FULL_BRIEFING_SCHEMA,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MEDIUM,
        },
      },
    });

    const parsed = parseJsonSafe<BriefingContent>(
      response.text,
      'Gemini returned an empty response while generating the briefing.'
    );

    if (Array.isArray(parsed.preparationChecklist)) {
      parsed.preparationChecklist = parsed.preparationChecklist.map((item, index) => ({
        ...item,
        id: item.id || `chk-${index + 1}`,
        completed: false,
      }));
    }

    return parsed;
  });
}

export async function regenerateBriefingSection<K extends BriefingSectionKey>(params: {
  meeting: Meeting;
  documents: UploadedDocument[];
  existingContent: BriefingContent;
  sectionKey: K;
  targetRole: string;
  tone: BriefingTone;
  userInstruction?: string;
}): Promise<BriefingContent[K]> {
  const ai = getGeminiClient();
  const context = buildMeetingPromptContext(
    params.meeting,
    params.documents,
    params.targetRole,
    params.tone
  );

  const currentSectionJson = JSON.stringify(params.existingContent[params.sectionKey], null, 2);

  const prompt = `Regenerate ONLY the "${params.sectionKey}" section of this Pre-Meeting Briefing.

USER REFINEMENT INSTRUCTION:
${params.userInstruction?.trim() || 'Improve depth, clarity, and practical usefulness while remaining strictly grounded in the source facts.'}

CURRENT SECTION OUTPUT (to improve upon):
${currentSectionJson}

FULL MEETING CONTEXT & DOCUMENTS:
${context}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: SECTION_SCHEMAS[params.sectionKey],
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    return parseJsonSafe<BriefingContent[K]>(
      response.text,
      `Gemini returned an empty response while regenerating ${params.sectionKey}.`
    );
  });
}

export async function analyzeAgendaQuick(params: {
  title: string;
  meetingType: string;
  durationMinutes: number;
  agenda: string;
  objectives: string;
  participantsText: string;
}): Promise<{
  smartAgendaAnalysis: SmartAgendaAnalysis;
  missingInformation: MissingInfoItem[];
}> {
  const ai = getGeminiClient();

  const prompt = `Perform a quick pre-meeting Smart Agenda & Missing Information diagnostic on these draft meeting details.
Do not invent missing facts—identify them clearly so the organizer can improve the meeting before it starts.

Title: ${params.title || 'Untitled Meeting'}
Type: ${params.meetingType}
Duration: ${params.durationMinutes} minutes
Participants: ${params.participantsText || 'Not specified'}
Objectives: ${params.objectives || 'Not specified'}
Agenda:
${params.agenda || 'Not specified'}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            smartAgendaAnalysis: smartAgendaAnalysisSchema,
            missingInformation: missingInformationSchema,
          },
          required: ['smartAgendaAnalysis', 'missingInformation'],
        },
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    return parseJsonSafe<{
      smartAgendaAnalysis: SmartAgendaAnalysis;
      missingInformation: MissingInfoItem[];
    }>(response.text, 'Gemini returned an empty agenda analysis.');
  });
}
