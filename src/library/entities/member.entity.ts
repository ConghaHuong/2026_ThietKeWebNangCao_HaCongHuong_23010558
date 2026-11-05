import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Loan } from './loan.entity';
import { Reservation } from './reservation.entity';

export enum MemberRole {
    MEMBER = 'member',
    LIBRARIAN = 'librarian',
    ADMIN = 'admin',
}

@Entity('members')
export class Member {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'membership_number', type: 'varchar', length: 30, unique: true })
    membershipNumber: string;

    @Column({ name: 'full_name', type: 'varchar', length: 150 })
    fullName: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false, default: '' })
    passwordHash: string;

    @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
    role: MemberRole;

    @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
    phone: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address: string;

    @Column({ name: 'joined_at', type: 'date' })
    joinedAt: Date;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany(() => Loan, (loan) => loan.member)
    loans: Loan[];

    @OneToMany(() => Reservation, (reservation) => reservation.member)
    reservations: Reservation[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}