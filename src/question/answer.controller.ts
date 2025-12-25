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
    @Body('mbrId') mbrId?: number,
  ): Promise<AnswerResponseDto> {
    const userMbrId = mbrId || 0;
    return this.answerService.create(questionId, createAnswerDto, userMbrId);
  }

  @Get()
  async findByQuestionId(
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<AnswerResponseDto[]> {
    return this.answerService.findByQuestionId(questionId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AnswerResponseDto> {
    return this.answerService.findOne(id);
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateAnswerDto: UpdateAnswerDto,
    @Body('mbrId') mbrId?: number,
  ): Promise<AnswerResponseDto> {
    const userMbrId = mbrId || 0;
    return this.answerService.update(id, updateAnswerDto, userMbrId);
  }

  @Post(':id/del')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('mbrId') mbrId?: number,
    @Body('targetAnswerId') targetAnswerId?: number,  // 취약점: Body에서 답변 ID 받기
  ): Promise<void> {
    const userMbrId = mbrId || 0;
    const actualAnswerId = targetAnswerId || id;  // Body 값이 우선
    return this.answerService.remove(actualAnswerId, userMbrId);
  }

  @Post(':id/vote')
  async vote(
    @Param('id', ParseIntPipe) id: number,
    @Body('direction') direction: 'up' | 'down',
  ): Promise<AnswerResponseDto> {
    return this.answerService.vote(id, direction);
  }

  @Post(':id/accept')
  async accept(
    @Param('id', ParseIntPipe) id: number,
    @Body('mbrId') mbrId?: number,
  ): Promise<AnswerResponseDto> {
    const userMbrId = mbrId || 0;
    return this.answerService.markAsAccepted(id, userMbrId);
  }
}
