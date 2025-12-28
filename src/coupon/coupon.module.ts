import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { Coupon } from './entities/coupon.entity';
import { User } from '../auth/entities/user.entity';
import { SessionMiddleware } from '../common/middleware/session.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, User])],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // SessionMiddleware 적용 (쿠폰 관련 모든 API는 로그인 필요)
    consumer
      .apply(SessionMiddleware)
      .forRoutes(
        CouponController,
      );
  }
}