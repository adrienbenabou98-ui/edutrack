import { Request, Response, NextFunction } from 'express'

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)\s+instructions/i,
  /disregard\s+(your\s+)?(system\s+prompt|instructions)/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /jailbreak/i,
  /repeat\s+after\s+me/i,
  /forget\s+(everything|all)\s+(you\s+)?(were\s+)?(told|instructed|trained)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a\s+(different|new|unrestricted)/i,
  /override\s+(your\s+)?(safety|guidelines|restrictions)/i,
]

function containsInjection(value: unknown): boolean {
  if (typeof value === 'string') {
    if (INJECTION_PATTERNS.some(p => p.test(value))) return true
    // Flag strings with excessive special chars (>30% non-alphanumeric)
    const nonAlpha = (value.match(/[^a-zA-Z0-9\s]/g) ?? []).length
    if (value.length > 50 && nonAlpha / value.length > 0.3) return true
    return false
  }
  if (Array.isArray(value)) return value.some(containsInjection)
  if (value && typeof value === 'object') return Object.values(value).some(containsInjection)
  return false
}

export function promptGuard(req: Request, res: Response, next: NextFunction) {
  if (containsInjection(req.body)) {
    const userId = (req as any).user?.id ?? 'unauthenticated'
    console.warn(`[promptGuard] Injection attempt blocked — ip=${req.ip} userId=${userId} ts=${new Date().toISOString()}`)
    res.status(400).json({ error: 'Invalid input' })
    return
  }
  next()
}
