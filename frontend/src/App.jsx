import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import "./index.css";
import LoginPage from "./components/Login";
import RegisterPage from "./components/Register";
import ChatPage from "./components/Chat";
function Layout() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage />} />
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
