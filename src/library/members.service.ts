import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member, MemberRole } from './entities/member.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class MembersService {
    constructor(
        @InjectRepository(Member)
        private readonly membersRepository: Repository<Member>,
    ) { }

    findAll() {
        return this.membersRepository.find({
            order: { fullName: 'ASC' },
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

    async updateCustomer(id: number, dto: UpdateCustomerDto) {
        const customer = await this.membersRepository.findOne({ where: { id } });
        if (!customer || customer.role !== MemberRole.MEMBER) {
            throw new NotFoundException(`Không tìm thấy khách hàng #${id}.`);
        }

        const email = dto.email.trim().toLowerCase();
        const phone = dto.phone?.trim() || null;
        const fullName = dto.fullName.trim();
        const address = dto.address?.trim() || null;

        if (email !== customer.email.toLowerCase()) {
            const existingEmail = await this.membersRepository.findOne({ where: { email } });
            if (existingEmail) {
                throw new ConflictException('Email này đã được tài khoản khác sử dụng.');
            }
        }
        if (phone && phone !== customer.phone) {
            const existingPhone = await this.membersRepository.findOne({ where: { phone } });
            if (existingPhone) {
                throw new ConflictException('Số điện thoại này đã được tài khoản khác sử dụng.');
            }
        }

        customer.fullName = fullName;
        customer.email = email;
        customer.phone = phone;
        customer.address = address;
        const updated = await this.membersRepository.save(customer);
        return {
            id: updated.id,
            membershipNumber: updated.membershipNumber,
            fullName: updated.fullName,
            email: updated.email,
            phone: updated.phone,
            address: updated.address,
            joinedAt: updated.joinedAt,
            isActive: updated.isActive,
            role: updated.role,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
}