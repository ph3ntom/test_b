import { PartialType } from '@nestjs/mapped-types';
import { CreateAnswerDto } from './create-answer.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateAnswerDto extends PartialType(CreateAnswerDto) {
  @IsOptional()
  @IsBoolean()
  accepted?: boolean;
}
