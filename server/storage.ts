import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ActivityLog,
  BriefingContent,
  BriefingRecord,
  BriefingTone,
  Meeting,
  StorageMode,
  UploadedDocument,
  UserProfile,
} from '../src/types.ts';

export const DEMO_USER_ID = 'demo-judge-user';
export const DEMO_MEETING_ID = 'demo-ai-hackathon-review';

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface LocalStoreData {
  users: StoredUser[];
  meetings: Meeting[];
  documents: UploadedDocument[];
  briefings: BriefingRecord[];
  activities: ActivityLog[];
}

const DATA_DIR = path.resolve(process.cwd(), '.local_data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getStorageMode(): StorageMode {
  return getSupabaseAdmin() ? 'supabase' : 'local';
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildDemoUser(): StoredUser {
  return {
    id: DEMO_USER_ID,
    email: 'judge.demo@premeetingbriefer.app',
    name: 'Elena Vance (Demo Judge)',
    defaultRole: 'Lead Judge & Technical Reviewer',
    organization: 'Global AI Hackathon Jury',
    preferredTone: 'Executive Concise',
    avatarUrl: '/src/assets/images/avatar_demo_user_1794585035428.jpg',
    isDemo: true,
    createdAt: nowIso(),
    passwordHash: '',
  };
}

function buildDemoMeeting(): Meeting {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const formattedDate = futureDate.toISOString().slice(0, 16);

  return {
    id: DEMO_MEETING_ID,
    userId: DEMO_USER_ID,
    title: 'AI Hackathon Project Review',
    dateTime: formattedDate,
    durationMinutes: 60,
    meetingType: 'Project Review',
    participants: [
      { id: 'p-1', name: 'Maya Lin', role: 'Team Lead & Product Architect', focus: 'End-to-end UX, problem framing, and demo narrative' },
      { id: 'p-2', name: 'Arjun Patel', role: 'Backend & AI Engineer', focus: 'Gemini API orchestration, JSON schemas, and document parsing' },
      { id: 'p-3', name: 'Sofia Morales', role: 'Frontend & Design Engineer', focus: 'Briefing workspace interactivity and PDF export' },
      { id: 'p-4', name: 'Elena Vance', role: 'Lead Judge & Technical Reviewer', focus: 'Technical feasibility, real AI grounding, and security' },
    ],
    agenda: [
      '1. Review project progress',
      '2. Discuss technical architecture',
      '3. Evaluate current challenges',
      '4. Plan final demonstration',
      '5. Assign responsibilities',
    ].join('\n'),
    objectives:
      'Verify end-to-end readiness of Pre-Meeting Briefer before hackathon submission, confirm zero-hallucination Gemini JSON grounding, lock the 3-minute live demo script, and assign final QA and polish owners.',
    backgroundInfo:
      'The team built Pre-Meeting Briefer over 48 hours to solve chronic meeting under-preparation. Core features include multi-format document ingestion (PDF, DOCX, TXT), server-side Gemini structured JSON synthesis, section-level AI regeneration, and PDF export.',
    previousNotes:
      'Yesterday sprint check-in: Document upload parsing for DOCX and PDF passed internal tests. Open items: verify how the app behaves when a user submits a sparse agenda (Missing Information Detector) and finalize who drives the live demo screen vs. narrates.',
    personalizedRole: 'Lead Judge & Technical Reviewer',
    status: 'Scheduled',
    isDemo: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function buildDemoDocument(): UploadedDocument {
  const sampleDocText = `PRE-MEETING BRIEFER — HACKATHON ARCHITECTURE & STATUS MEMO
Project: Pre-Meeting Briefer ("Walk Into Every Meeting Prepared")
Date: Pre-Submission Review

1. Progress Summary
- Server-side Express API routes operational with strict input validation and 10 MB file upload caps.
- Document parser extracts text safely in-memory from PDF, DOCX, and TXT without executing uploaded files.
- Structured Gemini briefing output generates all 10 core briefing sections plus 7 specialized intelligence modules.

2. Technical Architecture
- Frontend: React + TypeScript + Tailwind CSS with interactive Briefing Workspace and client-side multi-page PDF export.
- Backend: Node.js + Express + @google/genai SDK (server-side API key protection).
- Storage: Dual-mode layer supporting Supabase PostgreSQL (with RLS) when configured, and isolated local persistence + Demo Mode out of the box.

3. Known Challenges & Open Questions
- Live demo timing: 3 minutes is tight to show meeting creation, document upload, Gemini generation, inline editing, and PDF export.
- Handling scanned PDFs with zero embedded text layer: currently returns a clear validation error asking for a text-based PDF/DOCX/TXT.
- Need final confirmation on backup plan if venue Wi-Fi drops during live Gemini inference.`;

  return {
    id: 'demo-doc-architecture-memo',
    meetingId: DEMO_MEETING_ID,
    userId: DEMO_USER_ID,
    fileName: 'Hackathon_Architecture_Status_Memo.txt',
    fileType: 'txt',
    fileSize: Buffer.byteLength(sampleDocText, 'utf8'),
    extractedText: sampleDocText,
    wordCount: sampleDocText.trim().split(/\s+/).length,
    createdAt: nowIso(),
  };
}

function ensureLocalStore(): LocalStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: LocalStoreData = {
      users: [buildDemoUser()],
      meetings: [buildDemoMeeting()],
      documents: [buildDemoDocument()],
      briefings: [],
      activities: [
        {
          id: 'act-demo-1',
          userId: DEMO_USER_ID,
          meetingId: DEMO_MEETING_ID,
          action: 'Sample Meeting Loaded',
          detail: 'AI Hackathon Project Review is ready with 1 sample architecture memo attached.',
          createdAt: nowIso(),
        },
      ],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LocalStoreData;
    if (!parsed.users.some((u) => u.id === DEMO_USER_ID)) {
      parsed.users.unshift(buildDemoUser());
    }
    if (!parsed.meetings.some((m) => m.id === DEMO_MEETING_ID)) {
      parsed.meetings.unshift(buildDemoMeeting());
      parsed.documents.unshift(buildDemoDocument());
    }
    return parsed;
  } catch {
    const reset: LocalStoreData = {
      users: [buildDemoUser()],
      meetings: [buildDemoMeeting()],
      documents: [buildDemoDocument()],
      briefings: [],
      activities: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(reset, null, 2), 'utf8');
    return reset;
  }
}

function writeLocalStore(data: LocalStoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function toPublicUser(u: StoredUser): UserProfile {
  const { passwordHash: _ignored, ...rest } = u;
  return rest;
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, default_role, organization, preferred_tone, avatar_url, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      defaultRole: data.default_role,
      organization: data.organization,
      preferredTone: (data.preferred_tone as BriefingTone) || 'Executive Concise',
      avatarUrl: data.avatar_url || '/src/assets/images/avatar_demo_user_1794585035428.jpg',
      isDemo: false,
      createdAt: data.created_at,
    };
  }

  const store = ensureLocalStore();
  const found = store.users.find((u) => u.id === userId);
  return found ? toPublicUser(found) : null;
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  defaultRole: string;
  organization?: string;
}): Promise<UserProfile> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        name: input.name.trim(),
        default_role: input.defaultRole.trim() || 'Meeting Lead',
        organization: (input.organization ?? '').trim(),
        preferred_tone: 'Executive Concise',
        avatar_url: '/src/assets/images/avatar_demo_user_1794585035428.jpg',
        password_hash: passwordHash,
      })
      .select('id, email, name, default_role, organization, preferred_tone, avatar_url, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create user in Supabase.');
    }
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      defaultRole: data.default_role,
      organization: data.organization,
      preferredTone: data.preferred_tone as BriefingTone,
      avatarUrl: data.avatar_url,
      isDemo: false,
      createdAt: data.created_at,
    };
  }

  const store = ensureLocalStore();
  if (store.users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: input.name.trim(),
    defaultRole: input.defaultRole.trim() || 'Meeting Lead',
    organization: (input.organization ?? '').trim(),
    preferredTone: 'Executive Concise',
    avatarUrl: '/src/assets/images/avatar_demo_user_1794585035428.jpg',
    isDemo: false,
    createdAt: nowIso(),
    passwordHash,
  };

  store.users.push(newUser);
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId: newUser.id,
    action: 'Account Created',
    detail: `Welcome to Pre-Meeting Briefer, ${newUser.name}.`,
    createdAt: nowIso(),
  });
  writeLocalStore(store);
  return toPublicUser(newUser);
}

