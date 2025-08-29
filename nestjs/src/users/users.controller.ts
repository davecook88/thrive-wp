import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/admin.guard';
import { PaginatedUsersResponseDto } from './dto/user-response.dto';

@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ): Promise<PaginatedUsersResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    // Validate role parameter
    if (role && !['admin', 'teacher'].includes(role)) {
      throw new BadRequestException(
        'Invalid role parameter. Must be "admin" or "teacher"',
      );
    }

    return this.usersService.getUsersPaginated({
      page: pageNum,
      limit: limitNum,
      search,
      role,
    });
  }
}
