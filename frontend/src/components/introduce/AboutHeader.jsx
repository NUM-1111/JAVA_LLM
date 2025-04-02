import React from "react";
import { Sun, Moon, LogOut } from "lucide-react";

const Header = ({ darkMode, toggleDarkMode }) => {
  return (
    <header className={`fixed top-0 right-0 z-40 p-4`}>
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleDarkMode}
          className={`${
            darkMode ? "text-white" : "text-gray-800"
          } bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 p-2 rounded-full shadow-md focus:outline-none`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
        <button
          className={`${
            darkMode ? "text-white" : "text-gray-800"
          } bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 p-2 rounded-full shadow-md focus:outline-none`}
          aria-label="Log out"
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;
