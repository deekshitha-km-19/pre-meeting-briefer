import { jsPDF } from 'jspdf';
import type { BriefingContent, Meeting } from '../types';

export function briefingToMarkdown(meeting: Meeting, content: BriefingContent): string {
  const lines: string[] = [];
  lines.push(`# Pre-Meeting Briefing: ${meeting.title}`);
  lines.push(
    `Date: ${meeting.dateTime || 'Unscheduled'} | Duration: ${meeting.durationMinutes} min | Type: ${meeting.meetingType} | Personalized Role: ${content.personalizedBriefing.targetRole}`
  );
  lines.push('');

  lines.push('## 1. Executive Summary');
  lines.push(content.executiveSummary.summary);
  lines.push(`Readiness Note (${content.executiveSummary.sourceBasis}): ${content.executiveSummary.meetingReadinessNote}`);
  lines.push('');

  lines.push('## 2. Meeting Objectives');
  content.meetingObjectives.forEach((o, i) => {
    lines.push(`${i + 1}. [${o.priority} · ${o.sourceBasis}] ${o.objective} (${o.clarityStatus})`);
  });
  lines.push('');

  lines.push('## 3. Background Context');
  lines.push('### Verified Facts');
  content.backgroundContext.verifiedFacts.forEach((f) => lines.push(`- ${f}`));
  if (content.backgroundContext.inferredContext.length > 0) {
    lines.push('### AI-Synthesized Context');
    content.backgroundContext.inferredContext.forEach((c) => lines.push(`- ${c}`));
  }
  lines.push('');

  lines.push('## 4. Important Discussion Points');
  content.discussionPoints.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.topic} (${d.priority} · ${d.suggestedMinutes} min · ${d.sourceBasis})`);
    lines.push(`   Agenda alignment: ${d.agendaAlignment}`);
  });
  lines.push('');

  lines.push('## 5. Participant Responsibilities');
  content.participantResponsibilities.forEach((p) => {
    lines.push(`- ${p.name} (${p.role}) [${p.ownershipClarity}]`);
    lines.push(`  Pre-meeting prep: ${p.preMeetingPrep}`);
    lines.push(`  In-meeting role: ${p.inMeetingResponsibility}`);
  });
  lines.push('');

  lines.push('## 6. Smart Questions to Ask');
  content.smartQuestions.forEach((q, i) => {
    lines.push(`${i + 1}. [${q.category} -> ${q.targetRole}] ${q.question}`);
    lines.push(`   Why it matters: ${q.rationale}`);
  });
  lines.push('');

  lines.push('## 7. Potential Risks & Challenges');
  content.risksAndChallenges.forEach((r, i) => {
    lines.push(`${i + 1}. [${r.severity} · ${r.sourceBasis}] ${r.risk}`);
    lines.push(`   Impact: ${r.impact}`);
    lines.push(`   Mitigation: ${r.mitigationStrategy}`);
  });
  lines.push('');

  lines.push('## 8. Expected Decisions');
  content.expectedDecisions.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.decision} (Owner: ${d.owner} · ${d.urgency} · ${d.sourceBasis})`);
  });
  lines.push('');

  lines.push('## 9. Recommended Action Items');
  content.recommendedActionItems.forEach((a, i) => {
    lines.push(`${i + 1}. [${a.priority}] ${a.action} — Owner: ${a.suggestedOwner} (${a.timeframe})`);
  });
  lines.push('');

  lines.push('## 10. Preparation Checklist');
  content.preparationChecklist.forEach((c) => {
    lines.push(`- [${c.completed ? 'x' : ' '}] (${c.category} · ${c.estimatedMinutes} min) ${c.task}`);
  });
  lines.push('');

  lines.push('## Missing Information Detected');
  content.missingInformation.forEach((m, i) => {
    lines.push(`${i + 1}. [${m.severity}] ${m.gap} — Ask: ${m.whoCanClarify}`);
  });
  lines.push('');

  lines.push('## Suggested Time Allocation');
  content.timeAllocation.segments.forEach((s) => {
    lines.push(`- ${s.minutes} min: ${s.segment} (Lead: ${s.leadRole}) — ${s.purpose}`);
  });
  lines.push('');
  lines.push(`Grounding Note: ${content.groundingDisclaimer}`);

  return lines.join('\n');
}

