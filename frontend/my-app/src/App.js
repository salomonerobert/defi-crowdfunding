import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectTeamPage from './pages/ProjectTeamPage'
import ProjectBackerPage from './pages/ProjectBackerPage'
import LandingPage from './pages/LandingPage'
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {

  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage/>}/>
        <Route path="/project-team" element={<ProjectTeamPage />} />
        <Route path="/project-backer" element={<ProjectBackerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
