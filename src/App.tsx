import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Messages from './pages/Messages';
import NewsFeed from './pages/NewsFeed';
import Communities from './pages/Communities';
import MyPosts from './pages/MyPosts';
import { LayoutProvider } from './context/LayoutContext';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <LayoutProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/news-feed" element={<NewsFeed />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/search" element={<Search />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/my-posts" element={<MyPosts />} />
        </Routes>
      </Router>
    </LayoutProvider>
  );
}
