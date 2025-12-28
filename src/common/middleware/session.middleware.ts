import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 세션 존재 확인
    if (!req.session || !req.session.userId) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Session expired or not authenticated',
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    // 마지막 활동 시간 체크 (타임아웃 검증)
    const maxAge = parseInt(process.env.SESSION_MAX_AGE || '300000');
    const lastActivity = req.session.lastActivity || req.session.loginAt;
    const now = Date.now();

    if (lastActivity && now - lastActivity > maxAge) {
      // 세션 만료 - 세션 삭제
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
      });

      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Session expired due to inactivity',
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    // 세션 TTL 자동 갱신
    req.session.touch();

    // 마지막 활동 시간 업데이트
    req.session.lastActivity = Date.now();

    console.log(`✅ Session validated for user: ${req.session.userId}`);

    next();
  }
}
