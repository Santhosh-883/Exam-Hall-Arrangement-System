-- Full schema + sample data for exam_management
-- This file drops and recreates the database. Run it when you want a clean local DB.
DROP DATABASE IF EXISTS exam_management;
CREATE DATABASE exam_management;
USE exam_management;

-- --------------------------------------------------------
-- DDL: CREATE TABLES
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS Admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Student (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Hall (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT 'Standard Examination Hall',
    rows_cnt INT NOT NULL,
    cols_cnt INT NOT NULL,
    capacity INT NOT NULL,
    CONSTRAINT chk_rows CHECK (rows_cnt > 0),
    CONSTRAINT chk_cols CHECK (cols_cnt > 0),
    CONSTRAINT chk_capacity CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS Seating (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    hall_id INT NOT NULL,
    faculty_id INT NOT NULL,
    seat_no INT NOT NULL,
    row_no INT NOT NULL,
    col_no INT NOT NULL,
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
    CONSTRAINT fk_hall FOREIGN KEY (hall_id) REFERENCES Hall(id) ON DELETE CASCADE,
    CONSTRAINT fk_faculty FOREIGN KEY (faculty_id) REFERENCES Faculty(id) ON DELETE CASCADE,
    CONSTRAINT uq_hall_seat UNIQUE (hall_id, seat_no),
    CONSTRAINT uq_hall_grid UNIQUE (hall_id, row_no, col_no),
    CONSTRAINT chk_seat_no CHECK (seat_no > 0),
    CONSTRAINT chk_row_no CHECK (row_no > 0),
    CONSTRAINT chk_col_no CHECK (col_no > 0)
);

-- --------------------------------------------------------
-- Migrations (safe-to-run additions for older DBs)
-- These use IF NOT EXISTS so they won't error when columns already exist.
ALTER TABLE Hall ADD COLUMN IF NOT EXISTS rows_cnt INT NOT NULL DEFAULT 1;
ALTER TABLE Hall ADD COLUMN IF NOT EXISTS cols_cnt INT NOT NULL DEFAULT 1;
ALTER TABLE Seating ADD COLUMN IF NOT EXISTS row_no INT NOT NULL DEFAULT 1;
ALTER TABLE Seating ADD COLUMN IF NOT EXISTS col_no INT NOT NULL DEFAULT 1;

-- --------------------------------------------------------
-- DML: INSERT SAMPLE DATA
-- --------------------------------------------------------

INSERT INTO Admin (username, password_hash) VALUES ('admin', 'hashedpass123');

INSERT INTO Student (roll_no, name, department) VALUES
('24CSR271', 'SANTHOSH KUMAR R', 'CSE'),
('24CSR276', 'SHAHUL HAMEED M', 'CSE'),
('24CSR283', 'SHARVESHRAM R L', 'CSE'),
('24CSR244', 'ROHITHRAM R', 'CSE'),
('24MER059', 'SIVA S', 'MECH'),
('24ITR085', 'NIRANJAN G', 'IT'),
('24ADR122', 'RABIN KUMAR S', 'AIDS');

INSERT INTO Faculty (emp_id, name) VALUES

('101', 'MRS. S. SHANTHI'),
('102', 'MRS. S. MALLIGA'),
('103', 'MRS. E. GOTHAI'),
('104', 'MR. V. MANIMARAN'),
('105', 'MR. T. ARUNKUMAR'),
('106', 'MRS. J. GOWTHAMI');

INSERT INTO Hall (name, description, rows_cnt, cols_cnt, capacity) VALUES
('CC16', 'IT PARK 2ND FLOOR', 6, 10, 60),
('CC9', 'ADMIN BLOCK GROUND FLOOR', 4, 20, 80),
('CC8', 'IT PARK 1ST FLOOR', 4, 20, 80);

-- Seating sample (IDs correspond to above inserts)
INSERT INTO Seating (student_id, hall_id, faculty_id, seat_no, row_no, col_no) VALUES
(1, 1, 3, 1, 1, 1),
(2, 2, 6, 1, 1, 1),
(3, 3, 1, 1, 1, 1),
(4, 3, 1, 2, 1, 2),
(5, 3, 1, 3, 1, 3),
(6, 3, 1, 4, 1, 4),
(7, 3, 1, 5, 1, 5);

-- --------------------------------------------------------
-- Helpful queries (reports)
-- --------------------------------------------------------
SELECT 
    s.roll_no, s.name AS student_name, s.department,
    h.name AS hall_name,
    se.seat_no, se.row_no, se.col_no,
    f.name AS invigilator
FROM 
    Student s
JOIN 
    Seating se ON s.id = se.student_id
JOIN 
    Hall h ON se.hall_id = h.id
JOIN 
    Faculty f ON se.faculty_id = f.id
ORDER BY 
    h.name, se.row_no, se.col_no;

SELECT 
    h.name AS hall_name, 
    h.capacity, 
    COUNT(se.id) AS occupied_seats,
    (h.capacity - COUNT(se.id)) AS available_seats
FROM 
    Hall h
LEFT JOIN 
    Seating se ON h.id = se.hall_id
GROUP BY 
    h.id;
