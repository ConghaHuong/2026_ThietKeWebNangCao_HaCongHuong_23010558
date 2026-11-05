import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from './member.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Column({ name: 'customer_name', type: 'varchar', length: 150 })
    customerName: string;

    @Column({ type: 'varchar', length: 30 })
    phone: string;

    @Column({ type: 'varchar', length: 255 })
    address: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
    totalAmount: number;

    @ManyToOne(() => Member, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'member_id' })
    member: Member;

    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
    items: OrderItem[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
