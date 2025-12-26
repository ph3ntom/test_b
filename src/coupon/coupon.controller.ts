import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
  Req,
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
    @Req() req,
    @Body(ValidationPipe) useCouponDto: UseCouponDto,
  ): Promise<{ success: boolean; message: string; newPoints?: number }> {
    // 세션 디버깅
    console.log('=== 쿠폰 사용 요청 ===');
    console.log('세션 ID:', req.sessionID);
    console.log('세션 데이터:', req.session);
    console.log('쿠키:', req.headers.cookie);
    console.log('세션 mbrId:', req.session?.mbrId);

    // 세션에서 mbrId 추출 (클라이언트 값 신뢰 X)
    const sessionMbrId = req.session?.mbrId || 0;
    return this.couponService.useCoupon(useCouponDto, sessionMbrId);
  }

  @Post('points/:mbrId')
  async getUserPoints(
    @Param('mbrId', ParseIntPipe) mbrId: number,
  ): Promise<{ points: number }> {
    return this.couponService.getUserPoints(mbrId);
  }

}