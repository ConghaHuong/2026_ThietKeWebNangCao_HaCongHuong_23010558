import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole } from '../library/entities/member.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const imageDirectory = join(process.cwd(), 'uploads');
const imageExtensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

@Controller('books')
export class BooksController {
    constructor(private readonly booksService: BooksService) { }

    @Post('image')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    @UseInterceptors(FileInterceptor('image', {
        storage: diskStorage({
            destination: (_request, _file, callback) => {
                mkdirSync(imageDirectory, { recursive: true });
                callback(null, imageDirectory);
            },
            filename: (_request, file, callback) => {
                callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_request, file, callback) => {
            if (!imageExtensions[file.mimetype]) {
                callback(new BadRequestException('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.'), false);
                return;
            }
            callback(null, true);
        },
    }))
    uploadImage(@UploadedFile() image: Express.Multer.File) {
        if (!image) {
            throw new BadRequestException('Vui lòng chọn ảnh hợp lệ (tối đa 5 MB).');
        }
        return { imageUrl: `/uploads/${image.filename}` };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    create(@Body() createBookDto: CreateBookDto) {
        return this.booksService.create(createBookDto);
    }

    @Get()
    findAll() {
        return this.booksService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.booksService.findOne(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    update(@Param('id', ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto) {
        return this.booksService.update(id, updateBookDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.booksService.remove(id);
    }
}