// src/components/Msg.jsx
import React from "react";

export default function Msg({ text }) {
  // Если текст сообщения отсутствует, компонент не отображается
  if (!text) return null;
  // Определение класса сообщения в зависимости от префикса
  const cls = text.startsWith("✅") ? "msg success" : "msg error";
  return <div className={cls}>{text}</div>;
}
