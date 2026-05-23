import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const email = process.argv[2] ?? 'admin@edutrack.demo'
const password = process.argv[3] ?? 'admin1234'
const name = process.argv[4] ?? 'Admin'

const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  await prisma.user.update({ where: { email }, data: { role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12), name } })
  console.log(`Updated existing user ${email} to ADMIN`)
} else {
  await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), name, role: 'ADMIN' } })
  console.log(`Created admin account: ${email}`)
}

await prisma.$disconnect()
