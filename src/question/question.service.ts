import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { User } from '../auth/entities/user.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // HTML 입력값 필터링 및 특수문자 처리
  private sanitizeContent(content: string): string {
    if (!content) return '';

    let sanitized = content;

    // 1. 위험한 이벤트 핸들러 필터링
    const dangerousEvents = [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
      'onmousedown', 'onmouseup', 'onmousemove', 'onkeydown', 'onkeyup',
      'onkeypress', 'onfocus', 'onblur', 'onchange', 'onsubmit',
      'ondblclick', 'oncontextmenu', 'oninput', 'onwheel', 'ondrag',
      'ondrop', 'oncopy', 'oncut', 'onpaste', 'onabort', 'oncanplay',
      'oncanplaythrough', 'ondurationchange', 'onemptied', 'onended',
      'ontoggle', 'onreset', 'onscroll', 'onseeked', 'onseeking',
      'onselect', 'onshow', 'onstalled', 'onsuspend', 'ontimeupdate',
      'onvolumechange', 'onwaiting'
    ];

    dangerousEvents.forEach(event => {
      const regex = new RegExp(event, 'gi');
      sanitized = sanitized.replace(regex, 'on_filtered');
    });

    // 2. 위험한 태그 제거
    // <script> 태그 제거
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // <iframe> 태그 제거
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // <object> 태그 제거
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    // <embed> 태그 제거
    sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
    // <style> 태그 제거
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // <link> 태그 제거
    sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');
    // <meta> 태그 제거
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');

    // 3. 위험한 프로토콜 제거
    sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
    sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
    sanitized = sanitized.replace(/data:text\/html/gi, 'blocked:');

    // 4. 특수문자 HTML 엔티티로 인코딩
    // ' " < > / ( ) # & ` 문자를 HTML 엔티티로 변환
    const specialCharsMap: { [key: string]: string } = {
      "'": '&#39;',   // 작은따옴표
      '"': '&quot;',  // 큰따옴표
      '<': '&lt;',    // 작은 꺾쇠
      '>': '&gt;',    // 큰 꺾쇠
      '/': '&#x2F;',  // 슬래시
      '(': '&#40;',   // 왼쪽 괄호
      ')': '&#41;',   // 오른쪽 괄호
      '#': '&#35;',   // 샵
      '&': '&amp;',   // 앰퍼샌드
      '`': '&#96;'    // 백틱
    };

    // 특수문자를 HTML 엔티티로 변환
    sanitized = sanitized.replace(/['"><\/()#&`]/g, (char) => {
      return specialCharsMap[char] || char;
    });

    return sanitized;
  }

  async create(
    createQuestionDto: CreateQuestionDto,
    file?: Express.Multer.File,
  ): Promise<QuestionResponseDto> {
    // 로그인된 사용자만 질문 작성 허용
    const user = await this.userRepository.findOne({
      where: { mbrId: createQuestionDto.mbrId },
    });
    if (!user) {
      throw new NotFoundException(
        'User not found. Please login to create a question.',
      );
    }

    // 기본적인 필터링 적용 (여전히 취약함)
    const sanitizedDescription = this.sanitizeContent(createQuestionDto.description);

    const question = this.questionRepository.create({
      title: createQuestionDto.title,
      description: sanitizedDescription,
      tags: createQuestionDto.tags,
      mbrId: createQuestionDto.mbrId,
      attachment: file ? file.path : null,
    });

    const savedQuestion = await this.questionRepository.save(question);

    // 게시물 작성 시 10포인트 지급
    await this.userRepository.increment({ mbrId: createQuestionDto.mbrId }, 'point', 10);

    const questionWithUser = await this.questionRepository.findOne({
      where: { id: savedQuestion.id },
      relations: ['user'],
    });

    return plainToClass(QuestionResponseDto, questionWithUser, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<QuestionResponseDto[]> {
    const questions = await this.questionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return questions.map(question =>
      plainToClass(QuestionResponseDto, question, {
        excludeExtraneousValues: true,
      })
    );
  }

  async findOne(id: number): Promise<any> {
    const questionWithUser = await this.questionRepository.findOne({
      where: { id },
      relations: ['user', 'answersRelation', 'answersRelation.user'],
    });

    if (!questionWithUser) {
      throw new NotFoundException('Question not found');
    }

    await this.questionRepository.increment({ id }, 'views', 1);

    const questionDto = plainToClass(QuestionResponseDto, questionWithUser, {
      excludeExtraneousValues: true,
    });

    const answersData =
      questionWithUser.answersRelation?.map((answer) => ({
        id: answer.id,
        content: answer.content,
        votes: answer.votes,
        accepted: answer.accepted,
        postedAt: answer.createdAt,
        user: {
          name: answer.user?.name || 'Unknown',
          image: answer.user?.image || '/placeholder-user.jpg',
          reputation: answer.user?.reputation || 0,
        },
      })) || [];

    return {
      ...questionDto,
      answersCount: questionDto.answers,
      answers: answersData,
    };
  }

  async update(
    id: number,
    updateQuestionDto: UpdateQuestionDto,
    mbrId: number,
    file?: Express.Multer.File,
  ): Promise<QuestionResponseDto> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // 권한 검증: 로그인 필수
    if (!mbrId || mbrId === 0) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 권한 검증: 본인의 질문만 수정 가능
    if (question.mbrId !== mbrId) {
      throw new ForbiddenException('본인의 질문만 수정할 수 있습니다.');
    }

    Object.assign(question, updateQuestionDto);

    // 파일이 업로드된 경우 파일 경로 업데이트
    if (file) {
      question.attachment = file.path;
    }

    const updatedQuestion = await this.questionRepository.save(question);

    return plainToClass(QuestionResponseDto, updatedQuestion, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: number, mbrId: number): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // 권한 검증: 로그인 필수
    if (!mbrId || mbrId === 0) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 권한 검증: 본인의 질문만 삭제 가능
    if (question.mbrId !== mbrId) {
      throw new ForbiddenException('본인의 질문만 삭제할 수 있습니다.');
    }

    await this.questionRepository.remove(question);
  }

  async vote(
    id: number,
    direction: 'up' | 'down',
  ): Promise<QuestionResponseDto> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (direction === 'up') {
      question.votes += 1;
    } else {
      question.votes -= 1;
    }

    const updatedQuestion = await this.questionRepository.save(question);

    return plainToClass(QuestionResponseDto, updatedQuestion, {
      excludeExtraneousValues: true,
    });
  }
}

