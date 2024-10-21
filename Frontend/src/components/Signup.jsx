import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const specialCharacters = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
      if (!specialCharacters.test(password)) {
        setErrorMessage('Password must contain at least one special character.');
        return;
      }

      const response = await axios.post('https://emofy-lxvt.onrender.com/signup', { username, password });
      console.log(response.data);

      if (response.status === 201) {
        navigate('/login');
      }
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 400 && error.response.data.msg === 'User already exists') {
        setErrorMessage('Username already exists. Please choose a different username.');
      }
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-dark">
      <div className="card signup-card" style={{ maxWidth: '400px', width: '100%', borderRadius: '12px' }}>
        <div className="card-body p-5">
          <h2 className="text-center mb-4">Signup</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errorMessage && (
                <p className="text-danger mt-2">{errorMessage}</p>
              )}
            </div>
            <button type="submit" className="btn btn-primary w-100 mt-3">Signup</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
