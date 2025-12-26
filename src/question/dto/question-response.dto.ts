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
  hasAttachment: boolean;

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

  // 엔티티를 DTO로 변환하는 헬퍼 메서드
  static fromEntity(question: any): QuestionResponseDto {
    const dto = new QuestionResponseDto({
      id: question.id,
      title: question.title,
      description: question.description,
      votes: question.votes,
      answers: question.answers,
      views: question.views,
      tags: question.tags,
      hasAttachment: !!question.attachment, // 경로 노출 방지: 존재 여부만 반환
      user: {
        name: question.user.name,
        userId: question.user.userId,
      },
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    });
    return dto;
  }
}

