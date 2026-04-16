const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. STUDENTS
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Student');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/students', async (req, res) => {
    const { roll_no, name, department } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Student (roll_no, name, department) VALUES (?, ?, ?)',
            [roll_no, name, department]
        );
        res.status(201).json({ id: result.insertId, roll_no, name, department });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. FACULTY
app.get('/api/faculty', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Faculty');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/faculty', async (req, res) => {
    const { emp_id, name } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Faculty (emp_id, name) VALUES (?, ?)',
            [emp_id, name]
        );
        res.status(201).json({ id: result.insertId, emp_id, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. HALLS
app.get('/api/halls', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Hall');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/halls', async (req, res) => {
    const { name, description, capacity } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Hall (name, description, capacity) VALUES (?, ?, ?)',
            [name, description || 'Standard Examination Hall', capacity]
        );
        res.status(201).json({ id: result.insertId, name, description, capacity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. SEATING
app.get('/api/seating', async (req, res) => {
    try {
        // DQL Query for seating arrangement
        const query = `
            SELECT 
                se.id, s.roll_no, s.name AS student_name, s.department,
                h.name AS hall_name, se.seat_no,
                f.name AS invigilator
            FROM Seating se
            JOIN Student s ON se.student_id = s.id
            JOIN Hall h ON se.hall_id = h.id
            JOIN Faculty f ON se.faculty_id = f.id
            ORDER BY h.name, se.seat_no
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/seating', async (req, res) => {
    const { student_id, hall_id, faculty_id, seat_no } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Seating (student_id, hall_id, faculty_id, seat_no) VALUES (?, ?, ?, ?)',
            [student_id, hall_id, faculty_id, seat_no]
        );
        res.status(201).json({ id: result.insertId, student_id, hall_id, faculty_id, seat_no });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
