import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1] ?? (req.query.token as string)
  if (!token) {
    res.status(401).json({ error: 'No token provided' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string; email: string; tv?: number }
    // Check tokenVersion to support force-logout (skip if Prisma client is stale)
    if (payload.tv !== undefined) {
      try {
        const { prisma } = await import('../prisma/client.js')
        const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { tokenVersion: true } as any })
        if (user && (user as any).tokenVersion !== undefined && (user as any).tokenVersion !== payload.tv) {
          res.status(401).json({ error: 'Session expired' })
          return
        }
      } catch {
        // Prisma client may not yet include tokenVersion — allow through
      }
    }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
