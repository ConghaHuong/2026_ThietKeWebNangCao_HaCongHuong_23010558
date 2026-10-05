import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
    constructor(
        @InjectRepository(Book)
        private readonly bookRepository: Repository<Book>,
    ) { }

    async create(createBookDto: CreateBookDto): Promise<Book> {
        const existingBook = await this.bookRepository.findOne({ where: { isbn: createBookDto.isbn } });
        if (existingBook) {
            throw new ConflictException(`Sách với mã ISBN ${createBookDto.isbn} đã tồn tại`);
        }
        const book = this.bookRepository.create(createBookDto);
        return await this.bookRepository.save(book);
    }

    async findAll(): Promise<Book[]> {
        return await this.bookRepository.find();
    }

    async findOne(id: number): Promise<Book> {
        const book = await this.bookRepository.findOne({ where: { id } });
        if (!book) {
            throw new NotFoundException(`Không tìm thấy sách có ID #${id}`);
        }
        return book;
    }

    async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
        const book = await this.findOne(id);
        Object.assign(book, updateBookDto);
        return await this.bookRepository.save(book);
    }

    async remove(id: number): Promise<{ message: string }> {
        const book = await this.findOne(id);
        await this.bookRepository.remove(book);
        return { message: `Đã xóa thành công sách có ID #${id}` };
    }
}