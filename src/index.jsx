import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Основная точка входа в React-приложение
// Монтирует компонент App в DOM-элемент с id 'root'
createRoot(document.getElementById("root")).render(<App />);
