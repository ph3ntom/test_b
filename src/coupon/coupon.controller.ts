import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { UseCouponDto } from './dto/use-coupon.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  async findAvailable(): Promise<CouponResponseDto[]> {
    return this.couponService.findAvailable();
  }

  @Post('use')
  async useCoupon(
    @Body(ValidationPipe) useCouponDto: UseCouponDto,
  ): Promise<{ success: boolean; message: string; newPoints?: number }> {
    return this.couponService.useCoupon(useCouponDto);
  }

  @Post('points/:mbrId')
  async getUserPoints(
    @Param('mbrId', ParseIntPipe) mbrId: number,
  ): Promise<{ points: number }> {
    return this.couponService.getUserPoints(mbrId);
  }

}