import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    categoryRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((category) => category),
      save: jest.fn((category) => Promise.resolve(category)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  it('creates a trimmed category', async () => {
    await service.create({ name: '  Văn học  ', description: ' Mô tả ' });
    expect(categoryRepository.create).toHaveBeenCalledWith({
      name: 'Văn học',
      description: 'Mô tả',
    });
  });

  it('rejects duplicate category names', async () => {
    categoryRepository.findOne.mockResolvedValue({ id: 1, name: 'Văn học' });
    await expect(service.create({ name: 'Văn học' })).rejects.toThrow(
      'Danh mục "Văn học" đã tồn tại',
    );
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });
});
