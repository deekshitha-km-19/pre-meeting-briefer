import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Download,
  Edit3,
  FileText,
  FolderUp,
  HelpCircle,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Target,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { briefingToMarkdown, exportBriefingToPdf } from '../lib/pdfExport';
import type {
  BriefingContent,
  BriefingRecord,
  BriefingSectionKey,
  Meeting,
  UploadedDocument,
  UserProfile,
} from '../types';

const SECTION_LABELS: Record<BriefingSectionKey, string> = {
  executiveSummary: '1. Executive Summary',
  meetingObjectives: '2. Meeting Objectives',
  backgroundContext: '3. Background Context',
  discussionPoints: '4. Important Discussion Points',
  participantResponsibilities: '5. Participant Responsibilities',
  smartQuestions: '6. Smart Questions to Ask',
  risksAndChallenges: '7. Potential Risks & Challenges',
  expectedDecisions: '8. Expected Decisions',
  recommendedActionItems: '9. Recommended Action Items',
  preparationChecklist: '10. Preparation Checklist',
  smartAgendaAnalysis: 'Smart Agenda Analyzer',
  missingInformation: 'Missing Information Detector',
  priorityAnalysis: 'Meeting Priority Analyzer',
  timeAllocation: 'Suggested Time Allocation',
  personalizedBriefing: 'Personalized Meeting Briefing',
};

