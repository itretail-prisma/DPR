import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import DPRPage from "./components/CutPanelInward";
import Footer from "./components/footer";
import LoginPage from "./components/LoginPage";

function App() {
  // const [isLoggedIn, setIsLoggedIn] = useState(() => {
  //   return localStorage.getItem("isLoggedIn") === "true";
  // });

  // const handleLoginSuccess = () => {
  //   setIsLoggedIn(true);
  //   localStorage.setItem("isLoggedIn", "true");
  // };

  // const handleLogout = () => {
  //   setIsLoggedIn(false);
  //   localStorage.removeItem("isLoggedIn");
  // };

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem("isLoggedIn") === "true";
  });

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem("isLoggedIn", "true");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("isLoggedIn");
  };

  return (
    <Router>
      <div
        style={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "#e5e0e0",
          padding: "0.2rem",
          boxSizing: "border-box",
          // overflowY: "auto",
          position: "relative",
        }}
        // className="min-h-screen w-full bg-gray-50"
      >
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/DPR" replace />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/DPR"
            element={
              isLoggedIn ? (
                <>
                  {/* Main DPR Page */}
                  <DPRPage handleLogout={handleLogout} />
                  {/* <button onClick={handleLogout} className="logout-button">
                    Logout
                  </button> */}

                  <Footer />
                </>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
