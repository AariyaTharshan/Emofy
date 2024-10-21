import React from 'react'
import {BrowserRouter as Router , Routes , Route } from 'react-router-dom'
import Signup from './components/Signup'
import Login from './components/Login'
import Chat from './components/Chat'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  )
}

export default App