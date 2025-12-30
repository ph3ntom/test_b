import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../entities/user.entity';
import { maskName, maskUserId } from '../../common/utils/masking.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * 사용자 데이터 마스킹 처리 (아이디만 마스킹)
   */
  private maskUserData(users: User[]) {
    return users.map(user => ({
      userId: maskUserId(user.userId),
      name: user.name,
      createdAt: user.createdAt,
    }));
  }

  async getAllUsers() {
    const users = await this.usersRepository.find({
      select: ['userId', 'name', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    // 마스킹 처리 후 반환
    const maskedUsers = this.maskUserData(users);

    return {
      users: maskedUsers,
      total: maskedUsers.length,
    };
  }

  async searchUsers(searchQuery: string) {
    const users = await this.usersRepository.find({
      where: [
        { userId: Like(`%${searchQuery}%`) },
        { name: Like(`%${searchQuery}%`) },
      ],
      select: ['userId', 'name', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    // 마스킹 처리 후 반환
    const maskedUsers = this.maskUserData(users);

    return {
      users: maskedUsers,
      total: maskedUsers.length,
      searchQuery,
    };
  }
}
