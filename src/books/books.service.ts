import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Category } from '../library/entities/category.entity';
import { BookCopy } from '../library/entities/book-copy.entity';
import { Reservation } from '../library/entities/reservation.entity';
import { OrderItem } from '../library/entities/order-item.entity';

@Injectable()
export class BooksService {
    constructor(
        @InjectRepository(Book)
        private readonly bookRepository: Repository<Book>,
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
        @InjectRepository(BookCopy)
        private readonly bookCopyRepository: Repository<BookCopy>,
        @InjectRepository(Reservation)
        private readonly reservationRepository: Repository<Reservation>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
    ) { }

    async create(createBookDto: CreateBookDto): Promise<Book> {
        const existingBook = await this.bookRepository.findOne({ where: { isbn: createBookDto.isbn } });
        if (existingBook) {
            throw new ConflictException(`Sách với mã ISBN ${createBookDto.isbn} đã tồn tại`);
        }
        const { categoryId, ...bookDetails } = createBookDto;
        const category = categoryId
            ? await this.categoryRepository.findOne({ where: { id: categoryId } })
            : null;
        if (categoryId && !category) {
            throw new NotFoundException(`Không tìm thấy danh mục có ID #${categoryId}`);
        }
        const book = this.bookRepository.create({ ...bookDetails, category });
        return await this.bookRepository.save(book);
    }

    async findAll(): Promise<Book[]> {
        return await this.bookRepository.find({ relations: ['category'] });
    }

    async findOne(id: number): Promise<Book> {
        const book = await this.bookRepository.findOne({ where: { id }, relations: ['category'] });
        if (!book) {
            throw new NotFoundException(`Không tìm thấy sách có ID #${id}`);
        }
        return book;
    }

    async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
        const book = await this.findOne(id);
        const { categoryId, ...bookDetails } = updateBookDto;
        Object.assign(book, bookDetails);
        if (categoryId !== undefined) {
            book.category = categoryId === null
                ? null
                : await this.categoryRepository.findOne({ where: { id: categoryId } });
            if (categoryId !== null && !book.category) {
                throw new NotFoundException(`Không tìm thấy danh mục có ID #${categoryId}`);
            }
        }
        return await this.bookRepository.save(book);
    }

    async remove(id: number): Promise<{ message: string }> {
        const book = await this.findOne(id);
        const [copyCount, reservationCount, orderItemCount] = await Promise.all([
            this.bookCopyRepository.count({ where: { book: { id } } }),
            this.reservationRepository.count({ where: { book: { id } } }),
            this.orderItemRepository.count({ where: { book: { id } } }),
        ]);
        if (copyCount || reservationCount || orderItemCount) {
            throw new ConflictException(
                'Không thể xóa sách đang có bản sao, lịch sử mượn/đặt trước hoặc đơn hàng.',
            );
        }
        await this.bookRepository.remove(book);
        return { message: `Đã xóa thành công sách có ID #${id}` };
    }
}