export async function authenticateUser(email: string, password: string): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error || !data || !data.password_hash) {
      throw new Error('Invalid email or password.');
    }
    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      defaultRole: data.default_role,
      organization: data.organization,
      preferredTone: (data.preferred_tone as BriefingTone) || 'Executive Concise',
      avatarUrl: data.avatar_url || '/src/assets/images/avatar_demo_user_1794585035428.jpg',
      isDemo: false,
      createdAt: data.created_at,
    };
  }

  const store = ensureLocalStore();
  const found = store.users.find((u) => u.email === normalizedEmail && !u.isDemo);
  if (!found || !found.passwordHash) {
    throw new Error('Invalid email or password.');
  }
  const valid = await bcrypt.compare(password, found.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }
  return toPublicUser(found);
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'name' | 'defaultRole' | 'organization' | 'preferredTone'>>
): Promise<UserProfile> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.defaultRole !== undefined ? { default_role: updates.defaultRole } : {}),
        ...(updates.organization !== undefined ? { organization: updates.organization } : {}),
        ...(updates.preferredTone !== undefined ? { preferred_tone: updates.preferredTone } : {}),
        updated_at: nowIso(),
      })
      .eq('id', userId)
      .select('id, email, name, default_role, organization, preferred_tone, avatar_url, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update profile.');
    }
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      defaultRole: data.default_role,
      organization: data.organization,
      preferredTone: data.preferred_tone as BriefingTone,
      avatarUrl: data.avatar_url,
      isDemo: false,
      createdAt: data.created_at,
    };
  }

  const store = ensureLocalStore();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('User not found.');
  store.users[idx] = {
    ...store.users[idx],
    ...updates,
  };
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId,
    action: 'Settings Updated',
    detail: `Updated profile preferences (${store.users[idx].preferredTone}).`,
    createdAt: nowIso(),
  });
  writeLocalStore(store);
  return toPublicUser(store.users[idx]);
}

