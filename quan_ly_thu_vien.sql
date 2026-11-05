CREATE DATABASE IF NOT EXISTS quan_ly_thu_vien CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quan_ly_thu_vien;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE NOT NULL,
    published_year INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    description TEXT,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_books_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    membership_number VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    role ENUM('member', 'librarian', 'admin') NOT NULL DEFAULT 'member',
    phone VARCHAR(30) UNIQUE,
    address VARCHAR(255),
    joined_at DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    customer_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(255) NOT NULL,
    note TEXT,
    total_amount DECIMAL(12, 2) NOT NULL,
    member_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_member FOREIGN KEY (member_id)
        REFERENCES members(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_title VARCHAR(255) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    order_id INT NOT NULL,
    book_id INT NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_book FOREIGN KEY (book_id)
        REFERENCES books(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS book_copies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    shelf_location VARCHAR(100),
    status ENUM('available', 'borrowed', 'damaged', 'lost') NOT NULL DEFAULT 'available',
    book_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_book_copies_book FOREIGN KEY (book_id)
        REFERENCES books(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    borrowed_at DATETIME NOT NULL,
    due_at DATETIME NOT NULL,
    status ENUM('active', 'returned', 'overdue', 'cancelled') NOT NULL DEFAULT 'active',
    note TEXT,
    member_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loans_member FOREIGN KEY (member_id)
        REFERENCES members(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS loan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    returned_at DATETIME,
    return_condition VARCHAR(100),
    loan_id INT NOT NULL,
    copy_id INT NOT NULL,
    CONSTRAINT fk_loan_items_loan FOREIGN KEY (loan_id)
        REFERENCES loans(id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_items_copy FOREIGN KEY (copy_id)
        REFERENCES book_copies(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('waiting', 'ready', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'waiting',
    reserved_at DATETIME NOT NULL,
    expires_at DATETIME,
    member_id INT NOT NULL,
    book_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservations_member FOREIGN KEY (member_id)
        REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_reservations_book FOREIGN KEY (book_id)
        REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('unpaid', 'paid', 'waived') NOT NULL DEFAULT 'unpaid',
    paid_at DATETIME,
    loan_item_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fines_loan_item FOREIGN KEY (loan_item_id)
        REFERENCES loan_items(id) ON DELETE CASCADE
);