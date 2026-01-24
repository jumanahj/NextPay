create database payment_gateway2;
use payment_gateway2;

select * from merchants;
select * from customer_merchant_assignments;
select * from customers;
select * from debit_cards;
select * from bank_accounts;
select * from accounts;
select * from requests;
select * from transactions;
select * from upi_accounts;
select * from credit_cards;

drop table merchants;
CREATE TABLE merchants (
    merchant_id INT AUTO_INCREMENT PRIMARY KEY,
    merchant_user_id VARCHAR(50) NOT NULL UNIQUE,
    merchant_name VARCHAR(100) NOT NULL,
    business_name VARCHAR(150) NOT NULL,
    business_domain VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    contact_person_name VARCHAR(100) NOT NULL,
    contact_person_mobile VARCHAR(15) NOT NULL,
    gst_number VARCHAR(15) NOT NULL UNIQUE,
    account_id INT NOT NULL,                        -- link to accounts.account_id
    account_number VARCHAR(20) NOT NULL UNIQUE,     -- store the bank account number here
    password VARCHAR(255) NOT NULL,                -- hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_merchant_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE credit_cards (
    card_id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL,          
    card_number VARCHAR(16) NOT NULL UNIQUE,
    card_holder_name VARCHAR(100) NOT NULL,
    expiry_month INT NOT NULL,
    expiry_year INT NOT NULL,
    cvv VARCHAR(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


desc merchants;
ALTER TABLE merchants
ADD COLUMN account_number VARCHAR(20) NOT NULL UNIQUE AFTER account_id;


ALTER TABLE merchants 
ADD COLUMN password VARCHAR(255) NOT NULL AFTER email;

-- Maintained by Banks 
CREATE TABLE bank_accounts (
    bank_name VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    registered_phone_number VARCHAR(15) NOT NULL,

    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,

    account_status ENUM('active', 'inactive', 'blocked', 'closed')
        DEFAULT 'inactive',
    kyc_status ENUM('pending', 'verified', 'rejected')
        DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

drop table debit_cards;
CREATE TABLE debit_cards (
card_id INT AUTO_INCREMENT PRIMARY KEY,
account_number VARCHAR(20) NOT NULL,           -- link directly to accounts.account_number
card_number VARCHAR(16) NOT NULL UNIQUE,
card_holder_name VARCHAR(100) NOT NULL,
expiry_month INT NOT NULL,
expiry_year INT NOT NULL,
cvv VARCHAR(3) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

    
CREATE TABLE customers (
	customer_id INT AUTO_INCREMENT PRIMARY KEY,
	customer_user_id VARCHAR(50) NOT NULL UNIQUE,  -- system-generated username/ID
	password VARCHAR(255) NOT NULL,                -- store hashed passwords
	customer_name VARCHAR(100) NOT NULL,
	email VARCHAR(150) NOT NULL UNIQUE,
	mobile_no VARCHAR(15) NOT NULL,
	account_number VARCHAR(20) NOT NULL UNIQUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

drop table customers;
drop table accounts;

CREATE TABLE accounts (
account_id INT AUTO_INCREMENT PRIMARY KEY,
usertype ENUM('merchant', 'customer') NOT NULL,
bank_name VARCHAR(100) NOT NULL,
holder_name VARCHAR(100) NOT NULL,
account_number VARCHAR(20) NOT NULL UNIQUE,
ifsc_code VARCHAR(11) NOT NULL,
account_type ENUM('savings', 'current', 'salary') NOT NULL,
phone_number VARCHAR(15) NOT NULL,
registered_mobile_number VARCHAR(15) NOT NULL,
pan_number VARCHAR(10) NOT NULL UNIQUE,
permanent_address TEXT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

select * from debit_cards;
CREATE TABLE debit_cards (
card_id INT AUTO_INCREMENT PRIMARY KEY,                     -- normal field now
card_number VARCHAR(16) NOT NULL UNIQUE,
card_holder_name VARCHAR(100) NOT NULL,
expiry_month INT NOT NULL,
expiry_year INT NOT NULL,
cvv VARCHAR(3) NOT NULL,
account_number VARCHAR(20) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_merchant_assignments (
assignment_id INT AUTO_INCREMENT PRIMARY KEY,
customer_id VARCHAR(50) NOT NULL,
merchant_id VARCHAR(50) NOT NULL,
assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE upi_accounts (
    upi_id VARCHAR(100) PRIMARY KEY,        -- ex: user@okhdfc

    account_number VARCHAR(20) NOT NULL,    -- logical link to accounts
    upi_holder_name VARCHAR(100) NOT NULL,
    registered_mobile_number VARCHAR(15) NOT NULL,

    upi_status ENUM('active', 'inactive', 'blocked')
        DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO customer_merchant_assignments (customer_id, merchant_id)
VALUES ('CUST1187', 'MER-C5A0F04F');


INSERT INTO debit_cards 
(account_id, card_number, card_holder_name, expiry_month, expiry_year, cvv)
VALUES
(1, '1234567812345678', 'John Doe', 12, 2028, '123');

ALTER TABLE accounts
ADD COLUMN balance DECIMAL(12,2) DEFAULT 0.00;
drop table requests;
select * from requests;
CREATE TABLE requests (
    reference_number BIGINT AUTO_INCREMENT PRIMARY KEY,
    sending_customer_id VARCHAR(50) NOT NULL,
    receiving_merchant_id VARCHAR(50) NOT NULL,
    order_id VARCHAR(50) NOT NULL UNIQUE,
    due_date DATE NOT NULL,
    initialised_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'not paid'))
);
select * from requests;
ALTER TABLE customer_merchant_assignments
MODIFY customer_id VARCHAR(50) NOT NULL,
MODIFY merchant_id VARCHAR(50) NOT NULL;

CREATE TABLE transactions (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    reference_number BIGINT NOT NULL,          
    order_id VARCHAR(50) NOT NULL,

    payer_customer_id VARCHAR(50) NOT NULL,
    payee_merchant_id VARCHAR(50) NOT NULL,

    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_mode ENUM('debit_card', 'upi', 'net_banking') NOT NULL,
    transaction_status ENUM(
        'initiated',
        'success',
        'failed',
        'reversed'
    ) DEFAULT 'initiated',
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE transactions
MODIFY payment_mode ENUM('debit_card', 'credit_card', 'upi', 'net_banking') NOT NULL;

ALTER TABLE transactions
MODIFY payment_mode VARCHAR(20) NOT NULL;
ALTER TABLE merchants
ADD COLUMN account_number VARCHAR(20) NOT NULL UNIQUE AFTER account_id;


USE payment_gateway;

-- 1️⃣ Merchant bank account
INSERT INTO bank_accounts
(bank_name, ifsc_code, account_number, registered_phone_number, balance, account_status, kyc_status)
VALUES
('HDFC Bank', 'HDFC0001234', 'MERCHANT12345', '9876543210', 0.00, 'active', 'verified');

-- 2️⃣ Customer bank account
INSERT INTO bank_accounts
(bank_name, ifsc_code, account_number, registered_phone_number, balance, account_status, kyc_status)
VALUES
('HDFC Bank', 'HDFC0005678', 'CUSTOMER12345', '9123456789', 50000.00, 'active', 'verified');

USE payment_gateway;

-- 1️⃣ Create merchant account
INSERT INTO accounts 
(usertype, bank_name, holder_name, account_number, ifsc_code, account_type, phone_number, registered_mobile_number, pan_number, permanent_address, balance)
VALUES
('merchant', 'HDFC Bank', 'Alice Merchant', 'MERCHANT12345', 'HDFC0001234', 'current', '9876543210', '9876543210', 'ABCDE1234F', '123 Business Street, Mumbai', 0.00);

-- Get the account_id of the merchant account
SET @merchant_account_id = LAST_INSERT_ID();

-- 2️⃣ Create merchant
INSERT INTO merchants
(merchant_user_id, merchant_name, business_name, business_domain, email, contact_person_name, contact_person_mobile, gst_number, account_id, account_number, password)
VALUES
('MER-C12345', 'Alice Merchant', 'Alice Store', 'Retail', 'alice@example.com', 'Alice Merchant', '9876543210', '27ABCDE1234F1Z5', @merchant_account_id, 'MERCHANT12345', 'hashed_password_here');

-- 3️⃣ Create customer account
INSERT INTO accounts 
(usertype, bank_name, holder_name, account_number, ifsc_code, account_type, phone_number, registered_mobile_number, pan_number, permanent_address, balance)
VALUES
('customer', 'HDFC Bank', 'John Doe', 'CUSTOMER12345', 'HDFC0005678', 'savings', '9123456789', '9123456789', 'XYZAB1234C', '456 Residential Street, Delhi', 50000.00);

-- Get the account_id of the customer account
SET @customer_account_id = LAST_INSERT_ID();
INSERT INTO upi_accounts (
    upi_id,
    account_number,
    upi_holder_name,
    registered_mobile_number,
    upi_status
)
VALUES (
    '9123456789@okhdfc',
    'CUSTOMER12345',
    'John Doe',
    '9123456789',
    'active'
);
INSERT INTO credit_cards (account_number, card_number, card_holder_name, expiry_month, expiry_year, cvv)
VALUES
('CUSTOMER12345', '1234567812345678', 'John Doe', 12, 2028, '123');

-- 4️⃣ Create customer
INSERT INTO customers
(customer_user_id, password, customer_name, email, mobile_no, account_number)
VALUES
('CUST12345', 'hashed_password_here', 'John Doe', 'john@example.com', '9123456789', 'CUSTOMER12345');

-- 5️⃣ Add debit card for customer
INSERT INTO debit_cards
(account_id, card_number, card_holder_name, expiry_month, expiry_year, cvv, account_number)
VALUES
(1, '1234567812345678', 'John Doe', 12, 2028, '123', 'CUSTOMER12345');

-- 6️⃣ Optional: assign this customer to this merchant
INSERT INTO customer_merchant_assignments (customer_id, merchant_id)
VALUES ('CUST8937', 'MER-DA64AF61');
INSERT INTO debit_cards 
    (account_number, card_number, card_holder_name, expiry_month, expiry_year, cvv)
VALUES 
    ('CUSTOMER12345', '1234567812345678', 'John Doe', 12, 2028, '123');

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Truncate tables in proper order
TRUNCATE TABLE transactions;
TRUNCATE TABLE requests;
TRUNCATE TABLE customer_merchant_assignments;
TRUNCATE TABLE debit_cards;
TRUNCATE TABLE customers;
TRUNCATE TABLE merchants;
TRUNCATE TABLE accounts;
TRUNCATE TABLE bank_accounts;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
