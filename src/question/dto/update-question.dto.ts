import {
  IsString,
  IsArray,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(20)
  description?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
