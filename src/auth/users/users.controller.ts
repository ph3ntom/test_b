import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('search')
  async searchUsers(@Query('q') searchQuery: string) {
    if (!searchQuery) {
      return this.usersService.getAllUsers();
    }

    try {
      return await this.usersService.searchUsers(searchQuery);
    } catch (error: any) {
      // 커스텀 오류 정보를 HTTP 응답으로 전달
      throw new HttpException({
        message: 'Database Query Error',
        sqlMessage: error.sqlMessage || error.message,
        sql: error.sql,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        searchQuery: error.searchQuery || searchQuery,
        timestamp: new Date().toISOString(),
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}