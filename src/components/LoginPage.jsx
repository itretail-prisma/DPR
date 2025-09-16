// // src/components/LoginPage.jsx
// import React, { useState, useRef, useEffect } from "react";
// import "../LoginPage.css";
// import axios from "axios";
// import { useUser } from "../contexts/UserContext";

// const LoginPage = ({ onLoginSuccess }) => {
//   const { setUserInfo } = useUser();

//   const [userList, setUserList] = useState([]);
//   const [username, setUsername] = useState("");
//   const [employeeName, setEmployeeName] = useState("");
//   const [password, setPassword] = useState("");
//   const [empID, setEmployeeID] = useState("");
//   const [location, setLocation] = useState("");
//   const [locationID, setLocationID] = useState("");

//   const usernameRef = useRef(null);
//   const passwordRef = useRef(null);
//   const loginBtnRef = useRef(null);
//   // const validUsers = [
//   //   { username: "Admin", password: "123", employeeName: "Admin", employeeID: "91916", Location: "Tirupur", LocationID: "001" },
//   //   { username: "PTR", password: "123", employeeName: "Raj" },
//   //   { username: "Pavithra", password: "123", employeeName: "Pavithra-Admin" },
//   //   { username: "Sowbarniya", password: "123", employeeName: "Sowbarniya-Admin" },
//   //   { username: "Sasikala", password: "123", employeeName: "Sasikala-DEO" },
//   //   { username: "Sumithra", password: "123", employeeName: "Sumithra-DEO" },
//   //   { username: "Monika", password: "123", employeeName: "Monika-DEO" },
//   //   { username: "Divya", password: "123", employeeName: "Divya" },
//   //   { username: "Logeswari", password: "123", employeeName: "Logeswari" },
//   // ];
//   useEffect(() => {
//     axios.get("http://192.168.1.123:8080/name/api/getUsers.php").then((res) => {
//       if (res.data.success) {
//         setUserList(res.data.data);
//       }
//     });

//     // setUserList(validUsers);
//     usernameRef.current?.focus();
//   }, []);
//   useEffect(() => {
//     const trimmed = username.trim();

//     if (trimmed === "") {
//       setEmployeeName("");
//       setEmployeeID("");
//       setLocation("");
//       setLocationID("");
//     }
//   }, [username]);


//   const handleUsernameBlur = () => {
//     const trimmedInput = username.trim().toLowerCase();

//     const matchedUser = userList.find(
//       (user) => user.UserName?.toLowerCase() === trimmedInput
//     );

//     if (matchedUser) {
//       setEmployeeName(matchedUser.FName); // FName
//       setEmployeeID(matchedUser.EmpID);
//       setLocation(matchedUser.Location);
//       setLocationID(matchedUser.LocationID);
//       passwordRef.current?.focus();
//     } else {
//       setEmployeeName("");
//       setEmployeeID("");
//       setLocation("");
//       setLocationID("");
//     }
//   };
//   const handleUsernameKeyDown = (e) => {
//     if (e.key === "Enter") {
//       handleUsernameBlur(); // 👈 Same logic used on blur
//     }
//   };


//   const handleLogin = () => {
//     const matchedUser = userList.find(
//       (user) =>
//         user.UserName?.toLowerCase() === username?.trim().toLowerCase() &&
//         user.Password === password
//     );
//     console.log("Matched User:", matchedUser, typeof matchedUser.IsAdmin); // 🪵 Log for debugging

//     if (matchedUser) {
//       // setUserInfo(matchedUser); // Store in Context
//       setUserInfo({
//         ...matchedUser,
//         isAdmin: matchedUser.IsAdmin === "1", // convert int -> true/false
//       });
//       onLoginSuccess(matchedUser); // Call parent
//     } else {
//       alert("Invalid credentials");
//       passwordRef.current?.focus();
//     }
//   };


//   return (
//     <div className="login-container">
//       <div className="login-box">
//         <h2 className="login-title">Login</h2>

//         <label>Login ID</label>
//         <input
//           ref={usernameRef}
//           type="text"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)} // just update state
//           onBlur={handleUsernameBlur} // match username only on blur
//           onKeyDown={handleUsernameKeyDown}
//           className="login-input"
//         />

//         <label>Login Password</label>
//         <input
//           ref={passwordRef}
//           type="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter") loginBtnRef.current?.focus();
//           }}
//           className="login-input"
//         />

//         <label>Employee Name</label>
//         <input
//           type="text"
//           value={employeeName}
//           readOnly
//           className="login-input readonly-input"
//         />

//         <label>Employee ID</label>
//         <input
//           type="text"
//           value={empID}
//           readOnly
//           className="login-input readonly-input"
//         />

//         <label>Location</label>
//         <input
//           type="text"
//           value={location}
//           readOnly
//           className="login-input readonly-input"
//         />

//         <label>Location ID</label>
//         <input
//           type="text"
//           value={locationID}
//           readOnly
//           className="login-input readonly-input"
//         />

//         <button onClick={handleLogin} ref={loginBtnRef} className="login-button">
//           Login
//         </button>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;

// src/components/LoginPage.jsx
import React, { useState, useRef, useEffect } from "react";
import "../LoginPage.css";
import axios from "axios";
import { useUser } from "../contexts/UserContext";

const LoginPage = ({ onLoginSuccess }) => {
  const { setUserInfo } = useUser();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [empID, setEmployeeID] = useState("");
  const [location, setLocation] = useState("");
  const [locationID, setLocationID] = useState("");
  const [error, setError] = useState("");

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const loginBtnRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleUsernameEnter = async () => {
    try {
      const res = await axios.post("http://192.168.1.123:8080/name/api/login.php", {
        username,
      });

      if (res.data.success) {
        const user = res.data.user;
        setEmployeeName(user.FName);
        setEmployeeID(user.EmpID);
        setLocation(user.Location);
        setLocationID(user.LocationID);
        setError("");
        passwordRef.current?.focus(); // Move focus to password
      } else {
        // setError(res.data.message || "User not found");
        alert(res.data.message || "User not found");

        setEmployeeName("");
        setEmployeeID("");
        setLocation("");
        setLocationID("");
      }
    } catch (err) {
      // setError("Server error: " + err.message);
      alert("Server error: " + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://192.168.1.123:8080/name/api/login.php", {
        username,
        password,
      });

      if (res.data.success) {
        const user = res.data.user;
        setUserInfo({
          ...user,
          isAdmin: user.IsAdmin === "1",
        });
        onLoginSuccess(user);
      } else {
        // setError(res.data.message || "Invalid password");
        alert(res.data.message || "User not found");
        passwordRef.current?.focus();
      }
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Login</h2>

        {error && <div className="error-message">{error}</div>}

        <label>Login ID</label>
        <input
          ref={usernameRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUsernameEnter();
          }}
          className="login-input"
        />

        <label>Login Password</label>
        <input
          ref={passwordRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          className="login-input"
        />

        <label>Employee Name</label>
        <input type="text" value={employeeName} readOnly className="login-input readonly-input" />

        <label>Employee ID</label>
        <input type="text" value={empID} readOnly className="login-input readonly-input" />

        <label>Location</label>
        <input type="text" value={location} readOnly className="login-input readonly-input" />

        <label>Location ID</label>
        <input type="text" value={locationID} readOnly className="login-input readonly-input" />

        <button onClick={handleLogin} ref={loginBtnRef} className="login-button">
          Login
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