export async function listMeetingsForUser(userId: string): Promise<Meeting[]> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      dateTime: row.date_time,
      durationMinutes: row.duration_minutes,
      meetingType: row.meeting_type,
      participants: row.participants ?? [],
      agenda: row.agenda,
      objectives: row.objectives,
      backgroundInfo: row.background_info,
      previousNotes: row.previous_notes,
      personalizedRole: row.personalized_role,
      status: row.status,
      isDemo: row.is_demo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  const store = ensureLocalStore();
  return store.meetings
    .filter((m) => m.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getMeetingByIdForUser(meetingId: string, userId: string): Promise<Meeting | null> {
  const meetings = await listMeetingsForUser(userId);
  return meetings.find((m) => m.id === meetingId) ?? null;
}

export async function createMeetingForUser(
  userId: string,
  input: Omit<Meeting, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isDemo'>
): Promise<Meeting> {
  const isDemo = userId === DEMO_USER_ID;
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (supabase && !isDemo) {
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        user_id: userId,
        title: input.title,
        date_time: input.dateTime,
        duration_minutes: input.durationMinutes,
        meeting_type: input.meetingType,
        participants: input.participants,
        agenda: input.agenda,
        objectives: input.objectives,
        background_info: input.backgroundInfo,
        previous_notes: input.previousNotes,
        personalized_role: input.personalizedRole,
        status: input.status,
        is_demo: false,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create meeting.');
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      dateTime: data.date_time,
      durationMinutes: data.duration_minutes,
      meetingType: data.meeting_type,
      participants: data.participants ?? [],
      agenda: data.agenda,
      objectives: data.objectives,
      backgroundInfo: data.background_info,
      previousNotes: data.previous_notes,
      personalizedRole: data.personalized_role,
      status: data.status,
      isDemo: data.is_demo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const store = ensureLocalStore();
  const created: Meeting = {
    ...input,
    id: crypto.randomUUID(),
    userId,
    isDemo,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.meetings.unshift(created);
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId,
    meetingId: created.id,
    action: 'Meeting Created',
    detail: `Created "${created.title}" (${created.meetingType}).`,
    createdAt: timestamp,
  });
  writeLocalStore(store);
  return created;
}

export async function updateMeetingForUser(
  meetingId: string,
  userId: string,
  updates: Partial<Omit<Meeting, 'id' | 'userId' | 'createdAt' | 'isDemo'>>
): Promise<Meeting> {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (supabase && userId !== DEMO_USER_ID) {
    const { data, error } = await supabase
      .from('meetings')
      .update({
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.dateTime !== undefined ? { date_time: updates.dateTime } : {}),
        ...(updates.durationMinutes !== undefined ? { duration_minutes: updates.durationMinutes } : {}),
        ...(updates.meetingType !== undefined ? { meeting_type: updates.meetingType } : {}),
        ...(updates.participants !== undefined ? { participants: updates.participants } : {}),
        ...(updates.agenda !== undefined ? { agenda: updates.agenda } : {}),
        ...(updates.objectives !== undefined ? { objectives: updates.objectives } : {}),
        ...(updates.backgroundInfo !== undefined ? { background_info: updates.backgroundInfo } : {}),
        ...(updates.previousNotes !== undefined ? { previous_notes: updates.previousNotes } : {}),
        ...(updates.personalizedRole !== undefined ? { personalized_role: updates.personalizedRole } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updated_at: timestamp,
      })
      .eq('id', meetingId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Meeting not found or unauthorized.');
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      dateTime: data.date_time,
      durationMinutes: data.duration_minutes,
      meetingType: data.meeting_type,
      participants: data.participants ?? [],
      agenda: data.agenda,
      objectives: data.objectives,
      backgroundInfo: data.background_info,
      previousNotes: data.previous_notes,
      personalizedRole: data.personalized_role,
      status: data.status,
      isDemo: data.is_demo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const store = ensureLocalStore();
  const idx = store.meetings.findIndex((m) => m.id === meetingId && m.userId === userId);
  if (idx === -1) throw new Error('Meeting not found.');
  store.meetings[idx] = {
    ...store.meetings[idx],
    ...updates,
    updatedAt: timestamp,
  };
  writeLocalStore(store);
  return store.meetings[idx];
}

export async function deleteMeetingForUser(meetingId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return;
  }

  const store = ensureLocalStore();
  const target = store.meetings.find((m) => m.id === meetingId && m.userId === userId);
  if (!target) throw new Error('Meeting not found.');
  store.meetings = store.meetings.filter((m) => !(m.id === meetingId && m.userId === userId));
  store.documents = store.documents.filter((d) => !(d.meetingId === meetingId && d.userId === userId));
  store.briefings = store.briefings.filter((b) => !(b.meetingId === meetingId && b.userId === userId));
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId,
    action: 'Meeting Deleted',
    detail: `Removed "${target.title}".`,
    createdAt: nowIso(),
  });
  writeLocalStore(store);
}

