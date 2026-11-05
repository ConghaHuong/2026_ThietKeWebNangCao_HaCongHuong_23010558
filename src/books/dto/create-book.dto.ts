import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, MaxLength, Min } from 'class-validator';

export class CreateBookDto {
    @IsString()
    @IsNotEmpty({ message: 'Tên sách không được để trống' })
    title: string;

    @IsString()
    @IsNotEmpty({ message: 'Tác giả không được để trống' })
    author: string;

    @IsString()
    @IsNotEmpty({ message: 'Mã ISBN không được để trống' })
    isbn: string;

    @IsInt()
    @IsNotEmpty({ message: 'Năm xuất bản không được để trống' })
    publishedYear: number;

    @IsInt()
    @IsOptional()
    categoryId?: number | null;

    @IsInt()
    @IsOptional()
    quantity?: number;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(1)
    price: number;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    imageUrl?: string;

    @IsString()
    @IsOptional()
    description?: string;
}