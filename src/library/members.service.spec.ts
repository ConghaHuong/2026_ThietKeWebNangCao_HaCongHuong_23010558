import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Member, MemberRole } from './entities/member.entity';
import { MembersService } from './members.service';

describe('MembersService', () => {
    const customer = {
        id: 8,
        membershipNumber: 'MB0008',
        fullName: 'Nguyễn An',
        email: 'an@example.com',
        phone: '0900000000',
        address: 'Địa chỉ cũ',
        role: MemberRole.MEMBER,
    } as Member;
    const membersRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn((member) => Promise.resolve(member)),
    };
    let service: MembersService;

    beforeEach(() => {
        Object.assign(customer, {
            fullName: 'Nguyễn An',
            email: 'an@example.com',
            phone: '0900000000',
            address: 'Địa chỉ cũ',
            role: MemberRole.MEMBER,
        });
        membersRepository.findOne.mockReset().mockResolvedValue(customer);
        membersRepository.save.mockClear();
        service = new MembersService(membersRepository as unknown as Repository<Member>);
    });

    it('updates customer contact details after validating unique email and phone', async () => {
        membersRepository.findOne
            .mockResolvedValueOnce(customer)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        const dto: UpdateCustomerDto = {
            fullName: '  Nguyễn Bình ',
            email: ' BINH@example.com ',
            phone: ' 0911111111 ',
            address: '  Địa chỉ mới ',
        };

        const result = await service.updateCustomer(8, dto);

        expect(membersRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            fullName: 'Nguyễn Bình',
            email: 'binh@example.com',
            phone: '0911111111',
            address: 'Địa chỉ mới',
        }));
        expect(result).toEqual(expect.objectContaining({
            id: 8,
            fullName: 'Nguyễn Bình',
            email: 'binh@example.com',
            role: MemberRole.MEMBER,
        }));
        expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate email addresses', async () => {
        membersRepository.findOne
            .mockResolvedValueOnce(customer)
            .mockResolvedValueOnce({ id: 9 } as Member);

        await expect(service.updateCustomer(8, {
            fullName: 'Nguyễn An',
            email: 'other@example.com',
        })).rejects.toBeInstanceOf(ConflictException);
        expect(membersRepository.save).not.toHaveBeenCalled();
    });

    it('rejects duplicate phone numbers', async () => {
        membersRepository.findOne
            .mockResolvedValueOnce(customer)
            .mockResolvedValueOnce({ id: 9 } as Member);

        await expect(service.updateCustomer(8, {
            fullName: 'Nguyễn An',
            email: 'an@example.com',
            phone: '0911111111',
        })).rejects.toBeInstanceOf(ConflictException);
        expect(membersRepository.save).not.toHaveBeenCalled();
    });

    it('does not allow editing staff accounts through customer management', async () => {
        membersRepository.findOne.mockResolvedValueOnce({
            ...customer,
            role: MemberRole.ADMIN,
        });

        await expect(service.updateCustomer(8, {
            fullName: 'Nguyễn An',
            email: 'an@example.com',
        })).rejects.toBeInstanceOf(NotFoundException);
        expect(membersRepository.save).not.toHaveBeenCalled();
    });
});
