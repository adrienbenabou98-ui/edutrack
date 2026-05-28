import { z } from 'zod'

const questionSchema = z.object({
  text: z.string().max(5000),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER']),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  points: z.number().int().positive().max(1000).optional(),
})

export const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  instructions: z.string().max(10000).optional().nullable(),
  classroomId: z.string().min(1, 'classroomId is required'),
  type: z.enum(['ASSIGNMENT', 'QUIZ', 'EXAM'], { message: 'Invalid assignment type' }),
  totalPoints: z.number().positive().max(10000).optional(),
  dueDate: z.string().optional().nullable(),
  subject: z.string().max(200).optional().nullable(),
  unitName: z.string().max(200).optional().nullable(),
  rubricId: z.string().optional().nullable(),
  timeLimit: z.number().int().positive().optional().nullable(),
  resubmissionsAllowed: z.boolean().optional(),
  maxResubmissions: z.number().int().min(0).max(50).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  questions: z.array(questionSchema).optional(),
})

export const updateAssignmentSchema = createAssignmentSchema.partial()
