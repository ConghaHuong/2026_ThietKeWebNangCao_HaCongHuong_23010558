import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    fullName: string;

    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsEmail()
    @MaxLength(255)
    email: string;

    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(30)
    phone?: string | null;

    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(255)
    address?: string | null;
}
