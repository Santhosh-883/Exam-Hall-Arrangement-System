import React, { useState } from 'react';
import axios from 'axios';

const StudentForm = () => {
  const [formData, setFormData] = useState({ roll_no: '', name: '', department: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/students', formData);
      alert('Student added successfully!');
      setFormData({ roll_no: '', name: '', department: '' });
    } catch (err) {
      alert('Error adding student: ' + err.message);
    }
  };

  return (
    <div className="form-container">
      <h3>Add Student</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" name="roll_no" placeholder="Roll No" value={formData.roll_no} onChange={handleChange} required />
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
        <input type="text" name="department" placeholder="Department" value={formData.department} onChange={handleChange} required />
        <button type="submit">Add Student</button>
      </form>
    </div>
  );
};

export default StudentForm;
