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
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'ehy1123?',
      database: process.env.DB_NAME || 'node',
      entities: [User, Question, Answer, Coupon],
      migrations: ['dist/migrations/**/*{.ts,.js}'],
      synchronize: false,
      logging: true,
      migrationsRun: false,
      migrationsTableName: 'migrations_history',
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
