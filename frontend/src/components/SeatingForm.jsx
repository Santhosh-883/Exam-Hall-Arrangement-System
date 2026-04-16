import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SeatingForm = ({ onSeatAssigned }) => {
  const [students, setStudents] = useState([]);
  const [halls, setHalls] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [formData, setFormData] = useState({ student_id: '', hall_id: '', faculty_id: '', seat_no: '' });

  // Refresh lists before assigning
  const fetchOptions = async () => {
      try {
        const [stRes, hRes, fRes] = await Promise.all([
          axios.get('http://localhost:3000/api/students'),
          axios.get('http://localhost:3000/api/halls'),
          axios.get('http://localhost:3000/api/faculty')
        ]);
        setStudents(stRes.data);
        setHalls(hRes.data);
        setFaculty(fRes.data);
      } catch (err) {
        console.error('Failed to fetch data for seating form', err);
      }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/seating', {
        ...formData,
        student_id: parseInt(formData.student_id),
        hall_id: parseInt(formData.hall_id),
        faculty_id: parseInt(formData.faculty_id),
        seat_no: parseInt(formData.seat_no)
      });
      alert('Seating assigned successfully!');
      setFormData({ ...formData, student_id: '', seat_no: '' });
      if (onSeatAssigned) onSeatAssigned();
    } catch (err) {
      alert('Error assigning seating: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="form-container">
      <h3>Assign Seating</h3>
      <button type="button" onClick={fetchOptions} className="refresh-btn">Refresh Options</button>
      <form onSubmit={handleSubmit}>
        <select name="student_id" value={formData.student_id} onChange={handleChange} required>
          <option value="">Select Student</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>)}
        </select>
        <select name="hall_id" value={formData.hall_id} onChange={handleChange} required>
          <option value="">Select Hall</option>
          {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select name="faculty_id" value={formData.faculty_id} onChange={handleChange} required>
          <option value="">Select Invigilator</option>
          {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input type="number" name="seat_no" placeholder="Seat Number" value={formData.seat_no} onChange={handleChange} required min="1" />
        <button type="submit">Assign Seat</button>
      </form>
    </div>
  );
};

export default SeatingForm;
