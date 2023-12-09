import React from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const LandingPage = () => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "white" }}>
      <h1 style={{ color: "blue", marginBottom: "20px" }}>DeFi CrowdFunding Application</h1>
      <Button variant="primary" className="mb-3" href="/project-backer">Project Backers</Button>
      <Button variant="primary" href="/project-team">Project Teams</Button>
    </div>
  );
};

export default LandingPage;
