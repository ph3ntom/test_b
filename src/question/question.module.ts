import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { AnswerController } from './answer.controller';
import { AnswerService } from './answer.service';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer, User])],
  controllers: [QuestionController, AnswerController],
  providers: [QuestionService, AnswerService],
  exports: [QuestionService, AnswerService],
})
export class QuestionModule {}
