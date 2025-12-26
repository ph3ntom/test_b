import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getAllUsers() {
    const users = await this.usersRepository.find({
      select: ['userId', 'name', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    return {
      users,
      total: users.length,
    };
  }

  // 안전한 검색 메서드 - SQL 인젝션 방어
  async searchUsers(searchQuery: string) {
    // TypeORM의 Like 연산자 사용 - 자동 파라미터화
    const users = await this.usersRepository.find({
      where: [
        { userId: Like(`%${searchQuery}%`) },
        { name: Like(`%${searchQuery}%`) },
      ],
      select: ['userId', 'name', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    return {
      users,
      total: users.length,
      searchQuery,
    };
  }
}