import React, { createContext, useContext } from "react";
import "./Toast.css";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

// No-op provider to disable toast notifications app-wide.
export const ToastProvider = ({ children }) => {
  const showToast = () => {
    // Intentionally empty: notifications disabled
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
};
