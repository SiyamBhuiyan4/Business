import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() { const password = process.argv[2] || process.env.SUPER_ADMIN_PASSWORD; if (!password) throw new Error('Provide a password: npm run reset:super-admin -- "new-password"'); const username = (process.env.SUPER_ADMIN_USERNAME || 'sihab').trim().toLowerCase(); const user = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }); if (!user) throw new Error('No SUPER_ADMIN account exists. Run the seed first.'); await prisma.user.update({ where: { id: user.id }, data: { username, passwordHash: await bcrypt.hash(password, 10) } }); console.log(`Super Admin password reset successfully for ${username}.`); }
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
