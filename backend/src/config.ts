import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  otpPepper: process.env.OTP_PEPPER || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

export function validateConfig(): void {
  if (!config.databaseUrl) throw new Error('DATABASE_URL must be configured');
  if (config.jwtSecret.length < 24) throw new Error('JWT_SECRET must have at least 24 characters');
  if (config.otpPepper.length < 24) throw new Error('OTP_PEPPER must have at least 24 characters');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid PORT');
}
