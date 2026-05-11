import React from "react";
import "./LoadingBar.css";

export default function LoadingBar({ visible }) {
  return <div className={`loading-bar ${visible ? "visible" : ""}`} />;
}
