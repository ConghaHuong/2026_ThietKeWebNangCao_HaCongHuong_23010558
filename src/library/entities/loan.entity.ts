import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LoanItem } from './loan-item.entity';
import { Member } from './member.entity';

export enum LoanStatus {
    ACTIVE = 'active',
    RETURNED = 'returned',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled',
}

@Entity('loans')
export class Loan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'borrowed_at', type: 'datetime' })
    borrowedAt: Date;

    @Column({ name: 'due_at', type: 'datetime' })
    dueAt: Date;

    @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
    status: LoanStatus;

    @Column({ type: 'text', nullable: true })
    note: string;

    @ManyToOne(() => Member, (member) => member.loans, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'member_id' })
    member: Member;

    @OneToMany(() => LoanItem, (item) => item.loan, { cascade: true })
    items: LoanItem[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}