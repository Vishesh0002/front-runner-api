import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  me(@Req() req: Request) {
    return this.usersService.getProfile((req as any).user.userId);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'List my addresses' })
  listAddresses(@Req() req: Request) {
    return this.usersService.listAddresses((req as any).user.userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add address' })
  addAddress(@Req() req: Request, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress((req as any).user.userId, dto);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  deleteAddress(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.deleteAddress((req as any).user.userId, id);
  }
}
