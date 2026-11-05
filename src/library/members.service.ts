import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';

@Injectable()
export class MembersService {
    constructor(
        @InjectRepository(Member)
        private readonly membersRepository: Repository<Member>,
    ) { }

    findAll() {
        return this.membersRepository.find({
            select: {
                id: true,
                membershipNumber: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                joinedAt: true,
                isActive: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
}