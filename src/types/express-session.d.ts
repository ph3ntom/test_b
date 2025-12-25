import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    mbrId: number;
    loginAt?: number;
    lastActivity?: number;
  }
}
