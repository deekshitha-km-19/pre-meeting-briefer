import {
  ArrowRight,
  Calendar,
  FileText,
  FolderUp,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type {
  ActivityLog,
  BriefingRecord,
  DashboardSummary,
  Meeting,
  UploadedDocument,
  UserProfile,
} from '../types';
import type { WorkspaceRoute } from '../components/AppShell';

export function DashboardPage({
  user,
  onNavigate,
  onSelectMeeting,
  onToast,
}: {
  user: UserProfile;
  onNavigate: (route: WorkspaceRoute) => void;
  onSelectMeeting: (meetingId: string, route: WorkspaceRoute) => void;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [resetting, setResetting] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboard();
      setSummary(data.summary);
      setMeetings(data.meetings);
      setBriefings(data.briefings);
      setDocuments(data.documents);
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      await loadDashboard();
      onToast({
        type: 'success',
        title: 'Demo Workspace Reset',
        message: 'Sample "AI Hackathon Project Review" meeting restored.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Reset Failed',
        message: err instanceof Error ? err.message : 'Could not reset demo workspace.',
      });
    } finally {
      setResetting(false);
    }
  };

  const briefingByMeeting = new Map(briefings.map((b) => [b.meetingId, b]));
  const docCountByMeeting = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.meetingId] = (acc[doc.meetingId] || 0) + 1;
    return acc;
  }, {});

  const upcomingMeetings = meetings.filter((m) => m.status !== 'Completed').slice(0, 5);
  const demoMeeting = meetings.find((m) => m.isDemo);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B162C]">
            Preparation Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track upcoming meetings, attached source documents, and AI briefing readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create-meeting')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B162C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152647] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create New Briefing
        </button>
      </div>

      {/* Demo Banner */}
      {user.isDemo && (
        <div className="rounded-xl border border-violet-200 bg-[#0B162C] p-6 text-white">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Demo Mode · Sample Hackathon Workspace
              </p>
              <h2 className="mt-1.5 font-display text-lg font-bold">
                Sample Meeting Ready: AI Hackathon Project Review
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                All demo records are clearly labeled. Open the sample meeting in the AI Briefing
                Workspace to run real Gemini analysis, inspect missing information, edit sections,
                and export a formatted PDF.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {demoMeeting && (
                <button
                  type="button"
                  onClick={() => onSelectMeeting(demoMeeting.id, 'briefing-workspace')}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  Open Sample Briefing
                </button>
              )}
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {resetting ? 'Resetting...' : 'Reset Demo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Total Meetings</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-[#0B162C] tabular-nums">
                {summary?.totalMeetings ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Scoped to your account</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Briefings Generated</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-violet-700 tabular-nums">
                {summary?.briefingsGenerated ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Structured Gemini briefs</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Upcoming Meetings</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-[#0B162C] tabular-nums">
                {summary?.upcomingMeetings ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Active preparation queue</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Checklist Readiness</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-emerald-700 tabular-nums">
                {summary?.checklistCompletionPct ?? 0}%
              </p>
              <p className="mt-1 text-xs text-slate-500">Pre-meeting tasks completed</p>
            </div>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upcoming Meetings */}
        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-[#0B162C]">
              Upcoming Meetings
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-violet-700 hover:text-violet-800"
            >
              View all history
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">No upcoming meetings yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Create your first meeting and attach agendas or PDFs to generate an AI brief.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('create-meeting')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Meeting
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingMeetings.map((meeting) => {
                const hasBrief = briefingByMeeting.has(meeting.id);
                const docCount = docCountByMeeting[meeting.id] || 0;
                return (
                  <div
                    key={meeting.id}
                    className="flex flex-col justify-between gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {meeting.title}
                        </p>
                        {meeting.isDemo && (
                          <span className="text-xs font-medium text-violet-700 shrink-0">
                            · Demo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 tabular-nums">
                        {meeting.meetingType}
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        {meeting.durationMinutes} min
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        {meeting.participants.length} participants
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        {docCount} {docCount === 1 ? 'document' : 'documents'}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        Status:{' '}
                        <span className={hasBrief ? 'text-emerald-700' : 'text-amber-700'}>
                          {hasBrief ? 'Briefing Ready' : 'Needs AI Briefing'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectMeeting(meeting.id, 'upload-documents')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        <FolderUp className="h-3.5 w-3.5" />
                        Docs
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectMeeting(meeting.id, 'briefing-workspace')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 transition-colors whitespace-nowrap"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {hasBrief ? 'Open Brief' : 'Generate Brief'}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-[#0B162C]">
              Recent Activity
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Activity will appear here as you create meetings, upload documents, and generate briefs.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.slice(0, 8).map((act) => (
                <div key={act.id} className="px-6 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">{act.action}</p>
                    <time className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{act.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
