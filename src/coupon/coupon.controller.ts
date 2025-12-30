import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
  Req,
  ForbiddenException,
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
    console.log('=== 쿠폰 사용 요청 ===');
    console.log('세션 ID:', req.sessionID);
    console.log('세션 데이터:', req.session);
    console.log('쿠키:', req.headers.cookie);
    console.log('세션 mbrId:', req.session?.mbrId);

    const sessionMbrId = req.session?.mbrId || 0;
    return this.couponService.useCoupon(useCouponDto, sessionMbrId);
  }

  @Post('points/:mbrId')
  async getUserPoints(
    @Param('mbrId', ParseIntPipe) mbrId: number,
    @Req() req,
  ): Promise<{ points: number }> {
    // 세션 검증: 본인의 포인트만 조회 가능
    const sessionMbrId = req.session?.mbrId || 0;

    if (!sessionMbrId || sessionMbrId === 0) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    if (sessionMbrId !== mbrId) {
      throw new ForbiddenException('본인의 포인트만 조회할 수 있습니다.');
    }

    return this.couponService.getUserPoints(mbrId);
  }

}