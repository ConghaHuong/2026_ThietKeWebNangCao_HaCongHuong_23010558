import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    create(@Req() request: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
        return this.ordersService.create(request.user.sub, dto);
    }

    @Get('mine')
    findMine(@Req() request: AuthenticatedRequest) {
        return this.ordersService.findMine(request.user.sub);
    }
}
