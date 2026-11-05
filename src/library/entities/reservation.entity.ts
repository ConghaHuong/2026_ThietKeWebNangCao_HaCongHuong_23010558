import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Book } from '../../books/entities/book.entity';
import { Member } from './member.entity';

export enum ReservationStatus {
    WAITING = 'waiting',
    READY = 'ready',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
}

@Entity('reservations')
export class Reservation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.WAITING })
    status: ReservationStatus;

    @Column({ name: 'reserved_at', type: 'datetime' })
    reservedAt: Date;

    @Column({ name: 'expires_at', type: 'datetime', nullable: true })
    expiresAt: Date;

    @ManyToOne(() => Member, (member) => member.reservations, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'member_id' })
    member: Member;

    @ManyToOne(() => Book, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'book_id' })
    book: Book;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}