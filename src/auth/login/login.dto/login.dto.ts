import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  readonly userId: string;

  @IsString()
  readonly password: string;
}
