import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    bookId: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    customerName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    phone: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address: string;

    @IsString()
    @IsOptional()
    note?: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];
}
