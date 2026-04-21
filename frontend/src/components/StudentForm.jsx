import React, { useState } from 'react';
import api from '../lib/api';

const StudentForm = () => {
  const [formData, setFormData] = useState({ roll_no: '', name: '', department: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
  await api.post('/api/students', formData);
      alert('Student added successfully!');
      setFormData({ roll_no: '', name: '', department: '' });
    } catch (err) {
      alert('Error adding student: ' + err.message);
    }
  };

  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('No file chosen');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const data = new FormData();
    data.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/api/students/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message || 'Upload complete');
    } catch(err) {
      alert('Error uploading file: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      e.target.value = null;
      // keep filename shown briefly
      setTimeout(() => setUploadedFileName('No file chosen'), 3000);
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
      <hr style={{margin: '15px 0'}} />
      <h4>Or Bulk Upload (Excel)</h4>
      <div className="file-input-label">
        <input id="student-upload" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={uploading} style={{display:'none'}} />
        <label htmlFor="student-upload" style={{background:'#3498db', color:'#fff', padding:'8px 12px', borderRadius:4, cursor: uploading ? 'default' : 'pointer'}}>{uploading ? 'Uploading...' : 'Upload Students (.xlsx)'}</label>
        <span style={{fontSize:'0.9rem', marginLeft:10}}>{uploadedFileName}</span>
      </div>
    </div>
  );
};

export default StudentForm;
