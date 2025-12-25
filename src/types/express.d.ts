declare namespace Express {
  interface Request {
    session: Session & Partial<SessionData>;
  }

  interface SessionData {
    userId?: string;
    // isLoggedIn?: boolean;
  }
}
