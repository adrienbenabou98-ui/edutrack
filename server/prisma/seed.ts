import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database…')

  // Clean existing demo data (leaf nodes first to avoid FK violations)
  await prisma.feedback.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.question.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.lessonUnderstanding.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.unitAssessment.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.externalGrade.deleteMany()
  await prisma.externalAssignment.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.message.deleteMany()
  await prisma.studentComment.deleteMany()
  await prisma.understandingLevel.deleteMany()
  await prisma.term.deleteMany()
  await prisma.gradeBoundary.deleteMany()
  await prisma.classroom.deleteMany()
  await prisma.user.deleteMany()

  const hash = (p: string) => bcrypt.hash(p, 12)

  // Teacher
  const teacher = await prisma.user.create({
    data: { email: 'teacher@edutrack.demo', passwordHash: await hash('demo1234'), name: 'Sarah Mitchell', role: 'TEACHER' },
  })

  // Understanding levels
  const [lvlGreen, lvlYellow, lvlRed, lvlGrey] = await Promise.all([
    prisma.understandingLevel.create({ data: { teacherId: teacher.id, label: 'Very Good',     colour: '#4ade80', order: 0, isAbsent: false, category: 'EXCEEDING' } }),
    prisma.understandingLevel.create({ data: { teacherId: teacher.id, label: 'Understood',    colour: '#facc15', order: 1, isAbsent: false, category: 'MEETING'   } }),
    prisma.understandingLevel.create({ data: { teacherId: teacher.id, label: 'Needs Support', colour: '#f87171', order: 2, isAbsent: false, category: 'SUPPORT'   } }),
    prisma.understandingLevel.create({ data: { teacherId: teacher.id, label: 'Missed Lesson', colour: '#d1d5db', order: 3, isAbsent: true,  category: 'ABSENT'    } }),
  ])
  const levelMap: Record<string, string> = {
    GREEN:  lvlGreen.id,
    YELLOW: lvlYellow.id,
    RED:    lvlRed.id,
    GREY:   lvlGrey.id,
  }

  // Students
  const [alice, bob, charlie] = await Promise.all([
    prisma.user.create({ data: { email: 'alice@edutrack.demo', passwordHash: await hash('demo1234'), name: 'Alice Johnson', role: 'STUDENT' } }),
    prisma.user.create({ data: { email: 'bob@edutrack.demo', passwordHash: await hash('demo1234'), name: 'Bob Chen', role: 'STUDENT' } }),
    prisma.user.create({ data: { email: 'charlie@edutrack.demo', passwordHash: await hash('demo1234'), name: 'Charlie Rivera', role: 'STUDENT' } }),
  ])
  const students = [alice, bob, charlie]

  // Terms
  const now = new Date()
  const termStart = new Date(now); termStart.setDate(now.getDate() - 20)
  const termEnd = new Date(now); termEnd.setDate(now.getDate() + 50)
  const term2Start = new Date(now); term2Start.setDate(now.getDate() + 60)
  const term2End = new Date(now); term2End.setDate(now.getDate() + 130)

  const activeTerm = await prisma.term.create({
    data: { teacherId: teacher.id, name: 'Term 2 2026', startDate: termStart, endDate: termEnd, isActive: true },
  })
  await prisma.term.create({
    data: { teacherId: teacher.id, name: 'Term 3 2026', startDate: term2Start, endDate: term2End, isActive: false },
  })

  // ── BIOLOGY CLASSROOM ──────────────────────────────────────────────
  const bioClass = await prisma.classroom.create({
    data: { name: 'Year 10 Biology', teacherId: teacher.id, classCode: 'BIO101' },
  })
  await prisma.enrollment.createMany({
    data: students.map(s => ({ studentId: s.id, classroomId: bioClass.id })),
  })

  // Biology quiz
  const quiz = await prisma.assignment.create({
    data: {
      classroomId: bioClass.id,
      title: 'Cell Biology Quiz',
      instructions: 'Answer all questions carefully. You have one attempt.',
      type: 'QUIZ',
      status: 'PUBLISHED',
      totalPoints: 40,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      questions: {
        create: [
          { text: 'What is the powerhouse of the cell?', type: 'MULTIPLE_CHOICE', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'], correctAnswer: 'Mitochondria', tags: ['cell-organelles'], points: 10 },
          { text: 'DNA replication occurs in the nucleus.', type: 'TRUE_FALSE', correctAnswer: 'True', tags: ['dna', 'nucleus'], points: 10 },
          { text: 'Which process converts glucose into ATP?', type: 'MULTIPLE_CHOICE', options: ['Photosynthesis', 'Osmosis', 'Cellular respiration', 'Fermentation'], correctAnswer: 'Cellular respiration', tags: ['cellular-respiration', 'atp'], points: 10 },
          { text: 'Cell walls are found in animal cells.', type: 'TRUE_FALSE', correctAnswer: 'False', tags: ['cell-structure'], points: 10 },
        ],
      },
    },
    include: { questions: true },
  })

  await prisma.assignment.create({
    data: {
      classroomId: bioClass.id,
      title: 'Photosynthesis Essay',
      instructions: 'Write a 300-word essay explaining photosynthesis.',
      type: 'ASSIGNMENT',
      status: 'PUBLISHED',
      totalPoints: 100,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      questions: {
        create: [
          { text: 'Explain the light-dependent reactions.', type: 'LONG_ANSWER', tags: ['photosynthesis'], points: 50 },
          { text: 'Explain the Calvin cycle.', type: 'LONG_ANSWER', tags: ['photosynthesis'], points: 50 },
        ],
      },
    },
  })

  const aliceSub = await prisma.submission.create({
    data: {
      assignmentId: quiz.id,
      studentId: alice.id,
      totalScore: 75,
      status: 'GRADED',
      answers: {
        create: [
          { questionId: quiz.questions[0].id, responseText: 'Mitochondria', isCorrect: true, pointsAwarded: 10 },
          { questionId: quiz.questions[1].id, responseText: 'True', isCorrect: true, pointsAwarded: 10 },
          { questionId: quiz.questions[2].id, responseText: 'Photosynthesis', isCorrect: false, pointsAwarded: 0 },
          { questionId: quiz.questions[3].id, responseText: 'False', isCorrect: true, pointsAwarded: 10 },
        ],
      },
    },
  })
  await prisma.feedback.create({
    data: {
      submissionId: aliceSub.id,
      teacherNote: 'Good work Alice! Review the difference between photosynthesis and cellular respiration.',
      aiSuggestion: 'Great effort! Focus on distinguishing photosynthesis from cellular respiration.',
    },
  })

  await prisma.message.create({
    data: {
      senderId: teacher.id,
      classroomId: bioClass.id,
      body: 'Welcome to Year 10 Biology! Please complete the Cell Biology Quiz before next Friday.',
    },
  })

  // Biology units — use YELLOW instead of old ORANGE
  const bioUnits = ['Cell Biology', 'Photosynthesis', 'Genetics']
  // levels[student][lesson] for 3 students × 4 lessons each = 12 entries per unit
  const bioLevels = [
    ['GREEN', 'GREEN', 'YELLOW', 'RED'],    // alice
    ['GREEN', 'YELLOW', 'GREEN', 'GREEN'],  // bob
    ['YELLOW', 'RED', 'GREEN', 'GREEN'],    // charlie
  ] as const

  for (let ui = 0; ui < bioUnits.length; ui++) {
    const unit = await prisma.unit.create({
      data: { classroomId: bioClass.id, name: bioUnits[ui], order: ui + 1, termId: activeTerm.id },
    })
    const lessonTitles = [
      `${bioUnits[ui]} — Introduction`,
      `${bioUnits[ui]} — Core Concepts`,
      `${bioUnits[ui]} — Deep Dive`,
      `${bioUnits[ui]} — Review`,
    ]
    const lessons = await Promise.all(lessonTitles.map((title, li) => {
      const d = new Date(termStart); d.setDate(termStart.getDate() + ui * 14 + li * 3)
      return prisma.lesson.create({ data: { unitId: unit.id, title, date: d, order: li + 1 } })
    }))
    for (let si = 0; si < students.length; si++) {
      for (let li = 0; li < lessons.length; li++) {
        await prisma.lessonUnderstanding.create({
          data: { lessonId: lessons[li].id, studentId: students[si].id, understandingLevelId: levelMap[bioLevels[si][li]] },
        })
      }
      await prisma.unitAssessment.create({
        data: { unitId: unit.id, studentId: students[si].id, score: [78, 65, 82][si] - ui * 3, totalMarks: 100 },
      })
    }
  }

  // Biology external assignments
  const bioExt = await Promise.all([
    { title: 'Lab Report 1', daysAgo: 15, total: 50, weight: 20 },
    { title: 'Worksheet — Cells', daysAgo: 8, total: 20, weight: 0 },
    { title: 'Practical Exam', daysAgo: 2, total: 100, weight: 30 },
  ].map(({ title, daysAgo, total, weight }) => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo)
    return prisma.externalAssignment.create({
      data: { classroomId: bioClass.id, title, date: d, totalMarks: total, weight },
    })
  }))

  const bioRawScores = [[42, 16, 88], [35, 14, 71], [48, 18, 95]]
  for (let si = 0; si < students.length; si++) {
    for (let ai = 0; ai < bioExt.length; ai++) {
      await prisma.externalGrade.create({
        data: { externalAssignmentId: bioExt[ai].id, studentId: students[si].id, score: bioRawScores[si][ai] },
      })
    }
  }

  // ── MATHS CLASSROOM ────────────────────────────────────────────────
  const mathClass = await prisma.classroom.create({
    data: { name: 'Maths', teacherId: teacher.id, classCode: 'MATH01' },
  })
  await prisma.enrollment.createMany({
    data: students.map(s => ({ studentId: s.id, classroomId: mathClass.id })),
  })

  // UNIT 1: Shapes
  const shapesUnit = await prisma.unit.create({
    data: { classroomId: mathClass.id, name: 'Shapes', order: 1, termId: activeTerm.id },
  })
  const shapesLessons = await Promise.all([
    '2D Shapes',
    'Making 2D Shapes',
    '3D Shapes',
    'Making 3D Shapes',
  ].map((title, li) => {
    const d = new Date(termStart); d.setDate(termStart.getDate() + li * 3)
    return prisma.lesson.create({ data: { unitId: shapesUnit.id, title, date: d, order: li + 1 } })
  }))

  // Lesson understanding spread: GREEN/YELLOW/RED/GREY all visible
  const shapesLevels = [
    ['GREEN', 'GREEN', 'YELLOW', 'GREEN'],   // alice — good
    ['YELLOW', 'GREEN', 'RED', 'YELLOW'],    // bob — mixed
    ['RED', 'YELLOW', 'GREY', 'RED'],        // charlie — struggling, missed lesson 3
  ] as const

  for (let si = 0; si < students.length; si++) {
    for (let li = 0; li < shapesLessons.length; li++) {
      await prisma.lessonUnderstanding.create({
        data: { lessonId: shapesLessons[li].id, studentId: students[si].id, understandingLevelId: levelMap[shapesLevels[si][li]] },
      })
    }
    await prisma.unitAssessment.create({
      data: { unitId: shapesUnit.id, studentId: students[si].id, score: [88, 61, 45][si], totalMarks: 100 },
    })
  }

  // UNIT 2: Algebra / Numbers
  const algebraUnit = await prisma.unit.create({
    data: { classroomId: mathClass.id, name: 'Algebra / Numbers', order: 2, termId: activeTerm.id },
  })
  const algebraLessons = await Promise.all([
    'Numbers up to 100',
    'Addition up to 10',
    'Addition up to 20',
    'Subtraction in numbers 1–10',
    'Subtraction in numbers 10–20',
  ].map((title, li) => {
    const d = new Date(termStart); d.setDate(termStart.getDate() + 14 + li * 3)
    return prisma.lesson.create({ data: { unitId: algebraUnit.id, title, date: d, order: li + 1 } })
  }))

  const algebraLevels = [
    ['GREEN', 'GREEN', 'YELLOW', 'GREEN', 'GREY'],   // alice — missed last lesson
    ['GREEN', 'YELLOW', 'GREY', 'YELLOW', 'RED'],    // bob — missed lesson 3
    ['YELLOW', 'RED', 'RED', 'GREY', 'RED'],         // charlie — struggling
  ] as const

  for (let si = 0; si < students.length; si++) {
    for (let li = 0; li < algebraLessons.length; li++) {
      await prisma.lessonUnderstanding.create({
        data: { lessonId: algebraLessons[li].id, studentId: students[si].id, understandingLevelId: levelMap[algebraLevels[si][li]] },
      })
    }
    await prisma.unitAssessment.create({
      data: { unitId: algebraUnit.id, studentId: students[si].id, score: [92, 58, 39][si], totalMarks: 100 },
    })
  }

  // Maths external assignment
  const mathExt = await prisma.externalAssignment.create({
    data: {
      classroomId: mathClass.id,
      title: 'Term Test 1',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      totalMarks: 50,
      weight: 40,
    },
  })
  const mathScores = [45, 31, 22]
  for (let si = 0; si < students.length; si++) {
    await prisma.externalGrade.create({
      data: { externalAssignmentId: mathExt.id, studentId: students[si].id, score: mathScores[si] },
    })
  }

  // Teacher comment for Alice (for PDF testing)
  await prisma.studentComment.create({
    data: {
      studentId: alice.id,
      teacherId: teacher.id,
      strengths: 'Strong spatial reasoning\nEngages well in group tasks',
      weaknesses: 'Needs more practice with subtraction beyond 10',
      notes: 'Alice is a motivated student. Consider extension problems for shapes unit.',
    },
  })

  console.log('\n✓ Seed complete! Demo accounts:')
  console.log('  Teacher:  teacher@edutrack.demo  /  demo1234')
  console.log('  Student:  alice@edutrack.demo    /  demo1234')
  console.log('  Student:  bob@edutrack.demo      /  demo1234')
  console.log('  Student:  charlie@edutrack.demo  /  demo1234')
  console.log('\n  Classes: BIO101 (Year 10 Biology), MATH01 (Maths)\n')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
