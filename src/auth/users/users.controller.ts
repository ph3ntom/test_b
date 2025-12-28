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
      throw new HttpException({
        message: 'An error occurred while searching users',
        timestamp: new Date().toISOString(),
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}