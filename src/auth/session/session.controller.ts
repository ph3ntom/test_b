import {
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Controller('auth/session')
export class SessionController {
  // ⭐ 세션 검증 (프론트엔드에서 주기적으로 호출)
  @Get('validate')
  async validateSession(@Req() req: Request) {
    if (!req.session?.userId) {
      throw new UnauthorizedException('Session expired');
    }

    // ⭐ 타임아웃 체크 (마지막 활동 시간 확인)
    const maxAge = parseInt(process.env.SESSION_MAX_AGE || '7200000');
    const lastActivity = req.session.lastActivity || req.session.loginAt;
    const now = Date.now();
    const elapsed = now - lastActivity;

    console.log(`🔍 Validate - User: ${req.session.userId}, LastActivity: ${lastActivity}, Elapsed: ${elapsed}ms, MaxAge: ${maxAge}ms`);

    if (lastActivity && elapsed > maxAge) {
      // 세션 만료 - 삭제
      console.log(`❌ Session EXPIRED for user ${req.session.userId} - Elapsed: ${elapsed}ms > MaxAge: ${maxAge}ms`);

      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });

      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Session expired due to inactivity',
        error: 'Unauthorized',
      });
    }

    console.log(`✅ Session VALID for user ${req.session.userId} - Elapsed: ${elapsed}ms < MaxAge: ${maxAge}ms`);

    // ⭐ validate는 검증만 함 - lastActivity 업데이트 안 함!
    // 실제 사용자 활동(클릭, 키보드 입력 등)만 lastActivity 업데이트

    return {
      valid: true,
      userId: req.session.userId,
      mbrId: req.session.mbrId,
      lastActivity: lastActivity,
      remainingTime: maxAge - elapsed,
      expiresAt: lastActivity + maxAge,
    };
  }

  // ⭐ 로그아웃
  @Post('logout')
  async logout(@Req() req: Request) {
    const userId = req.session?.userId;

    // 세션 완전 파괴
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          reject(err);
        } else {
          console.log(`✅ User ${userId} logged out`);
          resolve({
            message: 'Logout successful',
            code: '0000',
          });
        }
      });
    });
  }

  // ⭐ 사용자 활동 업데이트 (마우스, 키보드 등 실제 활동 시)
  @Post('activity')
  async updateActivity(@Req() req: Request) {
    if (!req.session?.userId) {
      throw new UnauthorizedException('Session expired');
    }

    // ⭐ lastActivity만 업데이트 (검증은 안 함)
    req.session.touch();
    req.session.lastActivity = Date.now();

    console.log(`🎯 Activity updated for user ${req.session.userId} at ${req.session.lastActivity}`);

    return {
      message: 'Activity updated',
      code: '0000',
    };
  }

  // ⭐ 세션 연장 (프론트엔드 경고 모달에서 호출)
  @Post('extend')
  async extendSession(@Req() req: Request) {
    if (!req.session?.userId) {
      throw new UnauthorizedException('Session expired');
    }

    // ⭐ 타임아웃 체크
    const maxAge = parseInt(process.env.SESSION_MAX_AGE || '7200000');
    const lastActivity = req.session.lastActivity || req.session.loginAt;
    const now = Date.now();

    if (lastActivity && now - lastActivity > maxAge) {
      // 이미 만료됨 - 연장 불가
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });

      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Session expired, cannot extend',
        error: 'Unauthorized',
      });
    }

    // touch()로 TTL 갱신
    req.session.touch();
    req.session.lastActivity = Date.now();

    return {
      message: 'Session extended',
      expiresAt: Date.now() + maxAge,
      code: '0000',
    };
  }
}
