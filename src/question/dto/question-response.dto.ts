import { Exclude, Expose, Type } from 'class-transformer';

class UserInfo {
  @Expose()
  name: string;

  @Expose()
  userId: string;
}

export class QuestionResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  votes: number;

  @Expose()
  answers: number;

  @Expose()
  views: number;

  @Expose()
  tags: string[];

  @Expose()
  attachment: string;

  @Expose()
  @Type(() => UserInfo)
  user: UserInfo;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<QuestionResponseDto>) {
    Object.assign(this, partial);
  }
}

