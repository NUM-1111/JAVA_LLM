import React, { useState } from "react";
import "./styles/main.css";
import Header from "./introduce/AboutHeader";
import Navigation from "./introduce/Navigation";
import Sidebar from "./introduce/AboutSidebar";
import AboutSection from "./introduce/AboutSection";
import TechnologySection from "./introduce/TechnologySection";
import JoinSection from "./introduce/JoinSection";
import ScrollManager from "./introduce/ScrollManager";
import ProduceToHPCRC from "./introduce/ProduceToHPCRC";

function IntroducePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`${darkMode ? "dark bg-gray-900" : "bg-white"}`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <Navigation toggleSidebar={toggleSidebar} />
      <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="relative scroll-container">
        <AboutSection darkMode={darkMode} />
        <ProduceToHPCRC darkMode={darkMode} />
        <TechnologySection darkMode={darkMode} />
        <JoinSection darkMode={darkMode} />
      </main>

      <ScrollManager />
    </div>
  );
}

export default IntroducePage;
