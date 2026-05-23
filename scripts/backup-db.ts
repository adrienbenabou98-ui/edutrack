/**
 * Exports a full DB snapshot to backups/backup-YYYY-MM-DD.json
 * Run with: npx tsx scripts/backup-db.ts
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

const [
  users, classrooms, enrollments, assignments, submissions,
  gradeBoundaries, unitGrades, studentComments, terms,
  externalAssignments, externalGrades, units, lessons,
  lessonUnderstandings, understandingLevels, unitAssessments,
  platformSettings, announcements, auditLogs,
] = await Promise.all([
  prisma.user.findMany({ select: { id:true, name:true, email:true, role:true, suspended:true, createdAt:true } }),
  prisma.classroom.findMany(),
  prisma.enrollment.findMany(),
  prisma.assignment.findMany(),
  prisma.submission.findMany(),
  prisma.gradeBoundary.findMany(),
  prisma.unitGrade.findMany(),
  prisma.studentComment.findMany(),
  prisma.term.findMany(),
  prisma.externalAssignment.findMany(),
  prisma.externalGrade.findMany(),
  prisma.unit.findMany(),
  prisma.lesson.findMany(),
  prisma.lessonUnderstanding.findMany(),
  prisma.understandingLevel.findMany(),
  prisma.unitAssessment.findMany(),
  prisma.platformSetting.findMany(),
  prisma.announcement.findMany(),
  prisma.auditLog.findMany(),
])

const backup = {
  exportedAt: new Date().toISOString(),
  counts: { users: users.length, classrooms: classrooms.length, assignments: assignments.length, submissions: submissions.length },
  users, classrooms, enrollments, assignments, submissions,
  gradeBoundaries, unitGrades, studentComments, terms,
  externalAssignments, externalGrades, units, lessons,
  lessonUnderstandings, understandingLevels, unitAssessments,
  platformSettings, announcements, auditLogs,
}

mkdirSync(join(__dirname, '../backups'), { recursive: true })
const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`
const outPath = join(__dirname, '../backups', filename)
writeFileSync(outPath, JSON.stringify(backup, null, 2))
console.log(`Backup saved: ${outPath}`)
console.log(`Users: ${users.length} | Classrooms: ${classrooms.length} | Assignments: ${assignments.length} | Submissions: ${submissions.length}`)

await prisma.$disconnect()
