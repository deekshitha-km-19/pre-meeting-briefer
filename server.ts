import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  MAX_FILES_PER_MEETING,
  MAX_FILE_SIZE_BYTES,
  parseUploadedDocument,
} from './server/documentParser.ts';
import {
  analyzeAgendaQuick,
  generateFullBriefing,
  regenerateBriefingSection,
} from './server/gemini.ts';
import {
  DEMO_USER_ID,
  authenticateUser,
  createMeetingForUser,
  deleteDocumentForUser,
  deleteMeetingForUser,
  getBriefingByIdForUser,
  getBriefingByMeetingForUser,
  getMeetingByIdForUser,
  getStorageMode,
  getUserById,
  listActivitiesForUser,
  listBriefingsForUser,
  listDocumentsForUser,
  listMeetingsForUser,
  recordActivityForUser,
  registerUser,
  resetDemoWorkspace,
  saveDocumentForUser,
  updateMeetingForUser,
  updateUserProfile,
  upsertBriefingForUser,
} from './server/storage.ts';
import type { BriefingContent, BriefingSectionKey, UserProfile } from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE_NAME = 'pmb_session';

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  const secretFile = path.resolve(process.cwd(), '.local_data', '.session_secret');
  const dir = path.dirname(secretFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFile, generated, 'utf8');
  return generated;
}

const SESSION_SECRET = getSessionSecret();

function signToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now() }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
    };
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

interface AuthedRequest extends Request {
  currentUser?: UserProfile;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in or enter Demo Mode.' });
      return;
    }
    const userId = verifyToken(token);
    if (!userId) {
      res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      return;
    }
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Account not found. Please sign in again.' });
      return;
    }
    req.currentUser = user;
    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authentication error.';
    res.status(500).json({ error: msg });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_MEETING,
  },
});

