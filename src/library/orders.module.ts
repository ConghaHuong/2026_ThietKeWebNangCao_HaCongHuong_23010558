import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/entities/book.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
    imports: [TypeOrmModule.forFeature([Order, OrderItem, Book])],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule { }
