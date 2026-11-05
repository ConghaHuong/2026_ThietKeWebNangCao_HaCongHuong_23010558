import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Book } from '../../books/entities/book.entity';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'book_title', type: 'varchar', length: 255 })
    bookTitle: string;

    @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
    unitPrice: number;

    @Column({ type: 'int' })
    quantity: number;

    @ManyToOne(() => Order, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ManyToOne(() => Book, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'book_id' })
    book: Book;
}