export async function listDocumentsForUser(userId: string, meetingId?: string): Promise<UploadedDocument[]> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    let query = supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (meetingId) query = query.eq('meeting_id', meetingId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      meetingId: row.meeting_id,
      userId: row.user_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      extractedText: row.extracted_text,
      wordCount: row.word_count,
      createdAt: row.created_at,
    }));
  }

  const store = ensureLocalStore();
  return store.documents.filter(
    (d) => d.userId === userId && (!meetingId || d.meetingId === meetingId)
  );
}

export async function saveDocumentForUser(
  userId: string,
  doc: Omit<UploadedDocument, 'id' | 'userId' | 'createdAt'>
): Promise<UploadedDocument> {
  const meeting = await getMeetingByIdForUser(doc.meetingId, userId);
  if (!meeting) throw new Error('Meeting not found or access denied.');

  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (supabase && userId !== DEMO_USER_ID) {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .insert({
        meeting_id: doc.meetingId,
        user_id: userId,
        file_name: doc.fileName,
        file_type: doc.fileType,
        file_size: doc.fileSize,
        extracted_text: doc.extractedText,
        word_count: doc.wordCount,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save document.');
    return {
      id: data.id,
      meetingId: data.meeting_id,
      userId: data.user_id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      extractedText: data.extracted_text,
      wordCount: data.word_count,
      createdAt: data.created_at,
    };
  }

  const store = ensureLocalStore();
  const created: UploadedDocument = {
    ...doc,
    id: crypto.randomUUID(),
    userId,
    createdAt: timestamp,
  };
  store.documents.unshift(created);
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId,
    meetingId: doc.meetingId,
    action: 'Document Uploaded',
    detail: `Attached "${doc.fileName}" (${doc.wordCount.toLocaleString()} words extracted) to "${meeting.title}".`,
    createdAt: timestamp,
  });
  writeLocalStore(store);
  return created;
}

