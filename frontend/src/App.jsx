import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import LoginPage from "./components/Login";
import RegisterPage from "./components/Register";
import NewChatPage from "./components/NewChat";
import ChatPage from "./components/Conversation";
import SettingsPage from "./components/Setting";
import ForgotPasswordPage from "./components/ForgotPassword";
function Layout() {
  return (
    <>
      <Routes>
        <Route path="/" element={<NewChatPage />} />
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<NewChatPage />} />
        <Route path="/c/:conversation_id" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
