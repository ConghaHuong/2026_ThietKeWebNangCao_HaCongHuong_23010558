import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import {
    Order,
    OrderPaymentMethod,
    OrderPaymentStatus,
    OrderStatus,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Member } from './entities/member.entity';

@Injectable()
export class OrdersService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
    ) { }

    async create(memberId: number, dto: CreateOrderDto): Promise<Order> {
        const quantities = new Map<number, number>();
        dto.items.forEach(({ bookId, quantity }) => {
            quantities.set(bookId, (quantities.get(bookId) || 0) + quantity);
        });

        return this.dataSource.transaction(async (manager) => {
            const bookRepository = manager.getRepository(Book);
            const orderItems: OrderItem[] = [];
            let totalAmountCents = 0;

            for (const [bookId, quantity] of Array.from(quantities.entries()).sort(
                ([bookIdA], [bookIdB]) => bookIdA - bookIdB,
            )) {
                const book = await bookRepository.findOne({
                    where: { id: bookId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!book) {
                    throw new NotFoundException(`Không tìm thấy sản phẩm có ID #${bookId}`);
                }
                if (book.quantity < quantity) {
                    throw new ConflictException(
                        `Sản phẩm "${book.title}" hiện chỉ còn ${book.quantity} cuốn.`,
                    );
                }
                const priceCents = Math.round(Number(book.price) * 100);
                totalAmountCents += priceCents * quantity;
                book.quantity -= quantity;
                await bookRepository.save(book);
                orderItems.push(manager.getRepository(OrderItem).create({
                    book,
                    bookTitle: book.title,
                    unitPrice: priceCents / 100,
                    quantity,
                }));
            }

            const order = manager.getRepository(Order).create({
                status: OrderStatus.PENDING,
                paymentMethod: OrderPaymentMethod.CASH_ON_DELIVERY,
                paymentStatus: OrderPaymentStatus.UNPAID,
                customerName: dto.customerName.trim(),
                phone: dto.phone.trim(),
                address: dto.address.trim(),
                note: dto.note?.trim() || null,
                totalAmount: totalAmountCents / 100,
                member: { id: memberId } as Member,
                items: orderItems,
            });
            return manager.getRepository(Order).save(order);
        });
    }

    findMine(memberId: number): Promise<Order[]> {
        return this.orderRepository.find({
            where: { member: { id: memberId } },
            relations: ['items', 'items.book'],
            order: { createdAt: 'DESC' },
        });
    }

    async findAll() {
        const orders = await this.orderRepository.find({
            relations: ['items', 'member'],
            order: { createdAt: 'DESC' },
        });
        return orders.map((order) => ({
            id: order.id,
            status: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            customerName: order.customerName,
            phone: order.phone,
            address: order.address,
            note: order.note,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            member: order.member
                ? {
                    id: order.member.id,
                    fullName: order.member.fullName,
                    email: order.member.email,
                }
                : undefined,
            items: order.items.map(({ id, bookTitle, unitPrice, quantity }) => ({
                id,
                bookTitle,
                unitPrice,
                quantity,
            })),
        }));
    }

    async confirm(id: number): Promise<Order> {
        return this.dataSource.transaction(async (manager) => {
            const orderRepository = manager.getRepository(Order);
            const order = await orderRepository.findOne({
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng #${id}.`);
            if (order.status !== OrderStatus.PENDING) {
                throw new ConflictException('Chỉ có thể xác nhận đơn hàng đang chờ xử lý.');
            }

            order.status = OrderStatus.CONFIRMED;
            return orderRepository.save(order);
        });
    }

    async cancel(id: number): Promise<Order> {
        return this.dataSource.transaction(async (manager) => {
            const orderRepository = manager.getRepository(Order);
            const order = await orderRepository.findOne({
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng #${id}.`);
            if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
                throw new ConflictException('Không thể hủy đơn hàng ở trạng thái hiện tại.');
            }

            const items = await manager.getRepository(OrderItem).find({
                where: { order: { id } },
                relations: ['book'],
            });
            const bookIds = Array.from(new Set(items.map((item) => item.book.id))).sort(
                (bookIdA, bookIdB) => bookIdA - bookIdB,
            );
            const bookRepository = manager.getRepository(Book);
            const books = new Map<number, Book>();
            for (const bookId of bookIds) {
                const book = await bookRepository.findOne({
                    where: { id: bookId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!book) {
                    throw new NotFoundException(`Không tìm thấy sản phẩm có ID #${bookId}.`);
                }
                books.set(bookId, book);
            }

            for (const item of items) {
                const book = books.get(item.book.id);
                if (!book) {
                    throw new NotFoundException(`Không tìm thấy sản phẩm có ID #${item.book.id}.`);
                }
                book.quantity += item.quantity;
                await bookRepository.save(book);
            }

            order.status = OrderStatus.CANCELLED;
            return orderRepository.save(order);
        });
    }
}
