import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import LoginPage from "./components/user/Login";
import RegisterPage from "./components/user/Register";
import NewChatPage from "./components/NewChat";
import ChatPage from "./components/Conversation";
import SettingsPage from "./components/user/Setting";
import ForgotPasswordPage from "./components/user/ForgotPassword";
import IntroducePage from "./components/IntroducePage";
import KnowBasepage from "./components/KnowBase";
import DatasetPage from "./components/DatasetPage";
import FileShowPage from "./components/FileShowPage";
function Layout() {
  return (
    <>
      <Routes>
        <Route path="/" element={<NewChatPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/c/:conversation_id" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/introduce" element={<IntroducePage />} />
        <Route path="/knowledge" element={<KnowBasepage />} />
        <Route path="/knowledge/dataset" element={<DatasetPage />} />
        <Route path="/:filepath" element={<FileShowPage />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