export function BriefingWorkspacePage({
  user,
  selectedMeetingId,
  autoGenerateOnLoad,
  onClearAutoGenerate,
  onSelectMeetingId,
  onGoToUploadDocs,
  onToast,
}: {
  user: UserProfile;
  selectedMeetingId: string | null;
  autoGenerateOnLoad: boolean;
  onClearAutoGenerate: () => void;
  onSelectMeetingId: (id: string) => void;
  onGoToUploadDocs: (meetingId: string) => void;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [briefing, setBriefing] = useState<BriefingRecord | null>(null);
  const [draftContent, setDraftContent] = useState<BriefingContent | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [targetRole, setTargetRole] = useState(user.defaultRole || 'Meeting Lead');
  const [activeTab, setActiveTab] = useState<'brief' | 'intelligence' | 'sources'>('brief');
  const [questionFilter, setQuestionFilter] = useState<string>('All');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [saving, setSaving] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<BriefingSectionKey | null>(null);
  const [regenPromptTarget, setRegenPromptTarget] = useState<BriefingSectionKey | null>(null);
  const [regenInstruction, setRegenInstruction] = useState('');

  // Inline section editor modal state (JSON/structured friendly)
  const [editingSection, setEditingSection] = useState<BriefingSectionKey | null>(null);
  const [editBufferText, setEditBufferText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = async (targetId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const { meetings: list } = await api.listMeetings();
      setMeetings(list);
      const activeId =
        targetId && list.some((m) => m.id === targetId) ? targetId : list[0]?.id || null;

      if (!activeId) {
        setMeeting(null);
        setDocuments([]);
        setBriefing(null);
        setDraftContent(null);
        setLoading(false);
        return;
      }

      if (activeId !== selectedMeetingId) {
        onSelectMeetingId(activeId);
      }

      const detail = await api.getMeetingDetail(activeId);
      setMeeting(detail.meeting);
      setDocuments(detail.documents);
      setBriefing(detail.briefing);
      setDraftContent(detail.briefing?.content ?? null);
      setHasUnsavedChanges(false);
      setTargetRole(
        detail.briefing?.personalizedRole || detail.meeting.personalizedRole || user.defaultRole
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace(selectedMeetingId);
  }, [selectedMeetingId]);

  useEffect(() => {
    if (autoGenerateOnLoad && !loading && meeting && !briefing && !generating) {
      onClearAutoGenerate();
      void handleGenerateFullBriefing();
    } else if (autoGenerateOnLoad && !loading) {
      onClearAutoGenerate();
    }
  }, [autoGenerateOnLoad, loading, meeting, briefing]);

  const handleGenerateFullBriefing = async () => {
    if (!meeting) return;
    setError(null);
    setGenerating(true);
    setGenerationStage('Analyzing agenda, objectives, and uploaded documents...');

    const stageTimer1 = setTimeout(() => {
      setGenerationStage('Detecting missing information and participant responsibilities...');
    }, 1800);
    const stageTimer2 = setTimeout(() => {
      setGenerationStage('Structuring 10 briefing sections and time allocation...');
    }, 3800);

    try {
      const { briefing: generated } = await api.generateBriefing(meeting.id, targetRole);
      setBriefing(generated);
      setDraftContent(generated.content);
      setHasUnsavedChanges(false);
      onToast({
        type: 'success',
        title: 'AI Briefing Generated',
        message: `Structured 10-section brief ready for "${meeting.title}".`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gemini briefing generation failed.';
      setError(msg);
      onToast({ type: 'error', title: 'Generation Failed', message: msg });
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setGenerating(false);
      setGenerationStage('');
    }
  };

  const handleSaveChanges = async (overrideContent?: BriefingContent, actionLabel?: string) => {
    if (!briefing) return;
    const payloadContent = overrideContent ?? draftContent;
    if (!payloadContent) return;

    setSaving(true);
    try {
      const { briefing: saved } = await api.saveBriefing(briefing.id, {
        content: payloadContent,
        personalizedRole: targetRole,
        actionLabel,
      });
      setBriefing(saved);
      setDraftContent(saved.content);
      setHasUnsavedChanges(false);
      onToast({
        type: 'success',
        title: actionLabel || 'Briefing Saved',
        message: 'All changes persisted.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Could not save briefing.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!draftContent || !briefing) return;
    const updated: BriefingContent = {
      ...draftContent,
      preparationChecklist: draftContent.preparationChecklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    };
    setDraftContent(updated);
    await handleSaveChanges(updated, 'Checklist Updated');
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast({ type: 'success', title: 'Copied', message: `${label} copied to clipboard.` });
    } catch {
      onToast({
        type: 'error',
        title: 'Clipboard Unavailable',
        message: 'Could not access clipboard in this browser context.',
      });
    }
  };

  const handleExportPdf = async () => {
    if (!meeting || !draftContent || !briefing) return;
    try {
      const fileName = exportBriefingToPdf(meeting, draftContent);
      await api.logPdfExport(briefing.id);
      onToast({
        type: 'success',
        title: 'PDF Exported',
        message: `Downloaded ${fileName}`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'PDF Export Failed',
        message: err instanceof Error ? err.message : 'Unable to generate PDF.',
      });
    }
  };

  const startRegenerateSection = (key: BriefingSectionKey) => {
    setRegenPromptTarget(key);
    setRegenInstruction('');
  };

  const confirmRegenerateSection = async () => {
    if (!briefing || !regenPromptTarget) return;
    const key = regenPromptTarget;
    setRegenPromptTarget(null);
    setRegeneratingSection(key);
    try {
      const { briefing: updated } = await api.regenerateSection(briefing.id, {
        sectionKey: key,
        userInstruction: regenInstruction,
        targetRole,
      });
      setBriefing(updated);
      setDraftContent(updated.content);
      setHasUnsavedChanges(false);
      onToast({
        type: 'success',
        title: 'Section Regenerated',
        message: `${SECTION_LABELS[key]} updated by Gemini.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Regeneration Failed',
        message: err instanceof Error ? err.message : 'Could not regenerate section.',
      });
    } finally {
      setRegeneratingSection(null);
      setRegenInstruction('');
    }
  };

  const openSectionEditor = (key: BriefingSectionKey) => {
    if (!draftContent) return;
    setEditingSection(key);
    if (key === 'executiveSummary') {
      setEditBufferText(draftContent.executiveSummary.summary);
    } else if (key === 'backgroundContext') {
      setEditBufferText(draftContent.backgroundContext.verifiedFacts.join('\n'));
    } else if (key === 'meetingObjectives') {
      setEditBufferText(draftContent.meetingObjectives.map((o) => o.objective).join('\n'));
    } else if (key === 'discussionPoints') {
      setEditBufferText(
        draftContent.discussionPoints
          .map((d) => `${d.topic} | ${d.suggestedMinutes}m | ${d.agendaAlignment}`)
          .join('\n')
      );
    } else if (key === 'smartQuestions') {
      setEditBufferText(draftContent.smartQuestions.map((q) => q.question).join('\n'));
    } else if (key === 'risksAndChallenges') {
      setEditBufferText(
        draftContent.risksAndChallenges
          .map((r) => `${r.risk} -> Mitigation: ${r.mitigationStrategy}`)
          .join('\n')
      );
    } else if (key === 'expectedDecisions') {
      setEditBufferText(
        draftContent.expectedDecisions.map((d) => `${d.decision} (Owner: ${d.owner})`).join('\n')
      );
    } else if (key === 'recommendedActionItems') {
      setEditBufferText(
        draftContent.recommendedActionItems
          .map((a) => `${a.action} | ${a.suggestedOwner} | ${a.timeframe}`)
          .join('\n')
      );
    } else if (key === 'preparationChecklist') {
      setEditBufferText(draftContent.preparationChecklist.map((c) => c.task).join('\n'));
    } else if (key === 'personalizedBriefing') {
      setEditBufferText(draftContent.personalizedBriefing.focusSummary);
    } else {
      setEditBufferText(JSON.stringify(draftContent[key], null, 2));
    }
  };

  const applySectionEdit = () => {
    if (!draftContent || !editingSection) return;
    const lines = editBufferText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const next: BriefingContent = { ...draftContent };

    if (editingSection === 'executiveSummary') {
      next.executiveSummary = {
        ...next.executiveSummary,
        summary: editBufferText.trim(),
      };
    } else if (editingSection === 'backgroundContext') {
      next.backgroundContext = {
        ...next.backgroundContext,
        verifiedFacts: lines,
      };
    } else if (editingSection === 'meetingObjectives') {
      next.meetingObjectives = lines.map((line, i) => ({
        id: next.meetingObjectives[i]?.id || `obj-${i + 1}`,
        objective: line,
        priority: next.meetingObjectives[i]?.priority || 'High',
        clarityStatus: next.meetingObjectives[i]?.clarityStatus || 'Clear',
        sourceBasis: next.meetingObjectives[i]?.sourceBasis || 'Provided',
      }));
    } else if (editingSection === 'smartQuestions') {
      next.smartQuestions = lines.map((line, i) => ({
        id: next.smartQuestions[i]?.id || `q-${i + 1}`,
        question: line,
        targetRole: next.smartQuestions[i]?.targetRole || 'Team',
        rationale: next.smartQuestions[i]?.rationale || 'User-refined question',
        category: next.smartQuestions[i]?.category || 'Clarifying',
      }));
    } else if (editingSection === 'risksAndChallenges') {
      next.risksAndChallenges = lines.map((line, i) => {
        const [riskPart, mitPart] = line.split('-> Mitigation:');
        return {
          id: next.risksAndChallenges[i]?.id || `risk-${i + 1}`,
          risk: (riskPart ?? line).trim(),
          severity: next.risksAndChallenges[i]?.severity || 'Medium',
          impact: next.risksAndChallenges[i]?.impact || 'Requires team alignment',
          mitigationStrategy: (mitPart ?? next.risksAndChallenges[i]?.mitigationStrategy ?? 'Define mitigation owner').trim(),
          sourceBasis: next.risksAndChallenges[i]?.sourceBasis || 'Documented',
        };
      });
    } else if (editingSection === 'expectedDecisions') {
      next.expectedDecisions = lines.map((line, i) => ({
        id: next.expectedDecisions[i]?.id || `dec-${i + 1}`,
        decision: line.replace(/\(Owner:.*?\)$/i, '').trim(),
        owner: next.expectedDecisions[i]?.owner || 'Meeting Lead',
        requiredInputs: next.expectedDecisions[i]?.requiredInputs || 'Team consensus',
        urgency: next.expectedDecisions[i]?.urgency || 'This Meeting',
        sourceBasis: next.expectedDecisions[i]?.sourceBasis || 'Agenda-Driven',
      }));
    } else if (editingSection === 'recommendedActionItems') {
      next.recommendedActionItems = lines.map((line, i) => {
        const [action, owner, timeframe] = line.split('|').map((s) => s.trim());
        return {
          id: next.recommendedActionItems[i]?.id || `act-${i + 1}`,
          action: action || line,
          suggestedOwner: owner || next.recommendedActionItems[i]?.suggestedOwner || 'Unassigned',
          timeframe: timeframe || next.recommendedActionItems[i]?.timeframe || 'Next 48h',
          priority: next.recommendedActionItems[i]?.priority || 'High',
          sourceBasis: next.recommendedActionItems[i]?.sourceBasis || 'Provided',
        };
      });
    } else if (editingSection === 'preparationChecklist') {
      next.preparationChecklist = lines.map((line, i) => ({
        id: next.preparationChecklist[i]?.id || `chk-${i + 1}`,
        task: line,
        category: next.preparationChecklist[i]?.category || 'Prepare',
        estimatedMinutes: next.preparationChecklist[i]?.estimatedMinutes || 10,
        completed: next.preparationChecklist[i]?.completed || false,
      }));
    } else if (editingSection === 'discussionPoints') {
      next.discussionPoints = lines.map((line, i) => {
        const [topic, minsRaw, alignment] = line.split('|').map((s) => s.trim());
        const parsedMins = parseInt((minsRaw ?? '').replace(/\D/g, ''), 10);
        return {
          id: next.discussionPoints[i]?.id || `dp-${i + 1}`,
          topic: topic || line,
          suggestedMinutes: Number.isFinite(parsedMins) ? parsedMins : (next.discussionPoints[i]?.suggestedMinutes || 10),
          agendaAlignment: alignment || next.discussionPoints[i]?.agendaAlignment || 'Core agenda item',
          priority: next.discussionPoints[i]?.priority || 'High',
          keyQuestions: next.discussionPoints[i]?.keyQuestions || [],
          sourceBasis: next.discussionPoints[i]?.sourceBasis || 'Provided',
        };
      });
    } else if (editingSection === 'personalizedBriefing') {
      next.personalizedBriefing = {
        ...next.personalizedBriefing,
        focusSummary: editBufferText.trim(),
      };
    }

    setDraftContent(next);
    setHasUnsavedChanges(true);
    setEditingSection(null);
    onToast({
      type: 'info',
      title: 'Section Updated',
      message: 'Click "Save Changes" to persist your edits.',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl bg-white border border-slate-200" />
        <div className="h-96 animate-pulse rounded-xl bg-white border border-slate-200" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
          No Meetings Available
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Create a meeting first to generate an AI-powered preparation brief.
        </p>
      </div>
    );
  }

  const checklistTotal = draftContent?.preparationChecklist.length ?? 0;
  const checklistDone =
    draftContent?.preparationChecklist.filter((item) => item.completed).length ?? 0;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const roleChoices = Array.from(
    new Set([
      user.defaultRole || 'Meeting Lead',
      meeting.personalizedRole || 'Meeting Lead',
      ...meeting.participants.map((p) => p.role).filter(Boolean),
    ])
  );

  const SectionActionToolbar = ({
    sectionKey,
    copyText,
    allowEdit = true,
  }: {
    sectionKey: BriefingSectionKey;
    copyText: string;
    allowEdit?: boolean;
  }) => {
    const isRegenerating = regeneratingSection === sectionKey;
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {allowEdit && (
          <button
            type="button"
            onClick={() => openSectionEditor(sectionKey)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Edit section"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
        )}
        <button
          type="button"
          disabled={isRegenerating || generating}
          onClick={() => startRegenerateSection(sectionKey)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
          title="Regenerate this section with Gemini"
        >
          <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
          {isRegenerating ? 'Updating...' : 'Regenerate'}
        </button>
        <button
          type="button"
          onClick={() => void handleCopyText(copyText, SECTION_LABELS[sectionKey])}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          title="Copy section text"
          aria-label={`Copy ${SECTION_LABELS[sectionKey]}`}
        >
          <ClipboardCopy className="h-3 w-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{meeting.meetingType}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{meeting.durationMinutes} min</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{documents.length} doc(s)</span>
              {meeting.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-violet-700">Demo Sample Meeting</span>
                </>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <select
                aria-label="Select meeting"
                value={meeting.id}
                onChange={(e) => onSelectMeetingId(e.target.value)}
                className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-display text-lg font-bold text-[#0B162C] focus:border-violet-600 focus:outline-none"
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                    {m.isDemo ? ' (Demo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <label htmlFor="role-perspective" className="text-xs font-medium text-slate-600">
                Role:
              </label>
              <select
                id="role-perspective"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-violet-600 focus:outline-none"
              >
                {roleChoices.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerateFullBriefing()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generating
                ? 'Generating...'
                : draftContent
                  ? 'Regenerate Brief'
                  : 'Generate AI Briefing'}
            </button>

            {draftContent && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveChanges()}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    hasUnsavedChanges
                      ? 'border-violet-600 bg-violet-50 text-violet-800 hover:bg-violet-100'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'Saved'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleCopyText(
                      briefingToMarkdown(meeting, draftContent),
                      'Complete Markdown Briefing'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy Brief
                </button>

                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B162C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#152647] transition-colors whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Generation Progress Indicator */}
        {generating && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-medium text-violet-900">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="h-4 w-4 animate-spin text-violet-700" />
              <span>{generationStage || 'Generating structured briefing with Google Gemini...'}</span>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        {/* Segmented Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { id: 'brief', label: '10-Section Briefing' },
              { id: 'intelligence', label: 'AI Intelligence Suite (7 Modules)' },
              { id: 'sources', label: `Source Inputs & Docs (${documents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'brief' | 'intelligence' | 'sources')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {draftContent && (
            <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
              <span>
                Agenda Readiness:{' '}
                <strong className="font-mono text-[#0B162C]">
                  {draftContent.smartAgendaAnalysis.overallReadinessScore}/100
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Prep Checklist:{' '}
                <strong className="font-mono text-emerald-700">
                  {checklistDone}/{checklistTotal} ({checklistPct}%)
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Empty State Before Generation */}
      {!draftContent && activeTab !== 'sources' && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-violet-600" />
          <h2 className="mt-3 font-display text-xl font-bold text-[#0B162C]">
            Ready to Synthesize “{meeting.title}”
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Gemini will analyze your {meeting.participants.length} participant roles, meeting
            agenda, background notes, and {documents.length} uploaded document(s) to create a
            fact-grounded 10-section preparation brief.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerateFullBriefing()}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition-colors disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? 'Generating Briefing...' : 'Generate AI Briefing Now'}
            </button>
            <button
              type="button"
              onClick={() => onGoToUploadDocs(meeting.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FolderUp className="h-4 w-4" />
              Attach PDF / DOCX / TXT
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: 10-Section Structured Briefing */}
      {draftContent && activeTab === 'brief' && (
        <div className="space-y-6">
          {/* Anti-fabrication grounding bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-100/80 px-5 py-3 text-xs text-slate-700">
            <strong className="font-semibold text-slate-900">Source Grounding Policy:</strong>{' '}
            {draftContent.groundingDisclaimer}
          </div>

          {/* 1. Executive Summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B162C]">
                  1. Executive Summary
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Basis: {draftContent.executiveSummary.sourceBasis}
                </p>
              </div>
              <SectionActionToolbar
                sectionKey="executiveSummary"
                copyText={`${draftContent.executiveSummary.summary}\n\nReadiness: ${draftContent.executiveSummary.meetingReadinessNote}`}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-800">
              {draftContent.executiveSummary.summary}
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              <strong className="font-semibold text-slate-900">Readiness Note:</strong>{' '}
              {draftContent.executiveSummary.meetingReadinessNote}
            </p>
          </section>

          {/* 2. Meeting Objectives */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B162C]">
                2. Meeting Objectives
              </h2>
              <SectionActionToolbar
                sectionKey="meetingObjectives"
                copyText={draftContent.meetingObjectives
                  .map((o, i) => `${i + 1}. [${o.priority}] ${o.objective}`)
                  .join('\n')}
              />
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {draftContent.meetingObjectives.map((obj) => (
                <div key={obj.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-slate-900">{obj.objective}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Priority: <span className="font-semibold text-slate-700">{obj.priority}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    Clarity:{' '}
                    <span
                      className={
                        obj.clarityStatus === 'Clear' ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {obj.clarityStatus}
                    </span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    {obj.sourceBasis}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Background Context */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B162C]">
                3. Background Context
              </h2>
              <SectionActionToolbar
                sectionKey="backgroundContext"
                copyText={`Verified Facts:\n${draftContent.backgroundContext.verifiedFacts.join('\n')}\n\nAI Context:\n${draftContent.backgroundContext.inferredContext.join('\n')}`}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
                  Verified Facts (From Inputs & Documents)
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-700">
                  {draftContent.backgroundContext.verifiedFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-violet-800 uppercase">
                  AI-Synthesized Context & Connections
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-700">
                  {draftContent.backgroundContext.inferredContext.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-violet-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {draftContent.backgroundContext.documentHighlights.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold text-slate-700">Document Highlights</h3>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {draftContent.backgroundContext.documentHighlights.map((dh, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-[#0B162C]">{dh.documentName}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {dh.keyTakeaway}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 4. Important Discussion Points */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B162C]">
                4. Important Discussion Points
              </h2>
              <SectionActionToolbar
                sectionKey="discussionPoints"
                copyText={draftContent.discussionPoints
                  .map((d) => `${d.topic} (${d.suggestedMinutes} min) — ${d.agendaAlignment}`)
                  .join('\n')}
              />
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {draftContent.discussionPoints.map((dp) => (
                <div key={dp.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{dp.topic}</h3>
                    <span className="font-mono text-xs font-medium text-violet-700 tabular-nums">
                      {dp.suggestedMinutes} min · {dp.priority} · {dp.sourceBasis}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{dp.agendaAlignment}</p>
                  {dp.keyQuestions.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-700 space-y-1">
                      {dp.keyQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 5. Participant Responsibilities */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B162C]">
                5. Participant Responsibilities
              </h2>
              <SectionActionToolbar
                sectionKey="participantResponsibilities"
                allowEdit={false}
                copyText={draftContent.participantResponsibilities
                  .map(
                    (p) =>
                      `${p.name} (${p.role}) — Prep: ${p.preMeetingPrep} | In-meeting: ${p.inMeetingResponsibility}`
                  )
                  .join('\n')}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {draftContent.participantResponsibilities.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0B162C]">{p.name}</p>
                    <span className="text-xs font-medium text-slate-500">{p.ownershipClarity}</span>
                  </div>
                  <p className="text-xs font-medium text-violet-700">{p.role}</p>
                  <p className="mt-2.5 text-xs text-slate-700">
                    <strong className="font-semibold text-slate-900">Pre-meeting prep:</strong>{' '}
                    {p.preMeetingPrep}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-700">
                    <strong className="font-semibold text-slate-900">In-meeting role:</strong>{' '}
                    {p.inMeetingResponsibility}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Smart Questions to Ask */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-violet-700" />
                <h2 className="font-display text-lg font-bold text-[#0B162C]">
                  6. Smart Questions to Ask
                </h2>
              </div>
              <SectionActionToolbar
                sectionKey="smartQuestions"
                copyText={draftContent.smartQuestions
                  .map((q) => `[${q.category} -> ${q.targetRole}] ${q.question}`)
                  .join('\n')}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {['All', 'Clarifying', 'Strategic', 'Risk-Mitigation', 'Decision-Forcing'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setQuestionFilter(cat)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      questionFilter === cat
                        ? 'bg-[#0B162C] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {draftContent.smartQuestions
                .filter((q) => questionFilter === 'All' || q.category === questionFilter)
                .map((q) => (
                  <div key={q.id} className="py-3.5 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-900">{q.question}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {q.category}
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      Ask: <span className="font-medium text-violet-700">{q.targetRole}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{q.rationale}</p>
                  </div>
                ))}
            </div>
          </section>

          {/* 7. Potential Risks & Challenges */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h2 className="font-display text-lg font-bold text-[#0B162C]">
                  7. Potential Risks & Challenges
                </h2>
              </div>
              <SectionActionToolbar
                sectionKey="risksAndChallenges"
                copyText={draftContent.risksAndChallenges
                  .map((r) => `[${r.severity}] ${r.risk} — Mitigation: ${r.mitigationStrategy}`)
                  .join('\n')}
              />
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {draftContent.risksAndChallenges.map((r) => (
                <div key={r.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{r.risk}</p>
                    <span
                      className={`text-xs font-semibold ${
                        r.severity === 'High'
                          ? 'text-rose-700'
                          : r.severity === 'Medium'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                      }`}
                    >
                      {r.severity} Severity · {r.sourceBasis}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    <strong className="font-semibold text-slate-800">Impact:</strong> {r.impact}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    <strong className="font-semibold text-slate-900">Mitigation:</strong>{' '}
                    {r.mitigationStrategy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Expected Decisions & 9. Recommended Action Items */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B162C]">
                  8. Expected Decisions
                </h2>
                <SectionActionToolbar
                  sectionKey="expectedDecisions"
                  copyText={draftContent.expectedDecisions
                    .map((d) => `${d.decision} (Owner: ${d.owner})`)
                    .join('\n')}
                />
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {draftContent.expectedDecisions.map((d) => (
                  <div key={d.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-900">{d.decision}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Owner: <span className="font-medium text-slate-700">{d.owner}</span> ·{' '}
                      {d.urgency} · {d.sourceBasis}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Inputs needed: {d.requiredInputs}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B162C]">
                  9. Recommended Action Items
                </h2>
                <SectionActionToolbar
                  sectionKey="recommendedActionItems"
                  copyText={draftContent.recommendedActionItems
                    .map((a) => `${a.action} — ${a.suggestedOwner} (${a.timeframe})`)
                    .join('\n')}
                />
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {draftContent.recommendedActionItems.map((a) => (
                  <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-900">{a.action}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Owner: <span className="font-medium text-slate-700">{a.suggestedOwner}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      {a.timeframe}
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      {a.priority} Priority
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      {a.sourceBasis}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 10. Preparation Checklist */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B162C]">
                  10. Preparation Checklist
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  {checklistDone} of {checklistTotal} completed ({checklistPct}%)
                </p>
              </div>
              <SectionActionToolbar
                sectionKey="preparationChecklist"
                copyText={draftContent.preparationChecklist
                  .map((c) => `[${c.completed ? 'x' : ' '}] ${c.task}`)
                  .join('\n')}
              />
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${checklistPct}%` }}
              />
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {draftContent.preparationChecklist.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 py-3 hover:bg-slate-50/70 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => void handleToggleChecklist(item.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        item.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {item.task}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                      {item.category} · ~{item.estimatedMinutes} min
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: AI Intelligence Suite */}
      {draftContent && activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Personalized Meeting Briefing */}
          <section className="rounded-xl border border-violet-200 bg-[#0B162C] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-5 w-5 text-violet-300" />
                <div>
                  <h2 className="font-display text-lg font-bold">
                    Personalized Meeting Briefing: {draftContent.personalizedBriefing.targetRole}
                  </h2>
                  <p className="text-xs text-slate-300 tabular-nums">
                    Estimated personal prep time: {draftContent.personalizedBriefing.personalPrepMinutes} min
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openSectionEditor('personalizedBriefing')}
                  className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/15"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={regeneratingSection === 'personalizedBriefing'}
                  onClick={() => startRegenerateSection('personalizedBriefing')}
                  className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${
                      regeneratingSection === 'personalizedBriefing' ? 'animate-spin' : ''
                    }`}
                  />
                  Tailor Role
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-200">
              {draftContent.personalizedBriefing.focusSummary}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
                  Key Talking Points for Your Role
                </p>
                <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-200">
                  {draftContent.personalizedBriefing.talkingPoints.map((tp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
                      <span>{tp}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
                  Role Watchouts & Blind Spots
                </p>
                <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-200">
                  {draftContent.personalizedBriefing.watchouts.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Smart Agenda Analyzer & Missing Information Detector */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B162C]">
                    Smart Agenda Analyzer
                  </h2>
                  <p className="text-xs text-slate-500">
                    Readiness Score:{' '}
                    <span className="font-mono font-bold text-violet-700 tabular-nums">
                      {draftContent.smartAgendaAnalysis.overallReadinessScore}/100
                    </span>
                  </p>
                </div>
                <SectionActionToolbar
                  sectionKey="smartAgendaAnalysis"
                  allowEdit={false}
                  copyText={draftContent.smartAgendaAnalysis.agendaQualitySummary}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {draftContent.smartAgendaAnalysis.agendaQualitySummary}
              </p>

              <div className="mt-4 divide-y divide-slate-100">
                {draftContent.smartAgendaAnalysis.topicCoverageAssessments.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{item.agendaItem}</p>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          item.status === 'Well-Defined' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.recommendation}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="font-display text-lg font-bold text-[#0B162C]">
                    Missing Information Detector
                  </h2>
                </div>
                <SectionActionToolbar
                  sectionKey="missingInformation"
                  allowEdit={false}
                  copyText={draftContent.missingInformation
                    .map((m) => `[${m.severity}] ${m.gap} (Clarify with: ${m.whoCanClarify})`)
                    .join('\n')}
                />
              </div>

              {draftContent.missingInformation.length === 0 ? (
                <p className="mt-4 text-sm text-emerald-700">
                  No critical information gaps detected in your inputs.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {draftContent.missingInformation.map((gap) => (
                    <div key={gap.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{gap.gap}</p>
                        <span
                          className={`text-xs font-semibold shrink-0 ${
                            gap.severity === 'Critical' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          {gap.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{gap.whyItMatters}</p>
                      <p className="mt-1 text-xs font-medium text-violet-700">
                        Clarify with: {gap.whoCanClarify}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Priority Analyzer & Time Allocation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-700" />
                  <h2 className="font-display text-lg font-bold text-[#0B162C]">
                    Meeting Priority Analyzer
                  </h2>
                </div>
                <SectionActionToolbar
                  sectionKey="priorityAnalysis"
                  allowEdit={false}
                  copyText={draftContent.priorityAnalysis.primaryFocus}
                />
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-violet-700 uppercase">Primary Focus</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {draftContent.priorityAnalysis.primaryFocus}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase">Secondary Topics</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-600 space-y-1">
                    {draftContent.priorityAnalysis.secondaryTopics.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
                {draftContent.priorityAnalysis.deferrableTopics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      Deferrable If Short on Time
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-xs text-slate-600 space-y-1">
                      {draftContent.priorityAnalysis.deferrableTopics.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-3">
                  {draftContent.priorityAnalysis.rationale}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet-700" />
                  <h2 className="font-display text-lg font-bold text-[#0B162C]">
                    Suggested Time Allocation ({draftContent.timeAllocation.totalMinutes} min)
                  </h2>
                </div>
                <SectionActionToolbar
                  sectionKey="timeAllocation"
                  allowEdit={false}
                  copyText={draftContent.timeAllocation.segments
                    .map((s) => `${s.minutes}m: ${s.segment} (${s.leadRole})`)
                    .join('\n')}
                />
              </div>

              {/* Proportional Bar */}
              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {draftContent.timeAllocation.segments.map((seg, i) => {
                  const pct =
                    draftContent.timeAllocation.totalMinutes > 0
                      ? (seg.minutes / draftContent.timeAllocation.totalMinutes) * 100
                      : 20;
                  const colors = [
                    'bg-[#0B162C]',
                    'bg-violet-700',
                    'bg-indigo-600',
                    'bg-slate-600',
                    'bg-violet-500',
                  ];
                  return (
                    <div
                      key={seg.id}
                      style={{ width: `${pct}%` }}
                      className={`${colors[i % colors.length]} border-r border-white last:border-r-0`}
                      title={`${seg.segment}: ${seg.minutes} min`}
                    />
                  );
                })}
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {draftContent.timeAllocation.segments.map((seg) => (
                  <div
                    key={seg.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{seg.segment}</p>
                      <p className="text-xs text-slate-600">{seg.purpose}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">Lead: {seg.leadRole}</span>
                      <span className="font-mono text-sm font-semibold text-violet-700 tabular-nums">
                        {seg.minutes}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: Source Inputs & Attached Documents */}
      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-7">
            <h2 className="font-display text-base font-bold text-[#0B162C]">
              Original Meeting Inputs
            </h2>
            <div>
              <p className="text-xs font-semibold text-slate-500">Agenda</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-slate-800">
                {meeting.agenda || 'None provided'}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Objectives</p>
              <p className="mt-1 text-sm text-slate-800">
                {meeting.objectives || 'None provided'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Background Information</p>
              <p className="mt-1 text-sm text-slate-800">
                {meeting.backgroundInfo || 'None provided'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Previous Meeting Notes</p>
              <p className="mt-1 text-sm text-slate-800">
                {meeting.previousNotes || 'None provided'}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0B162C]">
                Attached Documents ({documents.length})
              </h2>
              <button
                type="button"
                onClick={() => onGoToUploadDocs(meeting.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
              >
                <FolderUp className="h-3.5 w-3.5" />
                Manage Docs
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500">
                No documents attached to this meeting yet.
              </p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold text-slate-900">{doc.fileName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {doc.fileType.toUpperCase()} · {doc.wordCount.toLocaleString()} words
                    </p>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-600">
                      {doc.extractedText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Regenerate Section Instruction Modal */}
      {regenPromptTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0B162C]">
                Regenerate {SECTION_LABELS[regenPromptTarget]}
              </h3>
              <button
                type="button"
                onClick={() => setRegenPromptTarget(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Optionally provide guidance for Gemini (e.g., focus on security trade-offs, make
              questions sharper, or keep concise).
            </p>
            <textarea
              rows={3}
              value={regenInstruction}
              onChange={(e) => setRegenInstruction(e.target.value)}
              placeholder="Optional refinement instruction..."
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRegenPromptTarget(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRegenerateSection()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Section Edit Modal */}
      {editingSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0B162C]">
                Edit {SECTION_LABELS[editingSection]}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {editingSection === 'executiveSummary' || editingSection === 'personalizedBriefing'
                ? 'Edit the summary paragraph directly.'
                : 'Edit one item per line.'}
            </p>
            <textarea
              rows={9}
              value={editBufferText}
              onChange={(e) => setEditBufferText(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-violet-600 focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applySectionEdit}
                className="rounded-lg bg-[#0B162C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#152647]"
              >
                Apply Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
