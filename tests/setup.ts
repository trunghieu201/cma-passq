(process.env as any).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-super-secret-jwt-key-2026';
process.env.DATABASE_URL = 'file:./dev.db';
