import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "@/pages/Home";
import Portfolio from "@/pages/Portfolio";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import CrewLogin from "@/pages/CrewLogin";
import CrewDashboard from "@/pages/CrewDashboard";

function App() {
  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/crew/login" element={<CrewLogin />} />
          <Route path="/crew" element={<CrewDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
