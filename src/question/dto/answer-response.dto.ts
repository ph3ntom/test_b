import { Expose, Transform } from 'class-transformer';

export class AnswerResponseDto {
  @Expose()
  id: number;

  @Expose()
  content: string;

  @Expose()
  votes: number;

  @Expose()
  accepted: boolean;

  @Expose()
  questionId: number;

  @Expose()
  userId: number;

  @Expose()
  @Transform(({ obj }) =>
    obj.user
      ? {
          id: obj.user.mbrId,
          name: obj.user.name,
          image: obj.user.image || '/placeholder-user.jpg',
          reputation: obj.user.reputation || 0,
        }
      : null,
  )
  user: {
    id: number;
    name: string;
    image: string;
    reputation: number;
  };

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
