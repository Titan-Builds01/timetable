import { config } from './env';

export const jwtConfig = {
  secret: config.jwt.secret,
  expiresIn: config.jwt.expiresIn,
};