const VALID_SECTIONS = new Set<BriefingSectionKey>([
  'executiveSummary',
  'meetingObjectives',
  'backgroundContext',
  'discussionPoints',
  'participantResponsibilities',
  'smartQuestions',
  'risksAndChallenges',
  'expectedDecisions',
  'recommendedActionItems',
  'preparationChecklist',
  'smartAgendaAnalysis',
  'missingInformation',
  'priorityAnalysis',
  'timeAllocation',
  'personalizedBriefing',
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, storageMode: getStorageMode() });
  });

  // Auth routes
  app.get('/api/auth/me', async (req: AuthedRequest, res) => {
    try {
      const token = extractTokenFromRequest(req);
      if (!token) {
        res.json({ user: null, storageMode: getStorageMode() });
        return;
      }
      const userId = verifyToken(token);
      if (!userId) {
        res.json({ user: null, storageMode: getStorageMode() });
        return;
      }
      const user = await getUserById(userId);
      res.json({ user, storageMode: getStorageMode() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load session.' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, defaultRole, organization } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        defaultRole?: string;
        organization?: string;
      };

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Please enter your full name.' });
        return;
      }

      const user = await registerUser({
        email,
        password,
        name,
        defaultRole: defaultRole || 'Meeting Lead',
        organization,
      });
      const token = signToken(user.id);
      setSessionCookie(res, token);
      res.status(201).json({ user, token, storageMode: getStorageMode() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      const user = await authenticateUser(email, password);
      const token = signToken(user.id);
      setSessionCookie(res, token);
      res.json({ user, token, storageMode: getStorageMode() });
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Invalid credentials.' });
    }
  });

  app.post('/api/auth/demo', async (_req, res) => {
    try {
      const user = await getUserById(DEMO_USER_ID);
      if (!user) {
        res.status(500).json({ error: 'Demo profile could not be initialized.' });
        return;
      }
      const token = signToken(user.id);
      setSessionCookie(res, token);
      res.json({ user, token, storageMode: getStorageMode() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to launch Demo Mode.' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  app.patch('/api/profile', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const user = req.currentUser!;
      const { name, defaultRole, organization, preferredTone } = req.body as Partial<UserProfile>;
      const updated = await updateUserProfile(user.id, {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(defaultRole !== undefined ? { defaultRole: defaultRole.trim() } : {}),
        ...(organization !== undefined ? { organization: organization.trim() } : {}),
        ...(preferredTone !== undefined ? { preferredTone } : {}),
      });
      res.json({ user: updated });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update profile.' });
    }
  });

  app.post('/api/demo/reset', requireAuth, async (req: AuthedRequest, res) => {
    try {
      if (req.currentUser!.id !== DEMO_USER_ID) {
        res.status(403).json({ error: 'Demo reset is only available in Demo Mode.' });
        return;
      }
      await resetDemoWorkspace();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to reset demo.' });
    }
  });

  // Dashboard
  app.get('/api/dashboard', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.currentUser!.id;
      const [meetings, briefings, documents, activities] = await Promise.all([
        listMeetingsForUser(userId),
        listBriefingsForUser(userId),
        listDocumentsForUser(userId),
        listActivitiesForUser(userId),
      ]);

      const now = Date.now();
      const upcomingMeetings = meetings.filter((m) => {
        if (m.status === 'Completed') return false;
        if (!m.dateTime) return true;
        const ts = new Date(m.dateTime).getTime();
        return Number.isNaN(ts) || ts >= now - 2 * 60 * 60 * 1000;
      });

      let totalChecklist = 0;
      let doneChecklist = 0;
      for (const b of briefings) {
        for (const item of b.content.preparationChecklist ?? []) {
          totalChecklist += 1;
          if (item.completed) doneChecklist += 1;
        }
      }

      const checklistCompletionPct =
        totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

      res.json({
        summary: {
          totalMeetings: meetings.length,
          briefingsGenerated: briefings.length,
          upcomingMeetings: upcomingMeetings.length,
          checklistCompletionPct,
          storageMode: getStorageMode(),
        },
        meetings,
        briefings,
        documents,
        activities,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load dashboard.' });
    }
  });

  // Meetings CRUD
  app.get('/api/meetings', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const meetings = await listMeetingsForUser(req.currentUser!.id);
      res.json({ meetings });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load meetings.' });
    }
  });

  app.post('/api/meetings', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const body = req.body as {
        title?: string;
        dateTime?: string;
        durationMinutes?: number;
        meetingType?: string;
        participants?: Array<{ id?: string; name?: string; role?: string; focus?: string }>;
        agenda?: string;
        objectives?: string;
        backgroundInfo?: string;
        previousNotes?: string;
        personalizedRole?: string;
      };

      if (!body.title || !body.title.trim()) {
        res.status(400).json({ error: 'Meeting title is required.' });
        return;
      }

      const participants = (body.participants ?? [])
        .filter((p) => p.name?.trim() || p.role?.trim())
        .map((p, idx) => ({
          id: p.id || `p-${idx + 1}`,
          name: (p.name ?? '').trim() || 'Participant',
          role: (p.role ?? '').trim() || 'Contributor',
          focus: (p.focus ?? '').trim(),
        }));

      const created = await createMeetingForUser(req.currentUser!.id, {
        title: body.title.trim(),
        dateTime: body.dateTime || '',
        durationMinutes: Math.min(480, Math.max(10, Number(body.durationMinutes) || 45)),
        meetingType: body.meetingType || 'Project Review',
        participants,
        agenda: (body.agenda ?? '').trim(),
        objectives: (body.objectives ?? '').trim(),
        backgroundInfo: (body.backgroundInfo ?? '').trim(),
        previousNotes: (body.previousNotes ?? '').trim(),
        personalizedRole: (body.personalizedRole ?? req.currentUser!.defaultRole).trim(),
        status: 'Scheduled',
      });

      res.status(201).json({ meeting: created });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create meeting.' });
    }
  });

  app.get('/api/meetings/:id', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const meeting = await getMeetingByIdForUser(String(req.params.id), req.currentUser!.id);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found.' });
        return;
      }
      const [documents, briefing] = await Promise.all([
        listDocumentsForUser(req.currentUser!.id, meeting.id),
        getBriefingByMeetingForUser(meeting.id, req.currentUser!.id),
      ]);
      res.json({ meeting, documents, briefing });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load meeting.' });
    }
  });

  app.patch('/api/meetings/:id', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const updated = await updateMeetingForUser(
        String(req.params.id),
        req.currentUser!.id,
        req.body
      );
      res.json({ meeting: updated });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update meeting.' });
    }
  });

  app.delete('/api/meetings/:id', requireAuth, async (req: AuthedRequest, res) => {
    try {
      await deleteMeetingForUser(String(req.params.id), req.currentUser!.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete meeting.' });
    }
  });

  // Document uploads
  app.get('/api/documents', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const meetingId = typeof req.query.meetingId === 'string' ? req.query.meetingId : undefined;
      const documents = await listDocumentsForUser(req.currentUser!.id, meetingId);
      res.json({ documents });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load documents.' });
    }
  });

  app.post('/api/meetings/:id/documents', requireAuth, (req: AuthedRequest, res: Response) => {
    upload.array('files', MAX_FILES_PER_MEETING)(req, res, async (uploadErr) => {
      if (uploadErr) {
        const msg =
          uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE'
            ? 'File exceeds the 10 MB maximum size limit.'
            : uploadErr instanceof Error
              ? uploadErr.message
              : 'File upload validation failed.';
        res.status(400).json({ error: msg });
        return;
      }

      try {
        const meetingId = String(req.params.id);
        const userId = req.currentUser!.id;
        const meeting = await getMeetingByIdForUser(meetingId, userId);
        if (!meeting) {
          res.status(404).json({ error: 'Meeting not found or access denied.' });
          return;
        }

        const existingDocs = await listDocumentsForUser(userId, meetingId);
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];

        if (files.length === 0) {
          res.status(400).json({ error: 'Please select at least one PDF, DOCX, or TXT file.' });
          return;
        }

        if (existingDocs.length + files.length > MAX_FILES_PER_MEETING) {
          res.status(400).json({
            error: `Maximum ${MAX_FILES_PER_MEETING} documents per meeting allowed (currently ${existingDocs.length}).`,
          });
          return;
        }

        const savedDocs = [];
        for (const file of files) {
          const parsed = await parseUploadedDocument(file);
          const saved = await saveDocumentForUser(userId, {
            meetingId,
            fileName: parsed.fileName,
            fileType: parsed.fileType,
            fileSize: parsed.fileSize,
            extractedText: parsed.extractedText,
            wordCount: parsed.wordCount,
          });
          savedDocs.push(saved);
        }

        res.status(201).json({ documents: savedDocs });
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Document parsing failed.' });
      }
    });
  });

  app.delete('/api/documents/:id', requireAuth, async (req: AuthedRequest, res) => {
    try {
      await deleteDocumentForUser(String(req.params.id), req.currentUser!.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete document.' });
    }
  });

  // AI endpoints
  app.post('/api/ai/analyze-agenda', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { title, meetingType, durationMinutes, agenda, objectives, participantsText } = req.body as {
        title?: string;
        meetingType?: string;
        durationMinutes?: number;
        agenda?: string;
        objectives?: string;
        participantsText?: string;
      };

      if (!agenda?.trim() && !objectives?.trim()) {
        res.status(400).json({ error: 'Please provide an agenda or meeting objectives to analyze.' });
        return;
      }

      const analysis = await analyzeAgendaQuick({
        title: title || 'Draft Meeting',
        meetingType: meetingType || 'Project Review',
        durationMinutes: Number(durationMinutes) || 45,
        agenda: agenda || '',
        objectives: objectives || '',
        participantsText: participantsText || '',
      });

      res.json(analysis);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Agenda analysis failed.' });
    }
  });

  app.post('/api/meetings/:id/briefing/generate', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const meetingId = String(req.params.id);
      const user = req.currentUser!;
      const meeting = await getMeetingByIdForUser(meetingId, user.id);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found.' });
        return;
      }

      const { targetRole } = (req.body ?? {}) as { targetRole?: string };
      const effectiveRole = (targetRole || meeting.personalizedRole || user.defaultRole).trim();
      const documents = await listDocumentsForUser(user.id, meetingId);

      const content = await generateFullBriefing({
        meeting,
        documents,
        targetRole: effectiveRole,
        tone: user.preferredTone,
      });

      const briefing = await upsertBriefingForUser({
        userId: user.id,
        meetingId,
        content,
        personalizedRole: effectiveRole,
        actionLabel: 'AI Briefing Generated',
      });

      res.json({ briefing });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Briefing generation failed.' });
    }
  });

  app.get('/api/meetings/:id/briefing', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const briefing = await getBriefingByMeetingForUser(
        String(req.params.id),
        req.currentUser!.id
      );
      res.json({ briefing });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load briefing.' });
    }
  });

  app.put('/api/briefings/:id', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const user = req.currentUser!;
      const existing = await getBriefingByIdForUser(String(req.params.id), user.id);
      if (!existing) {
        res.status(404).json({ error: 'Briefing not found or access denied.' });
        return;
      }

      const { content, personalizedRole, actionLabel } = req.body as {
        content?: BriefingContent;
        personalizedRole?: string;
        actionLabel?: string;
      };

      if (!content) {
        res.status(400).json({ error: 'Updated briefing content is required.' });
        return;
      }

      const saved = await upsertBriefingForUser({
        userId: user.id,
        meetingId: existing.meetingId,
        content,
        personalizedRole: personalizedRole || existing.personalizedRole,
        actionLabel: actionLabel || 'Briefing Saved',
      });

      res.json({ briefing: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save briefing.' });
    }
  });

  app.post('/api/briefings/:id/regenerate-section', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const user = req.currentUser!;
      const existing = await getBriefingByIdForUser(String(req.params.id), user.id);
      if (!existing) {
        res.status(404).json({ error: 'Briefing not found or access denied.' });
        return;
      }

      const { sectionKey, userInstruction, targetRole } = req.body as {
        sectionKey?: BriefingSectionKey;
        userInstruction?: string;
        targetRole?: string;
      };

      if (!sectionKey || !VALID_SECTIONS.has(sectionKey)) {
        res.status(400).json({ error: 'Invalid briefing section specified.' });
        return;
      }

      const meeting = await getMeetingByIdForUser(existing.meetingId, user.id);
      if (!meeting) {
        res.status(404).json({ error: 'Associated meeting not found.' });
        return;
      }

      const documents = await listDocumentsForUser(user.id, meeting.id);
      const effectiveRole = (targetRole || existing.personalizedRole || user.defaultRole).trim();

      const updatedSection = await regenerateBriefingSection({
        meeting,
        documents,
        existingContent: existing.content,
        sectionKey,
        targetRole: effectiveRole,
        tone: user.preferredTone,
        userInstruction,
      });

      const updatedContent: BriefingContent = {
        ...existing.content,
        [sectionKey]: updatedSection,
      };

      const saved = await upsertBriefingForUser({
        userId: user.id,
        meetingId: existing.meetingId,
        content: updatedContent,
        personalizedRole: effectiveRole,
        actionLabel: `Regenerated ${sectionKey}`,
      });

      res.json({ briefing: saved, sectionKey, updatedSection });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to regenerate section.',
      });
    }
  });

  app.post('/api/briefings/:id/export-log', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const user = req.currentUser!;
      const existing = await getBriefingByIdForUser(String(req.params.id), user.id);
      if (!existing) {
        res.status(404).json({ error: 'Briefing not found.' });
        return;
      }
      const meeting = await getMeetingByIdForUser(existing.meetingId, user.id);
      await recordActivityForUser(
        user.id,
        'PDF Exported',
        `Exported formatted PDF briefing for "${meeting?.title ?? 'Meeting'}".`,
        existing.meetingId
      );
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // Frontend Vite or Static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pre-Meeting Briefer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
