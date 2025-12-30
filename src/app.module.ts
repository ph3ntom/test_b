import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
//import { DatabaseModule } from './database/database.module';
import { QuestionModule } from './question/question.module';
import { CouponModule } from './coupon/coupon.module';
import { User } from './auth/entities/user.entity';
import { Question } from './question/entities/question.entity';
import { Answer } from './question/entities/answer.entity';
import { Coupon } from './coupon/entities/coupon.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      username: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
      database: process.env.DB_NAME!,
      entities: [User, Question, Answer, Coupon],
      synchronize: false,
      logging: true,

      // MySQL 연결 풀 설정 (Keep-Alive 포함)
      extra: {
        connectionLimit: 10,
        waitForConnections: true,
        connectTimeout: 60000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      },

      // TypeORM 연결 풀 크기
      poolSize: 10,
    }),
   // DatabaseModule,
    AuthModule,
    QuestionModule,
    CouponModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
