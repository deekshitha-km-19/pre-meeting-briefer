import {
  AlertTriangle,
  FileUp,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { MissingInfoItem, SmartAgendaAnalysis, UserProfile } from '../types';

interface DraftParticipant {
  id: string;
  name: string;
  role: string;
  focus: string;
}

const MEETING_TYPES = [
  'Project Review',
  'Technical Architecture',
  'Executive Alignment',
  'Sprint Planning',
  'Client Discovery',
  'Board / Stakeholder',
];

export function CreateMeetingPage({
  user,
  onCreated,
  onToast,
}: {
  user: UserProfile;
  onCreated: (meetingId: string, nextAction: 'workspace' | 'documents' | 'generate') => void;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}) {
  const defaultDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingType, setMeetingType] = useState('Project Review');
  const [personalizedRole, setPersonalizedRole] = useState(user.defaultRole || 'Meeting Lead');
  const [participants, setParticipants] = useState<DraftParticipant[]>([
    { id: '1', name: user.name.replace(' (Demo Judge)', ''), role: user.defaultRole || 'Meeting Lead', focus: '' },
    { id: '2', name: '', role: 'Engineering Lead', focus: '' },
  ]);
  const [agenda, setAgenda] = useState('');
  const [objectives, setObjectives] = useState('');
  const [backgroundInfo, setBackgroundInfo] = useState('');
  const [previousNotes, setPreviousNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [analyzingAgenda, setAnalyzingAgenda] = useState(false);
  const [agendaDiagnostic, setAgendaDiagnostic] = useState<{
    smartAgendaAnalysis: SmartAgendaAnalysis;
    missingInformation: MissingInfoItem[];
  } | null>(null);

  const [submitting, setSubmitting] = useState<'generate' | 'documents' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const addParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', role: '', focus: '' },
    ]);
  };

  const updateParticipant = (id: string, field: keyof DraftParticipant, value: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const handleFilePick = (fileList: FileList | null) => {
    if (!fileList) return;
    const validExts = ['.pdf', '.docx', '.txt', '.md'];
    const next: File[] = [...attachedFiles];
    for (const file of Array.from(fileList)) {
      const lower = file.name.toLowerCase();
      if (!validExts.some((ext) => lower.endsWith(ext))) {
        onToast({
          type: 'error',
          title: 'Unsupported File Type',
          message: `"${file.name}" must be a PDF, DOCX, or TXT file.`,
        });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        onToast({
          type: 'error',
          title: 'File Too Large',
          message: `"${file.name}" exceeds the 10 MB limit.`,
        });
        continue;
      }
      if (next.length >= 5) {
        onToast({
          type: 'error',
          title: 'File Limit Reached',
          message: 'Maximum 5 documents per meeting.',
        });
        break;
      }
      next.push(file);
    }
    setAttachedFiles(next);
  };

  const handleAnalyzeAgenda = async () => {
    if (!agenda.trim() && !objectives.trim()) {
      setFormError('Enter an agenda or objectives first to run the Smart Agenda Analyzer.');
      return;
    }
    setFormError(null);
    setAnalyzingAgenda(true);
    try {
      const participantsText = participants
        .filter((p) => p.name.trim() || p.role.trim())
        .map((p) => `${p.name || 'Unnamed'} (${p.role || 'Participant'})`)
        .join(', ');
      const res = await api.analyzeAgendaQuick({
        title: title || 'Draft Meeting',
        meetingType,
        durationMinutes,
        agenda,
        objectives,
        participantsText,
      });
      setAgendaDiagnostic(res);
      onToast({
        type: 'success',
        title: 'Smart Agenda Analysis Complete',
        message: `Readiness Score: ${res.smartAgendaAnalysis.overallReadinessScore}/100`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Agenda Analysis Failed',
        message: err instanceof Error ? err.message : 'Unable to analyze agenda.',
      });
    } finally {
      setAnalyzingAgenda(false);
    }
  };

  const handleLoadSample = () => {
    setTitle('Q4 Product Launch & Architecture Alignment');
    setDurationMinutes(60);
    setMeetingType('Technical Architecture');
    setPersonalizedRole('Product & Engineering Lead');
    setParticipants([
      { id: 's1', name: 'Jordan Lee', role: 'Product Manager', focus: 'Launch scope & customer rollout' },
      { id: 's2', name: 'Priya Nair', role: 'Staff Architect', focus: 'API latency & failover readiness' },
      { id: 's3', name: 'Marcus Chen', role: 'Security Lead', focus: 'Data privacy & upload validation' },
    ]);
    setAgenda(
      '1. Review load testing benchmarks\n2. Confirm API security & rate limits\n3. Finalize rollout checklist and rollback triggers\n4. Assign launch-day incident owners'
    );
    setObjectives(
      'Approve production readiness criteria, resolve open security sign-off items, and assign launch-week DRI owners.'
    );
    setBackgroundInfo(
      'Beta cohort has 120 active teams. P95 API latency improved from 820ms to 310ms last sprint, but document upload stress testing is still pending final review.'
    );
    setPreviousNotes(
      'Prior sync agreed to enforce 10 MB upload cap and strict MIME validation. Open question: who owns on-call escalation during first 48 hours post-launch?'
    );
    setAgendaDiagnostic(null);
  };

  const submitMeeting = async (nextAction: 'generate' | 'documents') => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Meeting title is required.');
      return;
    }
    if (!agenda.trim() && !objectives.trim()) {
      setFormError('Please provide at least a meeting agenda or meeting objectives.');
      return;
    }

    setSubmitting(nextAction);
    try {
      const { meeting } = await api.createMeeting({
        title,
        dateTime,
        durationMinutes,
        meetingType,
        participants,
        agenda,
        objectives,
        backgroundInfo,
        previousNotes,
        personalizedRole,
      });

      if (attachedFiles.length > 0) {
        await api.uploadDocuments(meeting.id, attachedFiles);
      }

      onToast({
        type: 'success',
        title: 'Meeting Created',
        message:
          attachedFiles.length > 0
            ? `Saved "${meeting.title}" with ${attachedFiles.length} attached document(s).`
            : `Saved "${meeting.title}".`,
      });

      onCreated(meeting.id, nextAction);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create meeting.');
      setSubmitting(null);
    }
  };

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    void submitMeeting('generate');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B162C]">
            Create Meeting Brief
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Provide your meeting agenda, roles, background, and optional PDF/DOCX/TXT documents.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          Fill Example Meeting
        </button>
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmitForm} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Main Form */}
        <div className="space-y-6 lg:col-span-8">
          {/* Core Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-[#0B162C]">
              1. Meeting Details
            </h2>

            <div>
              <label htmlFor="m-title" className="block text-xs font-semibold text-slate-700">
                Meeting Title *
              </label>
              <input
                id="m-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q4 Architecture & Launch Readiness Review"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="m-datetime" className="block text-xs font-semibold text-slate-700">
                  Date & Time
                </label>
                <input
                  id="m-datetime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>

              <div>
                <label htmlFor="m-duration" className="block text-xs font-semibold text-slate-700">
                  Duration (Minutes)
                </label>
                <input
                  id="m-duration"
                  type="number"
                  min={10}
                  max={480}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 45)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>

              <div>
                <label htmlFor="m-type" className="block text-xs font-semibold text-slate-700">
                  Meeting Type
                </label>
                <select
                  id="m-type"
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                >
                  {MEETING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="m-personal-role" className="block text-xs font-semibold text-slate-700">
                Your Role (For Personalized Meeting Briefing)
              </label>
              <input
                id="m-personal-role"
                type="text"
                value={personalizedRole}
                onChange={(e) => setPersonalizedRole(e.target.value)}
                placeholder="e.g., Product Lead, Engineering Manager, Executive Sponsor"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
              />
            </div>
          </section>

          {/* Participants */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#0B162C]">
                2. Participants & Roles
              </h2>
              <button
                type="button"
                onClick={addParticipant}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Participant
              </button>
            </div>

            <div className="space-y-3">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 sm:items-center"
                >
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                    placeholder="Participant name"
                    className="sm:col-span-4 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={p.role}
                    onChange={(e) => updateParticipant(p.id, 'role', e.target.value)}
                    placeholder="Role (e.g. Tech Lead)"
                    className="sm:col-span-4 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={p.focus}
                    onChange={(e) => updateParticipant(p.id, 'focus', e.target.value)}
                    placeholder="Focus area (optional)"
                    className="sm:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="sm:col-span-1 flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    aria-label="Remove participant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Agenda, Objectives, Background, Notes */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-[#0B162C]">
                3. Agenda, Objectives & Context
              </h2>
              <button
                type="button"
                disabled={analyzingAgenda}
                onClick={handleAnalyzeAgenda}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-60"
              >
                <Search className="h-3.5 w-3.5" />
                {analyzingAgenda ? 'Analyzing Agenda...' : 'Run Smart Agenda Check'}
              </button>
            </div>

            <div>
              <label htmlFor="m-agenda" className="block text-xs font-semibold text-slate-700">
                Meeting Agenda *
              </label>
              <textarea
                id="m-agenda"
                rows={4}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="List agenda topics line by line..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
              />
            </div>

            <div>
              <label htmlFor="m-objectives" className="block text-xs font-semibold text-slate-700">
                Meeting Objectives
              </label>
              <textarea
                id="m-objectives"
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="What decisions or outcomes must be achieved by the end of this meeting?"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="m-bg" className="block text-xs font-semibold text-slate-700">
                  Background Information
                </label>
                <textarea
                  id="m-bg"
                  rows={4}
                  value={backgroundInfo}
                  onChange={(e) => setBackgroundInfo(e.target.value)}
                  placeholder="Project status, metrics, constraints, or stakeholder context..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>

              <div>
                <label htmlFor="m-notes" className="block text-xs font-semibold text-slate-700">
                  Previous Meeting Notes
                </label>
                <textarea
                  id="m-notes"
                  rows={4}
                  value={previousNotes}
                  onChange={(e) => setPreviousNotes(e.target.value)}
                  placeholder="Action items or unresolved questions from the prior session..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: File Upload + Smart Agenda Diagnostic + Submit */}
        <div className="space-y-6 lg:col-span-4">
          {/* Quick Document Attachment */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#0B162C]">
              4. Attach Documents (Optional)
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Upload PDF, DOCX, or TXT files (max 10 MB each, up to 5 files). You can also upload
              or preview extracted text on the Upload Documents page.
            </p>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-violet-500 hover:bg-violet-50/40 transition-colors">
              <FileUp className="h-6 w-6 text-violet-700" />
              <span className="mt-2 text-xs font-semibold text-slate-800">
                Click to choose PDF, DOCX, or TXT
              </span>
              <span className="mt-1 text-[11px] text-slate-500">Validated safely on server</span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  handleFilePick(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            {attachedFiles.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {attachedFiles.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{file.name}</p>
                      <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Smart Agenda Pre-Flight Results */}
          {agendaDiagnostic && (
            <section className="rounded-xl border border-violet-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-[#0B162C]">
                  Smart Agenda Diagnostic
                </h3>
                <span className="font-mono text-sm font-bold text-violet-700 tabular-nums">
                  {agendaDiagnostic.smartAgendaAnalysis.overallReadinessScore}/100
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {agendaDiagnostic.smartAgendaAnalysis.agendaQualitySummary}
              </p>

              {agendaDiagnostic.missingInformation.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Missing Information Detected ({agendaDiagnostic.missingInformation.length})
                  </p>
                  <ul className="space-y-1.5">
                    {agendaDiagnostic.missingInformation.slice(0, 4).map((gap) => (
                      <li key={gap.id} className="text-xs text-slate-700">
                        <span className="font-semibold">{gap.severity}:</span> {gap.gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Action Card */}
          <section className="rounded-xl border border-slate-200 bg-[#0B162C] p-6 text-white space-y-3">
            <h2 className="font-display text-base font-semibold">Ready to Prepare?</h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Generate a complete 10-section structured AI brief immediately, or save first to
              review extracted document text.
            </p>

            <button
              type="submit"
              disabled={submitting !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {submitting === 'generate'
                ? 'Creating & Generating Brief...'
                : 'Create & Generate AI Briefing'}
            </button>

            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => void submitMeeting('documents')}
              className="flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-60"
            >
              {submitting === 'documents' ? 'Saving Meeting...' : 'Save & Manage Documents'}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}
