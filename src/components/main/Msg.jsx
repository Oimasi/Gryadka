import React from "react";

export default function Msg({ text }) {
  if (!text) return null;

  let str;
  if (typeof text === "string") {
    str = text;
  } else if (Array.isArray(text)) {
    str = text.map(t => (typeof t === "string" ? t : JSON.stringify(t))).join(", ");
  } else {
    str = JSON.stringify(text);
  }

  const cls = str.startsWith("✅") ? "msg success" : "msg error";
}
