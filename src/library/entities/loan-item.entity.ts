import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BookCopy } from './book-copy.entity';
import { Fine } from './fine.entity';
import { Loan } from './loan.entity';

@Entity('loan_items')
export class LoanItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'returned_at', type: 'datetime', nullable: true })
    returnedAt: Date;

    @Column({ name: 'return_condition', type: 'varchar', length: 100, nullable: true })
    returnCondition: string;

    @ManyToOne(() => Loan, (loan) => loan.items, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'loan_id' })
    loan: Loan;

    @ManyToOne(() => BookCopy, (copy) => copy.loanItems, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'copy_id' })
    copy: BookCopy;

    @OneToOne(() => Fine, (fine) => fine.loanItem)
    fine: Fine;
}