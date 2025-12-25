import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ValidationPipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/questions',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `question-${uniqueSuffix}${ext}`);
        },
      }),
      // fileFilter: (req, file, callback) => {
      //   // 허용할 파일 타입 설정
      //   const allowedMimes = [
      //     'image/jpeg',
      //     'image/png',
      //     'image/gif',
      //     'application/pdf',
      //     'application/msword',
      //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      //     'text/plain',
      //   ];
      //   if (allowedMimes.includes(file.mimetype)) {
      //     callback(null, true);
      //   } else {
      //     callback(new Error('Invalid file type. Only images, PDF, DOC, DOCX, and TXT files are allowed.'), false);
      //   }
      // },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
      },
    }),
  )
  async create(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('tags') tags: string,
    @Body('mbrId') mbrId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<QuestionResponseDto> {
    // tags를 파싱 (JSON 문자열 또는 공백으로 구분된 문자열)
    let tagsArray: string[] = [];
    if (tags) {
      try {
        // JSON 형식인 경우
        tagsArray = JSON.parse(tags);
      } catch {
        // 공백으로 구분된 문자열인 경우
        tagsArray = tags.split(' ').filter(tag => tag.trim() !== '');
      }
    }

    const createQuestionDto: CreateQuestionDto = {
      title,
      description,
      tags: tagsArray,
      mbrId: parseInt(mbrId, 10) || 0,
    };

    return this.questionService.create(createQuestionDto, file);
  }

  @Get()
  async findAll(): Promise<QuestionResponseDto[]> {
    return this.questionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.questionService.findOne(id);
  }

  @Post(':id/edit')
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/questions',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `question-${uniqueSuffix}${ext}`);
        },
      }),
      // fileFilter: (req, file, callback) => {
      //   // 허용할 파일 타입 설정
      //   const allowedMimes = [
      //     'image/jpeg',
      //     'image/png',
      //     'image/gif',
      //     'application/pdf',
      //     'application/msword',
      //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      //     'text/plain',
      //   ];
      //   if (allowedMimes.includes(file.mimetype)) {
      //     callback(null, true);
      //   } else {
      //     callback(new Error('Invalid file type. Only images, PDF, DOC, DOCX, and TXT files are allowed.'), false);
      //   }
      // },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
      },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string,
    @Body('mbrId') mbrId?: string,
    @Body('targetQuestionId') targetQuestionId?: string,  // 취약점: Body에서 수정할 게시물 ID 받기
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<QuestionResponseDto> {
    // tags를 파싱 (JSON 문자열 또는 공백으로 구분된 문자열)
    let tagsArray: string[] | undefined = undefined;
    if (tags) {
      try {
        // JSON 형식인 경우
        tagsArray = JSON.parse(tags);
      } catch {
        // 공백으로 구분된 문자열인 경우
        tagsArray = tags.split(' ').filter(tag => tag.trim() !== '');
      }
    }

    const updateQuestionDto: UpdateQuestionDto = {};
    if (title) updateQuestionDto.title = title;
    if (description) updateQuestionDto.description = description;
    if (tagsArray) updateQuestionDto.tags = tagsArray;

    const userMbrId = mbrId ? parseInt(mbrId, 10) : 0;
    const actualQuestionId = targetQuestionId ? parseInt(targetQuestionId, 10) : id;  // Body의 targetQuestionId가 있으면 우선 사용

    return this.questionService.update(actualQuestionId, updateQuestionDto, userMbrId, file);
  }

  @Post(':id/del')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('mbrId') mbrId?: number,
  ): Promise<void> {
    const userMbrId = mbrId || 0;
    return this.questionService.remove(id, userMbrId);
  }

  @Post(':id/vote')
  async vote(
    @Param('id', ParseIntPipe) id: number,
    @Body('direction') direction: 'up' | 'down',
  ): Promise<QuestionResponseDto> {
    return this.questionService.vote(id, direction);
  }

  @Get(':id/download')
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // 질문 정보 조회
    const question = await this.questionService.findOne(id);

    if (!question.attachment) {
      throw new NotFoundException('No attachment found for this question');
    }

    // 파일 경로 생성
    const filePath = join(process.cwd(), question.attachment);

    // 파일 존재 여부 확인
    if (!existsSync(filePath)) {
      throw new NotFoundException('Attachment file not found');
    }

    // 원본 파일명 추출 (question-timestamp-random- 부분 제거)
    const fileName = question.attachment.split('/').pop() || 'attachment';
    const originalFileName = fileName.replace(/^question-\d+-\d+-/, '');

    // Content-Disposition 헤더 설정 (다운로드 시 파일명 지정)
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFileName)}"`,
    });

    // 파일 스트림 생성 및 반환
    const file = createReadStream(filePath);
    return new StreamableFile(file);
  }
}

