import React, { useState } from 'react';
import axios from 'axios';

const HallForm = () => {
  const [formData, setFormData] = useState({ name: '', description: '', capacity: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/halls', {
        ...formData,
        capacity: parseInt(formData.capacity)
      });
      alert('Hall added successfully!');
      setFormData({ name: '', description: '', capacity: '' });
    } catch (err) {
      alert('Error adding hall: ' + err.message);
    }
  };

  return (
    <div className="form-container">
      <h3>Add Hall</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Hall Name" value={formData.name} onChange={handleChange} required />
        <input type="text" name="description" placeholder="Description (Optional)" value={formData.description} onChange={handleChange} />
        <input type="number" name="capacity" placeholder="Capacity" value={formData.capacity} onChange={handleChange} required min="1" />
        <button type="submit">Add Hall</button>
      </form>
    </div>
  );
};

export default HallForm;
