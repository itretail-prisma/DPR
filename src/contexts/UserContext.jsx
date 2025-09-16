import React, { createContext,useContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(() => {
    // Load from sessionStorage on initial render
    const storedUser = sessionStorage.getItem("userInfo");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    // Keep sessionStorage in sync with context
    if (userInfo) {
      sessionStorage.setItem("userInfo", JSON.stringify(userInfo));
    } else {
      sessionStorage.removeItem("userInfo");
    }
  }, [userInfo]);

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};

// ✅ Add this hook for easier usage
export const useUser = () => useContext(UserContext);
