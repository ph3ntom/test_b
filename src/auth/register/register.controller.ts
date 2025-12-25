import { Controller, Post, Body, Session, Req, Res } from '@nestjs/common';
import { RegisterDto } from './register.dto/register.dto';
import { Response, Request } from 'express';
import { RegisterService } from './register.service'; // ✅ RegisterService import
import { json } from 'stream/consumers';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('/CheckId')
  async checkId(
    @Body('userId') userId: string,
    @Session() session: any,
    @Res() response: Response,
  ) {
    console.log('checkId:', userId);
    try {
      const checkId = await this.registerService.checkId(userId);
      console.log('응답 테스트', checkId);

      if (checkId) {
        session.checkIdPerformed = true;
        const jsonResponse = {
          message: '사용 가능한 아이디입니다.',
          code: '0000',
        };
        console.log('jsonResponse', jsonResponse);
        return response.json(jsonResponse);
      } else {
        return response.json({
          message: '이미 사용중인 아이디입니다.',
          code: '0001',
        });
      }
    } catch (error) {
      console.error('checkId 처리 중 서버 오류:', error);
      return response.status(500).json({
        message: '아이디 확인 중 서버 오류가 발생했습니다.',
        code: '0002',
      });
    }
  }

  @Post('/registerProcess')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    if (!registerDto.checkIdPerformed) {
      return response.json({
        message: '아이디 중복 체크를 먼저 해주세요.',
        code: '0003',
      });
    }

    try {
      await this.registerService.register(registerDto); // ✅ 회원가입 처리도 RegisterService로 분리
      return response.json({ message: '회원가입 성공', code: '0000' });
    } catch (error) {
      console.error('회원가입 에러:', error);
      return response
        .status(400)
        .json({ message: '회원가입 실패', code: '0001' });
    }
  }
}