export async function deleteDocumentForUser(docId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    const { error } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', docId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return;
  }

  const store = ensureLocalStore();
  const target = store.documents.find((d) => d.id === docId && d.userId === userId);
  if (!target) throw new Error('Document not found.');
  store.documents = store.documents.filter((d) => !(d.id === docId && d.userId === userId));
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId,
    meetingId: target.meetingId,
    action: 'Document Removed',
    detail: `Removed "${target.fileName}".`,
    createdAt: nowIso(),
  });
  writeLocalStore(store);
}

export async function listBriefingsForUser(userId: string): Promise<BriefingRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase && userId !== DEMO_USER_ID) {
    const { data, error } = await supabase
      .from('briefings')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      meetingId: row.meeting_id,
      userId: row.user_id,
      content: row.content as BriefingContent,
      personalizedRole: row.personalized_role,
      isDemo: row.is_demo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  const store = ensureLocalStore();
  return store.briefings.filter((b) => b.userId === userId);
}

export async function getBriefingByMeetingForUser(
  meetingId: string,
  userId: string
): Promise<BriefingRecord | null> {
  const briefings = await listBriefingsForUser(userId);
  return briefings.find((b) => b.meetingId === meetingId) ?? null;
}

export async function getBriefingByIdForUser(
  briefingId: string,
  userId: string
): Promise<BriefingRecord | null> {
  const briefings = await listBriefingsForUser(userId);
  return briefings.find((b) => b.id === briefingId) ?? null;
}

