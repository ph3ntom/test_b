import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Question } from './question.entity';

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  votes: number;

  @Column({ type: 'boolean', default: false })
  accepted: boolean;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => Question, (question) => question.answersRelation, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'mbr_id', default: 0 })
  mbrId: number;


  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'mbr_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
