import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Book } from '../../books/entities/book.entity';
import { LoanItem } from './loan-item.entity';

export enum BookCopyStatus {
    AVAILABLE = 'available',
    BORROWED = 'borrowed',
    DAMAGED = 'damaged',
    LOST = 'lost',
}

@Entity('book_copies')
export class BookCopy {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    barcode: string;

    @Column({ name: 'shelf_location', type: 'varchar', length: 100, nullable: true })
    shelfLocation: string;

    @Column({ type: 'enum', enum: BookCopyStatus, default: BookCopyStatus.AVAILABLE })
    status: BookCopyStatus;

    @ManyToOne(() => Book, (book) => book.copies, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'book_id' })
    book: Book;

    @OneToMany(() => LoanItem, (item) => item.copy)
    loanItems: LoanItem[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}