import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const SeatingTable = ({ refreshTrigger }) => {
  const [seating, setSeating] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchSeating = async () => {
      try {
  const res = await api.get('/api/seating');
        setSeating(res.data);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSeating();
  }, [refreshTrigger]);

  return (
    <div className="table-container">
      <h3>Current Seating Arrangement</h3>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <div />
        <div>
          <button onClick={async () => {
            try {
              const resp = await api.get('/api/seating/export', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([resp.data]));
              const a = document.createElement('a');
              a.href = url;
              a.download = 'seating.xlsx';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              alert('Export failed: ' + (err.response?.data?.error || err.message));
            }
          }} style={{padding:'6px 10px'}}>Download XLSX</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Dept</th>
            <th>Hall</th>
            <th>Seat No</th>
            <th>Invigilator</th>
          </tr>
        </thead>
        <tbody>
          {seating.slice((currentPage-1)*pageSize, currentPage*pageSize).map((s, idx) => (
            <tr key={s.id}>
              <td>{(currentPage - 1) * pageSize + idx + 1}</td>
              <td>{s.roll_no}</td>
              <td>{s.student_name}</td>
              <td>{s.department}</td>
              <td>{s.hall_name}</td>
              <td>{s.seat_no}</td>
              <td>{s.invigilator}</td>
            </tr>
          ))}
          {seating.length === 0 && (
            <tr><td colSpan="7">No seating arrangements found.</td></tr>
          )}
        </tbody>
      </table>
      <div style={{display:'flex', justifyContent:'center', gap:8, marginTop:12}}>
        <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}>Prev</button>
        {Array.from({length: Math.max(1, Math.ceil(seating.length / pageSize))}, (_, i) => (
          <button key={i} onClick={() => setCurrentPage(i+1)} style={{fontWeight: currentPage===i+1 ? 'bold' : 'normal'}}>{i+1}</button>
        ))}
        <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(seating.length / pageSize), p+1))} disabled={currentPage>=Math.ceil(seating.length / pageSize)}>Next</button>
      </div>
    </div>
  );
};

export default SeatingTable;