export function exportBriefingToPdf(meeting: Meeting, content: BriefingContent): string {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 48;
    }
  };

  const addWrappedText = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; lineHeight?: number } = {}
  ) => {
    const size = opts.size ?? 10;
    const lineHeight = opts.lineHeight ?? size * 1.45;
    const indent = opts.indent ?? 0;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const [r, g, b] = opts.color ?? [30, 41, 59];
    doc.setTextColor(r, g, b);

    const safeText = (text || '').replace(/[^\x20-\x7E\n]/g, '-');
    const lines = doc.splitTextToSize(safeText, maxWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight + 4);
      doc.text(line, margin + indent, y);
      y += lineHeight;
    }
  };

  const addSectionHeader = (title: string) => {
    ensureSpace(34);
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 14;
  };

  // Navy Header Banner
  doc.setFillColor(11, 22, 44);
  doc.rect(0, 0, pageWidth, 108, 'F');
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 104, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(196, 181, 253);
  doc.text('PRE-MEETING BRIEFER  ·  EXECUTIVE PREPARATION BRIEF', margin, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(
    (meeting.title || 'Meeting Brief').replace(/[^\x20-\x7E]/g, '-'),
    maxWidth
  ) as string[];
  doc.text(titleLines.slice(0, 2), margin, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${meeting.meetingType}  |  ${meeting.durationMinutes} min  |  ${meeting.dateTime || 'Unscheduled'}  |  Role: ${content.personalizedBriefing.targetRole}`,
    margin,
    90
  );

  y = 128;

  // 1. Executive Summary
  addSectionHeader('1. Executive Summary');
  addWrappedText(content.executiveSummary.summary, { size: 10.5 });
  y += 4;
  addWrappedText(
    `Readiness (${content.executiveSummary.sourceBasis}): ${content.executiveSummary.meetingReadinessNote}`,
    { size: 9.5, color: [71, 85, 105] }
  );

  // Personalized Briefing
  addSectionHeader(`Personalized Focus: ${content.personalizedBriefing.targetRole}`);
  addWrappedText(content.personalizedBriefing.focusSummary, { size: 10 });
  content.personalizedBriefing.talkingPoints.forEach((tp) => {
    addWrappedText(`- Talking Point: ${tp}`, { size: 9.5, indent: 10 });
  });

  // 2. Meeting Objectives
  addSectionHeader('2. Meeting Objectives');
  content.meetingObjectives.forEach((obj, i) => {
    addWrappedText(
      `${i + 1}. [${obj.priority} | ${obj.clarityStatus}] ${obj.objective}`,
      { size: 10 }
    );
  });

  // 3. Background Context
  addSectionHeader('3. Background Context');
  addWrappedText('Verified Facts from Inputs & Documents:', { size: 10, bold: true });
  content.backgroundContext.verifiedFacts.forEach((fact) => {
    addWrappedText(`- ${fact}`, { size: 9.5, indent: 10 });
  });
  if (content.backgroundContext.inferredContext.length > 0) {
    y += 4;
    addWrappedText('AI-Synthesized Context:', { size: 10, bold: true, color: [91, 33, 182] });
    content.backgroundContext.inferredContext.forEach((ctx) => {
      addWrappedText(`- ${ctx}`, { size: 9.5, indent: 10 });
    });
  }

  // 4. Discussion Points & Time Allocation
  addSectionHeader('4. Discussion Points & Suggested Time Allocation');
  content.timeAllocation.segments.forEach((seg) => {
    addWrappedText(
      `- ${seg.minutes} min | ${seg.segment} (Lead: ${seg.leadRole}) — ${seg.purpose}`,
      { size: 9.5 }
    );
  });

  // 5. Participant Responsibilities
  addSectionHeader('5. Participant Responsibilities');
  content.participantResponsibilities.forEach((p) => {
    addWrappedText(`${p.name} — ${p.role} (${p.ownershipClarity})`, { size: 10, bold: true });
    addWrappedText(`Pre-work: ${p.preMeetingPrep} | In-meeting: ${p.inMeetingResponsibility}`, {
      size: 9.5,
      indent: 10,
      color: [71, 85, 105],
    });
  });

  // 6. Smart Questions
  addSectionHeader('6. Smart Questions to Ask');
  content.smartQuestions.forEach((q, i) => {
    addWrappedText(`${i + 1}. [${q.category} -> ${q.targetRole}] ${q.question}`, { size: 10 });
    addWrappedText(`Rationale: ${q.rationale}`, { size: 9, indent: 12, color: [71, 85, 105] });
  });

  // 7. Risks & Missing Info
  addSectionHeader('7. Potential Risks & Missing Information');
  content.risksAndChallenges.forEach((r) => {
    addWrappedText(`- [${r.severity} Risk] ${r.risk} — Mitigation: ${r.mitigationStrategy}`, {
      size: 9.5,
    });
  });
  if (content.missingInformation.length > 0) {
    y += 4;
    addWrappedText('Missing Information Detected:', { size: 10, bold: true, color: [180, 83, 9] });
    content.missingInformation.forEach((m) => {
      addWrappedText(`- [${m.severity}] ${m.gap} (Clarify with: ${m.whoCanClarify})`, {
        size: 9.5,
        indent: 10,
      });
    });
  }

  // 8. Expected Decisions & 9. Action Items
  addSectionHeader('8. Expected Decisions & 9. Recommended Action Items');
  content.expectedDecisions.forEach((d, i) => {
    addWrappedText(`${i + 1}. Decision: ${d.decision} (Owner: ${d.owner} | ${d.urgency})`, {
      size: 9.5,
    });
  });
  y += 4;
  content.recommendedActionItems.forEach((a, i) => {
    addWrappedText(
      `${i + 1}. Action [${a.priority}]: ${a.action} — ${a.suggestedOwner} (${a.timeframe})`,
      { size: 9.5 }
    );
  });

  // 10. Preparation Checklist
  addSectionHeader('10. Preparation Checklist');
  content.preparationChecklist.forEach((c) => {
    const box = c.completed ? '[DONE]' : '[    ]';
    addWrappedText(`${box} (${c.category}, ${c.estimatedMinutes}m) ${c.task}`, { size: 9.5 });
  });

  y += 8;
  addWrappedText(content.groundingDisclaimer, { size: 8.5, color: [100, 116, 139] });

  const safeFile =
    (meeting.title || 'Meeting_Briefing')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Meeting_Briefing';
  const fileName = `${safeFile}_Briefing.pdf`;
  doc.save(fileName);
  return fileName;
}
