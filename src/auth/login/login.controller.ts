import { Controller, Post, Body, Req } from '@nestjs/common'; 
import { LoginDto } from './login.dto/login.dto';
import { LoginService } from './login.service'; 
import { Request } from 'express'; 

@Controller('login')
export class LoginController {
  constructor(
    private readonly loginService: LoginService, 
  ) {}

  @Post('/loginProcess')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    console.log(`Login attempt for user: ${loginDto.userId}`);

    const result = await this.loginService.processLogin(loginDto);

    if (result.success) {
      // ⭐ 세션 재생성 (Session Fixation 방지)
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 새 세션에 사용자 정보 저장
      req.session.userId = result.userId;
      req.session.mbrId = result.mbrId;
      req.session.loginAt = Date.now();
      req.session.lastActivity = Date.now();

      // ⭐ 세션 저장 (Redis에 즉시 반영)
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(
        `✅ User ${result.userId} (mbrId: ${result.mbrId}) logged in. Session ID: ${req.session.id}`,
      );

      return {
        message: 'Login successful',
        userId: result.userId,
        mbrId: result.mbrId,
        point: result.point,
        sessionId: req.session.id,
        expiresAt:
          Date.now() + parseInt(process.env.SESSION_MAX_AGE || '1800000'),
        code: '0000',
      };
    } else {
      return {
        message: 'Invalid credentials',
        code: '9999',
      };
    }
  }

  // @Post('/check-login')
  // checkLoginStatus(@Req() req: Request) {
  //      if (req.session && req.session.userId) {
  //          return {
  //              isLoggedIn: true,
  //              userId: req.session.userId,
  //              message: 'User is logged in'
  //          };
  //      } else {
  //          return {
  //              isLoggedIn: false,
  //              message: 'User is not logged in'
  //          };
  //      }
  //  }
}
