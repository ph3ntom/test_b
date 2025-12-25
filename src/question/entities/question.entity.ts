import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Answer } from './answer.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', default: 0 })
  votes: number;

  @Column({ type: 'int', default: 0 })
  answers: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  attachment: string | null;

  @Column({ name: 'mbr_id', default: 0 })
  mbrId: number;


  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'mbr_id' })
  user: User;

  @OneToMany(() => Answer, (answer) => answer.question)
  answersRelation: Answer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

