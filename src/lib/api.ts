import type {
  ActivityLog,
  BriefingContent,
  BriefingRecord,
  BriefingSectionKey,
  DashboardSummary,
  Meeting,
  MissingInfoItem,
  SmartAgendaAnalysis,
  StorageMode,
  UploadedDocument,
  UserProfile,
} from '../types';

const TOKEN_STORAGE_KEY = 'pmb_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  getMe: () => apiFetch<{ user: UserProfile | null; storageMode: StorageMode }>('/api/auth/me'),

  register: async (payload: {
    email: string;
    password: string;
    name: string;
    defaultRole: string;
    organization?: string;
  }) => {
    const data = await apiFetch<{ user: UserProfile; token: string; storageMode: StorageMode }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    setStoredToken(data.token);
    return data;
  },

  login: async (payload: { email: string; password: string }) => {
    const data = await apiFetch<{ user: UserProfile; token: string; storageMode: StorageMode }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    setStoredToken(data.token);
    return data;
  },

  enterDemoMode: async () => {
    const data = await apiFetch<{ user: UserProfile; token: string; storageMode: StorageMode }>(
      '/api/auth/demo',
      { method: 'POST' }
    );
    setStoredToken(data.token);
    return data;
  },

  logout: async () => {
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  resetDemo: () => apiFetch<{ ok: boolean }>('/api/demo/reset', { method: 'POST' }),

  updateProfile: (payload: Partial<Pick<UserProfile, 'name' | 'defaultRole' | 'organization' | 'preferredTone'>>) =>
    apiFetch<{ user: UserProfile }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getDashboard: () =>
    apiFetch<{
      summary: DashboardSummary;
      meetings: Meeting[];
      briefings: BriefingRecord[];
      documents: UploadedDocument[];
      activities: ActivityLog[];
    }>('/api/dashboard'),

  listMeetings: () => apiFetch<{ meetings: Meeting[] }>('/api/meetings'),

  createMeeting: (payload: {
    title: string;
    dateTime: string;
    durationMinutes: number;
    meetingType: string;
    participants: Array<{ id?: string; name: string; role: string; focus?: string }>;
    agenda: string;
    objectives: string;
    backgroundInfo: string;
    previousNotes: string;
    personalizedRole: string;
  }) =>
    apiFetch<{ meeting: Meeting }>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMeetingDetail: (meetingId: string) =>
    apiFetch<{
      meeting: Meeting;
      documents: UploadedDocument[];
      briefing: BriefingRecord | null;
    }>(`/api/meetings/${encodeURIComponent(meetingId)}`),

  updateMeeting: (meetingId: string, updates: Partial<Meeting>) =>
    apiFetch<{ meeting: Meeting }>(`/api/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteMeeting: (meetingId: string) =>
    apiFetch<{ ok: boolean }>(`/api/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'DELETE',
    }),

  listDocuments: (meetingId?: string) =>
    apiFetch<{ documents: UploadedDocument[] }>(
      meetingId ? `/api/documents?meetingId=${encodeURIComponent(meetingId)}` : '/api/documents'
    ),

  uploadDocuments: (meetingId: string, files: File[]) => {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    return apiFetch<{ documents: UploadedDocument[] }>(
      `/api/meetings/${encodeURIComponent(meetingId)}/documents`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  deleteDocument: (docId: string) =>
    apiFetch<{ ok: boolean }>(`/api/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    }),

  analyzeAgendaQuick: (payload: {
    title: string;
    meetingType: string;
    durationMinutes: number;
    agenda: string;
    objectives: string;
    participantsText: string;
  }) =>
    apiFetch<{
      smartAgendaAnalysis: SmartAgendaAnalysis;
      missingInformation: MissingInfoItem[];
    }>('/api/ai/analyze-agenda', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateBriefing: (meetingId: string, targetRole?: string) =>
    apiFetch<{ briefing: BriefingRecord }>(
      `/api/meetings/${encodeURIComponent(meetingId)}/briefing/generate`,
      {
        method: 'POST',
        body: JSON.stringify({ targetRole }),
      }
    ),

  saveBriefing: (
    briefingId: string,
    payload: { content: BriefingContent; personalizedRole?: string; actionLabel?: string }
  ) =>
    apiFetch<{ briefing: BriefingRecord }>(`/api/briefings/${encodeURIComponent(briefingId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  regenerateSection: (
    briefingId: string,
    payload: { sectionKey: BriefingSectionKey; userInstruction?: string; targetRole?: string }
  ) =>
    apiFetch<{
      briefing: BriefingRecord;
      sectionKey: BriefingSectionKey;
      updatedSection: unknown;
    }>(`/api/briefings/${encodeURIComponent(briefingId)}/regenerate-section`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logPdfExport: (briefingId: string) =>
    apiFetch<{ ok: boolean }>(`/api/briefings/${encodeURIComponent(briefingId)}/export-log`, {
      method: 'POST',
    }),
};
