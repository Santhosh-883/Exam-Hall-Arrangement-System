import React, { useState, useEffect } from 'react';
import api from '../lib/api';

const SeatingForm = ({ onSeatAssigned }) => {
  const [students, setStudents] = useState([]);
  const [halls, setHalls] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [formData, setFormData] = useState({ student_id: '', hall_id: '', faculty_id: '', seat_no: '' });
  // only per_hall mode is supported

  // Refresh lists before assigning
  const fetchOptions = async () => {
      try {
        const [stRes, hRes, fRes] = await Promise.all([
          api.get('/api/students'),
          api.get('/api/halls'),
          api.get('/api/faculty')
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
  await api.post('/api/seating', {
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

  const handleAutoAssign = async () => {
    try {
      // server currently expects per-hall behavior; send explicit mode for clarity
  const res = await api.post('/api/seating/auto', { mode: 'per_hall' });
      alert(res.data.message || 'Auto assignment completed');
      if (onSeatAssigned) onSeatAssigned();
    } catch (err) {
      console.error('Auto assign failed', err);
      alert('Auto assigning failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Update seat UI state & handler
  const [updateData, setUpdateData] = useState({ student_id: '', hall_id: '', seat_no: '', replace: false });
  const handleUpdateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUpdateData({ ...updateData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleUpdateSeat = async () => {
    try {
      if (!updateData.student_id || !updateData.seat_no) return alert('Select student and seat number');
      const payload = {
        hall_id: updateData.hall_id ? parseInt(updateData.hall_id) : undefined,
        seat_no: parseInt(updateData.seat_no),
        replace: !!updateData.replace,
      };
      if (updateData.faculty_id) payload.faculty_id = parseInt(updateData.faculty_id);
  const res = await api.patch(`/api/seating/${parseInt(updateData.student_id)}`, payload);
      alert(res.data.message || 'Seating updated');
      if (onSeatAssigned) onSeatAssigned();
    } catch (err) {
      console.error('Update seat failed', err);
      alert('Update failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Hall department mapping UI state & handler
  const [hallDept, setHallDept] = useState({ hall_id: '', department: '', capacity_allowed: '' });
  const handleHallDeptChange = (e) => setHallDept({ ...hallDept, [e.target.name]: e.target.value });

  const handleSaveHallDept = async () => {
    try {
      if (!hallDept.hall_id || !hallDept.department) return alert('Select hall and department');
  const res = await api.post(`/api/halls/${parseInt(hallDept.hall_id)}/departments`, {
        department: hallDept.department,
        capacity_allowed: parseInt(hallDept.capacity_allowed) || 0
      });
      alert(res.data.message || 'Mapping saved');
    } catch (err) {
      console.error('Save hall dept failed', err);
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Upload is handled in the Add Student card; seating form does not include file upload.

  return (
    <div className="form-container">
      <h3>Assign Seating</h3>
      <div className="seating-controls">
        <button type="button" onClick={fetchOptions} className="refresh-btn">Refresh Lists</button>
        <button type="button" onClick={handleAutoAssign} className="auto-assign-btn">Assign Automatically</button>
      </div>

      <hr />
      <h4>Update Student Seat</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="student_id" value={updateData.student_id} onChange={handleUpdateChange}>
          <option value="">Select Student</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>)}
        </select>
        <select name="hall_id" value={updateData.hall_id} onChange={handleUpdateChange}>
          <option value="">(keep current hall)</option>
          {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select name="faculty_id" value={updateData.faculty_id || ''} onChange={handleUpdateChange}>
          <option value="">(leave current invigilator)</option>
          {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input type="number" name="seat_no" placeholder="Seat No" value={updateData.seat_no} onChange={handleUpdateChange} min="1" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" name="replace" checked={updateData.replace} onChange={handleUpdateChange} /> Replace if occupied
        </label>
        <button type="button" onClick={handleUpdateSeat}>Update Seat</button>
      </div>

      <hr />
      <h4>Configure Hall Department</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="hall_id" value={hallDept.hall_id} onChange={handleHallDeptChange}>
          <option value="">Select Hall</option>
          {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input name="department" placeholder="Department (e.g. CSE)" value={hallDept.department} onChange={handleHallDeptChange} />
        <input name="capacity_allowed" type="number" placeholder="Allowed Count (0=none)" value={hallDept.capacity_allowed} onChange={handleHallDeptChange} min="0" />
        <button type="button" onClick={handleSaveHallDept}>Save Mapping</button>
      </div>
      <small style={{ color: '#666' }}>If you don't configure a mapping for a hall, all departments are allowed by default.</small>
    </div>
  );
};

export default SeatingForm;
