-- Where My Money Went - Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS money_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE money_tracker;

-- Single user table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('food','social_life','transport','education','clothing','health','gifts','others') NOT NULL,
  account_mode ENUM('cash','upi','card') NOT NULL,
  transaction_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, transaction_date),
  INDEX idx_user_category (user_id, category),
  INDEX idx_user_type (user_id, type)
);

-- Tags (stored per user, reusable)
CREATE TABLE IF NOT EXISTS tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  use_count INT DEFAULT 1,
  UNIQUE KEY unique_user_tag (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transaction <-> Tags (many-to-many)
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Budgets (monthly or category-wise)
CREATE TABLE IF NOT EXISTS budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('monthly', 'category') NOT NULL,
  month INT CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  category ENUM('food','social_life','transport','education','clothing','health','gifts','others'),
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_monthly_budget (user_id, type, year, month, category),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Split: People/Contacts
CREATE TABLE IF NOT EXISTS split_people (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY unique_person (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Multi-user Split Groups
CREATE TABLE IF NOT EXISTS shared_split_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_created_by (created_by)
);

-- Group Members
CREATE TABLE IF NOT EXISTS shared_split_group_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES shared_split_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_groups (user_id, group_id)
);

-- Shared Split Expenses
CREATE TABLE IF NOT EXISTS shared_split_expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(50),
  paid_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES shared_split_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(id),
  INDEX idx_group_date (group_id, created_at)
);

-- Shared Split Expense Splits (who owes what)
CREATE TABLE IF NOT EXISTS shared_split_expense_splits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'settled') DEFAULT 'pending',
  UNIQUE(expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES shared_split_expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Legacy Split: Groups (single-user)
CREATE TABLE IF NOT EXISTS split_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Split: Expenses
CREATE TABLE IF NOT EXISTS split_expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  group_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES split_groups(id) ON DELETE SET NULL
);

-- Split: Shares (who owes whom)
CREATE TABLE IF NOT EXISTS split_shares (
  id INT PRIMARY KEY AUTO_INCREMENT,
  split_expense_id INT NOT NULL,
  person_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  direction ENUM('you_owe', 'owes_you') NOT NULL,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMP NULL,
  FOREIGN KEY (split_expense_id) REFERENCES split_expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES split_people(id) ON DELETE CASCADE
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  billing_cycle ENUM('weekly','monthly','yearly') NOT NULL,
  next_billing_date DATE NOT NULL,
  category VARCHAR(50) DEFAULT 'others',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0.00,
  deadline DATE NULL,
  emoji VARCHAR(10) DEFAULT '🎯',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Goal Allocations (history)
CREATE TABLE IF NOT EXISTS goal_allocations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  goal_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Web Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification log
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  snooze_until TIMESTAMP NULL,
  reference_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
);
