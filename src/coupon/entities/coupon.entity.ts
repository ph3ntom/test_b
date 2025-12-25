import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  couponCode: string;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'int', nullable: true })
  usedByMbrId: number;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}