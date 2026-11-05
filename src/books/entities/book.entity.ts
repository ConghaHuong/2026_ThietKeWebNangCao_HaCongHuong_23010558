import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BookCopy } from '../../library/entities/book-copy.entity';
import { Category } from '../../library/entities/category.entity';

@Entity('books')
export class Book {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'varchar', length: 255 })
    author: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    isbn: string;

    @Column({ name: 'published_year', type: 'int' })
    publishedYear: number;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
    imageUrl: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToOne(() => Category, (category) => category.books, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @OneToMany(() => BookCopy, (copy) => copy.book)
    copies: BookCopy[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}