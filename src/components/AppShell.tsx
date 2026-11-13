import {
  FileText,
  FolderUp,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  PlusCircle,
  Settings,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { StorageMode, UserProfile } from '../types';

export type WorkspaceRoute =
  | 'dashboard'
  | 'create-meeting'
  | 'upload-documents'
  | 'briefing-workspace'
  | 'history'
  | 'profile';

const NAV_ITEMS: Array<{
  id: WorkspaceRoute;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-meeting', label: 'Create Meeting', icon: PlusCircle },
  { id: 'upload-documents', label: 'Upload Documents', icon: FolderUp },
  { id: 'briefing-workspace', label: 'AI Briefing Workspace', icon: FileText },
  { id: 'history', label: 'Meeting History', icon: History },
  { id: 'profile', label: 'Profile & Settings', icon: Settings },
];

export function AppShell({
  user,
  storageMode,
  activeRoute,
  onNavigate,
  onLogout,
  children,
}: {
  user: UserProfile;
  storageMode: StorageMode;
  activeRoute: WorkspaceRoute;
  onNavigate: (route: WorkspaceRoute) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const currentNav = NAV_ITEMS.find((item) => item.id === activeRoute) ?? NAV_ITEMS[0];

  const handleNavClick = (route: WorkspaceRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B162C] text-slate-200">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <button
          type="button"
          onClick={() => handleNavClick('dashboard')}
          className="text-left font-display text-base font-bold tracking-tight text-white whitespace-nowrap"
        >
          Pre-Meeting Briefer
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Workspace navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeRoute;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-white">
            {user.isDemo ? 'Demo Mode Active' : 'Personal Workspace'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {storageMode === 'supabase' ? 'Supabase DB Connected' : 'Local Persistent Storage'}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{user.isDemo ? 'Exit Demo Mode' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw]">{sidebarContent}</div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="hidden sm:inline text-slate-400">Workspace</span>
                <span className="hidden sm:inline text-slate-300">/</span>
                <span className="font-display font-semibold text-slate-900 truncate">
                  {currentNav.label}
                </span>
                {user.isDemo && (
                  <span className="hidden md:inline text-xs font-medium text-violet-700 whitespace-nowrap">
                    · Demo Content
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleNavClick('create-meeting')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Briefing</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 transition-colors shrink-0"
                aria-label="Open profile and settings"
              >
                {!avatarError && user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="h-6 w-6 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0B162C] text-xs font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[140px] truncate text-xs font-medium text-slate-800">
                  {user.name}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
