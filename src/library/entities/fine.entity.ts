import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LoanItem } from './loan-item.entity';

export enum FineStatus {
    UNPAID = 'unpaid',
    PAID = 'paid',
    WAIVED = 'waived',
}

@Entity('fines')
export class Fine {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 255 })
    reason: string;

    @Column({ type: 'enum', enum: FineStatus, default: FineStatus.UNPAID })
    status: FineStatus;

    @Column({ name: 'paid_at', type: 'datetime', nullable: true })
    paidAt: Date;

    @OneToOne(() => LoanItem, (item) => item.fine, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'loan_item_id' })
    loanItem: LoanItem;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}