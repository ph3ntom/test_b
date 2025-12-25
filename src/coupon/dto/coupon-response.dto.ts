import { Expose } from 'class-transformer';

export class CouponResponseDto {
  @Expose()
  id: number;

  @Expose()
  couponCode: string;

  @Expose()
  points: number;

  @Expose()
  isUsed: boolean;

  @Expose()
  createdAt: Date;
}