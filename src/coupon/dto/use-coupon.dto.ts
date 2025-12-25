import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UseCouponDto {
  @IsString()
  @IsNotEmpty()
  couponCode: string;

  @IsNumber()
  @IsOptional()
  mbrId?: number;
}