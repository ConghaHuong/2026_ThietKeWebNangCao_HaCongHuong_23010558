import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './entities/book.entity';
import { Category } from '../library/entities/category.entity';
import { BookCopy } from '../library/entities/book-copy.entity';
import { Reservation } from '../library/entities/reservation.entity';
import { OrderItem } from '../library/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Category, BookCopy, Reservation, OrderItem])],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule { }