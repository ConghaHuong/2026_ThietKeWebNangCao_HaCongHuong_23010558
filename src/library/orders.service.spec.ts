import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const book = {
    id: 4,
    title: 'Sách hay',
    price: 24990,
    quantity: 5,
  } as Book;
  const bookRepository = {
    findOne: jest.fn(),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const itemRepository = {
    create: jest.fn((value) => value),
  };
  const orderRepository = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: 22, ...value })),
    find: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === Book) return bookRepository;
      if (entity === OrderItem) return itemRepository;
      return orderRepository;
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  let service: OrdersService;

  beforeEach(() => {
    book.quantity = 5;
    bookRepository.findOne.mockReset().mockResolvedValue(book);
    bookRepository.save.mockClear();
    itemRepository.create.mockClear();
    orderRepository.create.mockClear();
    orderRepository.save.mockClear();
    dataSource.transaction.mockClear();
    service = new OrdersService(
      dataSource as unknown as DataSource,
      orderRepository as unknown as Repository<Order>,
    );
  });

  it('creates an order, snapshots current prices, and reduces stock in a transaction', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Bạn đọc',
      phone: '0900000000',
      address: 'Địa chỉ nhận hàng',
      items: [
        { bookId: 4, quantity: 1 },
        { bookId: 4, quantity: 2 },
      ],
    };

    const order = await service.create(7, dto);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(bookRepository.findOne).toHaveBeenCalledWith({
      where: { id: 4 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(book.quantity).toBe(2);
    expect(orderRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      totalAmount: 74970,
      items: [expect.objectContaining({
        book,
        bookTitle: 'Sách hay',
        unitPrice: 24990,
        quantity: 3,
      })],
    }));
    expect(order.id).toBe(22);
  });

  it('rejects orders when stock is insufficient', async () => {
    await expect(service.create(7, {
      customerName: 'Bạn đọc',
      phone: '0900000000',
      address: 'Địa chỉ nhận hàng',
      items: [{ bookId: 4, quantity: 6 }],
    })).rejects.toBeInstanceOf(ConflictException);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('rejects orders with unknown products', async () => {
    bookRepository.findOne.mockResolvedValue(null);
    await expect(service.create(7, {
      customerName: 'Bạn đọc',
      phone: '0900000000',
      address: 'Địa chỉ nhận hàng',
      items: [{ bookId: 999, quantity: 1 }],
    })).rejects.toBeInstanceOf(NotFoundException);
  });
});
