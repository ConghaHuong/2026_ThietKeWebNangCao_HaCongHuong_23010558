import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import AdminPage from './AdminPage';
import './App.css';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
};

const normalizeSearchText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd');

const formatPrice = (price) =>
  `${Number(price || 0).toLocaleString('vi-VN')} ₫`;

function App() {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [authToken, setAuthToken] = useState(() =>
    window.sessionStorage.getItem('accessToken'),
  );
  const [member, setMember] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [adminPageOpen, setAdminPageOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    note: '',
  });

  const loadBooks = useCallback(async (signal) => {
    setBooksLoading(true);
    setBooksError('');
    try {
      setBooks(await api.getBooks(signal));
    } catch (error) {
      if (error.name !== 'AbortError') setBooksError(error.message);
    } finally {
      if (!signal?.aborted) setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadBooks(controller.signal);
    return () => controller.abort();
  }, [loadBooks]);

  useEffect(() => {
    if (!authToken) {
      setMember(null);
      return undefined;
    }

    const controller = new AbortController();
    api
      .getProfile(authToken, controller.signal)
      .then((profile) =>
        setMember((currentMember) => ({ ...currentMember, ...profile })),
      )
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (error.status === 401) {
          window.sessionStorage.removeItem('accessToken');
          setAuthToken(null);
          setAuthMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setAuthMessage(`Không thể tải hồ sơ thành viên: ${error.message}`);
        }
      });

    return () => controller.abort();
  }, [authToken]);

  const categories = useMemo(() => {
    const uniqueCategories = new Map();
    books.forEach((book) => {
      const category = book.category;
      if (category?.name) {
        uniqueCategories.set(String(category.id ?? category.name), category);
      }
    });
    return Array.from(uniqueCategories.entries())
      .sort(([, categoryA], [, categoryB]) =>
        categoryA.name.localeCompare(categoryB.name, 'vi'),
      )
      .map(([id, category]) => ({ id, name: category.name }));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const term = normalizeSearchText(search.trim());
    return books.filter((book) => {
      const categoryId = String(book.category?.id ?? book.category?.name ?? '');
      const matchesCategory =
        !selectedCategory || categoryId === selectedCategory;
      const matchesSearch =
        !term ||
        [book.title, book.author, book.isbn, book.category?.name, book.description]
          .filter(Boolean)
          .some((value) => normalizeSearchText(value).includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [books, search, selectedCategory]);

  const totalCopies = books.reduce(
    (total, book) => total + (Number(book.quantity) || 0),
    0,
  );
  const canManageLibrary =
    member?.role === 'admin' || member?.role === 'librarian';
  const cartCount = cartItems.reduce((total, item) => total + item.cartQuantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + Number(item.price || 0) * item.cartQuantity,
    0,
  );

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setAuthMessage('');
    setAuthOpen(true);
  };

  const addToCart = (book) => {
    if (book.quantity < 1) return;
    const currentItem = cartItems.find((item) => item.id === book.id);
    if (currentItem && currentItem.cartQuantity >= book.quantity) {
      setCheckoutError(`"${book.title}" hiện chỉ còn ${book.quantity} cuốn.`);
      setCartOpen(true);
      return;
    }
    setCheckoutError('');
    if (currentItem) {
      setCartItems((items) =>
        items.map((item) =>
          item.id === book.id
            ? { ...item, ...book, cartQuantity: item.cartQuantity + 1 }
            : item,
        ),
      );
      return;
    }
    setCartItems((items) => [...items, { ...book, cartQuantity: 1 }]);
  };

  const updateCartQuantity = (bookId, nextQuantity) => {
    const book = books.find((item) => item.id === bookId);
    if (!book) return;
    if (nextQuantity < 1) {
      setCartItems((items) => items.filter((item) => item.id !== bookId));
      return;
    }
    if (nextQuantity > book.quantity) {
      setCheckoutError(`"${book.title}" hiện chỉ còn ${book.quantity} cuốn.`);
      return;
    }
    setCheckoutError('');
    setCartItems((items) =>
      items.map((item) =>
        item.id === bookId ? { ...item, cartQuantity: nextQuantity } : item,
      ),
    );
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setCheckoutError('Vui lòng đăng nhập để đặt hàng.');
      openAuth('login');
      setAuthMessage('Đăng nhập xong, bạn có thể tiếp tục đặt hàng trong giỏ.');
      return;
    }
    setCheckoutSubmitting(true);
    setCheckoutError('');
    try {
      const order = await api.createOrder({
        ...checkoutForm,
        items: cartItems.map(({ id, cartQuantity }) => ({
          bookId: id,
          quantity: cartQuantity,
        })),
      }, authToken);
      setOrderReceipt({
        id: order.id,
        totalAmount: Number(order.totalAmount ?? cartTotal),
      });
      setCartItems([]);
      setCartOpen(false);
      setCheckoutOpen(false);
      setCheckoutForm({ customerName: member?.fullName || '', phone: '', address: '', note: '' });
      setAuthMessage('');
      await loadBooks();
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const response =
        authMode === 'register'
          ? await api.register({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password,
            phone: form.phone.trim() || undefined,
            address: form.address.trim() || undefined,
          })
          : await api.login({
            email: form.email.trim(),
            password: form.password,
          });

      window.sessionStorage.setItem('accessToken', response.accessToken);
      setMember(response.member);
      setAuthToken(response.accessToken);
      setCheckoutForm((currentForm) => ({
        ...currentForm,
        customerName: currentForm.customerName || response.member.fullName || '',
      }));
      setAuthOpen(false);
      setForm(emptyForm);
      setAuthMessage(
        authMode === 'register'
          ? 'Tạo tài khoản thành công. Chào mừng bạn đến với thư viện!'
          : `Chào mừng trở lại, ${response.member.fullName}.`,
      );
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const signOut = () => {
    window.sessionStorage.removeItem('accessToken');
    setAuthToken(null);
    setMember(null);
    setAdminPageOpen(false);
    setAuthMessage('Bạn đã đăng xuất.');
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#home"
            aria-label="Trang chủ Thư viện Mộc"
            onClick={() => setAdminPageOpen(false)}
          >
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-copy">
              <strong>Bokos</strong>
              <small>THƯ VIỆN CỦA BẠN</small>
            </span>
          </a>

          <nav className="main-nav" aria-label="Điều hướng chính">
            <a className="nav-link active" href="#catalog">
              Khám phá sách
            </a>
            <a className="nav-link" href="#about">
              Về thư viện
            </a>
            {canManageLibrary && (
              <button
                className={`nav-link nav-button${adminPageOpen ? ' active' : ''}`}
                onClick={() => setAdminPageOpen(true)}
                aria-current={adminPageOpen ? 'page' : undefined}
              >
                Quản trị
              </button>
            )}
          </nav>

          <div className="header-actions">
            <button
              className="button button-outline button-small cart-nav-button"
              onClick={() => {
                setAdminPageOpen(false);
                setCartOpen(true);
                setCheckoutError('');
              }}
              aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
            >
              <span aria-hidden="true">🛒</span> Giỏ hàng
              <span className="cart-count">{cartCount}</span>
            </button>
            {member ? (
              <>
                {canManageLibrary && (
                  <button
                    className="button button-outline button-small admin-header-button"
                    onClick={() => setAdminPageOpen(true)}
                  >
                    Quản trị
                  </button>
                )}
                <span className="member-greeting">
                  Xin chào, <strong>{member.fullName || member.email}</strong>
                </span>
                <button className="button button-outline button-small" onClick={signOut}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  className="button button-quiet button-small login-button"
                  onClick={() => openAuth('login')}
                >
                  Đăng nhập
                </button>
                <button
                  className="button button-primary button-small"
                  onClick={() => openAuth('register')}
                >
                  Tạo tài khoản
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="home">
        {adminPageOpen && canManageLibrary ? (
          <AdminPage
            token={authToken}
            onBooksChanged={() => loadBooks()}
          />
        ) : (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-copy">
                <span className="brand-mark hero-logo" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="eyebrow"><span /> MỘT GÓC NHỎ ĐỂ LỚN LÊN</span>
                <h1 id="hero-title">
                  Mở một trang sách,
                  <br />
                  <em>mở một chân trời.</em>
                </h1>
                <p>
                  Tìm cuốn sách tiếp theo bạn yêu thích trong bộ sưu tập của thư
                  viện. Một hành trình mới luôn bắt đầu từ đây.
                </p>
                <div className="hero-actions">
                  <a className="button button-primary hero-button" href="#catalog">
                    Bắt đầu
                  </a>
                  <a className="button button-outline hero-button" href="#about">
                    Tìm hiểu thư viện
                  </a>
                </div>
                <div className="hero-note">
                  <span className="reader-avatars" aria-hidden="true">
                    <i>H</i>
                    <i>M</i>
                    <i>A</i>
                  </span>
                  <span>Cùng cộng đồng yêu sách mỗi ngày</span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="sun-disc" />
                <div className="plant plant-left"><i /><i /><i /><b /></div>
                <div className="book-stack">
                  <div className="book-cover cover-back"><span>NHỮNG NGÀY<br />THƠ ẤU</span></div>
                  <div className="book-cover cover-middle"><span>ĐI TÌM<br />LẼ SỐNG</span></div>
                  <div className="book-cover cover-front">
                    <span className="cover-kicker">MỘT CUỐN SÁCH</span>
                    <span className="cover-title">KHU VƯỜN<br />BÍ MẬT</span>
                    <span className="cover-author">FRANCES HODGSON BURNETT</span>
                    <span className="cover-sun" />
                  </div>
                </div>
                <div className="plant plant-right"><i /><i /><i /><b /></div>
                <span className="art-sparkle sparkle-one">✳</span>
                <span className="art-sparkle sparkle-two">✳</span>
                <div className="art-caption"><span>01 / 03</span> NHỮNG CÂU CHUYỆN ĐANG CHỜ BẠN</div>
              </div>
              <div className="hero-index" aria-hidden="true">01 — 03</div>
            </section>

            <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">GÓC SÁCH CỦA BOKOS</span>
                  <h2 id="catalog-title">Tìm câu chuyện của bạn</h2>
                  <p>Những cuốn sách hay đang đợi được khám phá.</p>
                </div>
                <div className="catalog-controls">
                  <label className="category-filter">
                    <span>Danh mục</span>
                    <select
                      value={selectedCategory}
                      onChange={(event) => setSelectedCategory(event.target.value)}
                      aria-label="Lọc sách theo danh mục"
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-box">
                    <span aria-hidden="true">⌕</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Tìm tên sách, tác giả, ISBN..."
                      aria-label="Tìm sản phẩm theo tên sách, tác giả, ISBN hoặc danh mục"
                    />
                  </label>
                </div>
              </div>

              <div className="catalog-meta">
                <span>
                  {booksLoading
                    ? 'Đang tải bộ sưu tập...'
                    : `${filteredBooks.length} cuốn sách`}
                </span>
                <span className="catalog-total">
                  <i /> {books.length} đầu sách · {totalCopies} bản trong thư viện
                </span>
              </div>

              {booksError ? (
                <div className="feedback-panel error-panel" role="alert">
                  <div>
                    <strong>Chưa thể tải bộ sưu tập</strong>
                    <p>{booksError}</p>
                  </div>
                  <button
                    className="button button-outline button-small"
                    onClick={() => loadBooks()}
                  >
                    Thử lại
                  </button>
                </div>
              ) : booksLoading ? (
                <div className="loading-grid" aria-label="Đang tải sách">
                  {[1, 2, 3, 4].map((item) => (
                    <div className="book-skeleton" key={item} />
                  ))}
                </div>
              ) : filteredBooks.length ? (
                <div className="book-grid">
                  {filteredBooks.map((book, index) => (
                    <article className="book-card" key={book.id}>
                      <button
                        className={`book-visual book-visual-${index % 4}`}
                        onClick={() => setSelectedBook(book)}
                        aria-label={`Xem thông tin sách ${book.title}`}
                      >
                        {book.imageUrl && (
                          <img className="book-product-image" src={book.imageUrl} alt="" />
                        )}
                        <span className="book-visual-label">MỘC · TỦ SÁCH</span>
                        <span className="book-visual-title">{book.title}</span>
                        <span className="book-visual-author">{book.author}</span>
                        <span className="book-visual-decoration" aria-hidden="true">
                          {['✳', '◉', '✺', '❋'][index % 4]}
                        </span>
                      </button>
                      <div className="book-details">
                        <div>
                          <h3>{book.title}</h3>
                          <p>{book.author}</p>
                        </div>
                        <button
                          className="details-button"
                          onClick={() => setSelectedBook(book)}
                          aria-label={`Xem chi tiết ${book.title}`}
                        >
                          ↗
                        </button>
                      </div>
                      <div className="book-meta">
                        <strong>{formatPrice(book.price)}</strong>
                        <span>{book.category?.name || 'Chưa phân loại'}</span>
                        <span>{book.publishedYear || 'Sách hay'}</span>
                        <span>{book.quantity} bản</span>
                      </div>
                      <button
                        className="button button-primary add-to-cart-button"
                        onClick={() => addToCart(book)}
                        disabled={book.quantity < 1 || Number(book.price) < 1}
                      >
                        {book.quantity < 1
                          ? 'Tạm hết hàng'
                          : Number(book.price) < 1
                            ? 'Chưa có giá'
                            : 'Thêm vào giỏ'}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="feedback-panel empty-panel">
                  <span className="empty-icon" aria-hidden="true">⌕</span>
                  <strong>
                    {search || selectedCategory
                      ? 'Không tìm thấy cuốn sách phù hợp'
                      : 'Tủ sách đang được cập nhật'}
                  </strong>
                  <p>
                    {search || selectedCategory
                      ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác nhé.'
                      : 'Hãy quay lại sau để khám phá những đầu sách mới.'}
                  </p>
                </div>
              )}
            </section>

            <section className="about-strip" id="about">
              <span className="about-sparkle" aria-hidden="true">✳</span>
              <div>
                <span className="eyebrow">ĐỌC CHẬM, SỐNG SÂU</span>
                <h2>Mỗi cuốn sách là một người bạn.</h2>
                <p>Bokos giúp bạn dễ dàng tìm thấy cuốn sách hợp với hành trình của mình.</p>
              </div>
              <div className="about-stat">
                <strong>{books.length.toString().padStart(2, '0')}</strong>
                <span>ĐẦU SÁCH<br />TRONG THƯ VIỆN</span>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-copy"><strong>Bokos</strong><small>THƯ VIỆN CỦA BẠN</small></span>
        </a>
        <span>Một nơi bình yên dành cho những tâm hồn ham đọc.</span>
        <span>© {new Date().getFullYear()} Thư viện Bokos</span>
      </footer>

      {cartOpen && (
        <div
          className="modal-backdrop cart-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCartOpen(false);
              setCheckoutOpen(false);
            }
          }}
        >
          <section className="modal-card cart-modal" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <button
              className="modal-close"
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(false);
              }}
              aria-label="Đóng giỏ hàng"
            >
              ×
            </button>
            <span className="eyebrow">BOKOS · MUA SÁCH</span>
            <h2 id="cart-title">Giỏ hàng của bạn</h2>
            {!cartItems.length ? (
              <div className="cart-empty">
                <p>Giỏ hàng đang trống.</p>
                <button
                  className="button button-primary"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(false);
                    setAdminPageOpen(false);
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Tiếp tục xem sách
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <article className="cart-item" key={item.id}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" />
                      ) : (
                        <span className="cart-item-placeholder" aria-hidden="true">B</span>
                      )}
                      <div className="cart-item-info">
                        <strong>{item.title}</strong>
                        <span>{formatPrice(item.price)}</span>
                        <div className="cart-quantity">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                            aria-label={`Giảm số lượng ${item.title}`}
                          >−</button>
                          <span>{item.cartQuantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                            aria-label={`Tăng số lượng ${item.title}`}
                          >+</button>
                        </div>
                      </div>
                      <button
                        className="cart-remove"
                        type="button"
                        onClick={() => updateCartQuantity(item.id, 0)}
                        aria-label={`Xóa ${item.title} khỏi giỏ`}
                      >
                        Xóa
                      </button>
                    </article>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Tổng cộng</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                {checkoutError && (
                  <p className="form-error cart-error" role="alert">{checkoutError}</p>
                )}
                {!checkoutOpen ? (
                  <button
                    className="button button-primary cart-checkout-button"
                    onClick={() => {
                      setCheckoutForm((currentForm) => ({
                        ...currentForm,
                        customerName: currentForm.customerName || member?.fullName || '',
                      }));
                      setCheckoutOpen(true);
                      setCheckoutError('');
                    }}
                  >
                    Tiến hành đặt hàng
                  </button>
                ) : (
                  <form className="checkout-form" onSubmit={handleOrderSubmit}>
                    <h3>Thông tin nhận hàng</h3>
                    {!authToken && (
                      <p className="checkout-login-note">
                        Bạn cần đăng nhập trước khi gửi đơn hàng.
                      </p>
                    )}
                    <label>
                      Họ và tên
                      <input
                        required
                        maxLength="150"
                        value={checkoutForm.customerName}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, customerName: event.target.value })}
                      />
                    </label>
                    <label>
                      Số điện thoại
                      <input
                        required
                        type="tel"
                        maxLength="30"
                        value={checkoutForm.phone}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, phone: event.target.value })}
                      />
                    </label>
                    <label>
                      Địa chỉ nhận hàng
                      <input
                        required
                        maxLength="255"
                        value={checkoutForm.address}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, address: event.target.value })}
                      />
                    </label>
                    <label>
                      Ghi chú
                      <textarea
                        rows="2"
                        value={checkoutForm.note}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, note: event.target.value })}
                      />
                    </label>
                    <fieldset className="checkout-payment">
                      <legend>Phương thức thanh toán</legend>
                      <div className="checkout-payment-choice">
                        <span className="checkout-payment-icon" aria-hidden="true">₫</span>
                        <div>
                          <strong>Thanh toán khi nhận hàng (COD)</strong>
                          <p>Bạn thanh toán cho nhân viên giao hàng khi nhận sách.</p>
                        </div>
                      </div>
                    </fieldset>
                    <p className="checkout-total">
                      Số tiền cần thanh toán khi nhận <strong>{formatPrice(cartTotal)}</strong>
                    </p>
                    <button className="button button-primary cart-checkout-button" type="submit" disabled={checkoutSubmitting}>
                      {checkoutSubmitting ? 'Đang gửi đơn...' : 'Đặt hàng'}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {authMessage && (
        <div className="toast-message" role="status">
          <span aria-hidden="true">✓</span> {authMessage}
          <button onClick={() => setAuthMessage('')} aria-label="Đóng thông báo">×</button>
        </div>
      )}

      {orderReceipt && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOrderReceipt(null);
          }}
        >
          <section className="modal-card order-receipt" role="dialog" aria-modal="true" aria-labelledby="order-receipt-title">
            <button className="modal-close" onClick={() => setOrderReceipt(null)} aria-label="Đóng">
              ×
            </button>
            <span className="eyebrow">ĐẶT HÀNG THÀNH CÔNG</span>
            <h2 id="order-receipt-title">Đơn hàng đã được ghi nhận</h2>
            {orderReceipt.id && <p className="order-receipt-id">Mã đơn hàng <strong>#{orderReceipt.id}</strong></p>}
            <div className="order-payment-summary">
              <span>Phương thức thanh toán</span>
              <strong>Thanh toán khi nhận hàng (COD)</strong>
              <span>Số tiền cần thanh toán</span>
              <strong className="order-receipt-total">{formatPrice(orderReceipt.totalAmount)}</strong>
            </div>
            <p className="order-receipt-note">Vui lòng thanh toán cho nhân viên giao hàng khi nhận đủ sách.</p>
            <button className="button button-primary cart-checkout-button" onClick={() => setOrderReceipt(null)}>
              Tiếp tục mua sắm
            </button>
          </section>
        </div>
      )}

      {authOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAuthOpen(false);
          }}
        >
          <section
            className="modal-card auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              className="modal-close"
              onClick={() => setAuthOpen(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <span className="eyebrow">CHÀO MỪNG BẠN ĐẾN VỚI BOKOS</span>
            <h2 id="auth-title">
              {authMode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
            </h2>
            <p className="modal-intro">
              {authMode === 'register'
                ? 'Gia nhập cộng đồng và bắt đầu hành trình đọc của bạn.'
                : 'Đăng nhập để tiếp tục hành trình cùng những cuốn sách.'}
            </p>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label>
                  Họ và tên
                  <input
                    autoComplete="name"
                    maxLength="150"
                    required
                    value={form.fullName}
                    onChange={(event) =>
                      setForm({ ...form, fullName: event.target.value })
                    }
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  maxLength="255"
                  required
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  minLength="8"
                  maxLength="72"
                  required
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
                {authMode === 'register' && (
                  <small className="field-hint">Tối thiểu 8 ký tự.</small>
                )}
              </label>
              {authMode === 'register' && (
                <>
                  <label>
                    Số điện thoại <span className="optional-label">Không bắt buộc</span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      maxLength="30"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </label>
                  <label>
                    Địa chỉ <span className="optional-label">Không bắt buộc</span>
                    <input
                      autoComplete="street-address"
                      maxLength="255"
                      value={form.address}
                      onChange={(event) =>
                        setForm({ ...form, address: event.target.value })
                      }
                    />
                  </label>
                </>
              )}
              {authError && <p className="form-error" role="alert">{authError}</p>}
              <button
                className="button button-primary auth-submit"
                type="submit"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? 'Đang xử lý...'
                  : authMode === 'register'
                    ? 'Tạo tài khoản'
                    : 'Đăng nhập'}
                {!authSubmitting && <span aria-hidden="true">↗</span>}
              </button>
            </form>
            <p className="auth-switch">
              {authMode === 'register' ? 'Đã có tài khoản?' : 'Bạn chưa có tài khoản?'}{' '}
              <button
                onClick={() => {
                  setAuthMode(authMode === 'register' ? 'login' : 'register');
                  setAuthError('');
                }}
              >
                {authMode === 'register' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </p>
          </section>
        </div>
      )}

      {selectedBook && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedBook(null);
        }}>
          <section className="modal-card book-modal" role="dialog" aria-modal="true" aria-labelledby="book-title">
            <button
              className="modal-close"
              onClick={() => setSelectedBook(null)}
              aria-label="Đóng"
            >
              ×
            </button>
            <span className="eyebrow">CHI TIẾT SÁCH · MỘC</span>
            {selectedBook.imageUrl && (
              <img className="book-modal-image" src={selectedBook.imageUrl} alt={`Bìa sách ${selectedBook.title}`} />
            )}
            <h2 id="book-title">{selectedBook.title}</h2>
            <p className="book-modal-author">Tác giả: {selectedBook.author}</p>
            <dl className="book-facts">
              <div><dt>ISBN</dt><dd>{selectedBook.isbn}</dd></div>
              <div><dt>Năm xuất bản</dt><dd>{selectedBook.publishedYear}</dd></div>
              <div><dt>Số bản trong thư viện</dt><dd>{selectedBook.quantity}</dd></div>
              <div><dt>Giá bán</dt><dd>{formatPrice(selectedBook.price)}</dd></div>
            </dl>
            {selectedBook.description ? (
              <p className="book-description">{selectedBook.description}</p>
            ) : (
              <p className="book-description">Một cuốn sách đang chờ bạn khám phá.</p>
            )}
            <button
              className="button button-primary cart-checkout-button"
              disabled={selectedBook.quantity < 1 || Number(selectedBook.price) < 1}
              onClick={() => {
                addToCart(selectedBook);
                setSelectedBook(null);
                setCartOpen(true);
              }}
            >
              {selectedBook.quantity < 1
                ? 'Tạm hết hàng'
                : Number(selectedBook.price) < 1
                  ? 'Chưa có giá'
                  : 'Thêm vào giỏ hàng'}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
