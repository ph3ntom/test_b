import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { AnswerResponseDto } from './dto/answer-response.dto';

@Controller('questions/:questionId/answers')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post()
  async create(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body(ValidationPipe) createAnswerDto: CreateAnswerDto,
    @Req() req,
  ): Promise<AnswerResponseDto> {
    // 세션에서 mbrId 가져오기 (보안: 클라이언트 입력값 무시)
    const sessionMbrId = req.session?.mbrId || 0;
    return this.answerService.create(questionId, createAnswerDto, sessionMbrId);
  }

  @Get()
  async findByQuestionId(
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<AnswerResponseDto[]> {
    return this.answerService.findByQuestionId(questionId);
  }

  // @Get(':id')
  // async findOne(
  //   @Param('id', ParseIntPipe) id: number,
  // ): Promise<AnswerResponseDto> {
  //   return this.answerService.findOne(id);
  // }

  // @Post(':id')
  // async update(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body(ValidationPipe) updateAnswerDto: UpdateAnswerDto,
  //   @Req() req,
  // ): Promise<AnswerResponseDto> {
  //   // 세션에서 mbrId 가져오기 (보안: 클라이언트 입력값 무시)
  //   const sessionMbrId = req.session?.mbrId || 0;
  //   return this.answerService.update(id, updateAnswerDto, sessionMbrId);
  // }

  @Post(':id/del')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ): Promise<void> {
    // 세션에서 mbrId 추출 (클라이언트 값 신뢰 X)
    const sessionMbrId = req.session?.mbrId || 0;
    return this.answerService.remove(id, sessionMbrId);
  }

  // @Post(':id/vote')
  // async vote(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body('direction') direction: 'up' | 'down',
  // ): Promise<AnswerResponseDto> {
  //   return this.answerService.vote(id, direction);
  // }

  // @Post(':id/accept')
  // async accept(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Req() req,
  // ): Promise<AnswerResponseDto> {
  //   // 세션에서 mbrId 가져오기 (보안: 클라이언트 입력값 무시)
  //   const sessionMbrId = req.session?.mbrId || 0;
  //   return this.answerService.markAsAccepted(id, sessionMbrId);
  // }
}
