import { IsString, IsNotEmpty } from 'class-validator';

export class UseCouponDto {
  @IsString()
  @IsNotEmpty()
  couponCode: string;
}