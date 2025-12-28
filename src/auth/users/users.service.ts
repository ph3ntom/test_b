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

  async searchUsers(searchQuery: string) {
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