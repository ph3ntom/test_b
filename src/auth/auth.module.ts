import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { RegisterController } from './register/register.controller';
import { LoginController } from './login/login.controller';
import { UsersController } from './users/users.controller';
import { SessionController } from './session/session.controller';
import { LoginService } from './login/login.service';
import { UsersService } from './users/users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterService } from './register/register.service';
import { UserService } from '../sql/auth/auth';
import { SessionMiddleware } from '../common/middleware/session.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [
    RegisterController,
    LoginController,
    UsersController,
    SessionController,
  ],
  providers: [LoginService, RegisterService, UserService, UsersService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ⭐ SessionMiddleware 적용
    // ⭐ UsersController는 공개 (사용자 목록/검색은 비로그인 사용자도 접근 가능)
    // ⭐ 로그인, 회원가입, 세션 관련 API는 미들웨어 적용 안 함
    consumer
      .apply(SessionMiddleware)
      .exclude(
        // 제외할 라우트 (공개 API)
        { path: 'auth/login/loginProcess', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/session/validate', method: RequestMethod.GET },
        { path: 'auth/session/logout', method: RequestMethod.POST },
        { path: 'users', method: RequestMethod.GET }, // 사용자 목록 공개
        { path: 'users/search', method: RequestMethod.GET }, // 사용자 검색 공개
      )
      .forRoutes(
        // SessionController에만 적용 (activity, extend 엔드포인트)
        SessionController,
      );
  }
}
