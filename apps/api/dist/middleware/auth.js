import jwt from 'jsonwebtoken';
import { config } from '@zyra/config';
const JWT_SECRET = process.env.JWT_SECRET || config.auth.secret;
export async function authMiddleware(req, reply) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return reply.status(401).send({ success: false, error: 'No token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    }
    catch {
        return reply.status(401).send({ success: false, error: 'Invalid token' });
    }
}
// Role-based access control
export function requireRole(...roles) {
    return async (req, reply) => {
        if (!req.user) {
            return reply.status(401).send({ success: false, error: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return reply.status(403).send({ success: false, error: 'Insufficient permissions' });
        }
    };
}
