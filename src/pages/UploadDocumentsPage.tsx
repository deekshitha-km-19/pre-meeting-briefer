import {
  ArrowRight,
  Eye,
  FileText,
  FolderUp,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useState, type DragEvent } from 'react';
import { api } from '../lib/api';
import type { Meeting, UploadedDocument } from '../types';

export function UploadDocumentsPage({
  selectedMeetingId,
  onSelectMeetingId,
  onGoToWorkspace,
  onToast,
}: {
  selectedMeetingId: string | null;
  onSelectMeetingId: (id: string) => void;
  onGoToWorkspace: (meetingId: string) => void;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (targetMeetingId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const { meetings: list } = await api.listMeetings();
      setMeetings(list);
      const activeId =
        targetMeetingId && list.some((m) => m.id === targetMeetingId)
          ? targetMeetingId
          : list[0]?.id || null;
      if (activeId && activeId !== selectedMeetingId) {
        onSelectMeetingId(activeId);
      }
      if (activeId) {
        const { documents: docs } = await api.listDocuments(activeId);
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings and documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(selectedMeetingId);
  }, [selectedMeetingId]);

  const handleFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!selectedMeetingId) {
      onToast({
        type: 'error',
        title: 'No Meeting Selected',
        message: 'Create or select a meeting before uploading documents.',
      });
      return;
    }

    const files = Array.from(fileList);
    setError(null);
    setUploading(true);
    try {
      const res = await api.uploadDocuments(selectedMeetingId, files);
      setDocuments((prev) => [...res.documents, ...prev]);
      onToast({
        type: 'success',
        title: 'Documents Uploaded',
        message: `Extracted text from ${res.documents.length} file(s) safely.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Document upload failed.';
      setError(msg);
      onToast({ type: 'error', title: 'Upload Rejected', message: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    void handleFilesUpload(e.dataTransfer.files);
  };

  const handleDeleteDoc = async (doc: UploadedDocument) => {
    try {
      await api.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      onToast({
        type: 'info',
        title: 'Document Removed',
        message: `"${doc.fileName}" was removed from this meeting.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not delete document.',
      });
    }
  };

  const activeMeeting = meetings.find((m) => m.id === selectedMeetingId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B162C]">
            Upload Supporting Documents
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Attach PDF, DOCX, or TXT files (up to 10 MB each). Extracted text feeds directly into
            Gemini briefing synthesis.
          </p>
        </div>

        {activeMeeting && (
          <button
            type="button"
            onClick={() => onGoToWorkspace(activeMeeting.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 transition-colors whitespace-nowrap shrink-0"
          >
            Open AI Briefing Workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Meeting Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label htmlFor="doc-meeting-select" className="block text-xs font-semibold text-slate-700">
          Target Meeting
        </label>
        <select
          id="doc-meeting-select"
          value={selectedMeetingId ?? ''}
          onChange={(e) => onSelectMeetingId(e.target.value)}
          disabled={meetings.length === 0}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
        >
          {meetings.length === 0 ? (
            <option value="">No meetings created yet</option>
          ) : (
            meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.meetingType} · {m.durationMinutes} min){m.isDemo ? ' [Demo]' : ''}
              </option>
            ))
          )}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Upload Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragActive
            ? 'border-violet-600 bg-violet-50'
            : 'border-slate-300 bg-white hover:border-violet-500 hover:bg-slate-50'
        }`}
      >
        <UploadCloud className="h-9 w-9 text-violet-700" />
        <p className="mt-3 text-sm font-semibold text-slate-900">
          {uploading ? 'Validating & extracting document text...' : 'Drop PDF, DOCX, or TXT files here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Max 10 MB per file · Up to 5 documents per meeting · Files are parsed safely without execution
        </p>
        <input
          type="file"
          multiple
          disabled={uploading || !selectedMeetingId}
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => {
            void handleFilesUpload(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </label>

      {/* Documents List */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-[#0B162C]">
            Attached Documents ({documents.length}/5)
          </h2>
          {activeMeeting && (
            <span className="text-xs text-slate-500">
              {activeMeeting.title}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center">
            <FolderUp className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-900">No documents attached yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload project specs, memos, or prior minutes so Gemini grounds your brief in real facts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="mt-0.5 h-5 w-5 text-violet-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{doc.fileName}</p>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {doc.fileType.toUpperCase()}
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      {(doc.fileSize / 1024).toFixed(1)} KB
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      {doc.wordCount.toLocaleString()} words extracted
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview Text
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDoc(doc)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    aria-label={`Delete ${doc.fileName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Extracted Text Preview Drawer */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-slate-900">
                  {previewDoc.fileName}
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {previewDoc.fileType.toUpperCase()} · {previewDoc.wordCount.toLocaleString()} words extracted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close document preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                {previewDoc.extractedText}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
