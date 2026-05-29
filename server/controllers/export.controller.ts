import { Response } from 'express'
import { createRequire } from 'module'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'
import { getClassroomAnalytics } from '../services/analytics.service.js'
import { getGrade, lessonSummativeColour, DEFAULT_BOUNDARIES } from '../services/gradeUtils.js'
import type { UnderstandingLevelRecord } from '../services/gradeUtils.js'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')

export async function exportClassroomCSV(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const data = await getClassroomAnalytics(classroomId)
  const rows = [
    ['Student Name', 'Average Score (%)', 'Submissions', 'Trend', 'Weak Areas', 'At Risk'],
    ...data.studentStats.map(s => [
      s.studentName,
      s.averageScore ?? 'N/A',
      s.submissionCount,
      s.trend,
      s.weakTags.join('; '),
      s.atRisk ? 'Yes' : 'No',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${classroom.name}-report.csv"`)
  res.send(csv)
}

export async function exportStudentReport(req: AuthRequest, res: Response) {
  const { studentId } = req.params

  // Verify the requesting teacher has this student in one of their classrooms
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, classroom: { teacherId: req.user!.id } },
  })
  if (!enrollment) { res.status(403).json({ error: 'Forbidden' }); return }

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true, email: true } })
  if (!student) { res.status(404).json({ error: 'Not found' }); return }
  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: { assignment: { select: { title: true, totalPoints: true, classroom: { select: { name: true } } } }, feedback: true },
    orderBy: { submittedAt: 'desc' },
  })
  const rows = [
    ['Assignment', 'Classroom', 'Score (%)', 'Submitted At', 'AI Feedback'],
    ...submissions.map(s => [
      s.assignment.title,
      s.assignment.classroom.name,
      s.totalScore ?? 'N/A',
      new Date(s.submittedAt).toLocaleDateString(),
      s.feedback?.aiSuggestion ?? '',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${student.name}-report.csv"`)
  res.send(csv)
}

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1f2937' : 'white'
}

export async function exportStudentPDF(req: AuthRequest, res: Response) {
  const { studentId } = req.params
  const { classroomId, unitIds, sections } = req.body as {
    classroomId: string
    unitIds: string[]
    sections: { assignments: boolean; lessons: boolean; assessment: boolean; comments: boolean }
  }

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, email: true } })
  if (!student) { res.status(404).json({ error: 'Not found' }); return }

  const teacher = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } })

  const teacherLevels: UnderstandingLevelRecord[] = await (async () => {
    const levels = await prisma.understandingLevel.findMany({
      where: { teacherId: req.user!.id },
      orderBy: { order: 'asc' },
    })
    if (levels.length > 0) return levels
    return [
      { id: 'GREEN',  label: 'Very Good',     colour: '#4ade80', order: 0, isAbsent: false },
      { id: 'YELLOW', label: 'Understood',    colour: '#facc15', order: 1, isAbsent: false },
      { id: 'RED',    label: 'Needs Support', colour: '#f87171', order: 2, isAbsent: false },
      { id: 'GREY',   label: 'Missed Lesson', colour: '#d1d5db', order: 3, isAbsent: true  },
    ]
  })()
  const levelMap = new Map(teacherLevels.map(l => [l.id, l]))

  const boundaries = await (async () => {
    const b = await prisma.gradeBoundary.findMany({ where: { teacherId: req.user!.id }, orderBy: { minScore: 'desc' } })
    return b.length > 0 ? b : DEFAULT_BOUNDARIES.map(d => ({ ...d, id: d.label }))
  })()

  const activeTerm = await prisma.term.findFirst({ where: { teacherId: req.user!.id, isActive: true } })

  const units = await prisma.unit.findMany({
    where: {
      classroomId,
      ...(unitIds?.length ? { id: { in: unitIds } } : {}),
    },
    include: {
      lessons: { include: { understandings: { where: { studentId } } }, orderBy: { order: 'asc' } },
      unitAssessments: { where: { studentId } },
    },
    orderBy: { order: 'asc' },
  })

  const externalAssignments = sections.assignments ? await prisma.externalAssignment.findMany({
    where: { classroomId },
    include: { externalGrades: { where: { studentId } } },
    orderBy: { date: 'asc' },
  }) : []

  const comment = sections.comments ? await prisma.studentComment.findUnique({
    where: { studentId_teacherId: { studentId, teacherId: req.user!.id } },
  }) : null

  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${student.name.replace(/\s+/g, '_')}_Report.pdf"`)
  doc.pipe(res)

  const W = 495
  const indigo = '#4f46e5'
  const gray = '#6b7280'

  function hline(y: number) { doc.moveTo(50, y).lineTo(545, y).stroke('#e5e7eb') }

  function sectionHeader(title: string) {
    doc.moveDown(0.5)
    doc.fontSize(11).fillColor(indigo).font('Helvetica-Bold').text(title)
    doc.moveDown(0.2)
    doc.font('Helvetica')
  }

  // ── COVER PAGE ──────────────────────────────────────────────────────
  doc.rect(50, 50, W, 4).fill(indigo)
  doc.moveDown(3)
  doc.fontSize(28).fillColor(indigo).font('Helvetica-Bold').text('Student Report', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(14).fillColor('#1f2937').font('Helvetica').text(student.name, { align: 'center' })
  doc.moveDown(0.2)
  if (student.email) {
    doc.fontSize(11).fillColor(gray).text(student.email, { align: 'center' })
  }
  doc.moveDown(1)
  if (activeTerm) {
    doc.fontSize(11).fillColor('#374151').text(`Term: ${activeTerm.name}`, { align: 'center' })
  }
  doc.text(`Class: ${classroom.name}`, { align: 'center' })
  doc.text(`Teacher: ${teacher?.name ?? ''}`, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' })
  doc.moveDown(1.5)

  if (units.length > 0) {
    doc.fontSize(11).fillColor(indigo).font('Helvetica-Bold').text('Units included in this report:', { align: 'center' })
    doc.font('Helvetica').fillColor('#374151').fontSize(10)
    units.forEach(u => doc.text(`• ${u.name}`, { align: 'center' }))
  }

  if (teacherLevels.length > 0) {
    doc.moveDown(1.2)
    doc.fontSize(10).fillColor(indigo).font('Helvetica-Bold').text('Understanding Level Key', { align: 'center' })
    doc.font('Helvetica').moveDown(0.4)
    teacherLevels.forEach(l => {
      const legendY = doc.y
      doc.rect(242, legendY, 12, 12).fill(l.colour)
      const suffix = l.isAbsent ? ' — absent' : ''
      doc.fontSize(9).fillColor('#374151').text(`   ${l.label}${suffix}`, 260, legendY + 1)
      doc.moveDown(0.35)
    })
  }

  doc.rect(50, 760, W, 4).fill(indigo)

  // ── UNIT PAGES ──────────────────────────────────────────────────────
  for (const unit of units) {
    doc.addPage()
    doc.fontSize(16).fillColor(indigo).font('Helvetica-Bold').text(unit.name)
    doc.fontSize(10).fillColor(gray).font('Helvetica').text(activeTerm?.name ?? classroom.name)
    doc.moveDown(0.5)
    hline(doc.y)
    doc.moveDown(0.5)

    // Lesson Understanding table
    if (sections.lessons && unit.lessons.length > 0) {
      sectionHeader('Lesson Understanding')

      // Table header
      const lessonColW = [280, 180]
      const headerY = doc.y
      doc.rect(50, headerY, W, 16).fill('#f3f4f6')
      doc.fontSize(9).fillColor(gray).font('Helvetica-Bold')
      doc.text('Lesson', 54, headerY + 4, { width: lessonColW[0] })
      doc.text('Understanding', 54 + lessonColW[0], headerY + 4, { width: lessonColW[1] })
      doc.font('Helvetica')
      doc.moveDown(1.2)

      for (const lesson of unit.lessons) {
        const u = lesson.understandings[0]
        const levelId = u?.understandingLevelId ?? null
        const levelRecord = levelId ? levelMap.get(levelId) : null
        const colour = levelRecord ? levelRecord.colour : '#e5e7eb'
        const label = levelRecord ? levelRecord.label : 'Not recorded'
        const rowY = doc.y

        doc.fontSize(9).fillColor('#111827').text(lesson.title, 54, rowY, { width: lessonColW[0] - 4 })

        const cellX = 54 + lessonColW[0]
        const cellH = 14
        doc.rect(cellX, rowY - 1, lessonColW[1] - 4, cellH).fill(colour)
        const textColour = levelRecord ? contrastText(levelRecord.colour) : '#9ca3af'
        doc.fontSize(8).fillColor(textColour).font('Helvetica-Bold')
          .text(label, cellX + 4, rowY + 2, { width: lessonColW[1] - 12 })
        doc.font('Helvetica')
        doc.moveDown(0.5)
      }

      const levelIds = unit.lessons.map(l => l.understandings[0]?.understandingLevelId ?? null)
      const summative = lessonSummativeColour(levelIds, teacherLevels)
      doc.moveDown(0.3)

      const summResultY = doc.y
      if (summative) {
        doc.fontSize(9).fillColor(gray).text('Summative Unit Result: ', 54, summResultY, { continued: true })
        doc.rect(54 + 140, summResultY - 1, 120, 14).fill(summative.colour)
        doc.fontSize(9).fillColor(contrastText(summative.colour)).font('Helvetica-Bold')
          .text(summative.label, 58 + 140, summResultY + 2, { width: 112, align: 'center' })
        doc.font('Helvetica')
      } else {
        doc.fontSize(9).fillColor(gray).text('Summative Unit Result: No attended lessons recorded', 54, summResultY)
      }
      doc.moveDown(0.8)
    }

    // End of Unit Assessment
    if (sections.assessment && unit.unitAssessments.length > 0) {
      sectionHeader('End of Unit Assessment')
      const assessment = unit.unitAssessments[0]
      const pct = assessment.score !== null ? (assessment.score / assessment.totalMarks) * 100 : null
      const g = pct !== null ? getGrade(pct, boundaries as any) : null

      doc.fontSize(10).fillColor('#111827')
        .text(`Score: ${assessment.score ?? '—'} / ${assessment.totalMarks}   ·   ${pct !== null ? pct.toFixed(1) + '%' : '—'}${g ? `   (${g.label})` : ''}`)

      if (g) {
        const badgeY = doc.y + 4
        doc.rect(50, badgeY, 90, 18).fill(g.colour)
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(g.label, 50, badgeY + 5, { width: 90, align: 'center' })
        doc.font('Helvetica').moveDown(1)
      }
      doc.moveDown(0.5)
    }
  }

  // ── ASSIGNMENT GRADES PAGE ──────────────────────────────────────────
  if (sections.assignments && externalAssignments.length > 0) {
    doc.addPage()
    doc.fontSize(16).fillColor(indigo).font('Helvetica-Bold').text('Assignment Grades')
    doc.moveDown(0.5)
    hline(doc.y)
    doc.moveDown(0.5)

    const colW = [170, 50, 75, 60, 80]
    const headers = ['Assignment', 'Weight', 'Score', '%', 'Grade']
    let x = 50
    const hdrY = doc.y
    doc.rect(50, hdrY, W, 16).fill('#f3f4f6')
    headers.forEach((h, i) => {
      doc.fontSize(9).fillColor(gray).font('Helvetica-Bold').text(h, x + 2, hdrY + 4, { width: colW[i] })
      x += colW[i]
    })
    doc.font('Helvetica').moveDown(1.2)
    hline(doc.y)
    doc.moveDown(0.2)

    let weightedSum = 0
    let weightTotal = 0
    let hasNonDefaultWeight = false

    for (const ea of externalAssignments) {
      const grade = ea.externalGrades[0]
      const score = grade?.score ?? null
      const pct = score !== null ? (score / ea.totalMarks) * 100 : null
      const g = pct !== null ? getGrade(pct, boundaries as any) : null
      const w = (ea as any).weight ?? 0

      if (pct !== null && w > 0) {
        weightedSum += pct * w
        weightTotal += w
      }
      if (w !== 0) hasNonDefaultWeight = true

      x = 50
      const rowY = doc.y
      const vals = [
        ea.title,
        w > 0 ? `${w}%` : '—',
        score !== null ? `${score}/${ea.totalMarks}` : '—',
        pct !== null ? `${pct.toFixed(1)}%` : '—',
        g ? g.label : '—',
      ]
      vals.forEach((v, i) => {
        doc.fontSize(9).fillColor('#111827').text(v, x + 2, rowY, { width: colW[i] })
        x += colW[i]
      })
      doc.moveDown(0.35)
    }

    doc.moveDown(0.2)
    hline(doc.y)
    doc.moveDown(0.3)

    if (weightTotal > 0) {
      const wavg = weightedSum / weightTotal
      const wg = getGrade(wavg, boundaries as any)
      doc.fontSize(9).fillColor(indigo).font('Helvetica-Bold')
        .text(`Weighted Average: ${wavg.toFixed(1)}%${wg ? ` (${wg.label})` : ''}`)
      doc.font('Helvetica')
    } else {
      const scores = externalAssignments
        .map(ea => {
          const g = ea.externalGrades[0]
          return g?.score !== null && g?.score !== undefined ? (g.score / ea.totalMarks) * 100 : null
        })
        .filter((v): v is number => v !== null)
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        doc.fontSize(9).fillColor(indigo).font('Helvetica-Bold').text(`Average: ${avg.toFixed(1)}%`)
        doc.font('Helvetica')
      }
    }

    if (hasNonDefaultWeight) {
      doc.moveDown(0.4)
      doc.fontSize(8).fillColor(gray).text('* Weighted average accounts for individual assignment weights')
    }
  }

  // ── NOTES PAGE ──────────────────────────────────────────────────────
  if (sections.comments && comment && (comment.strengths || comment.weaknesses || comment.notes)) {
    doc.addPage()
    doc.fontSize(16).fillColor(indigo).font('Helvetica-Bold').text('Notes')
    doc.moveDown(0.5)
    hline(doc.y)
    doc.moveDown(0.5)

    if (comment.strengths) {
      sectionHeader('Strengths')
      comment.strengths.split('\n').filter(Boolean).forEach(s => {
        doc.fontSize(10).fillColor('#111827').text(`• ${s}`)
      })
      doc.moveDown(0.3)
    }
    if (comment.weaknesses) {
      sectionHeader('Areas for Improvement')
      comment.weaknesses.split('\n').filter(Boolean).forEach(s => {
        doc.fontSize(10).fillColor('#111827').text(`• ${s}`)
      })
      doc.moveDown(0.3)
    }
    if (comment.notes) {
      sectionHeader('General Notes')
      doc.fontSize(10).fillColor('#111827').text(comment.notes)
      doc.moveDown(0.3)
    }
  }

  doc.end()
}
