import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPage from './AdminPage';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    getBooks: jest.fn(),
    getCategories: jest.fn(),
    createBook: jest.fn(),
    uploadBookImage: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
}));

beforeEach(() => {
  api.getBooks.mockResolvedValue([]);
  api.getCategories.mockResolvedValue([{ id: 2, name: 'Văn học' }]);
  api.createBook.mockResolvedValue({});
  api.uploadBookImage.mockResolvedValue({ imageUrl: '/uploads/book.jpg' });
  api.createCategory.mockResolvedValue({});
});

test('creates a product with its selected category and refreshes the public catalogue', async () => {
  const onBooksChanged = jest.fn();
  render(<AdminPage token="admin-token" onBooksChanged={onBooksChanged} />);

  await screen.findByRole('heading', { name: 'Thêm sản phẩm' });
  fireEvent.change(screen.getByLabelText('Tên sản phẩm / sách'), {
    target: { value: 'Sách thử nghiệm' },
  });
  fireEvent.change(screen.getByLabelText('Tác giả'), {
    target: { value: 'Tác giả thử nghiệm' },
  });
  fireEvent.change(screen.getByLabelText('ISBN'), {
    target: { value: '9781234567890' },
  });
  fireEvent.change(screen.getByLabelText('Danh mục sản phẩm'), {
    target: { value: '2' },
  });
  fireEvent.change(screen.getByLabelText('Giá bán (₫)'), {
    target: { value: '25000' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }));

  await waitFor(() => {
    expect(api.createBook).toHaveBeenCalledWith(
      {
        title: 'Sách thử nghiệm',
        author: 'Tác giả thử nghiệm',
        isbn: '9781234567890',
        publishedYear: new Date().getFullYear(),
        quantity: 1,
        price: 25000,
        categoryId: 2,
        description: '',
        imageUrl: '',
      },
      'admin-token',
    );
  });
  await waitFor(() => expect(onBooksChanged).toHaveBeenCalled());
});

test('creates categories from the category management tab', async () => {
  render(<AdminPage token="admin-token" onBooksChanged={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Thêm sản phẩm' });
  fireEvent.click(screen.getByRole('tab', { name: 'Danh mục' }));
  fireEvent.change(screen.getByLabelText('Tên danh mục'), {
    target: { value: 'Khoa học' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }));

  await waitFor(() => {
    expect(api.createCategory).toHaveBeenCalledWith(
      { name: 'Khoa học', description: '' },
      'admin-token',
    );
  });
});

test('uploads a product image before creating the product', async () => {
  const file = new File(['image data'], 'cover.png', { type: 'image/png' });
  render(<AdminPage token="admin-token" onBooksChanged={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Thêm sản phẩm' });

  fireEvent.change(screen.getByLabelText('Tên sản phẩm / sách'), {
    target: { value: 'Sách có ảnh' },
  });
  fireEvent.change(screen.getByLabelText('Tác giả'), {
    target: { value: 'Tác giả' },
  });
  fireEvent.change(screen.getByLabelText('ISBN'), {
    target: { value: '9781234567891' },
  });
  fireEvent.change(screen.getByLabelText('Giá bán (₫)'), {
    target: { value: '15000' },
  });
  fireEvent.change(screen.getByLabelText('Ảnh sản phẩm'), {
    target: { files: [file] },
  });
  await screen.findByAltText('Xem trước ảnh sản phẩm');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }));

  await waitFor(() => {
    expect(api.uploadBookImage).toHaveBeenCalledWith(file, 'admin-token');
    expect(api.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: '/uploads/book.jpg', price: 15000 }),
      'admin-token',
    );
  });
});
