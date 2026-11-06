import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { MemberRole } from './entities/member.entity';
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

    @Get()
    @UseGuards(RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    findAll() {
        return this.ordersService.findAll();
    }

    @Patch(':id/confirm')
    @UseGuards(RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    confirm(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.confirm(id);
    }

    @Patch(':id/cancel')
    @UseGuards(RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    cancel(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.cancel(id);
    }
}
