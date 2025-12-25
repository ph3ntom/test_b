import { Injectable } from '@nestjs/common';
import { UserService } from '../../sql/auth/auth';
import { RegisterDto } from './register.dto/register.dto'; // RegisterDto 임포트

@Injectable()
export class RegisterService {
  constructor(private readonly userService: UserService) {}

  async checkId(userId: string): Promise<boolean> {
    return this.userService.checkUsernameDuplicate(userId);
  }

  async register(registerDto: RegisterDto): Promise<any> {
    return this.userService.signup(registerDto);
  }
}
