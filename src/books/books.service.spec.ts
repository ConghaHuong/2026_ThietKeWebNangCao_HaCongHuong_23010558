import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Category } from '../library/entities/category.entity';
import { BookCopy } from '../library/entities/book-copy.entity';
import { Reservation } from '../library/entities/reservation.entity';
import { OrderItem } from '../library/entities/order-item.entity';

describe('BooksService', () => {
  let service: BooksService;
  let bookRepository: Record<string, jest.Mock>;
  let categoryRepository: Record<string, jest.Mock>;
  let bookCopyRepository: Record<string, jest.Mock>;
  let reservationRepository: Record<string, jest.Mock>;
  let orderItemRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    bookRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((book) => book),
      save: jest.fn((book) => Promise.resolve(book)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    categoryRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    bookCopyRepository = { count: jest.fn().mockResolvedValue(0) };
    reservationRepository = { count: jest.fn().mockResolvedValue(0) };
    orderItemRepository = { count: jest.fn().mockResolvedValue(0) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: bookRepository },
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
        { provide: getRepositoryToken(BookCopy), useValue: bookCopyRepository },
        { provide: getRepositoryToken(Reservation), useValue: reservationRepository },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepository },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('loads categories with the book list', async () => {
    await service.findAll();
    expect(bookRepository.find).toHaveBeenCalledWith({
      relations: ['category'],
    });
  });

  it('associates a selected category when creating a book', async () => {
    const category = { id: 3, name: 'Văn học' } as Category;
    categoryRepository.findOne.mockResolvedValue(category);
    bookRepository.findOne.mockResolvedValue(null);

    await service.create({
      title: 'Sách mới',
      author: 'Tác giả',
      isbn: '9781234567890',
      publishedYear: 2025,
      price: 25000,
      categoryId: 3,
    });

    expect(bookRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ category }),
    );
    expect(bookRepository.save).toHaveBeenCalled();
  });

  it('prevents deleting books that have copies or reservations', async () => {
    const book = { id: 8, title: 'Sách có lịch sử' };
    bookRepository.findOne.mockResolvedValue(book);
    bookCopyRepository.count.mockResolvedValue(1);

    await expect(service.remove(8)).rejects.toThrow(
      'Không thể xóa sách đang có bản sao, lịch sử mượn/đặt trước hoặc đơn hàng.',
    );
    expect(bookRepository.remove).not.toHaveBeenCalled();
  });
});
