import { z } from 'zod'

export const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(5000).optional(),
  classroomId: z.string().min(1, 'classroomId is required'),
  totalMarks: z.number({ invalid_type_error: 'totalMarks must be a number' }).positive('totalMarks must be positive').max(10000),
  dueDate: z.string().datetime({ message: 'dueDate must be a valid ISO date' }).optional().nullable(),
  type: z.enum(['MCQ', 'SHORT_ANSWER', 'FILE'], { message: 'Invalid assignment type' }).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export const updateAssignmentSchema = createAssignmentSchema.partial()
