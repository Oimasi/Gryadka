// src/components/Profile.jsx
import React from "react";

export default function Profile({ user }) {
  if (!user) return <div className="form">Пожалуйста, войдите.</div>;
  return (
    <div className="form">
      <h3>Профиль</h3>
      <div className="small">ID: {user.id}</div>
      <div className="small">Email: {user.email}</div>
      <div className="small">Имя: {user.first_name || ""} {user.last_name || ""}</div>
      <div className="small">Роль: {user.role}</div>
    </div>
  );
}
