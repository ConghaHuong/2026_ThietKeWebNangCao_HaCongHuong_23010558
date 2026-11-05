import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    getBooks: jest.fn(),
    getProfile: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    getCategories: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    createOrder: jest.fn(),
    getMyOrders: jest.fn(),
  },
}));

const sampleBooks = [
  {
    id: 1,
    title: 'Những ngày thơ ấu',
    author: 'Đặng Nguyên Hồng',
    isbn: '9780000000001',
    publishedYear: 1938,
    quantity: 3,
    price: 25000,
    category: { id: 1, name: 'Văn học' },
  },
  {
    id: 2,
    title: 'Khu vườn bí mật',
    author: 'Frances Hodgson Burnett',
    isbn: '9780000000002',
    publishedYear: 1911,
    quantity: 2,
    price: 32000,
    category: { id: 2, name: 'Thiếu nhi' },
  },
];

beforeEach(() => {
  window.sessionStorage.clear();
  api.getBooks.mockResolvedValue(sampleBooks);
  api.getProfile.mockResolvedValue({ fullName: 'Bạn đọc' });
  api.login.mockReset();
  api.register.mockReset();
  api.getCategories.mockResolvedValue([]);
  api.createOrder.mockResolvedValue({ id: 17 });
});

test('loads and filters books from the library API', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Những ngày thơ ấu' })).toBeInTheDocument();
  expect(screen.getByText('2 đầu sách · 5 bản trong thư viện')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Burnett' } });

  expect(screen.getByRole('heading', { name: 'Khu vườn bí mật' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Những ngày thơ ấu' })).not.toBeInTheDocument();
});

test('filters books by category and searches without Vietnamese accents', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Những ngày thơ ấu' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lọc sách theo danh mục'), {
    target: { value: '2' },
  });

  expect(screen.getByRole('heading', { name: 'Khu vườn bí mật' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Những ngày thơ ấu' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'khu vuon' },
  });
  expect(screen.getByRole('heading', { name: 'Khu vườn bí mật' })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Lọc sách theo danh mục'), {
    target: { value: '' },
  });
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'dang nguyen' },
  });
  expect(screen.getByRole('heading', { name: 'Những ngày thơ ấu' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Khu vườn bí mật' })).not.toBeInTheDocument();
});

test('logs in through the API and stores the session token', async () => {
  api.login.mockResolvedValue({
    accessToken: 'test-token',
    member: { fullName: 'Bạn đọc' },
  });

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'reader@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), {
    target: { value: 'a-long-password' },
  });
  fireEvent.click(screen.getAllByRole('button', { name: 'Đăng nhập', exact: true })[1]);

  await waitFor(() => expect(api.login).toHaveBeenCalledWith({
    email: 'reader@example.com',
    password: 'a-long-password',
  }));
  await waitFor(() => expect(window.sessionStorage.getItem('accessToken')).toBe('test-token'));
  expect(await screen.findByText('Bạn đọc')).toBeInTheDocument();
  expect(api.getProfile).toHaveBeenCalledWith('test-token', expect.any(AbortSignal));
});

test('shows library management only to a librarian or admin', async () => {
  api.login.mockResolvedValue({
    accessToken: 'admin-token',
    member: { fullName: 'Quản trị viên', role: 'admin' },
  });

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'admin@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), {
    target: { value: 'a-long-password' },
  });
  fireEvent.click(screen.getAllByRole('button', { name: 'Đăng nhập', exact: true })[1]);

  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: 'Quản trị' })).toHaveLength(2);
  });
  fireEvent.click(screen.getAllByRole('button', { name: 'Quản trị' })[0]);
  expect(await screen.findByRole('heading', { name: 'Quản lý thư viện' })).toBeInTheDocument();
  expect(api.getCategories).toHaveBeenCalled();
});

test('places an order for books added to the shopping cart', async () => {
  api.login.mockResolvedValue({
    accessToken: 'member-token',
    member: { fullName: 'Bạn đọc', role: 'member' },
  });
  render(<App />);

  fireEvent.click((await screen.findAllByRole('button', { name: 'Thêm vào giỏ' }))[0]);
  fireEvent.click(screen.getByRole('button', { name: /Giỏ hàng/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Tiến hành đặt hàng' }));
  fireEvent.change(screen.getByLabelText('Họ và tên'), {
    target: { value: 'Bạn đọc' },
  });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), {
    target: { value: '0900000000' },
  });
  fireEvent.change(screen.getByLabelText('Địa chỉ nhận hàng'), {
    target: { value: '123 Đường Sách' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'reader@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), {
    target: { value: 'a-long-password' },
  });
  fireEvent.click(screen.getAllByRole('button', { name: 'Đăng nhập', exact: true })[1]);
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận đặt hàng' }));

  await waitFor(() => {
    expect(api.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Bạn đọc',
        phone: '0900000000',
        address: '123 Đường Sách',
        items: [{ bookId: 1, quantity: 1 }],
      }),
      'member-token',
    );
  });
  expect(await screen.findByText(/Mã đơn #17/)).toBeInTheDocument();
});
