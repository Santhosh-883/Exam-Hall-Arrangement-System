const mysql = require('mysql2/promise');

// Create a connection pool to MySQL
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Replace with your MySQL Workbench user
    password: '',      // Replace with your MySQL Workbench password
    database: 'exam_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
