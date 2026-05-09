import { createContext, useCallback, useContext, useState } from "react";
import LoadingBar from "./LoadingBar";

const LoadingContext = createContext();

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0);

  const showLoading = useCallback(() => setCount(c => c + 1), []);
  const hideLoading = useCallback(() => setCount(c => Math.max(0, c - 1)), []);

  return (
    <LoadingContext.Provider value={{ loading: count > 0, showLoading, hideLoading }}>
      <LoadingBar show={count > 0} />
      {children}
    </LoadingContext.Provider>
  );
}
