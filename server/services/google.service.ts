import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function makeClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

export function getAuthUrl(state: string): string {
  const client = makeClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  })
}

export async function exchangeCode(code: string) {
  const client = makeClient()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function createCalendarEvent(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiryDate: Date | null,
  event: { title: string; description?: string; dueDate: Date },
): Promise<void> {
  try {
    const client = makeClient()
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate ? expiryDate.getTime() : undefined,
    })

    // Persist refreshed access token back to DB automatically
    client.on('tokens', async (tokens) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(tokens.access_token ? { googleAccessToken: tokens.access_token } : {}),
            ...(tokens.expiry_date ? { googleTokenExpiry: new Date(tokens.expiry_date) } : {}),
          },
        })
      } catch {}
    })

    const calendar = google.calendar({ version: 'v3', auth: client })
    const dateStr = event.dueDate.toISOString().split('T')[0]

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        description: event.description ?? '',
        start: { date: dateStr },
        end: { date: dateStr },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 60 * 24 }],
        },
      },
    })
  } catch (err) {
    // Log message only — full GaxiosError includes Authorization header (bearer token)
    console.error('[GoogleCalendar] createCalendarEvent failed:', (err as any)?.message ?? String(err))
  }
}
