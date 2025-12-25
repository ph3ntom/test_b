import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { User } from '../auth/entities/user.entity';
import { UseCouponDto } from './dto/use-coupon.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAvailable(): Promise<CouponResponseDto[]> {
    const coupons = await this.couponRepository.find({
      where: { isUsed: false },
      order: { points: 'ASC' },
    });

    return coupons.map((coupon) =>
      plainToClass(CouponResponseDto, coupon, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async useCoupon(useCouponDto: UseCouponDto): Promise<{ success: boolean; message: string; newPoints?: number }> {
    const { couponCode, mbrId } = useCouponDto;

    const coupon = await this.couponRepository.findOne({
      where: { couponCode },
    });

    if (!coupon) {
      throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
    }

    // 취약점: 쿠폰 사용 여부 검증 제거
    // if (coupon.isUsed) {
    //   throw new BadRequestException('이미 사용된 쿠폰입니다.');
    // }

    const user = await this.userRepository.findOne({
      where: { mbrId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 사용자 포인트 업데이트
    user.point = (user.point || 0) + coupon.points;
    await this.userRepository.save(user);

    // 쿠폰 사용 처리 (프론트엔드에서만 숨김)
    coupon.isUsed = true;
    coupon.usedByMbrId = mbrId!;
    coupon.usedAt = new Date();
    await this.couponRepository.save(coupon);

    return {
      success: true,
      message: `${coupon.points} 포인트가 충전되었습니다.`,
      newPoints: user.point,
    };
  }

  async seedCoupons(): Promise<void> {
    const existingCoupons = await this.couponRepository.count();
    if (existingCoupons > 0) {
      return; // 이미 쿠폰이 있으면 생성하지 않음
    }

    const coupons: any[] = [];
    
    // 100포인트 쿠폰 7개
    for (let i = 1; i <= 7; i++) {
      coupons.push({
        couponCode: `POINT100-${String(i).padStart(3, '0')}`,
        points: 100,
      });
    }

    // 500포인트 쿠폰 8개
    for (let i = 1; i <= 8; i++) {
      coupons.push({
        couponCode: `POINT500-${String(i).padStart(3, '0')}`,
        points: 500,
      });
    }

    // 1000포인트 쿠폰 5개
    for (let i = 1; i <= 5; i++) {
      coupons.push({
        couponCode: `POINT1000-${String(i).padStart(2, '0')}`,
        points: 1000,
      });
    }

    await this.couponRepository.save(coupons);
  }

  async getUserPoints(mbrId: number): Promise<{ points: number }> {
    const user = await this.userRepository.findOne({
      where: { mbrId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { points: user.point || 0 };
  }
}