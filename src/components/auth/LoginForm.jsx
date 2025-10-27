import React, { useState } from "react";
import { login, saveAccessToken } from "../../api";
import logo from "/images/logotype.png"
import back from "/images/back-button.svg"

export default function LoginForm({ onSuccess, setMsg, onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);
    try {
      const r = await login({ email, password });
      if (!r.ok) {
        setMsg && setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка входа");
      } else {
        const token = r.data?.access_token;
        if (token) saveAccessToken(token);
        setMsg && setMsg("✅ Вход выполнен");
        onSuccess && onSuccess();
      }
    } catch (err) {
      setMsg && setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full p-0 bg-white md:bg-[#3E8D43] flex justify-center items-center">
      <button onClick={() => onNavigate("main")} className="absolute top-10 left-10 cursor-pointer">
        <img src={back} alt="Назад" className="w-[10px] h-[18px]" />
      </button>
      <div className="rounded-full absolute left-auto top-10 md:top-28 px-4 py-2 bg-[#D9D9D9]/40">
        <p className="md:text-white text-black/40">Gryadka ID</p>
      </div>
      <div className="bg-white p-2 sm:p-15 ml-5 mr-5 rounded-[30px] shadow-none md:shadow-md max-w-[518px] w-full">
        <form onSubmit={submit} className="justify-center items-center w-full">
          <img src={logo} className="w-[62px] h-[50px] justify-center items-center mx-auto mb-5"/>
          <p className="text-[24px] md:text-[28px] text-center font-medium">Авторизация</p>
          <p className="text-[#7D7D7D] text-center text-[15px] md:text-[17px]">Пожалуйста, войдите в аккаунт</p>

          <div className="flex flex-col w-full max-w-[390px] mt-6">
            <label htmlFor="email" className="mb-1 text-[15px] md:text-[16px] text-black">
              Почта
            </label>
            <input
              type="login-email"
              id="email"
              placeholder="email@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
            />
          </div>

          <div className="flex flex-col w-full max-w-[390px] mt-3">
            <label htmlFor="email" className="mb-1 text-[15px] md:text-[16px] text-black">
              Пароль
            </label>
            <input
              type="login-password"
              id="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
            />
          </div>

          <div className="row w-full max-w-[390px] mb-3 mt-4">
            <button className="w-full h-[48px] bg-black hover:bg-[#3C7D40] active:bg-[#3C7D40] transition-all duration-150 text-white cursor-pointer rounded-lg" type="submit" disabled={loading}>Войти</button>
          </div>

          <div className="text-center pt-3">
            <span className="text-[#7D7D7D] text-[13px] md:text-[15px]">Еще нет аккаунта? <a className="text-black hover:text-black/60 active:text-black/60 cursor-pointer transition-all duration-100" onClick={() => onNavigate("register")}>Зарегистрироваться</a></span>
          </div>
        </form>
      </div>
    </div>
  );
}
