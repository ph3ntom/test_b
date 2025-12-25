import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // 취약한 검색 메서드 - SQL 인젝션 가능
  async searchUsers(searchQuery: string) {
    // 보안 취약점: 사용자 입력을 직접 SQL 쿼리에 삽입
    const query = `
      SELECT userId, name, createdAt
      FROM users
      WHERE userId LIKE '%${searchQuery}%'
      OR name LIKE '%${searchQuery}%'
      ORDER BY createdAt DESC
    `;

    try {
      const users = await this.usersRepository.query(query);
      return {
        users,
        total: users.length,
        searchQuery,
      };
    } catch (error: any) {
      // MySQL 오류 정보를 그대로 전달
      error.sql = error.sql || query;
      error.searchQuery = searchQuery;
      throw error;
    }
  }
}