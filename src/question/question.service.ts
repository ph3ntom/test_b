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
import { FileValidator } from '../common/utils/file-validator.util';

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

    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');

    sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
    sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
    sanitized = sanitized.replace(/data:text\/html/gi, 'blocked:');

    const specialCharsMap: { [key: string]: string } = {
      "'": '&#39;',  
      '"': '&quot;',  
      '<': '&lt;',   
      '>': '&gt;',   
      '/': '&#x2F;', 
      '(': '&#40;',  
      ')': '&#41;',   
      '#': '&#35;',   
      '&': '&amp;',   
      '`': '&#96;'    
    };

    sanitized = sanitized.replace(/['"><\/()#&`]/g, (char) => {
      return specialCharsMap[char] || char;
    });

    return sanitized;
  }

  async create(
    createQuestionDto: CreateQuestionDto,
    file?: Express.Multer.File,
  ): Promise<QuestionResponseDto> {
    const user = await this.userRepository.findOne({
      where: { mbrId: createQuestionDto.mbrId },
    });
    if (!user) {
      throw new NotFoundException(
        'User not found. Please login to create a question.',
      );
    }

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

    return QuestionResponseDto.fromEntity(questionWithUser);
  }

  async findAll(): Promise<QuestionResponseDto[]> {
    const questions = await this.questionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return questions.map(question => QuestionResponseDto.fromEntity(question));
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

    const questionDto = QuestionResponseDto.fromEntity(questionWithUser);

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

    let attachmentFileName: string | null = null;
    if (questionWithUser.attachment) {
      const parts = questionWithUser.attachment.replace(/\\/g, '/').split('/');
      attachmentFileName = parts[parts.length - 1];
    }

    return {
      ...questionDto,
      attachment: attachmentFileName, 
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
      // 기존 파일이 있으면 삭제
      if (question.attachment) {
        await FileValidator.deleteFile(question.attachment);
      }
      question.attachment = file.path;
    }

    const updatedQuestion = await this.questionRepository.save(question);

    return QuestionResponseDto.fromEntity(updatedQuestion);
  }

  async remove(id: number, mbrId: number): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (!mbrId || mbrId === 0) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    if (question.mbrId !== mbrId) {
      throw new ForbiddenException('본인의 질문만 삭제할 수 있습니다.');
    }

    if (question.attachment) {
      await FileValidator.deleteFile(question.attachment);
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

    return QuestionResponseDto.fromEntity(updatedQuestion);
  }

  // 파일 다운로드를 위한 원본 attachment 경로 반환
  async getAttachmentPath(id: number): Promise<string | null> {
    const question = await this.questionRepository.findOne({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question.attachment;
  }
}

