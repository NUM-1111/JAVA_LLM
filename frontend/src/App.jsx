import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import "./index.css";
import LoginPage from "./components/Login";
import RegisterPage from "./components/Register";
import NewChatPage from "./components/NewChat";
import ChatPage from "./components/Conversation";
import SettingsPage from "./components/Setting";
function Layout() {
  return (
    <>
      <Routes>
        <Route path="/" element={<NewChatPage />} />
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<NewChatPage />} />
        <Route path="/c/:conversationId" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
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
