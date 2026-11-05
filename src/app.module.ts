import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { Book } from './books/entities/book.entity';
import { BookCopy } from './library/entities/book-copy.entity';
import { Category } from './library/entities/category.entity';
import { Fine } from './library/entities/fine.entity';
import { LoanItem } from './library/entities/loan-item.entity';
import { Loan } from './library/entities/loan.entity';
import { Member } from './library/entities/member.entity';
import { MembersModule } from './library/members.module';
import { Reservation } from './library/entities/reservation.entity';
import { CategoriesModule } from './library/categories.module';
import { Order } from './library/entities/order.entity';
import { OrderItem } from './library/entities/order-item.entity';
import { OrdersModule } from './library/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root123',
      database: 'quan_ly_thu_vien',
      entities: [Book, Category, Member, BookCopy, Loan, LoanItem, Reservation, Fine, Order, OrderItem],
      synchronize: true,
    }),
    AuthModule,
    MembersModule,
    CategoriesModule,
    OrdersModule,
    BooksModule,
  ],
})
export class AppModule { }