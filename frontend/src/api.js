const apiBaseUrl = process.env.REACT_APP_API_URL || '';

async function request(path, { token, signal, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    signal,
  });

  const contentType = response.headers.get('content-type') || '';
  const data =
    response.status === 204
      ? null
      : contentType.includes('application/json')
        ? await response.json()
        : await response.text();

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message || data || `Yêu cầu thất bại (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  getBooks(signal) {
    return request('/books', { signal });
  },
  getCategories(signal) {
    return request('/categories', { signal });
  },
  createBook(book, token) {
    return request('/books', {
      method: 'POST',
      token,
      body: JSON.stringify(book),
    });
  },
  uploadBookImage(file, token) {
    const body = new FormData();
    body.append('image', file);
    return request('/books/image', { method: 'POST', token, body });
  },
  updateBook(id, book, token) {
    return request(`/books/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(book),
    });
  },
  deleteBook(id, token) {
    return request(`/books/${id}`, { method: 'DELETE', token });
  },
  createCategory(category, token) {
    return request('/categories', {
      method: 'POST',
      token,
      body: JSON.stringify(category),
    });
  },
  updateCategory(id, category, token) {
    return request(`/categories/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(category),
    });
  },
  deleteCategory(id, token) {
    return request(`/categories/${id}`, { method: 'DELETE', token });
  },
  createOrder(order, token) {
    return request('/orders', {
      method: 'POST',
      token,
      body: JSON.stringify(order),
    });
  },
  getMyOrders(token, signal) {
    return request('/orders/mine', { token, signal });
  },
  getOrders(token, signal) {
    return request('/orders', { token, signal });
  },
  confirmOrder(id, token) {
    return request(`/orders/${id}/confirm`, { method: 'PATCH', token });
  },
  cancelOrder(id, token) {
    return request(`/orders/${id}/cancel`, { method: 'PATCH', token });
  },
  getProfile(token, signal) {
    return request('/members/me', { token, signal });
  },
  login(credentials) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  register(details) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(details),
    });
  },
};
