import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      // Zod v4 renamed `.errors` to `.issues`; fall back for safety across versions.
      const zodErr = result.error as ZodError
      const issues = (zodErr.issues ?? (zodErr as any).errors ?? [])
      const errors = issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      res.status(400).json({ error: 'Validation failed', details: errors })
      return
    }
    req.body = result.data
    next()
  }
}
