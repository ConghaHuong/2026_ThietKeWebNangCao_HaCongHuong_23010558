import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from './entities/member.entity';
import { MembersService } from './members.service';

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
}