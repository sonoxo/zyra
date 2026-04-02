const clients = new Set();
const WS_OPEN = 1;
export async function websocketRoutes(fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        clients.add(socket);
        console.log('Client connected. Total clients:', clients.size);
        socket.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === 'auth') {
                    socket.orgId = message.orgId;
                    socket.userId = message.userId;
                }
            }
            catch (e) {
                console.error('Invalid WebSocket message');
            }
        });
        socket.on('close', () => {
            clients.delete(socket);
            console.log('Client disconnected. Total clients:', clients.size);
        });
    });
}
export function broadcast(type, payload) {
    const event = {
        type,
        payload,
        timestamp: Date.now(),
    };
    const message = JSON.stringify(event);
    clients.forEach((client) => {
        if (client.readyState === WS_OPEN) {
            client.send(message);
        }
    });
}
export function sendToOrg(orgId, type, payload) {
    const event = {
        type,
        payload,
        timestamp: Date.now(),
    };
    const message = JSON.stringify(event);
    clients.forEach((client) => {
        if (client.orgId === orgId && client.readyState === WS_OPEN) {
            client.send(message);
        }
    });
}
