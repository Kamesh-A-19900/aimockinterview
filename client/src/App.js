import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/globals.css'; // Import professional dark theme

// Pages
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import InterviewTypeSelection from './pages/InterviewTypeSelection';
import Practice from './pages/Practice';
import Results from './pages/Results';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {


  return (
    <Router>
      <ErrorBoundary>
        <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/interview-type-selection" 
            element={
              <PrivateRoute>
                <InterviewTypeSelection />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/interview" 
            element={
              <PrivateRoute>
                <Interview />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/practice" 
            element={
              <PrivateRoute>
                <Practice />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/results/:id" 
            element={
              <PrivateRoute>
                <Results />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Footer />
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
