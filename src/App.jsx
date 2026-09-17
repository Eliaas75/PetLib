import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import Profile from "./pages/Profile.jsx";
import Conseils from "./pages/Conseils.jsx";
import ConseilArticle from "./pages/ConseilArticle.jsx";
import Account from "./pages/Account.jsx";
import WaitlistNew from "./pages/WaitlistNew.jsx";
import ProDashboard from "./pages/ProDashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PrivateRoute from "./auth/PrivateRoute.jsx";
import ProRoute from "./auth/ProRoute.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/p/:id" element={<Profile />} />
        <Route path="/conseils" element={<Conseils />} />
        <Route path="/conseils/:id" element={<ConseilArticle />} />
        <Route
          path="/account"
          element={
            <PrivateRoute>
              <Account />
            </PrivateRoute>
          }
        />
        <Route
          path="/waitlist/new"
          element={
            <PrivateRoute>
              <WaitlistNew />
            </PrivateRoute>
          }
        />
        <Route
          path="/pro"
          element={
            <ProRoute>
              <ProDashboard />
            </ProRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
