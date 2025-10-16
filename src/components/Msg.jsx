// src/components/Msg.jsx
import React from "react";

export default function Msg({ text }) {
  if (!text) return null;
  const cls = text.startsWith("✅") ? "msg success" : "msg error";
  return <div className={cls}>{text}</div>;
}
