// ==========================================
// RWS Server
// ==========================================
// Fastify server with RWS endpoints

import Fastify from 'fastify';
import { Simulator } from './simulator';
import { registerRWSRoutes } from './rws';

export function buildServer(sim?: Simulator, enableLogging = false) {
  const app = Fastify({
    logger: enableLogging ? {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    } : false
  });

  if (enableLogging) {
    app.addHook('onRequest', async (request, _reply) => {
      console.log(`[RWS] ${request.method} ${request.url}`);
    });

    app.addHook('onResponse', async (request, reply) => {
      console.log(`[RWS] ${request.method} ${request.url} - ${reply.statusCode}`);
    });
  }

  // Health check endpoint (legacy compatibility)
  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });

  // Control endpoint for simulation
  app.post('/api/control/tick', async (_request, reply) => {
    if (!sim) {
      return reply.code(503).send({ error: 'Simulator not initialized' });
    }
    await sim.tick();
    return reply.send({ status: 'advanced' });
  });

  // Register RWS routes
  if (sim) {
    const storage = sim.getStorage();
    const config = sim.getConfig();
    registerRWSRoutes(app, storage, config);
  }

  return app;
}

export default buildServer;
