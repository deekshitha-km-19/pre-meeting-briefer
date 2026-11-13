import {
  ArrowRight,
  FolderUp,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../components/ToastBanner';
import { api } from '../lib/api';
import type { BriefingRecord, Meeting, UploadedDocument } from '../types';
import type { WorkspaceRoute } from '../components/AppShell';

export function HistoryPage({
  onSelectMeeting,
  onNavigate,
  onToast,
}: {
  onSelectMeeting: (meetingId: string, route: WorkspaceRoute) => void;
  onNavigate: (route: WorkspaceRoute) => void;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'pending'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setMeetings(data.meetings);
      setBriefings(data.briefings);
      setDocuments(data.documents);
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Load Failed',
        message: err instanceof Error ? err.message : 'Unable to load meeting history.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const briefingMap = new Map(briefings.map((b) => [b.meetingId, b]));
  const docCountMap = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.meetingId] = (acc[d.meetingId] || 0) + 1;
    return acc;
  }, {});

  const filtered = meetings.filter((m) => {
    const hasBrief = briefingMap.has(m.id);
    if (statusFilter === 'ready' && !hasBrief) return false;
    if (statusFilter === 'pending' && hasBrief) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.meetingType.toLowerCase().includes(q) ||
      m.agenda.toLowerCase().includes(q)
    );
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMeeting(deleteTarget.id);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      onToast({
        type: 'info',
        title: 'Meeting Deleted',
        message: `Removed "${deleteTarget.title}".`,
      });
      setDeleteTarget(null);
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not delete meeting.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B162C]">
            Meeting History
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, filter, reopen, or manage all meetings and generated preparation briefs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create-meeting')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B162C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152647] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Meeting
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by meeting title, type, or agenda..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { id: 'all', label: 'All Meetings' },
            { id: 'ready', label: 'Briefing Ready' },
            { id: 'pending', label: 'Pending Brief' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as 'all' | 'ready' | 'pending')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900">No matching meetings found</p>
            <p className="mt-1 text-xs text-slate-500">
              Try clearing your filter or create a new meeting brief.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3.5">Meeting</th>
                  <th className="px-4 py-3.5">Type & Duration</th>
                  <th className="px-4 py-3.5 text-right">Docs</th>
                  <th className="px-4 py-3.5 text-right">Checklist</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((meeting) => {
                  const brief = briefingMap.get(meeting.id);
                  const checklist = brief?.content.preparationChecklist ?? [];
                  const doneCount = checklist.filter((c) => c.completed).length;
                  const pct =
                    checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;
                  const docsCount = docCountMap[meeting.id] || 0;

                  return (
                    <tr key={meeting.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {meeting.title}
                          {meeting.isDemo && (
                            <span className="ml-2 text-xs font-medium text-violet-700">
                              · Demo
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                          {meeting.dateTime ? meeting.dateTime.replace('T', ' ') : 'Unscheduled'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 tabular-nums">
                        {meeting.meetingType} · {meeting.durationMinutes} min
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {docsCount}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {brief ? `${pct}%` : '—'}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium">
                        <span className={brief ? 'text-emerald-700' : 'text-amber-700'}>
                          {brief ? 'Briefing Ready' : 'Pending Brief'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectMeeting(meeting.id, 'upload-documents')}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            title="Manage Documents"
                          >
                            <FolderUp className="h-3.5 w-3.5" />
                            Docs
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectMeeting(meeting.id, 'briefing-workspace')}
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 whitespace-nowrap"
                          >
                            {brief ? 'Open Brief' : 'Generate'}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(meeting)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete ${meeting.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Meeting?"
        description={`This will permanently remove "${deleteTarget?.title ?? ''}", its attached documents, and any generated briefing.`}
        confirmLabel="Delete Meeting"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
