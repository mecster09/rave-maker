// ==========================================
// RWS Routes
// ==========================================
// Route definitions for RWS API endpoints

import { FastifyInstance } from 'fastify';
import { Storage } from '../storage/Storage';
import { SimulatorConfig } from '../config';
import { createBasicAuthMiddleware } from './auth';
import {
  handleVersion,
  handleTwoHundred,
  handleStudies,
  handleStudySubjects,
  handleStudyDataset,
  handleSubjectDataset,
  handleRegisterSubject
} from './handlers';

/**
 * Register all RWS routes
 */
export async function registerRWSRoutes(
  fastify: FastifyInstance,
  storage: Storage,
  config: SimulatorConfig
): Promise<void> {
  const authUsers = config.rws?.auth?.users || [];
  const requireAuth = authUsers.length > 0;

  // Public endpoints (no auth required)
  fastify.get('/RaveWebServices/version', async (request, reply) => {
    return handleVersion(request, reply, config);
  });

  fastify.get('/RaveWebServices/twohundred', async (request, reply) => {
    return handleTwoHundred(request, reply);
  });

  // Protected endpoints (require authentication if users configured)
  if (requireAuth) {
    const authMiddleware = createBasicAuthMiddleware(authUsers);

    // Studies list
    fastify.get('/RaveWebServices/studies', {
      onRequest: authMiddleware
    }, async (request, reply) => {
      return handleStudies(request, reply, storage, config);
    });

    // Study subjects
    fastify.get('/RaveWebServices/studies/:study/subjects', {
      onRequest: authMiddleware
    }, async (request, reply) => {
      return handleStudySubjects(request as any, reply, storage);
    });

    // Study clinical data
    fastify.get('/RaveWebServices/studies/:study/datasets/regular', {
      onRequest: authMiddleware
    }, async (request, reply) => {
      return handleStudyDataset(request as any, reply, storage);
    });

    // Subject clinical data
    fastify.get('/RaveWebServices/studies/:study/subjects/:subjectKey/datasets/regular', {
      onRequest: authMiddleware
    }, async (request, reply) => {
      return handleSubjectDataset(request as any, reply, storage);
    });

    // Register subject
    fastify.post('/RaveWebServices/studies/:study/subjects', {
      onRequest: authMiddleware
    }, async (request, reply) => {
      return handleRegisterSubject(request as any, reply, storage);
    });
  } else {
    // No auth required
    fastify.get('/RaveWebServices/studies', async (request, reply) => {
      return handleStudies(request, reply, storage, config);
    });

    fastify.get('/RaveWebServices/studies/:study/subjects', async (request, reply) => {
      return handleStudySubjects(request as any, reply, storage);
    });

    fastify.get('/RaveWebServices/studies/:study/datasets/regular', async (request, reply) => {
      return handleStudyDataset(request as any, reply, storage);
    });

    fastify.get('/RaveWebServices/studies/:study/subjects/:subjectKey/datasets/regular', async (request, reply) => {
      return handleSubjectDataset(request as any, reply, storage);
    });

    fastify.post('/RaveWebServices/studies/:study/subjects', async (request, reply) => {
      return handleRegisterSubject(request as any, reply, storage);
    });
  }
}
