import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  role: z.enum(['TEACHER', 'STUDENT'], { message: 'Role must be TEACHER or STUDENT' }),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(1, 'Password is required').optional(),
  username: z.string().min(1).optional(),
  classCode: z.string().min(1).optional(),
}).refine(
  data => (data.email && data.password) || (data.username && data.classCode),
  { message: 'Provide email+password or username+classCode' }
)
