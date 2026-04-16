import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SeatingTable = ({ refreshTrigger }) => {
  const [seating, setSeating] = useState([]);

  useEffect(() => {
    const fetchSeating = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/seating');
        setSeating(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSeating();
  }, [refreshTrigger]);

  return (
    <div className="table-container">
      <h3>Current Seating Arrangement</h3>
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Dept</th>
            <th>Hall</th>
            <th>Seat No</th>
            <th>Invigilator</th>
          </tr>
        </thead>
        <tbody>
          {seating.map(s => (
            <tr key={s.id}>
              <td>{s.roll_no}</td>
              <td>{s.student_name}</td>
              <td>{s.department}</td>
              <td>{s.hall_name}</td>
              <td>{s.seat_no}</td>
              <td>{s.invigilator}</td>
            </tr>
          ))}
          {seating.length === 0 && (
            <tr><td colSpan="6">No seating arrangements found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SeatingTable;
