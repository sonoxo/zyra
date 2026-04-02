import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { config } from '@zyra/config';
const JWT_SECRET = process.env.JWT_SECRET || config.auth.secret;
const TOKEN_EXPIRY = '7d';
// Build user payload with org info
async function buildUserPayload(user) {
    const orgMemberships = await prisma.organizationUser.findMany({
        where: { userId: user.id },
        include: { organization: true },
    });
    const defaultOrg = orgMemberships[0]?.organization;
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        orgId: defaultOrg?.id,
        orgRole: orgMemberships[0]?.role,
    };
}
export default async function authRoutes(fastify) {
    // POST /api/auth/register
    fastify.post('/register', async (req, reply) => {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return reply.status(400).send({ success: false, error: 'Email and password required' });
        }
        if (password.length < 6) {
            return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' });
        }
        try {
            // Check if user exists
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return reply.status(409).send({ success: false, error: 'Email already registered' });
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || email.split('@')[0],
                    role: 'VIEWER',
                    isVerified: false,
                },
            });
            // Create profile
            await prisma.profile.create({
                data: {
                    userId: user.id,
                    displayName: name || email.split('@')[0],
                },
            });
            const userPayload = await buildUserPayload(user);
            const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
            return reply.status(201).send({
                success: true,
                data: {
                    user: userPayload,
                    token
                }
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, error: 'Registration failed' });
        }
    });
    // POST /api/auth/login
    fastify.post('/login', async (req, reply) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return reply.status(400).send({ success: false, error: 'Email and password required' });
        }
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Invalid credentials' });
            }
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return reply.status(401).send({ success: false, error: 'Invalid credentials' });
            }
            const userPayload = await buildUserPayload(user);
            const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
            return reply.send({
                success: true,
                data: {
                    user: userPayload,
                    token
                }
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, error: 'Login failed' });
        }
    });
    // GET /api/auth/me
    fastify.get('/me', async (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return reply.status(401).send({ success: false, error: 'No token provided' });
        }
        const token = authHeader.replace('Bearer ', '');
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: { profile: true }
            });
            if (!user) {
                return reply.status(401).send({ success: false, error: 'User not found' });
            }
            const userPayload = await buildUserPayload(user);
            const orgMemberships = await prisma.organizationUser.findMany({
                where: { userId: user.id },
                include: { organization: true },
            });
            return reply.send({
                success: true,
                data: {
                    user: userPayload,
                    organizations: orgMemberships.map((m) => ({
                        id: m.organization.id,
                        name: m.organization.name,
                        slug: m.organization.slug,
                        role: m.role,
                    })),
                    profile: user.profile
                }
            });
        }
        catch {
            return reply.status(401).send({ success: false, error: 'Invalid token' });
        }
    });
    // POST /api/auth/logout
    fastify.post('/logout', async (req, reply) => {
        // For now, just return success - JWT is stateless
        return reply.send({ success: true, message: 'Logged out' });
    });
}
