import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Create order (guest or logged-in)' })
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.ordersService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my orders' })
  findAll(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.ordersService.findAllForUser(userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get order by id' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.ordersService.findOne(id, userId);
  }
}
