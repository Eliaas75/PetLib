import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PrivateRoute from "./auth/PrivateRoute.jsx";

<Route
  path="/p/:id"
  element={
    <PrivateRoute>
      <Profile />
    </PrivateRoute>
  }
/>
export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/p/:id" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
