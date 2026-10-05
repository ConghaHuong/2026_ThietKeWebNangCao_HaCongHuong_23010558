import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

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
    quantity?: number;

    @IsString()
    @IsOptional()
    description?: string;
}