// In-memory store
const streams = [];
// Generate random stream key
function generateStreamKey() {
    return `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}
export default async function streamRoutes(fastify) {
    // GET /api/streams
    fastify.get('/', async (req, reply) => {
        const liveOnly = req.query['live'] === 'true';
        let results = streams;
        if (liveOnly) {
            results = streams.filter(s => s.isLive);
        }
        return reply.send({ success: true, data: results, total: results.length });
    });
    // GET /api/streams/:id
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params;
        const stream = streams.find(s => s.id === id);
        if (!stream) {
            return reply.status(404).send({ success: false, error: 'Stream not found' });
        }
        return reply.send({ success: true, data: stream });
    });
    // POST /api/streams (create stream)
    fastify.post('/', async (req, reply) => {
        const { userId, title, description, category } = req.body;
        const newStream = {
            id: `stream_${Date.now()}`,
            userId,
            title: title || 'Untitled Stream',
            description,
            category,
            streamKey: generateStreamKey(),
            isLive: false,
            isPrivate: false,
            viewerCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        streams.push(newStream);
        return reply.status(201).send({ success: true, data: newStream });
    });
    // PUT /api/streams/:id/go-live
    fastify.put('/:id/go-live', async (req, reply) => {
        const { id } = req.params;
        const stream = streams.find(s => s.id === id);
        if (!stream) {
            return reply.status(404).send({ success: false, error: 'Stream not found' });
        }
        stream.isLive = true;
        stream.startedAt = new Date();
        stream.viewerCount = 0;
        return reply.send({ success: true, data: stream });
    });
    // PUT /api/streams/:id/end-stream
    fastify.put('/:id/end-stream', async (req, reply) => {
        const { id } = req.params;
        const stream = streams.find(s => s.id === id);
        if (!stream) {
            return reply.status(404).send({ success: false, error: 'Stream not found' });
        }
        stream.isLive = false;
        stream.endedAt = new Date();
        stream.viewerCount = 0;
        return reply.send({ success: true, data: stream });
    });
    // GET /api/streams/:id/chat
    fastify.get('/:id/chat', async (req, reply) => {
        const { id } = req.params;
        // Return chat messages
        return reply.send({ success: true, data: [], total: 0 });
    });
    // POST /api/streams/:id/chat
    fastify.post('/:id/chat', async (req, reply) => {
        const { id } = req.params;
        const { userId, content } = req.body;
        // Create chat message
        const message = {
            id: `msg_${Date.now()}`,
            streamId: id,
            userId,
            content,
            isSystem: false,
            createdAt: new Date(),
        };
        return reply.status(201).send({ success: true, data: message });
    });
}
