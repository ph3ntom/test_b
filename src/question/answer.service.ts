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
    // 로그인 검증 (mbrId 필수)
    if (!mbrId || mbrId === 0) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    const user = await this.userRepository.findOne({ where: { mbrId } });
    if (!user) {
      throw new NotFoundException('User not found. Please login to create an answer.');
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

    // 권한 검증: 로그인 필수
    if (!mbrId || mbrId === 0) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 권한 검증: 본인의 답변만 수정 가능
    if (answer.mbrId !== mbrId) {
      throw new ForbiddenException('본인의 답변만 수정할 수 있습니다.');
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

    // 디버깅 로그
    console.log('=== 답변 삭제 권한 검증 ===');
    console.log('답변 ID:', id);
    console.log('답변 소유자 mbrId:', answer.mbrId);
    console.log('세션 mbrId:', mbrId);
    console.log('타입 확인 - answer.mbrId:', typeof answer.mbrId, 'mbrId:', typeof mbrId);

    // 권한 검증: 로그인 필수
    if (!mbrId || mbrId === 0) {
      console.log('권한 검증 실패: 로그인 필요');
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 권한 검증: 본인의 답변만 삭제 가능
    if (answer.mbrId !== mbrId) {
      console.log('권한 검증 실패: 소유자 불일치');
      throw new ForbiddenException('본인의 답변만 삭제할 수 있습니다.');
    }

    console.log('✅ 권한 검증 통과: 답변 삭제 허용');

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
