import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { Order, OrderStatus } from './entities/order.entity';
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
}
