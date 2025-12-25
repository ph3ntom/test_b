// src/login/login.service.ts
import { Injectable } from '@nestjs/common';
import { LoginDto } from './login.dto/login.dto';
import { UserService } from '../../sql/auth/auth';

@Injectable()
export class LoginService {
  constructor(private readonly authService: UserService) {}

  async processLogin(
    loginDto: LoginDto,
  ): Promise<{ success: boolean; userId?: string; mbrId?: number; point?: number }> {
    const { userId, password } = loginDto;

    const result = await this.authService.login(loginDto);

    if (result.success) {
      console.log(`User ${userId} authenticated successfully via database.`);
      return {
        success: true,
        userId: result.user.userId,
        mbrId: result.user.mbrId,
        point: result.user.point,
      };
    } else {
      console.log(`Authentication failed for user ${userId}.`);
      return { success: false };
    }
  }
}
