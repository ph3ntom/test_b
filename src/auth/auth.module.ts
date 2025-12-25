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
    // ⭐ SessionMiddleware 적용 (보호된 라우트만)
    consumer
      .apply(SessionMiddleware)
      .exclude(
        // 제외할 라우트
        { path: 'auth/login/loginProcess', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/session/validate', method: RequestMethod.GET },
        { path: 'auth/session/logout', method: RequestMethod.POST },
      )
      .forRoutes(
        // 적용할 라우트
        UsersController,
      );
  }
}
