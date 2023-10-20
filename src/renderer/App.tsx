/* eslint-disable react/function-component-definition */
import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import Search from './Search';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Search />} />
      </Routes>
    </Router>
  );
}
