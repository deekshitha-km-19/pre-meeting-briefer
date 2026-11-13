import { useCallback, useEffect, useState } from 'react';
import { AppShell, type WorkspaceRoute } from './components/AppShell';
import { ToastContainer, type ToastItem } from './components/ToastBanner';
import { api } from './lib/api';
import { AuthPage } from './pages/AuthPage';
import { BriefingWorkspacePage } from './pages/BriefingWorkspacePage';
import { CreateMeetingPage } from './pages/CreateMeetingPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { UploadDocumentsPage } from './pages/UploadDocumentsPage';
import type { StorageMode, UserProfile } from './types';

type TopView = 'landing' | 'auth' | 'workspace';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [view, setView] = useState<TopView>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [workspaceRoute, setWorkspaceRoute] = useState<WorkspaceRoute>('dashboard');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [autoGenerateOnLoad, setAutoGenerateOnLoad] = useState(false);

  const [demoLoading, setDemoLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getMe();
        if (!active) return;
        setStorageMode(res.storageMode);
        if (res.user) {
          setUser(res.user);
          setView('workspace');
        }
      } catch {
        // Stay on landing page
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleEnterDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await api.enterDemoMode();
      setUser(res.user);
      setStorageMode(res.storageMode);
      setSelectedMeetingId('demo-ai-hackathon-review');
      setWorkspaceRoute('dashboard');
      setView('workspace');
      pushToast({
        type: 'info',
        title: 'Demo Mode Activated',
        message: 'Explore "AI Hackathon Project Review" or create your own meetings.',
      });
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Demo Launch Failed',
        message: err instanceof Error ? err.message : 'Unable to start demo mode.',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  const handleAuthenticated = (authedUser: UserProfile) => {
    setUser(authedUser);
    setSelectedMeetingId(null);
    setWorkspaceRoute('dashboard');
    setView('workspace');
    pushToast({
      type: 'success',
      title: `Welcome, ${authedUser.name}`,
      message: 'Your Pre-Meeting Briefer workspace is ready.',
    });
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setSelectedMeetingId(null);
    setView('landing');
    pushToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Returned to home page.',
    });
  };

  const handleSelectMeeting = (meetingId: string, route: WorkspaceRoute) => {
    setSelectedMeetingId(meetingId);
    setAutoGenerateOnLoad(false);
    setWorkspaceRoute(route);
  };

  const handleMeetingCreated = (
    meetingId: string,
    nextAction: 'workspace' | 'documents' | 'generate'
  ) => {
    setSelectedMeetingId(meetingId);
    if (nextAction === 'documents') {
      setAutoGenerateOnLoad(false);
      setWorkspaceRoute('upload-documents');
    } else if (nextAction === 'generate') {
      setAutoGenerateOnLoad(true);
      setWorkspaceRoute('briefing-workspace');
    } else {
      setAutoGenerateOnLoad(false);
      setWorkspaceRoute('briefing-workspace');
    }
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="font-display text-lg font-bold text-[#0B162C]">Pre-Meeting Briefer</p>
          <p className="mt-1 text-xs text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'landing' && (
        <LandingPage
          demoLoading={demoLoading}
          onEnterDemo={() => void handleEnterDemo()}
          onNavigateAuth={(mode) => {
            setAuthMode(mode);
            setView('auth');
          }}
        />
      )}

      {view === 'auth' && (
        <AuthPage
          initialMode={authMode}
          storageMode={storageMode}
          demoLoading={demoLoading}
          onAuthenticated={handleAuthenticated}
          onBackLanding={() => setView('landing')}
          onEnterDemo={() => void handleEnterDemo()}
        />
      )}

      {view === 'workspace' && user && (
        <AppShell
          user={user}
          storageMode={storageMode}
          activeRoute={workspaceRoute}
          onNavigate={(route) => {
            setAutoGenerateOnLoad(false);
            setWorkspaceRoute(route);
          }}
          onLogout={() => void handleLogout()}
        >
          {workspaceRoute === 'dashboard' && (
            <DashboardPage
              user={user}
              onNavigate={(route) => setWorkspaceRoute(route)}
              onSelectMeeting={handleSelectMeeting}
              onToast={pushToast}
            />
          )}

          {workspaceRoute === 'create-meeting' && (
            <CreateMeetingPage
              user={user}
              onCreated={handleMeetingCreated}
              onToast={pushToast}
            />
          )}

          {workspaceRoute === 'upload-documents' && (
            <UploadDocumentsPage
              selectedMeetingId={selectedMeetingId}
              onSelectMeetingId={setSelectedMeetingId}
              onGoToWorkspace={(id) => handleSelectMeeting(id, 'briefing-workspace')}
              onToast={pushToast}
            />
          )}

          {workspaceRoute === 'briefing-workspace' && (
            <BriefingWorkspacePage
              user={user}
              selectedMeetingId={selectedMeetingId}
              autoGenerateOnLoad={autoGenerateOnLoad}
              onClearAutoGenerate={() => setAutoGenerateOnLoad(false)}
              onSelectMeetingId={setSelectedMeetingId}
              onGoToUploadDocs={(id) => handleSelectMeeting(id, 'upload-documents')}
              onToast={pushToast}
            />
          )}

          {workspaceRoute === 'history' && (
            <HistoryPage
              onSelectMeeting={handleSelectMeeting}
              onNavigate={(route) => setWorkspaceRoute(route)}
              onToast={pushToast}
            />
          )}

          {workspaceRoute === 'profile' && (
            <ProfilePage
              user={user}
              storageMode={storageMode}
              onUserUpdated={setUser}
              onToast={pushToast}
            />
          )}
        </AppShell>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
