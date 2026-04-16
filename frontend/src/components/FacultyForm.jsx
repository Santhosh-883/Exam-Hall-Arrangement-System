import React, { useState } from 'react';
import axios from 'axios';

const FacultyForm = () => {
  const [formData, setFormData] = useState({ emp_id: '', name: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/faculty', formData);
      alert('Faculty added successfully!');
      setFormData({ emp_id: '', name: '' });
    } catch (err) {
      alert('Error adding faculty: ' + err.message);
    }
  };

  return (
    <div className="form-container">
      <h3>Add Faculty</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" name="emp_id" placeholder="Employee ID" value={formData.emp_id} onChange={handleChange} required />
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
        <button type="submit">Add Faculty</button>
      </form>
    </div>
  );
};

export default FacultyForm;
