import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './AdminPage.css';

const emptyBook = {
  title: '',
  author: '',
  isbn: '',
  publishedYear: String(new Date().getFullYear()),
  quantity: '1',
  price: '',
  categoryId: '',
  description: '',
  imageUrl: '',
};

const emptyCategory = { name: '', description: '' };
const orderStatusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd');

const formatPrice = (price) => `${Number(price || 0).toLocaleString('vi-VN')} ₫`;

const formatOrderDate = (date) =>
  new Date(date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

function AdminPage({ token, onBooksChanged }) {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('books');
  const [bookSearch, setBookSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [bookForm, setBookForm] = useState(emptyBook);
  const [bookImage, setBookImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async (signal) => {
    setError('');
    try {
      const [nextBooks, nextCategories, nextOrders] = await Promise.all([
        api.getBooks(signal),
        api.getCategories(signal),
        api.getOrders(token, signal),
      ]);
      setBooks(nextBooks);
      setCategories(nextCategories);
      setOrders(nextOrders);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const filteredBooks = useMemo(() => {
    const term = normalize(bookSearch.trim());
    if (!term) return books;
    return books.filter((book) =>
      [book.title, book.author, book.isbn, book.category?.name]
        .filter(Boolean)
        .some((value) => normalize(value).includes(term)),
    );
  }, [books, bookSearch]);

  const filteredCategories = useMemo(() => {
    const term = normalize(categorySearch.trim());
    if (!term) return categories;
    return categories.filter((category) =>
      [category.name, category.description]
        .filter(Boolean)
        .some((value) => normalize(value).includes(term)),
    );
  }, [categories, categorySearch]);

  const filteredOrders = useMemo(() => {
    const term = normalize(orderSearch.trim());
    return orders.filter((order) => {
      const matchesStatus = !orderStatusFilter || order.status === orderStatusFilter;
      const matchesTerm =
        !term ||
        [
          order.id,
          order.customerName,
          order.phone,
          order.address,
          order.member?.fullName,
          order.member?.email,
        ]
          .filter(Boolean)
          .some((value) => normalize(value).includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const refreshData = async () => {
    await loadData();
    onBooksChanged();
  };

  const resetBookForm = () => {
    setBookForm(emptyBook);
    setBookImage(null);
    setImagePreview('');
    setEditingBookId(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory);
    setEditingCategoryId(null);
  };

  const handleBookSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      ...bookForm,
      publishedYear: Number(bookForm.publishedYear),
      quantity: Number(bookForm.quantity),
      price: Number(bookForm.price),
      categoryId: bookForm.categoryId ? Number(bookForm.categoryId) : null,
    };

    try {
      if (bookImage) {
        const { imageUrl } = await api.uploadBookImage(bookImage, token);
        payload.imageUrl = imageUrl;
      }
      if (editingBookId) {
        await api.updateBook(editingBookId, payload, token);
        setNotice('Đã cập nhật thông tin sản phẩm.');
      } else {
        await api.createBook(payload, token);
        setNotice('Đã thêm sản phẩm vào thư viện.');
      }
      resetBookForm();
      await refreshData();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
    };

    try {
      if (editingCategoryId) {
        await api.updateCategory(editingCategoryId, payload, token);
        setNotice('Đã cập nhật danh mục.');
      } else {
        await api.createCategory(payload, token);
        setNotice('Đã thêm danh mục.');
      }
      resetCategoryForm();
      await refreshData();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const editBook = (book) => {
    setActiveTab('books');
    setEditingBookId(book.id);
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      publishedYear: String(book.publishedYear || ''),
      quantity: String(book.quantity ?? 1),
      price: String(book.price ?? 0),
      categoryId: book.category?.id ? String(book.category.id) : '',
      description: book.description || '',
      imageUrl: book.imageUrl || '',
    });
    setBookImage(null);
    setImagePreview(book.imageUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setBookImage(file);
    if (!file) {
      setImagePreview(bookForm.imageUrl || '');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.onerror = () => setError('Không thể xem trước ảnh đã chọn.');
    reader.readAsDataURL(file);
  };

  const editCategory = (category) => {
    setActiveTab('categories');
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBook = async (book) => {
    if (!window.confirm(`Xóa sản phẩm "${book.title}" khỏi thư viện?`)) return;
    setError('');
    setNotice('');
    try {
      await api.deleteBook(book.id, token);
      setNotice('Đã xóa sản phẩm.');
      await refreshData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const deleteCategory = async (category) => {
    const confirmed = window.confirm(
      `Xóa danh mục "${category.name}"? Sản phẩm thuộc danh mục này vẫn được giữ lại.`,
    );
    if (!confirmed) return;
    setError('');
    setNotice('');
    try {
      await api.deleteCategory(category.id, token);
      setNotice('Đã xóa danh mục.');
      await refreshData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const updateOrderStatus = async (order, action) => {
    if (
      action === 'cancel' &&
      !window.confirm(`Bạn có chắc muốn hủy đơn hàng #${order.id}? Tồn kho sẽ được hoàn lại.`)
    ) {
      return;
    }

    setSavingOrderId(order.id);
    setError('');
    setNotice('');
    let successMessage;
    try {
      if (action === 'confirm') {
        await api.confirmOrder(order.id, token);
        successMessage = `Đã xác nhận đơn hàng #${order.id}.`;
      } else {
        await api.cancelOrder(order.id, token);
        successMessage = `Đã hủy đơn hàng #${order.id} và hoàn lại tồn kho.`;
      }
    } catch (orderError) {
      setError(orderError.message);
      setSavingOrderId(null);
      return;
    }

    setNotice(successMessage);
    try {
      setOrders(await api.getOrders(token));
    } catch (refreshError) {
      setError(`Đã cập nhật đơn hàng nhưng không thể tải lại danh sách: ${refreshError.message}`);
    } finally {
      setSavingOrderId(null);
    }
  };

  return (
    <section className="admin-page" aria-labelledby="admin-title">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">BOKOS · QUẢN TRỊ</span>
          <h1 id="admin-title">Quản lý thư viện</h1>
          <p>Quản lý sản phẩm, danh mục và đơn đặt hàng của bạn đọc.</p>
        </div>
        <div className="admin-stats">
          <span><strong>{books.length}</strong> sản phẩm</span>
          <span><strong>{categories.length}</strong> danh mục</span>
          <span><strong>{orders.length}</strong> đơn hàng</span>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Khu vực quản lý">
        <button
          id="products-tab"
          className={activeTab === 'books' ? 'active' : ''}
          role="tab"
          aria-selected={activeTab === 'books'}
          aria-controls="products-panel"
          onClick={() => setActiveTab('books')}
        >
          Sản phẩm
        </button>
        <button
          id="categories-tab"
          className={activeTab === 'categories' ? 'active' : ''}
          role="tab"
          aria-selected={activeTab === 'categories'}
          aria-controls="categories-panel"
          onClick={() => setActiveTab('categories')}
        >
          Danh mục
        </button>
        <button
          id="orders-tab"
          className={activeTab === 'orders' ? 'active' : ''}
          role="tab"
          aria-selected={activeTab === 'orders'}
          aria-controls="orders-panel"
          onClick={() => setActiveTab('orders')}
        >
          Đơn hàng
        </button>
      </div>

      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {notice && <div className="admin-alert success" role="status">{notice}</div>}
      {loading ? (
        <div className="admin-empty" role="status">Đang tải dữ liệu quản trị...</div>
      ) : (
        <>
          {activeTab === 'books' ? (
            <div id="products-panel" className="admin-layout" role="tabpanel" aria-labelledby="products-tab">
              <form className="admin-card admin-form" onSubmit={handleBookSubmit}>
                <div className="admin-card-heading">
                  <div>
                    <span className="eyebrow">{editingBookId ? 'CẬP NHẬT' : 'THÊM MỚI'}</span>
                    <h2>{editingBookId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
                  </div>
                  {editingBookId && (
                    <button className="admin-text-button" type="button" onClick={resetBookForm}>
                      Hủy sửa
                    </button>
                  )}
                </div>
                <label>
                  Tên sản phẩm / sách
                  <input required maxLength="255" value={bookForm.title} onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })} />
                </label>
                <div className="admin-form-row">
                  <label>
                    Tác giả
                    <input required maxLength="255" value={bookForm.author} onChange={(event) => setBookForm({ ...bookForm, author: event.target.value })} />
                  </label>
                  <label>
                    ISBN
                    <input required maxLength="50" value={bookForm.isbn} onChange={(event) => setBookForm({ ...bookForm, isbn: event.target.value })} />
                  </label>
                </div>
                <label>
                  Danh mục sản phẩm
                  <select value={bookForm.categoryId} onChange={(event) => setBookForm({ ...bookForm, categoryId: event.target.value })}>
                    <option value="">Chưa gắn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <div className="admin-form-row">
                  <label>
                    Năm xuất bản
                    <input type="number" min="0" max="9999" required value={bookForm.publishedYear} onChange={(event) => setBookForm({ ...bookForm, publishedYear: event.target.value })} />
                  </label>
                  <label>
                    Số lượng
                    <input type="number" min="0" required value={bookForm.quantity} onChange={(event) => setBookForm({ ...bookForm, quantity: event.target.value })} />
                  </label>
                </div>
                <div className="admin-form-row">
                  <label>
                    Giá bán (₫)
                    <input type="number" min="1" step="1000" required value={bookForm.price} onChange={(event) => setBookForm({ ...bookForm, price: event.target.value })} />
                  </label>
                  <label>
                    Ảnh sản phẩm
                    <input aria-label="Ảnh sản phẩm" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
                    <small className="admin-field-hint">JPEG, PNG, WebP hoặc GIF, tối đa 5 MB.</small>
                  </label>
                </div>
                {imagePreview && (
                  <div className="admin-image-preview">
                    <img src={imagePreview} alt="Xem trước ảnh sản phẩm" />
                    <button
                      type="button"
                      className="admin-text-button"
                      onClick={() => {
                        setBookImage(null);
                        setImagePreview('');
                        setBookForm({ ...bookForm, imageUrl: '' });
                      }}
                    >
                      Gỡ ảnh
                    </button>
                  </div>
                )}
                <label>
                  Mô tả
                  <textarea rows="3" value={bookForm.description} onChange={(event) => setBookForm({ ...bookForm, description: event.target.value })} />
                </label>
                <button className="button button-primary admin-submit" type="submit" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingBookId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                </button>
              </form>

              <div className="admin-card admin-list-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="eyebrow">THƯ VIỆN</span>
                    <h2>Danh sách sản phẩm</h2>
                    <p className="admin-list-hint">
                      Sản phẩm đã có bản sao hoặc lịch sử mượn/đặt trước sẽ không thể xóa.
                    </p>
                  </div>
                  <label className="admin-search">
                    <span className="sr-only">Tìm sản phẩm</span>
                    <input type="search" value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} placeholder="Tìm sản phẩm..." />
                  </label>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Số lượng</th><th>Thao tác</th></tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((book) => (
                        <tr key={book.id}>
                          <td>
                            <strong>{book.title}</strong>
                            <span>{book.author} · ISBN {book.isbn}</span>
                          </td>
                          <td>{book.category?.name || 'Chưa phân loại'}</td>
                          <td>{Number(book.price || 0).toLocaleString('vi-VN')} ₫</td>
                          <td>{book.quantity}</td>
                          <td className="admin-row-actions">
                            <button type="button" onClick={() => editBook(book)}>Sửa</button>
                            <button className="danger" type="button" onClick={() => deleteBook(book)}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                      {!filteredBooks.length && (
                        <tr><td className="admin-no-results" colSpan="5">Không tìm thấy sản phẩm.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'categories' ? (
            <div id="categories-panel" className="admin-layout category-layout" role="tabpanel" aria-labelledby="categories-tab">
              <form className="admin-card admin-form" onSubmit={handleCategorySubmit}>
                <div className="admin-card-heading">
                  <div>
                    <span className="eyebrow">{editingCategoryId ? 'CẬP NHẬT' : 'THÊM MỚI'}</span>
                    <h2>{editingCategoryId ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
                  </div>
                  {editingCategoryId && (
                    <button className="admin-text-button" type="button" onClick={resetCategoryForm}>
                      Hủy sửa
                    </button>
                  )}
                </div>
                <label>
                  Tên danh mục
                  <input required maxLength="100" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
                </label>
                <label>
                  Mô tả
                  <textarea rows="4" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
                </label>
                <button className="button button-primary admin-submit" type="submit" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingCategoryId ? 'Lưu thay đổi' : 'Thêm danh mục'}
                </button>
              </form>

              <div className="admin-card admin-list-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="eyebrow">PHÂN LOẠI</span>
                    <h2>Danh sách danh mục</h2>
                  </div>
                  <label className="admin-search">
                    <span className="sr-only">Tìm danh mục</span>
                    <input type="search" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Tìm danh mục..." />
                  </label>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Tên danh mục</th><th>Mô tả</th><th>Số sản phẩm</th><th>Thao tác</th></tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((category) => (
                        <tr key={category.id}>
                          <td><strong>{category.name}</strong></td>
                          <td>{category.description || '—'}</td>
                          <td>{books.filter((book) => String(book.category?.id) === String(category.id)).length}</td>
                          <td className="admin-row-actions">
                            <button type="button" onClick={() => editCategory(category)}>Sửa</button>
                            <button className="danger" type="button" onClick={() => deleteCategory(category)}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                      {!filteredCategories.length && (
                        <tr><td className="admin-no-results" colSpan="4">Không tìm thấy danh mục.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <section id="orders-panel" className="admin-card admin-orders-card" role="tabpanel" aria-labelledby="orders-tab">
              <div className="admin-card-heading">
                <div>
                  <span className="eyebrow">ĐẶT HÀNG</span>
                  <h2>Danh sách đơn hàng</h2>
                  <p className="admin-list-hint">Xác nhận hoặc hủy đơn. Hệ thống không gửi email.</p>
                </div>
                <div className="admin-order-filters">
                  <label className="admin-search">
                    <span className="sr-only">Tìm đơn hàng</span>
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Tìm mã đơn, khách hàng..."
                    />
                  </label>
                  <label className="admin-order-status-filter">
                    <span className="sr-only">Lọc trạng thái đơn hàng</span>
                    <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}>
                      <option value="">Tất cả trạng thái</option>
                      {Object.entries(orderStatusLabels).map(([status, label]) => (
                        <option key={status} value={status}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table admin-orders-table">
                  <thead>
                    <tr><th>Đơn hàng</th><th>Người đặt / người nhận</th><th>Thanh toán</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id}</strong>
                          <span>{formatOrderDate(order.createdAt)}</span>
                          <details className="admin-order-details">
                            <summary>Chi tiết đơn ({order.items?.length || 0} sản phẩm)</summary>
                            <ul>
                              {(order.items || []).map((item) => (
                                <li key={item.id}>
                                  <span>{item.bookTitle} × {item.quantity}</span>
                                  <strong>{formatPrice(Number(item.unitPrice) * item.quantity)}</strong>
                                </li>
                              ))}
                            </ul>
                            <p><strong>Người nhận:</strong> {order.customerName} · {order.phone}</p>
                            <p><strong>Địa chỉ:</strong> {order.address}</p>
                            {order.note && <p><strong>Ghi chú:</strong> {order.note}</p>}
                          </details>
                        </td>
                        <td>
                          <strong>{order.member?.fullName || 'Bạn đọc'}</strong>
                          <span>{order.member?.email || order.customerName} · {order.phone}</span>
                        </td>
                        <td>
                          <strong>{order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod}</strong>
                          <span>{order.paymentStatus === 'unpaid' ? 'Chưa thanh toán' : order.paymentStatus}</span>
                        </td>
                        <td><strong>{formatPrice(order.totalAmount)}</strong></td>
                        <td>
                          <span className={`admin-order-status ${order.status}`}>
                            {orderStatusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="admin-row-actions admin-order-actions">
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              disabled={savingOrderId === order.id}
                              onClick={() => updateOrderStatus(order, 'confirm')}
                            >
                              Xác nhận
                            </button>
                          )}
                          {['pending', 'confirmed'].includes(order.status) && (
                            <button
                              className="danger"
                              type="button"
                              disabled={savingOrderId === order.id}
                              onClick={() => updateOrderStatus(order, 'cancel')}
                            >
                              Hủy đơn
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr><td className="admin-no-results" colSpan="6">Không tìm thấy đơn hàng phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

export default AdminPage;
