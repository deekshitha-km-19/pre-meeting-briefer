import { RotateCcw, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { BriefingTone, StorageMode, UserProfile } from '../types';

const TONES: BriefingTone[] = [
  'Executive Concise',
  'Technical Deep-Dive',
  'Collaborative Workshop',
];

export function ProfilePage({
  user,
  storageMode,
  onUserUpdated,
  onToast,
}: {
  user: UserProfile;
  storageMode: StorageMode;
  onUserUpdated: (user: UserProfile) => void;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [defaultRole, setDefaultRole] = useState(user.defaultRole);
  const [organization, setOrganization] = useState(user.organization);
  const [preferredTone, setPreferredTone] = useState<BriefingTone>(user.preferredTone);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user: updated } = await api.updateProfile({
        name,
        defaultRole,
        organization,
        preferredTone,
      });
      onUserUpdated(updated);
      onToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your profile and AI briefing preferences are updated.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Unable to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      onToast({
        type: 'success',
        title: 'Demo Data Reset',
        message: 'Restored sample "AI Hackathon Project Review" meeting.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Reset Failed',
        message: err instanceof Error ? err.message : 'Could not reset demo.',
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B162C]">
          Profile & Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure your default meeting perspective, preferred Gemini briefing tone, and storage status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-8"
        >
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            {!avatarError && user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-14 w-14 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0B162C] text-lg font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-display text-base font-bold text-[#0B162C]">{user.name}</p>
              <p className="text-xs text-slate-500">
                {user.email} · {user.isDemo ? 'Demo Judge Account' : 'Registered Account'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="prof-role" className="block text-xs font-semibold text-slate-700">
                Default Meeting Role
              </label>
              <input
                id="prof-role"
                type="text"
                required
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-org" className="block text-xs font-semibold text-slate-700">
              Organization / Team
            </label>
            <input
              id="prof-org"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Optional"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Preferred AI Briefing Tone
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setPreferredTone(tone)}
                  className={`rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                    preferredTone === tone
                      ? 'border-violet-600 bg-violet-50 text-violet-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B162C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#152647] transition-colors disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>

        {/* Storage & Security Status */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-[#0B162C]">
              Database & Security Mode
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              {storageMode === 'supabase'
                ? 'Supabase PostgreSQL is active. All meetings, documents, and briefings are stored with user-scoped access control.'
                : 'Supabase environment variables are not set. Running in Local Persistent Mode with isolated user workspaces and sample Demo Mode.'}
            </p>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
              <p>AI Engine: Server-side Google Gemini API</p>
              <p>Upload Validation: PDF, DOCX, TXT (max 10 MB)</p>
              <p>Session Scope: Signed token isolation</p>
            </div>
          </div>

          {user.isDemo && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-6 space-y-3">
              <h2 className="font-display text-base font-bold text-[#0B162C]">
                Demo Workspace Controls
              </h2>
              <p className="text-xs leading-relaxed text-slate-700">
                Reset the Demo Judge workspace back to the original “AI Hackathon Project Review”
                sample meeting and architecture memo.
              </p>
              <button
                type="button"
                disabled={resetting}
                onClick={() => void handleResetDemo()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3.5 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {resetting ? 'Resetting...' : 'Reset Demo Data'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
