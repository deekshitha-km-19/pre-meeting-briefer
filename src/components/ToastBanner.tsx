import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
          );

        const borderClass =
          toast.type === 'success'
            ? 'border-emerald-200 bg-white/95'
            : toast.type === 'error'
              ? 'border-rose-200 bg-white/95'
              : 'border-slate-200 bg-white/95';

        return (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-3 rounded-xl border ${borderClass} p-3.5 shadow-lg backdrop-blur-md transition-all duration-200`}
          >
            {icon}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 id="confirm-modal-title" className="text-base font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
              destructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-violet-700 hover:bg-violet-800'
            }`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