export async function upsertBriefingForUser(params: {
  userId: string;
  meetingId: string;
  content: BriefingContent;
  personalizedRole: string;
  actionLabel?: string;
}): Promise<BriefingRecord> {
  const meeting = await getMeetingByIdForUser(params.meetingId, params.userId);
  if (!meeting) throw new Error('Meeting not found or access denied.');

  const isDemo = params.userId === DEMO_USER_ID;
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (supabase && !isDemo) {
    const existing = await getBriefingByMeetingForUser(params.meetingId, params.userId);
    if (existing) {
      const { data, error } = await supabase
        .from('briefings')
        .update({
          content: params.content,
          personalized_role: params.personalizedRole,
          updated_at: timestamp,
        })
        .eq('id', existing.id)
        .eq('user_id', params.userId)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'Failed to update briefing.');
      await updateMeetingForUser(params.meetingId, params.userId, { status: 'Briefing Ready' });
      return {
        id: data.id,
        meetingId: data.meeting_id,
        userId: data.user_id,
        content: data.content as BriefingContent,
        personalizedRole: data.personalized_role,
        isDemo: data.is_demo,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const { data, error } = await supabase
      .from('briefings')
      .insert({
        meeting_id: params.meetingId,
        user_id: params.userId,
        content: params.content,
        personalized_role: params.personalizedRole,
        is_demo: false,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save briefing.');
    await updateMeetingForUser(params.meetingId, params.userId, { status: 'Briefing Ready' });
    return {
      id: data.id,
      meetingId: data.meeting_id,
      userId: data.user_id,
      content: data.content as BriefingContent,
      personalizedRole: data.personalized_role,
      isDemo: data.is_demo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const store = ensureLocalStore();
  const existingIdx = store.briefings.findIndex(
    (b) => b.meetingId === params.meetingId && b.userId === params.userId
  );

  let record: BriefingRecord;
  if (existingIdx >= 0) {
    record = {
      ...store.briefings[existingIdx],
      content: params.content,
      personalizedRole: params.personalizedRole,
      updatedAt: timestamp,
    };
    store.briefings[existingIdx] = record;
  } else {
    record = {
      id: crypto.randomUUID(),
      meetingId: params.meetingId,
      userId: params.userId,
      content: params.content,
      personalizedRole: params.personalizedRole,
      isDemo,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.briefings.unshift(record);
  }

  const mIdx = store.meetings.findIndex(
    (m) => m.id === params.meetingId && m.userId === params.userId
  );
  if (mIdx >= 0) {
    store.meetings[mIdx] = {
      ...store.meetings[mIdx],
      status: 'Briefing Ready',
      updatedAt: timestamp,
    };
  }

  store.activities.unshift({
    id: crypto.randomUUID(),
    userId: params.userId,
    meetingId: params.meetingId,
    action: params.actionLabel || (existingIdx >= 0 ? 'Briefing Updated' : 'AI Briefing Generated'),
    detail: `${params.actionLabel || 'Briefing saved'} for "${meeting.title}" (${params.personalizedRole}).`,
    createdAt: timestamp,
  });

  writeLocalStore(store);
  return record;
}

export async function listActivitiesForUser(userId: string): Promise<ActivityLog[]> {
  const store = ensureLocalStore();
  return store.activities
    .filter((a) => a.userId === userId)
    .slice(0, 20);
}

export async function recordActivityForUser(
  userId: string,
  action: string,
  detail: string,
  meetingId?: string
): Promise<void> {
  const store = ensureLocalStore();
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId,
    meetingId,
    action,
    detail,
    createdAt: nowIso(),
  });
  store.activities = store.activities.slice(0, 100);
  writeLocalStore(store);
}

export async function resetDemoWorkspace(): Promise<void> {
  const store = ensureLocalStore();
  store.users = store.users.filter((u) => u.id !== DEMO_USER_ID);
  store.meetings = store.meetings.filter((m) => m.userId !== DEMO_USER_ID);
  store.documents = store.documents.filter((d) => d.userId !== DEMO_USER_ID);
  store.briefings = store.briefings.filter((b) => b.userId !== DEMO_USER_ID);
  store.activities = store.activities.filter((a) => a.userId !== DEMO_USER_ID);

  store.users.unshift(buildDemoUser());
  store.meetings.unshift(buildDemoMeeting());
  store.documents.unshift(buildDemoDocument());
  store.activities.unshift({
    id: crypto.randomUUID(),
    userId: DEMO_USER_ID,
    meetingId: DEMO_MEETING_ID,
    action: 'Demo Workspace Reset',
    detail: 'Restored sample "AI Hackathon Project Review" meeting and architecture memo.',
    createdAt: nowIso(),
  });
  writeLocalStore(store);
}
