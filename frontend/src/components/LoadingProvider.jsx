import React, { createContext, useContext, useState, useCallback } from "react";
import LoadingBar from "./LoadingBar";

const LoadingContext = createContext();

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);

  const showLoading = useCallback(() => setLoading(true), []);
  const hideLoading = useCallback(() => setLoading(false), []);

  return (
    <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
      {children}
      <LoadingBar visible={loading} />
    </LoadingContext.Provider>
  );
}
