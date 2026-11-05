import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
    @MaxLength(100)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}
