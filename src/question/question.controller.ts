import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ValidationPipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  StreamableFile,
  BadRequestException,
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
import { FileValidator } from '../common/utils/file-validator.util';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/questions',
        filename: (req, file, callback) => {
          // 파일명 안전화
          const safeName = FileValidator.sanitizeFilename(file.originalname);
          const ext = extname(safeName).toLowerCase();

          // 화이트리스트 확장자만 허용 (추가 검증)
          const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'];
          if (!allowedExts.includes(ext)) {
            return callback(
              new BadRequestException(`허용되지 않는 파일 확장자입니다: ${ext}`),
              '',
            );
          }

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `question-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        try {
          // 파일 타입 검증
          FileValidator.validateFileType(file as any);
          callback(null, true);
        } catch (error) {
          callback(error, false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
        files: 1, // 단일 파일만 허용
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
    // 파일 크기 검증 (타입별 차등)
    if (file) {
      FileValidator.validateFileSize(file);

      // Magic Number 검증 (파일 내용 검증)
      const ext = extname(file.originalname).toLowerCase();
      const isValidContent = await FileValidator.validateMagicNumber(
        file.path,
        ext,
      );

      if (!isValidContent) {
        await FileValidator.deleteFile(file.path);
        throw new BadRequestException(
          '파일 내용이 확장자와 일치하지 않습니다. 악성 파일일 수 있습니다.',
        );
      }
    }

    let tagsArray: string[] = [];
    if (tags) {
      try {
        tagsArray = JSON.parse(tags);
      } catch {
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
          // 파일명 안전화
          const safeName = FileValidator.sanitizeFilename(file.originalname);
          const ext = extname(safeName).toLowerCase();

          // 화이트리스트 확장자만 허용 (추가 검증)
          const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'];
          if (!allowedExts.includes(ext)) {
            return callback(
              new BadRequestException(`허용되지 않는 파일 확장자입니다: ${ext}`),
              '',
            );
          }

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `question-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        try {
          // 파일 타입 검증
          FileValidator.validateFileType(file as any);
          callback(null, true);
        } catch (error) {
          callback(error, false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
        files: 1, // 단일 파일만 허용
      },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<QuestionResponseDto> {
    // 파일 크기 검증 (타입별 차등)
    if (file) {
      FileValidator.validateFileSize(file);

      // Magic Number 검증 (파일 내용 검증)
      const ext = extname(file.originalname).toLowerCase();
      const isValidContent = await FileValidator.validateMagicNumber(
        file.path,
        ext,
      );

      if (!isValidContent) {
        // 파일 삭제
        await FileValidator.deleteFile(file.path);
        throw new BadRequestException(
          '파일 내용이 확장자와 일치하지 않습니다. 악성 파일일 수 있습니다.',
        );
      }
    }

    let tagsArray: string[] | undefined = undefined;
    if (tags) {
      try {
        tagsArray = JSON.parse(tags);
      } catch {
        tagsArray = tags.split(' ').filter(tag => tag.trim() !== '');
      }
    }

    const updateQuestionDto: UpdateQuestionDto = {};
    if (title) updateQuestionDto.title = title;
    if (description) updateQuestionDto.description = description;
    if (tagsArray) updateQuestionDto.tags = tagsArray;

    const sessionMbrId = req.session?.mbrId || 0;

    return this.questionService.update(id, updateQuestionDto, sessionMbrId, file);
  }

  @Post(':id/del')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ): Promise<void> {
    const sessionMbrId = req.session?.mbrId || 0;
    return this.questionService.remove(id, sessionMbrId);
  }

  // @Post(':id/vote')
  // async vote(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body('direction') direction: 'up' | 'down',
  // ): Promise<QuestionResponseDto> {
  //   return this.questionService.vote(id, direction);
  // }

  @Get(':id/download')
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // 원본 attachment 경로 조회
    const attachmentPath = await this.questionService.getAttachmentPath(id);

    if (!attachmentPath) {
      throw new NotFoundException('No attachment found for this question');
    }

    // 파일 경로 생성
    const filePath = join(process.cwd(), attachmentPath);

    // 파일 존재 여부 확인
    if (!existsSync(filePath)) {
      throw new NotFoundException('Attachment file not found');
    }

    // 원본 파일명 추출
    const fileName = attachmentPath.split(/[/\\]/).pop() || 'attachment';
    const originalFileName = fileName.replace(/^question-\d+-\d+-/, '');

    // Content-Disposition 헤더 설정
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFileName)}"`,
    });

    const file = createReadStream(filePath);
    return new StreamableFile(file);
  }
}

