import { Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards, Body } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from './entities/member.entity';
import { MembersService } from './members.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('members')
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req() request: AuthenticatedRequest) {
        return request.user;
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    findAll() {
        return this.membersService.findAll();
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    updateCustomer(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCustomerDto,
    ) {
        return this.membersService.updateCustomer(id, dto);
    }
}