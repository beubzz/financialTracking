import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),
});

export const env = envSchema.parse(process.env);
