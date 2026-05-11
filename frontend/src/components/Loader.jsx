import React from "react";
import { Loader as LoaderIcon } from "lucide-react";
import "./Loader.css";

export default function Loader({ text = "Loading..." }) {
  return (
    <div className="loader-container">
      <LoaderIcon size={28} className="loader-spinner" />
      <p>{text}</p>
    </div>
  );
}
