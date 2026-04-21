const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('./db');
const fs = require('fs');
const os = require('os');

const uploadDir = os.tmpdir();
const upload = multer({ dest: uploadDir });

const app = express();

// Configure CORS: allow only FRONTEND_URL in production when set; otherwise allow all (dev)
const FRONTEND_URL = process.env.FRONTEND_URL || '';
if (FRONTEND_URL) {
    app.use(cors({
        origin: function(origin, callback) {
            // allow requests with no origin (like curl, mobile apps)
            if (!origin) return callback(null, true);
            if (origin === FRONTEND_URL) return callback(null, true);
            return callback(new Error('CORS policy: This origin is not allowed'));
        }
    }));
} else {
    // development: allow all origins
    app.use(cors());
}

app.use(express.json());

// Ensure HallDepartment mapping table exists
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS HallDepartment (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hall_id INT NOT NULL,
                department VARCHAR(100) NOT NULL,
                capacity_allowed INT NOT NULL DEFAULT 0,
                UNIQUE KEY uq_hall_dept (hall_id, department),
                CONSTRAINT fk_hd_hall FOREIGN KEY (hall_id) REFERENCES Hall(id) ON DELETE CASCADE
            )
        `);
        console.log('Ensured HallDepartment table exists');

        await db.query(`
            CREATE TABLE IF NOT EXISTS Session (
                token VARCHAR(255) PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                expires BIGINT NOT NULL
            )
        `);
        console.log('Ensured Session table exists');
        
        // Clean up expired sessions periodically (optional, but handled manually here)
        await db.query('DELETE FROM Session WHERE expires < ?', [Date.now()]);
    } catch (err) {
        console.error('Failed to ensure tables exist:', err.message || err);
    }
})();

// --- Database-backed session store for serverless compatibility
const crypto = require('crypto');
const SESSION_TTL = Number(process.env.SESSION_TTL_MS) || (8 * 60 * 60 * 1000); // 8 hours default

async function createSession(username) {
    const token = crypto.randomBytes(24).toString('hex');
    const expires = Date.now() + SESSION_TTL;
    await db.query('INSERT INTO Session (token, username, expires) VALUES (?, ?, ?)', [token, username, expires]);
    return token;
}

async function validateSession(token) {
    if (!token) return null;
    const [[session]] = await db.query('SELECT * FROM Session WHERE token = ?', [token]);
    if (!session) return null;
    if (session.expires < Date.now()) {
        await db.query('DELETE FROM Session WHERE token = ?', [token]);
        return null;
    }
    // refresh expiry
    const newExpires = Date.now() + SESSION_TTL;
    await db.query('UPDATE Session SET expires = ? WHERE token = ?', [newExpires, token]);
    return session.username;
}

// Auth middleware: allow login endpoint through, protect other /api routes
app.use(async (req, res, next) => {
    // Allow login and logout endpoints
    if (req.path === '/api/admin/login' || req.path === '/api/admin/logout') return next();
    // Allow non-API routes
    if (!req.path.startsWith('/api')) return next();

    // Check x-api-key env override (useful for CI/deploy)
    const envKey = process.env.ADMIN_API_KEY;
    const headerKey = req.get('x-api-key');
    if (envKey && headerKey && headerKey === envKey) return next();

    // Check bearer token
    const auth = req.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.*)$/i);
    const token = m ? m[1] : (req.query && req.query.token);
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    
    try {
        const user = await validateSession(token);
        if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
        // attach user
        req.adminUser = user;
        next();
    } catch (err) {
        console.error('Session validation error:', err);
        return res.status(500).json({ error: 'Internal server error during auth' });
    }
});

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
            'INSERT IGNORE INTO Student (roll_no, name, department) VALUES (?, ?, ?)',
            [roll_no, name, department]
        );
        res.status(201).json({ id: result.insertId, roll_no, name, department });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Excel Upload
app.post('/api/students/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        let counter = 0;
        for (const row of data) {
            const roll_no = row['Roll No'] || row['rollno'] || row['roll_no'];
            const name = row['Name'] || row['name'];
            const department = row['Dep'] || row['department'] || row['Department'];
            
            if (roll_no && name && department) {
                await db.query(
                    'INSERT IGNORE INTO Student (roll_no, name, department) VALUES (?, ?, ?)',
                    [String(roll_no), name, department]
                );
                counter++;
            }
        }
        res.json({ message: `Processed ${counter} valid students.` });
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
    const { name, description, rows_cnt, cols_cnt } = req.body;
    try {
        // Coerce to integers and validate
        const rows = Number(rows_cnt);
        const cols = Number(cols_cnt);
        if (!name || !Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
            return res.status(400).json({ error: 'Invalid hall data. Ensure name, rows_cnt and cols_cnt are positive integers.' });
        }

        const capacity = rows * cols;
        // Use the same table name casing as the schema
        const [result] = await db.query(
            'INSERT INTO Hall (name, description, rows_cnt, cols_cnt, capacity) VALUES (?, ?, ?, ?, ?)',
            [name, description || 'Standard Examination Hall', rows, cols, capacity]
        );
        res.status(201).json({ id: result.insertId, name, description, rows_cnt: rows, cols_cnt: cols, capacity });
    } catch (err) {
        console.error('Error inserting hall:', err);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A hall with that name already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Admin login (very simple for local admin UI)
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [[admin]] = await db.query('SELECT * FROM Admin WHERE username = ?', [username]);
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
        // NOTE: password handling here is simple: compare provided password to stored password_hash
        // For production, store bcrypt hashes and use bcrypt.compare.
        if (password !== admin.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
        // create a session token and return it
        const token = await createSession(admin.username);
        res.json({ success: true, username: admin.username, token, expiresInMs: SESSION_TTL });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin logout: invalidate token
app.post('/api/admin/logout', async (req, res) => {
    const auth = req.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.*)$/i);
    const token = m ? m[1] : (req.query && req.query.token);
    if (token) {
        try {
            await db.query('DELETE FROM Session WHERE token = ?', [token]);
        } catch (err) {}
    }
    res.json({ success: true });
});

// Manage hall -> department mappings (which departments allowed and capacity per dept)
app.get('/api/halls/:id/departments', async (req, res) => {
    const hallId = Number(req.params.id);
    try {
        const [rows] = await db.query('SELECT department, capacity_allowed FROM HallDepartment WHERE hall_id = ?', [hallId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/halls/:id/departments', async (req, res) => {
    const hallId = Number(req.params.id);
    const { department, capacity_allowed } = req.body;
    try {
        if (!department || !Number.isInteger(Number(capacity_allowed)) || Number(capacity_allowed) < 0) {
            return res.status(400).json({ error: 'Provide department and non-negative integer capacity_allowed' });
        }
        await db.query(
            `INSERT INTO HallDepartment (hall_id, department, capacity_allowed) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE capacity_allowed = VALUES(capacity_allowed)`,
            [hallId, department, Number(capacity_allowed)]
        );
        res.json({ message: 'Hall department mapping updated' });
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
                h.name AS hall_name, se.seat_no, se.row_no, se.col_no,
                f.name AS invigilator
            FROM Seating se
            JOIN Student s ON se.student_id = s.id
            JOIN Hall h ON se.hall_id = h.id
            JOIN Faculty f ON se.faculty_id = f.id
            ORDER BY h.name, se.row_no, se.col_no
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export seating as XLSX
app.get('/api/seating/export', async (req, res) => {
    try {
        const query = `
            SELECT 
                se.id, s.roll_no, s.name AS student_name, s.department,
                h.name AS hall_name, se.seat_no, se.row_no, se.col_no,
                f.name AS invigilator
            FROM Seating se
            JOIN Student s ON se.student_id = s.id
            JOIN Hall h ON se.hall_id = h.id
            JOIN Faculty f ON se.faculty_id = f.id
            ORDER BY h.name, se.row_no, se.col_no
        `;
        const [rows] = await db.query(query);

        // Convert rows to worksheet and workbook
        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Seating');
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="seating.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual seating assignment
app.post('/api/seating', async (req, res) => {
    const { student_id, hall_id, faculty_id, seat_no, replace } = req.body;
    try {
        const sId = Number(student_id);
        const hId = Number(hall_id);
        const fId = Number(faculty_id);
        const seat = Number(seat_no);

        if (!Number.isInteger(sId) || !Number.isInteger(hId) || !Number.isInteger(fId) || !Number.isInteger(seat) || sId <= 0 || hId <= 0 || fId <= 0 || seat <= 0) {
            return res.status(400).json({ error: 'Invalid seating data. Ensure numeric student_id, hall_id, faculty_id and seat_no.' });
        }

        // Validate existence
        const [[student]] = await db.query('SELECT * FROM Student WHERE id = ?', [sId]);
        const [[hall]] = await db.query('SELECT * FROM Hall WHERE id = ?', [hId]);
        const [[faculty]] = await db.query('SELECT * FROM Faculty WHERE id = ?', [fId]);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        if (!hall) return res.status(404).json({ error: 'Hall not found' });
        if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

        const capacity = hall.rows_cnt * hall.cols_cnt;
        if (seat > capacity) return res.status(400).json({ error: 'Seat number exceeds hall capacity' });

        // Enforce department -> hall mapping (if any)
        const [[hdExists]] = await db.query('SELECT COUNT(*) as cnt FROM HallDepartment WHERE hall_id = ?', [hId]);
        if (hdExists && hdExists.cnt > 0) {
            // Check this student's department is allowed and hall dept capacity not exceeded
            const [[mapping]] = await db.query('SELECT capacity_allowed FROM HallDepartment WHERE hall_id = ? AND department = ?', [hId, student.department]);
            if (!mapping) return res.status(400).json({ error: `Department ${student.department} is not allowed in this hall` });
            // count existing students of this department in this hall
            const [[deptCountRow]] = await db.query(
                `SELECT COUNT(*) AS cnt FROM Seating se JOIN Student s ON se.student_id = s.id WHERE se.hall_id = ? AND s.department = ?`,
                [hId, student.department]
            );
            const deptCount = deptCountRow.cnt || 0;
            if (!replace && deptCount >= mapping.capacity_allowed) {
                return res.status(400).json({ error: `Hall capacity for department ${student.department} reached` });
            }
        }

        // Check existing assignments
        const [existingStudent] = await db.query('SELECT * FROM Seating WHERE student_id = ?', [sId]);
        const [existingSeat] = await db.query('SELECT * FROM Seating WHERE hall_id = ? AND seat_no = ?', [hId, seat]);

        if (existingStudent.length > 0 && !replace) return res.status(409).json({ error: 'Student is already seated. Use replace=true to move.' });
        if (existingSeat.length > 0 && !replace) return res.status(409).json({ error: 'Seat already assigned in this hall. Use replace=true to override.' });

        // If replacing, remove existing assignments as needed
        if (replace) {
            if (existingStudent.length > 0) {
                await db.query('DELETE FROM Seating WHERE id = ?', [existingStudent[0].id]);
            }
            if (existingSeat.length > 0) {
                await db.query('DELETE FROM Seating WHERE id = ?', [existingSeat[0].id]);
            }
        }

        // Enforce one-faculty-per-hall rule: if any seating exists in hall, the faculty must match
        const [hallFacRows] = await db.query('SELECT DISTINCT faculty_id FROM Seating WHERE hall_id = ? LIMIT 1', [hId]);
        if (hallFacRows.length > 0 && hallFacRows[0].faculty_id !== fId) {
            return res.status(400).json({ error: 'This hall already has a different invigilator assigned. Each hall must have only one invigilator.' });
        }

        // Compute row_no and col_no from seat_no
        const row_no = Math.floor((seat - 1) / hall.cols_cnt) + 1;
        const col_no = ((seat - 1) % hall.cols_cnt) + 1;

        const [result] = await db.query(
            'INSERT INTO Seating (student_id, hall_id, faculty_id, seat_no, row_no, col_no) VALUES (?, ?, ?, ?, ?, ?)',
            [sId, hId, fId, seat, row_no, col_no]
        );
        res.status(201).json({ id: result.insertId, student_id: sId, hall_id: hId, faculty_id: fId, seat_no: seat, row_no, col_no });
    } catch (err) {
        console.error('Error assigning seat:', err);
        res.status(500).json({ error: err.message });
    }
});

// Auto Seating
app.post('/api/seating/auto', async (req, res) => {
    try {
        const [halls] = await db.query('SELECT * FROM Hall');
        const [faculties] = await db.query('SELECT * FROM Faculty');
        const [students] = await db.query('SELECT * FROM Student');

        if (halls.length === 0 || students.length === 0 || faculties.length === 0) {
            return res.status(400).json({ error: 'Ensure halls, faculty, and students are populated.' });
        }

        let totalCap = 0;
        halls.forEach(h => totalCap += (h.rows_cnt * h.cols_cnt));
        if (students.length > totalCap) return res.status(400).json({ error: 'Not enough overall hall capacity!' });

        const deptMap = {};
        students.forEach(s => {
            if (!deptMap[s.department]) deptMap[s.department] = [];
            deptMap[s.department].push(s);
        });

        await db.query('DELETE FROM Seating'); // Clear out existing

        // Load hall->department mappings (if any)
        const [hdRows] = await db.query('SELECT * FROM HallDepartment');
        const hallDeptMap = {}; // hall_id -> { dept: capacity_allowed }
        hdRows.forEach(r => {
            if (!hallDeptMap[r.hall_id]) hallDeptMap[r.hall_id] = {};
            hallDeptMap[r.hall_id][r.department] = r.capacity_allowed;
        });

        // counters for per-hall dept assignments
        const hallDeptCount = {};

        // Allow selection of assignment mode for flexibility
        // Modes: 'per_hall' (default), 'per_row', 'round_robin', 'random'
        const mode = (req.body && req.body.mode) ? req.body.mode : 'per_hall';

        // Shuffle faculties to avoid deterministic picks
        const shuffledFaculties = faculties.slice();
        for (let i = shuffledFaculties.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledFaculties[i], shuffledFaculties[j]] = [shuffledFaculties[j], shuffledFaculties[i]];
        }

        let studentCount = 0;
        for (let hIndex = 0; hIndex < halls.length; hIndex++) {
            const hall = halls[hIndex];
            const grid = Array.from({length: hall.rows_cnt}, () => Array(hall.cols_cnt).fill(null));
                // For per_hall, pick one faculty per hall and cache it
                if (mode === 'per_hall' && !hall._assignedFaculty) {
                    hall._assignedFaculty = shuffledFaculties[hIndex % shuffledFaculties.length];
                }
                const facultyForHall = hall._assignedFaculty;
            
            for (let r = 0; r < hall.rows_cnt; r++) {
                for (let c = 0; c < hall.cols_cnt; c++) {
                    if (studentCount >= students.length) break;

                    const avoidDepts = new Set();
                    if (r > 0 && grid[r-1][c]) avoidDepts.add(grid[r-1][c].department);
                    if (c > 0 && grid[r][c-1]) avoidDepts.add(grid[r][c-1].department);

                    // Filter available departments by whether the hall allows them and capacity per-dept
                    if (!hallDeptCount[hall.id]) hallDeptCount[hall.id] = {};
                    const availableDepts = Object.keys(deptMap).filter(d => {
                        if (!deptMap[d] || deptMap[d].length === 0) return false;
                        const mapping = hallDeptMap[hall.id];
                        if (!mapping) return true; // no mapping => all depts allowed
                        const allowed = mapping[d];
                        const curr = hallDeptCount[hall.id][d] || 0;
                        return (allowed !== undefined) && (curr < allowed);
                    });
                    if (availableDepts.length === 0) break;

                    const goodDepts = availableDepts.filter(d => !avoidDepts.has(d));
                    
                    let chosenDept = null;
                    if (goodDepts.length > 0) {
                        goodDepts.sort((a, b) => deptMap[b].length - deptMap[a].length);
                        chosenDept = goodDepts[0];
                    } else {
                        availableDepts.sort((a, b) => deptMap[b].length - deptMap[a].length);
                        chosenDept = availableDepts[0];
                    }

                    const student = deptMap[chosenDept].pop();
                    // increment hall->dept counter
                    if (!hallDeptCount[hall.id][chosenDept]) hallDeptCount[hall.id][chosenDept] = 0;
                    hallDeptCount[hall.id][chosenDept]++;
                    grid[r][c] = student;
                    
                    const seat_no = r * hall.cols_cnt + c + 1;
                    // choose faculty according to mode
                    let facultyToUse = null;
                    if (mode === 'per_hall') {
                        facultyToUse = facultyForHall;
                    } else if (mode === 'per_row') {
                        facultyToUse = shuffledFaculties[(hIndex + r) % shuffledFaculties.length];
                    } else if (mode === 'round_robin') {
                        facultyToUse = shuffledFaculties[studentCount % shuffledFaculties.length];
                    } else { // random
                        facultyToUse = shuffledFaculties[Math.floor(Math.random() * shuffledFaculties.length)];
                    }

                    await db.query(
                        'INSERT INTO Seating (student_id, hall_id, faculty_id, seat_no, row_no, col_no) VALUES (?, ?, ?, ?, ?, ?)',
                        [student.id, hall.id, facultyToUse.id, seat_no, r + 1, c + 1]
                    );
                    studentCount++;
                }
            }
        }
        res.json({ message: 'Auto assignment completed!', totalAssigned: studentCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a student's seating (change seat_no and/or hall)
app.patch('/api/seating/:studentId', async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const { hall_id, seat_no, replace, faculty_id } = req.body;

        if (!Number.isInteger(studentId) || studentId <= 0) return res.status(400).json({ error: 'Invalid student id' });
        if (!seat_no || !Number.isInteger(Number(seat_no)) || Number(seat_no) <= 0) return res.status(400).json({ error: 'Provide a valid seat_no' });

        const [[student]] = await db.query('SELECT * FROM Student WHERE id = ?', [studentId]);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const [existingRows] = await db.query('SELECT * FROM Seating WHERE student_id = ?', [studentId]);
        if (existingRows.length === 0) return res.status(404).json({ error: 'Student is not currently seated' });
        const existing = existingRows[0];

        const targetHallId = hall_id ? Number(hall_id) : existing.hall_id;
        const seat = Number(seat_no);

        const [[hall]] = await db.query('SELECT * FROM Hall WHERE id = ?', [targetHallId]);
        if (!hall) return res.status(404).json({ error: 'Target hall not found' });

        if (seat > (hall.rows_cnt * hall.cols_cnt)) return res.status(400).json({ error: 'Seat exceeds hall capacity' });

        // If moving halls, require faculty_id (so invigilator can be assigned)
        let facultyToUseId = existing.faculty_id;
        if (targetHallId !== existing.hall_id) {
            if (!faculty_id) return res.status(400).json({ error: 'Moving to a different hall requires faculty_id to be provided' });
            facultyToUseId = Number(faculty_id);
        }

        // Validate faculty exists
        const [[faculty]] = await db.query('SELECT * FROM Faculty WHERE id = ?', [facultyToUseId]);
        if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

        // Check per-hall invigilator rule: if hall already has a faculty assigned and it's different -> error
        const [hallFacRows] = await db.query('SELECT DISTINCT faculty_id FROM Seating WHERE hall_id = ? LIMIT 1', [targetHallId]);
        if (hallFacRows.length > 0 && hallFacRows[0].faculty_id !== facultyToUseId && targetHallId !== existing.hall_id) {
            return res.status(400).json({ error: 'This hall already has a different invigilator assigned. Each hall must have only one invigilator.' });
        }

        // Enforce hall->department mapping and per-dept capacity
        const [[hdExists]] = await db.query('SELECT COUNT(*) as cnt FROM HallDepartment WHERE hall_id = ?', [targetHallId]);
        if (hdExists && hdExists.cnt > 0) {
            const [[mapping]] = await db.query('SELECT capacity_allowed FROM HallDepartment WHERE hall_id = ? AND department = ?', [targetHallId, student.department]);
            if (!mapping) return res.status(400).json({ error: `Department ${student.department} is not allowed in this hall` });
            const [[deptCountRow]] = await db.query(
                `SELECT COUNT(*) AS cnt FROM Seating se JOIN Student s ON se.student_id = s.id WHERE se.hall_id = ? AND s.department = ? AND se.student_id != ?`,
                [targetHallId, student.department, studentId]
            );
            const deptCount = deptCountRow.cnt || 0;
            if (!replace && deptCount >= mapping.capacity_allowed) {
                return res.status(400).json({ error: `Hall capacity for department ${student.department} reached` });
            }
        }

        // Check whether seat is occupied by someone else
        const [occ] = await db.query('SELECT * FROM Seating WHERE hall_id = ? AND seat_no = ?', [targetHallId, seat]);
        if (occ.length > 0 && occ[0].student_id !== studentId && !replace) {
            return res.status(409).json({ error: 'Seat already occupied. Use replace=true to override.' });
        }
        if (occ.length > 0 && occ[0].student_id !== studentId && replace) {
            await db.query('DELETE FROM Seating WHERE id = ?', [occ[0].id]);
        }

        // Compute row/col
        const row_no = Math.floor((seat - 1) / hall.cols_cnt) + 1;
        const col_no = ((seat - 1) % hall.cols_cnt) + 1;

        // Update existing seating row
        await db.query(
            'UPDATE Seating SET hall_id = ?, faculty_id = ?, seat_no = ?, row_no = ?, col_no = ? WHERE id = ?',
            [targetHallId, facultyToUseId, seat, row_no, col_no, existing.id]
        );

        res.json({ message: 'Seating updated', student_id: studentId, hall_id: targetHallId, seat_no: seat, row_no, col_no });
    } catch (err) {
        console.error('Error updating seating:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
module.exports = app;
