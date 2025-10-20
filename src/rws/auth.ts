// ==========================================
// RWS Authentication
// ==========================================
// Basic Authentication for RWS endpoints

import { FastifyRequest, FastifyReply } from 'fastify';
import { RWSAuthUser } from '../config';

/**
 * Validate Basic Auth credentials
 */
export function validateCredentials(
  username: string,
  password: string,
  users: RWSAuthUser[]
): boolean {
  return users.some(u => u.username === username && u.password === password);
}

/**
 * Parse Basic Auth header
 */
export function parseBasicAuth(authHeader: string | undefined): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    if (!username || !password) {
      return null;
    }

    return { username, password };
  } catch {
    return null;
  }
}

/**
 * Create Basic Auth challenge response
 */
export function sendAuthChallenge(reply: FastifyReply): void {
  reply
    .code(401)
    .header('WWW-Authenticate', 'Basic realm="RaveWebServices"')
    .send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
}

/**
 * Basic Auth middleware factory
 */
export function createBasicAuthMiddleware(users: RWSAuthUser[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const credentials = parseBasicAuth(request.headers.authorization);
    
    if (!credentials) {
      sendAuthChallenge(reply);
      return;
    }

    if (!validateCredentials(credentials.username, credentials.password, users)) {
      sendAuthChallenge(reply);
      return;
    }

    // Authentication successful, continue
    // Store username in request for logging/auditing if needed
    (request as any).authenticatedUser = credentials.username;
  };
}
