import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from './entities/answer.entity';
import { User } from '../auth/entities/user.entity';
import { Question } from './entities/question.entity';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { AnswerResponseDto } from './dto/answer-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async create(
    questionId: number,
    createAnswerDto: CreateAnswerDto,
    mbrId: number,
  ): Promise<AnswerResponseDto> {
    if (mbrId > 0) {
      const user = await this.userRepository.findOne({ where: { mbrId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const answer = this.answerRepository.create({
      ...createAnswerDto,
      questionId,
      mbrId,
    });

    const savedAnswer = await this.answerRepository.save(answer);
    await this.questionRepository.increment({ id: questionId }, 'answers', 1);

    const answerWithUser = await this.answerRepository.findOne({
      where: { id: savedAnswer.id },
      relations: ['user'],
    });

    return plainToClass(AnswerResponseDto, answerWithUser, {
      excludeExtraneousValues: true,
    });
  }

  async findByQuestionId(questionId: number): Promise<AnswerResponseDto[]> {
    const answers = await this.answerRepository.find({
      where: { questionId },
      relations: ['user'],
      order: { votes: 'DESC', createdAt: 'ASC' },
    });

    return answers.map((answer) =>
      plainToClass(AnswerResponseDto, answer, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findOne(id: number): Promise<AnswerResponseDto> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return plainToClass(AnswerResponseDto, answer, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: number,
    updateAnswerDto: UpdateAnswerDto,
    mbrId: number,
  ): Promise<AnswerResponseDto> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    if (mbrId > 0 && answer.mbrId !== mbrId) {
      throw new ForbiddenException('You can only update your own answers');
    }

    Object.assign(answer, updateAnswerDto);
    const updatedAnswer = await this.answerRepository.save(answer);

    return plainToClass(AnswerResponseDto, updatedAnswer, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: number, mbrId: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['question'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    // 취약점: 권한 검증 제거
    // if (mbrId > 0 && answer.mbrId !== mbrId) {
    //   throw new ForbiddenException('You can only delete your own answers');
    // }

    await this.answerRepository.remove(answer);
    await this.questionRepository.decrement(
      { id: answer.questionId },
      'answers',
      1,
    );
  }

  async vote(id: number, direction: 'up' | 'down'): Promise<AnswerResponseDto> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    if (direction === 'up') {
      answer.votes += 1;
    } else {
      answer.votes -= 1;
    }

    const updatedAnswer = await this.answerRepository.save(answer);

    return plainToClass(AnswerResponseDto, updatedAnswer, {
      excludeExtraneousValues: true,
    });
  }

  async markAsAccepted(
    id: number,
    questionOwnerMbrId: number,
  ): Promise<AnswerResponseDto> {
    const answer = await this.answerRepository.findOne({
      where: { id },
      relations: ['user', 'question'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    if (
      questionOwnerMbrId > 0 &&
      answer.question.mbrId !== questionOwnerMbrId
    ) {
      throw new ForbiddenException(
        'Only the question owner can accept answers',
      );
    }

    await this.answerRepository.update(
      { questionId: answer.questionId },
      { accepted: false },
    );

    answer.accepted = true;
    const updatedAnswer = await this.answerRepository.save(answer);

    return plainToClass(AnswerResponseDto, updatedAnswer, {
      excludeExtraneousValues: true,
    });
  }
}
