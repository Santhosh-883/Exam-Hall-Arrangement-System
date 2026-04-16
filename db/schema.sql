-- ER Diagram (Text Representation)
-- -----------------------------------
-- +-------------+       +---------+
-- |   Student   |-------|<Seating>|
-- +-------------+       +---------+
--                           |
-- +-------------+           |
-- |     Hall    |-----------|
-- +-------------+           |
--                           |
-- +-------------+           |
-- |   Faculty   |-----------+
-- +-------------+
-- -----------------------------------

-- Create Database
CREATE DATABASE IF NOT EXISTS exam_management;
USE exam_management;

-- --------------------------------------------------------
-- DDL: CREATE TABLES
-- --------------------------------------------------------

-- 1. Admin Table
CREATE TABLE Admin (
    id INT AUTO_INCREMENT PRIMARY KEY, -- AUTO_INCREMENT & PRIMARY KEY
    username VARCHAR(100) NOT NULL UNIQUE, -- NOT NULL & UNIQUE
    password_hash VARCHAR(255) NOT NULL
);

-- 2. Student Table
CREATE TABLE Student (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

-- 3. Faculty Table
CREATE TABLE Faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

-- 4. Hall Table
CREATE TABLE Hall (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT 'Standard Examination Hall', -- DEFAULT
    rows_cnt INT NOT NULL,
    cols_cnt INT NOT NULL,
    capacity INT NOT NULL,
    CONSTRAINT chk_rows CHECK (rows_cnt > 0),
    CONSTRAINT chk_cols CHECK (cols_cnt > 0),
    CONSTRAINT chk_capacity CHECK (capacity > 0) -- CHECK
);

-- 5. Seating Table
CREATE TABLE Seating (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE, -- A student can only be seated once
    hall_id INT NOT NULL,
    faculty_id INT NOT NULL,
    seat_no INT NOT NULL,
    row_no INT NOT NULL,
    col_no INT NOT NULL,
    
    -- FOREIGN KEYS
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
    CONSTRAINT fk_hall FOREIGN KEY (hall_id) REFERENCES Hall(id) ON DELETE CASCADE,
    CONSTRAINT fk_faculty FOREIGN KEY (faculty_id) REFERENCES Faculty(id) ON DELETE CASCADE,
    
    -- UNIQUE and CHECK
    CONSTRAINT uq_hall_seat UNIQUE (hall_id, seat_no), -- Linear seat_no
    CONSTRAINT uq_hall_grid UNIQUE (hall_id, row_no, col_no), -- Grid location
    CONSTRAINT chk_seat_no CHECK (seat_no > 0),
    CONSTRAINT chk_row_no CHECK (row_no > 0),
    CONSTRAINT chk_col_no CHECK (col_no > 0)
);

-- --------------------------------------------------------
-- DML: INSERT SAMPLE DATA
-- --------------------------------------------------------

INSERT INTO Admin (username, password_hash) VALUES ('admin', 'hashedpass123');

INSERT INTO Student (roll_no, name, department) VALUES 
('CS01', 'Alice Smith', 'Computer Science'),
('CS02', 'Bob Jones', 'Computer Science'),
('EC01', 'Charlie Brown', 'Electronics');

INSERT INTO Faculty (emp_id, name) VALUES 
('F001', 'Dr. Alan Turing'),
('F002', 'Dr. Grace Hopper');

INSERT INTO Hall (name, description, rows_cnt, cols_cnt, capacity) VALUES 
('Hall A', 'Main Building 1st Floor', 5, 10, 50),
('Hall B', DEFAULT, 5, 6, 30);

INSERT INTO Seating (student_id, hall_id, faculty_id, seat_no, row_no, col_no) VALUES 
(1, 1, 1, 1, 1, 1), -- Alice in Hall A
(2, 1, 1, 2, 1, 2), -- Bob in Hall A
(3, 2, 2, 1, 1, 1); -- Charlie in Hall B

-- --------------------------------------------------------
-- DQL: SELECT QUERIES (Reports)
-- --------------------------------------------------------

-- View all students and their assigned halls and seats
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

-- View capacity and current occupancy of each hall
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
