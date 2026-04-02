import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
// Bootstrap endpoint - only works if no users exist
export default async function bootstrapRoutes(fastify) {
    // POST /api/bootstrap/admin - create master admin (only if no users exist)
    fastify.post('/admin', async (req, reply) => {
        const { email, password, secret } = req.body;
        // Secret key to prevent unauthorized bootstrap
        const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || 'zyra-bootstrap-2026';
        if (secret !== BOOTSTRAP_SECRET) {
            return reply.status(403).send({ success: false, error: 'Invalid secret' });
        }
        try {
            // Check if users exist
            const userCount = await prisma.user.count();
            if (userCount > 0) {
                return reply.status(400).send({
                    success: false,
                    error: 'Bootstrap only works when no users exist. Users already present.'
                });
            }
            if (!email || !password) {
                return reply.status(400).send({ success: false, error: 'Email and password required' });
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: 'Admin',
                    role: 'ADMIN',
                    isVerified: true,
                },
            });
            // Create default organization
            const org = await prisma.organization.create({
                data: {
                    name: 'Zyra HQ',
                    slug: 'zyra-hq',
                    plan: 'ENTERPRISE',
                },
            });
            // Make user owner of org
            await prisma.organizationUser.create({
                data: {
                    userId: user.id,
                    organizationId: org.id,
                    role: 'OWNER',
                },
            });
            // Create profile
            await prisma.profile.create({
                data: {
                    userId: user.id,
                    displayName: 'Admin',
                },
            });
            return reply.status(201).send({
                success: true,
                data: {
                    message: 'Master admin created',
                    userId: user.id,
                    orgId: org.id,
                    email
                }
            });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
