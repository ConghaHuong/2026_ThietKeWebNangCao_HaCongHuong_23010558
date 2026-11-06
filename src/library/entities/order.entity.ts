import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from './member.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum OrderPaymentMethod {
    CASH_ON_DELIVERY = 'cod',
}

export enum OrderPaymentStatus {
    UNPAID = 'unpaid',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Column({
        name: 'payment_method',
        type: 'enum',
        enum: OrderPaymentMethod,
        default: OrderPaymentMethod.CASH_ON_DELIVERY,
    })
    paymentMethod: OrderPaymentMethod;

    @Column({
        name: 'payment_status',
        type: 'enum',
        enum: OrderPaymentStatus,
        default: OrderPaymentStatus.UNPAID,
    })
    paymentStatus: OrderPaymentStatus;

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
