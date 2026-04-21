import React, { useState } from 'react'
import api from './lib/api'
import StudentForm from './components/StudentForm'
import FacultyForm from './components/FacultyForm'
import HallForm from './components/HallForm'
import SeatingForm from './components/SeatingForm'
import SeatingTable from './components/SeatingTable'
import Login from './components/Login'
import './App.css'

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('adminToken'));

  // if token exists, set default header for api instance
  if (localStorage.getItem('adminToken')) {
    api.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('adminToken')}`;
  }

  const handleSeatAssigned = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="App">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Examination Hall Arrangement System</h1>
            <p>Admin Dashboard</p>
          </div>
          <div>
            <button onClick={() => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); delete api.defaults.headers.common['Authorization']; setAuthenticated(false); }} style={{ background:'#c0392b' }}>Logout</button>
          </div>
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className="forms-grid">
          <StudentForm />
          <FacultyForm />
          <HallForm />
          <SeatingForm onSeatAssigned={handleSeatAssigned} />
        </div>

        <div className="view-section">
          <SeatingTable refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  )
}

export default App
