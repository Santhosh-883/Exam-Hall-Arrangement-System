import React, { useState } from 'react';
import api from '../lib/api';

const HallForm = () => {
  const [formData, setFormData] = useState({ name: '', description: '', rows_cnt: '', cols_cnt: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/halls', {
        ...formData,
        rows_cnt: parseInt(formData.rows_cnt),
        cols_cnt: parseInt(formData.cols_cnt)
      });
      alert('Hall added successfully!');
      setFormData({ name: '', description: '', rows_cnt: '', cols_cnt: '' });
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
        <div style={{display: 'flex', gap: '10px'}}>
            <input type="number" name="rows_cnt" placeholder="Rows" value={formData.rows_cnt} onChange={handleChange} required min="1" style={{width: '50%'}} />
            <input type="number" name="cols_cnt" placeholder="Columns" value={formData.cols_cnt} onChange={handleChange} required min="1" style={{width: '50%'}} />
        </div>
        <button type="submit">Add Hall</button>
      </form>
    </div>
  );
};

export default HallForm;
