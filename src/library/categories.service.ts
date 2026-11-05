import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    findAll(): Promise<Category[]> {
        return this.categoryRepository.find({ order: { name: 'ASC' } });
    }

    async create(dto: CreateCategoryDto): Promise<Category> {
        const name = dto.name.trim();
        if (!name) {
            throw new BadRequestException('Tên danh mục không được để trống');
        }
        const existingCategory = await this.categoryRepository.findOne({ where: { name } });
        if (existingCategory) {
            throw new ConflictException(`Danh mục "${name}" đã tồn tại`);
        }
        return this.categoryRepository.save(this.categoryRepository.create({
            ...dto,
            name,
            description: dto.description?.trim() || null,
        }));
    }

    async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
        const category = await this.findOne(id);
        if (dto.name !== undefined) {
            const name = dto.name.trim();
            if (!name) {
                throw new BadRequestException('Tên danh mục không được để trống');
            }
            const existingCategory = await this.categoryRepository.findOne({ where: { name } });
            if (existingCategory && existingCategory.id !== id) {
                throw new ConflictException(`Danh mục "${name}" đã tồn tại`);
            }
            category.name = name;
        }
        if (dto.description !== undefined) {
            category.description = dto.description.trim() || null;
        }
        return this.categoryRepository.save(category);
    }

    async remove(id: number): Promise<{ message: string }> {
        const category = await this.findOne(id);
        await this.categoryRepository.remove(category);
        return { message: `Đã xóa danh mục "${category.name}"` };
    }

    private async findOne(id: number): Promise<Category> {
        const category = await this.categoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException(`Không tìm thấy danh mục có ID #${id}`);
        }
        return category;
    }
}
