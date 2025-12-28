import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { AnswerController } from './answer.controller';
import { AnswerService } from './answer.service';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { User } from '../auth/entities/user.entity';
import { SessionMiddleware } from '../common/middleware/session.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer, User])],
  controllers: [QuestionController, AnswerController],
  providers: [QuestionService, AnswerService],
  exports: [QuestionService, AnswerService],
})
export class QuestionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // SessionMiddleware 적용
    consumer
      .apply(SessionMiddleware)
      .exclude(
        // 공개 라우트 (조회만 가능)
        { path: 'questions', method: RequestMethod.GET }, // 질문 목록
        { path: 'questions/:id', method: RequestMethod.GET }, // 질문 상세
        { path: 'questions/:id/download', method: RequestMethod.GET }, // 첨부파일 다운로드
        { path: 'questions/:questionId/answers', method: RequestMethod.GET }, // 답변 목록
        { path: 'questions/:questionId/answers/:id', method: RequestMethod.GET }, // 답변 상세
      )
      .forRoutes(
        // 모든 POST 메서드는 로그인 필요
        QuestionController,
        AnswerController,
      );
  }
}
