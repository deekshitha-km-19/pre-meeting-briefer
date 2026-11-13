import { ArrowLeft, ArrowRight, Lock, Mail, Sparkles, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { StorageMode, UserProfile } from '../types';

export function AuthPage({
  initialMode,
  storageMode,
  onAuthenticated,
  onBackLanding,
  onEnterDemo,
  demoLoading,
}: {
  initialMode: 'login' | 'signup';
  storageMode: StorageMode;
  onAuthenticated: (user: UserProfile) => void;
  onBackLanding: () => void;
  onEnterDemo: () => void;
  demoLoading: boolean;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [defaultRole, setDefaultRole] = useState('Product & Strategy Lead');
  const [organization, setOrganization] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const res = await api.register({
          email,
          password,
          name,
          defaultRole,
          organization,
        });
        onAuthenticated(res.user);
      } else {
        const res = await api.login({ email, password });
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-[#0B162C] p-12 text-white">
        <div>
          <button
            type="button"
            onClick={onBackLanding}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </button>
          <h1 className="mt-12 font-display text-3xl font-bold tracking-tight text-white">
            Pre-Meeting Briefer
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            Walk Into Every Meeting Prepared. Analyze agendas, PDF/DOCX/TXT briefs, and prior notes
            with structured Gemini intelligence.
          </p>
        </div>

        <div className="space-y-4 border-t border-white/15 pt-8">
          <p className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
            Persistence Status
          </p>
          <p className="text-sm leading-relaxed text-slate-300">
            {storageMode === 'supabase'
              ? 'Connected to Supabase PostgreSQL with user-scoped row-level isolation.'
              : 'Running in Local Persistent Mode with isolated Demo Judge Workspace support.'}
          </p>
        </div>
      </div>

      {/* Right Auth Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:col-span-7 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={onBackLanding}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span className="font-display text-sm font-bold text-[#0B162C]">
              Pre-Meeting Briefer
            </span>
          </div>

          {/* Segmented Mode Switch */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/80 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7">
            <h2 className="font-display text-2xl font-bold text-[#0B162C]">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'login'
                ? 'Access your saved meetings, documents, and AI briefings.'
                : 'Your meetings and documents remain strictly scoped to your account.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700">
                      Full Name
                    </label>
                    <div className="relative mt-1.5">
                      <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="auth-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="auth-role" className="block text-xs font-semibold text-slate-700">
                        Default Meeting Role
                      </label>
                      <input
                        id="auth-role"
                        type="text"
                        value={defaultRole}
                        onChange={(e) => setDefaultRole(e.target.value)}
                        placeholder="Product Lead"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-org" className="block text-xs font-semibold text-slate-700">
                        Team / Organization
                      </label>
                      <input
                        id="auth-org"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Optional"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B162C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152647] transition-colors disabled:opacity-60"
              >
                {submitting
                  ? mode === 'login'
                    ? 'Signing In...'
                    : 'Creating Account...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              disabled={demoLoading}
              onClick={onEnterDemo}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {demoLoading ? 'Launching Demo Mode...' : 'Continue in Demo Mode (No Account)'}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              Pre-loaded with “AI Hackathon Project Review” sample meeting for instant evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
