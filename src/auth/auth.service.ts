import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Member, MemberRole } from '../library/entities/member.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Member)
        private readonly membersRepository: Repository<Member>,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existingMember = await this.membersRepository.findOne({ where: { email: dto.email } });
        if (existingMember) {
            throw new ConflictException('An account with this email already exists');
        }

        const member = this.membersRepository.create({
            membershipNumber: `LIB-${randomUUID().slice(0, 8).toUpperCase()}`,
            fullName: dto.fullName,
            email: dto.email,
            passwordHash: await hash(dto.password, 12),
            phone: dto.phone,
            address: dto.address,
            joinedAt: new Date(),
            role: MemberRole.MEMBER,
        });

        await this.membersRepository.save(member);
        return this.createAuthResponse(member);
    }

    async login(dto: LoginDto) {
        const member = await this.membersRepository
            .createQueryBuilder('member')
            .addSelect('member.passwordHash')
            .where('member.email = :email', { email: dto.email })
            .getOne();

        if (!member || !member.isActive || !(await compare(dto.password, member.passwordHash))) {
            throw new UnauthorizedException('Invalid email or password');
        }

        return this.createAuthResponse(member);
    }

    private async createAuthResponse(member: Member) {
        const payload: JwtPayload = {
            sub: member.id,
            email: member.email,
            role: member.role,
        };

        return {
            accessToken: await this.jwtService.signAsync(payload),
            tokenType: 'Bearer',
            member: {
                id: member.id,
                membershipNumber: member.membershipNumber,
                fullName: member.fullName,
                email: member.email,
                phone: member.phone,
                address: member.address,
                joinedAt: member.joinedAt,
                role: member.role,
            },
        };
    }
}