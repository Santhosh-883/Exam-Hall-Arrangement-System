import React, { useState } from 'react'
import StudentForm from './components/StudentForm'
import FacultyForm from './components/FacultyForm'
import HallForm from './components/HallForm'
import SeatingForm from './components/SeatingForm'
import SeatingTable from './components/SeatingTable'
import './App.css'

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSeatAssigned = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Examination Hall Arrangement System</h1>
        <p>Admin Dashboard</p>
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
