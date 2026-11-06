import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPage from './AdminPage';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    getBooks: jest.fn(),
    getCategories: jest.fn(),
    getOrders: jest.fn(),
    getMembers: jest.fn(),
    createBook: jest.fn(),
    uploadBookImage: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    confirmOrder: jest.fn(),
    cancelOrder: jest.fn(),
    updateCustomer: jest.fn(),
  },
}));

beforeEach(() => {
  api.getBooks.mockResolvedValue([]);
  api.getCategories.mockResolvedValue([{ id: 2, name: 'Văn học' }]);
  api.getOrders.mockResolvedValue([]);
  api.getMembers.mockResolvedValue([]);
  api.createBook.mockResolvedValue({});
  api.uploadBookImage.mockResolvedValue({ imageUrl: '/uploads/book.jpg' });
  api.createCategory.mockResolvedValue({});
  api.confirmOrder.mockResolvedValue({});
  api.cancelOrder.mockResolvedValue({});
  api.updateCustomer.mockResolvedValue({});
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
    target: { value: '59000' },
  });
  expect(screen.getByLabelText('Giá bán (₫)')).toHaveAttribute('step', '1');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm sản phẩm' }));

  await waitFor(() => {
    expect(api.createBook).toHaveBeenCalledWith(
      {
        title: 'Sách thử nghiệm',
        author: 'Tác giả thử nghiệm',
        isbn: '9781234567890',
        publishedYear: new Date().getFullYear(),
        quantity: 1,
        price: 59000,
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

test('shows order details and confirms a pending order', async () => {
  const pendingOrder = {
    id: 42,
    status: 'pending',
    customerName: 'Nguyễn An',
    phone: '0900000000',
    address: '12 Đường Sách',
    totalAmount: 50000,
    createdAt: '2026-11-05T08:00:00.000Z',
    member: { fullName: 'Nguyễn An', email: 'an@example.com' },
    items: [{ id: 1, bookTitle: 'Sách kiểm thử', unitPrice: 25000, quantity: 2 }],
  };
  api.getOrders.mockResolvedValueOnce([pendingOrder]).mockResolvedValueOnce([
    { ...pendingOrder, status: 'confirmed' },
  ]);
  render(<AdminPage token="admin-token" onBooksChanged={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Thêm sản phẩm' });
  fireEvent.click(screen.getByRole('tab', { name: 'Đơn hàng' }));

  expect(await screen.findByText('Chờ xác nhận', { selector: '.admin-order-status' })).toBeInTheDocument();
  fireEvent.click(screen.getByText('Chi tiết đơn (1 sản phẩm)'));
  expect(screen.getByText('Sách kiểm thử × 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

  await waitFor(() => {
    expect(api.confirmOrder).toHaveBeenCalledWith(42, 'admin-token');
    expect(screen.getByText('Đã xác nhận', { selector: '.admin-order-status' })).toBeInTheDocument();
  });
});

test('requires confirmation before cancelling an order', async () => {
  const confirmedOrder = {
    id: 43,
    status: 'confirmed',
    customerName: 'Nguyễn Bình',
    phone: '0911111111',
    address: '24 Đường Sách',
    totalAmount: 32000,
    createdAt: '2026-11-05T08:00:00.000Z',
    member: { fullName: 'Nguyễn Bình', email: 'binh@example.com' },
    items: [{ id: 2, bookTitle: 'Sách thử', unitPrice: 32000, quantity: 1 }],
  };
  const confirmDialog = jest.spyOn(window, 'confirm').mockReturnValue(true);
  api.getOrders.mockResolvedValueOnce([confirmedOrder]).mockResolvedValueOnce([
    { ...confirmedOrder, status: 'cancelled' },
  ]);
  render(<AdminPage token="admin-token" onBooksChanged={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Thêm sản phẩm' });
  fireEvent.click(screen.getByRole('tab', { name: 'Đơn hàng' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn' }));

  await waitFor(() => {
    expect(api.cancelOrder).toHaveBeenCalledWith(43, 'admin-token');
    expect(screen.getByText('Đã hủy', { selector: '.admin-order-status' })).toBeInTheDocument();
  });
  expect(confirmDialog).toHaveBeenCalledWith(expect.stringContaining('#43'));
  confirmDialog.mockRestore();
});

test('searches and updates customer contact information', async () => {
  const customer = {
    id: 8,
    membershipNumber: 'MB0008',
    role: 'member',
    fullName: 'Nguyễn An',
    email: 'an@example.com',
    phone: '0900000000',
    address: 'Địa chỉ cũ',
    isActive: true,
  };
  api.updateCustomer.mockResolvedValue({
    ...customer,
    fullName: 'Nguyễn Bình',
    email: 'binh@example.com',
  });
  api.getMembers.mockResolvedValueOnce([customer]).mockResolvedValueOnce([
    { ...customer, fullName: 'Nguyễn Bình', email: 'binh@example.com' },
  ]);
  render(<AdminPage token="admin-token" onBooksChanged={jest.fn()} />);
  await screen.findByRole('heading', { name: 'Thêm sản phẩm' });
  fireEvent.click(screen.getByRole('tab', { name: 'Khách hàng' }));
  expect(await screen.findByText('Nguyễn An')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Tìm khách hàng'), {
    target: { value: 'an@example.com' },
  });
  expect(screen.getByText('Nguyễn An')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật' }));
  fireEvent.change(screen.getByLabelText('Họ và tên'), {
    target: { value: 'Nguyễn Bình' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'binh@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật khách hàng' }));

  await waitFor(() => {
    expect(api.updateCustomer).toHaveBeenCalledWith(
      8,
      {
        fullName: 'Nguyễn Bình',
        email: 'binh@example.com',
        phone: '0900000000',
        address: 'Địa chỉ cũ',
      },
      'admin-token',
    );
    expect(screen.getByText(/Đã cập nhật thông tin khách hàng #8/)).toBeInTheDocument();
  });
});
