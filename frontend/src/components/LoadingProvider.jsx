import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import LoadingBar from "./LoadingBar";

const LoadingContext = createContext();

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const countRef = useRef(0);

  const showLoading = useCallback(() => {
    countRef.current += 1;
    setLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) setLoading(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
      {children}
      <LoadingBar visible={loading} />
    </LoadingContext.Provider>
  );
}
