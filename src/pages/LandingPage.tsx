import {
  ArrowRight,
  CheckSquare,
  Clock,
  FileSearch,
  FileText,
  HelpCircle,
  ShieldAlert,
  Target,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';

export function LandingPage({
  onEnterDemo,
  onNavigateAuth,
  demoLoading,
}: {
  onEnterDemo: () => void;
  onNavigateAuth: (mode: 'login' | 'signup') => void;
  demoLoading: boolean;
}) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Brand wordmark — 4 concise links — 1 primary CTA */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-[#0B162C] whitespace-nowrap shrink-0"
          >
            Pre-Meeting Briefer
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#capabilities"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#demo-showcase"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Live Demo
            </a>
            <button
              type="button"
              onClick={() => onNavigateAuth('login')}
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              disabled={demoLoading}
              onClick={onEnterDemo}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:opacity-60"
            >
              {demoLoading ? 'Opening Demo...' : 'Try Live Demo'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-22">
            <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
              <div className="flex flex-col justify-center lg:col-span-6">
                <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
                  Executive Preparation Engine
                </p>
                <h1
                  className="mt-3 font-display font-bold tracking-tight text-[#0B162C]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', lineHeight: 1.08, textWrap: 'balance' }}
                >
                  Walk Into Every Meeting Prepared.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  Turn scattered agendas, previous notes, and PDF, DOCX, or TXT attachments into a
                  fact-grounded 10-section preparation brief—complete with missing-information
                  alerts, smart questions, and role-specific talking points.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={demoLoading}
                    onClick={onEnterDemo}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0B162C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#152647] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    {demoLoading ? 'Launching Demo Workspace...' : 'Explore Demo Workspace'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateAuth('signup')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Create Free Account
                  </button>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Includes pre-loaded sample meeting: AI Hackathon Project Review · No account required for demo
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[340px] overflow-hidden rounded-xl border border-slate-200 bg-[#0B162C]">
                  {!heroImgFailed ? (
                    <img
                      src="/src/assets/images/hero_executive_briefing_1794585031828.jpg"
                      alt="Executive conference room table with strategy brief folio and laptop"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B162C] via-[#172554] to-[#31105E] p-8 text-white">
                      <FileText className="h-16 w-16 text-violet-300" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B162C]/95 via-[#0B162C]/75 to-transparent p-6">
                    <div className="rounded-lg border border-white/15 bg-[#0B162C]/80 p-4 backdrop-blur-md">
                      <p className="text-xs font-medium text-violet-300">
                        Sample Brief Output · AI Hackathon Project Review · 60 min
                      </p>
                      <p className="mt-1.5 text-sm font-medium leading-snug text-white">
                        3 Critical Gaps Detected · 5 Time-Boxed Agenda Segments · 4 Participant Prep Plans
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-column specs strip below hero */}
            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-semibold text-[#0B162C] tabular-nums">10 Sections</p>
                <p className="mt-1 text-sm text-slate-600">
                  Executive summary, objectives, facts, risks, decisions, and checklist
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-semibold text-[#0B162C] tabular-nums">7 AI Modules</p>
                <p className="mt-1 text-sm text-slate-600">
                  Agenda analyzer, gap detector, question generator, and time allocation
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-semibold text-[#0B162C] tabular-nums">PDF · DOCX · TXT</p>
                <p className="mt-1 text-sm text-slate-600">
                  Server-side validated text extraction up to 10 MB per document
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-semibold text-[#0B162C] tabular-nums">1-Click PDF</p>
                <p className="mt-1 text-sm text-slate-600">
                  Edit inline, regenerate individual sections, and export formatted briefs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Bento Grid */}
        <section id="capabilities" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
              Built For High-Stakes Preparation
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0B162C]">
              Seven Intelligence Engines Grounded in Your Source Material
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Every brief strictly separates verified facts from AI-generated recommendations so
              you never walk into a room relying on fabricated assumptions.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Marquee Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-2">
              <div className="flex items-center gap-3 text-violet-700">
                <FileSearch className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold text-[#0B162C]">
                  01. Smart Agenda Analyzer & Missing Information Detector
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Before the meeting begins, Gemini audits every agenda item for vagueness, overloaded
                scope, or missing ownership. When key baselines, metrics, or decision criteria are
                absent from your notes and uploads, they are flagged explicitly with who should clarify them.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Verified Fact Grounding</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Facts sourced directly from uploaded PDFs, DOCX specs, and prior notes are labeled separately from AI suggestions.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Pre-Flight Agenda Diagnostics</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Test agenda clarity right inside the Meeting Creator before inviting stakeholders.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border border-slate-200 bg-[#0B162C] p-7 text-white">
              <div className="flex items-center gap-3 text-violet-300">
                <UserCheck className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold">
                  02. Personalized Role Briefings
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Switch perspective between Host, Engineering Lead, Product Manager, or Reviewer to
                receive tailored talking points, watchouts, and prep time estimates for your seat at the table.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-7">
              <div className="flex items-center gap-3 text-violet-700">
                <HelpCircle className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold text-[#0B162C]">
                  03. Intelligent Question Generator
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Surface clarifying, strategic, risk-mitigation, and decision-forcing questions mapped
                to the exact participant role who can answer them.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl border border-slate-200 bg-white p-7">
              <div className="flex items-center gap-3 text-violet-700">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold text-[#0B162C]">
                  04. Risk & Challenge Identifier
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Spot technical bottlenecks, timeline conflicts, and stakeholder misalignments early,
                paired with concrete mitigation options.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-xl border border-slate-200 bg-white p-7">
              <div className="flex items-center gap-3 text-violet-700">
                <Clock className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold text-[#0B162C]">
                  05. Priority & Time Allocation
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Separates critical decisions from deferrable topics and builds a minute-by-minute
                run-of-show aligned to your meeting duration.
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="border-y border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
                End-To-End Workflow
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0B162C]">
                From Raw Notes to Exportable Brief in Four Steps
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="font-mono text-sm font-semibold text-violet-700 tabular-nums">01</p>
                <h3 className="mt-2 font-display text-base font-semibold text-[#0B162C]">
                  Define Meeting Context
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Enter title, date, participants with roles, agenda, objectives, and prior notes.
                </p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-violet-700 tabular-nums">02</p>
                <h3 className="mt-2 font-display text-base font-semibold text-[#0B162C]">
                  Attach Source Documents
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Upload PDF, DOCX, or TXT briefs. Text is safely extracted and previewable on the server.
                </p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-violet-700 tabular-nums">03</p>
                <h3 className="mt-2 font-display text-base font-semibold text-[#0B162C]">
                  Generate & Refine Brief
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Gemini structures 10 briefing sections. Edit inline or regenerate any section with instructions.
                </p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-violet-700 tabular-nums">04</p>
                <h3 className="mt-2 font-display text-base font-semibold text-[#0B162C]">
                  Complete Checklist & Export
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Check off pre-work tasks, copy Markdown, or export a multi-page executive PDF.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Showcase */}
        <section id="demo-showcase" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 items-center gap-10 rounded-xl border border-slate-200 bg-[#0B162C] p-8 text-white lg:grid-cols-12 lg:p-12">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
                Instant Hackathon Demo Mode
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Test With “AI Hackathon Project Review” Right Now
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                Jump directly into a pre-configured Demo Workspace with an attached technical
                architecture memo, 4 team roles, and a 5-point agenda. Generate a live Gemini
                briefing, edit sections, and export to PDF with zero signup friction.
              </p>
              <div className="mt-6 flex flex-wrap gap-6 text-xs text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-300" />
                  5 Agenda Items Pre-Loaded
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-violet-300" />
                  Live Gemini API Synthesis
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
              <button
                type="button"
                disabled={demoLoading}
                onClick={onEnterDemo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors sm:w-auto whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {demoLoading ? 'Launching Demo...' : 'Launch Demo Workspace'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateAuth('login')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Or sign in to your personal workspace
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-sm font-bold text-[#0B162C]">Pre-Meeting Briefer</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Walk Into Every Meeting Prepared · Powered by Google Gemini API
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
            <a href="#capabilities" className="hover:text-slate-900">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-slate-900">
              Workflow
            </a>
            <button type="button" onClick={() => onNavigateAuth('login')} className="hover:text-slate-900">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
