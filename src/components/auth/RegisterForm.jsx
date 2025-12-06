import React, { useState } from "react";
import { register, login, saveAccessToken } from "../../api";
import Dropdown from "../ui/dropdown";
import logo from "/images/logotype.png"
import back from "/images/back-button.svg"

export default function RegisterForm({ onSuccess, setMsg, onNavigate }) {

  const [selected, setSelected] = useState("");
  const options = ["Покупатель", "Фермер"];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState("consumer"); 
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);

    try {
      const r = await register({ email, password, first_name: first, last_name: last, role });

      if (r.ok) {
        const loginResult = await login({ email, password });
        if (loginResult.ok) {
          const token = loginResult.data?.access_token;
          if (token) saveAccessToken(token);
          setMsg && setMsg("Регистрация успешна!");
          onSuccess && onSuccess();
        } else {
          setMsg && setMsg("Регистрация успешна. Войдите.");
          onSuccess && onSuccess();
        }
      } else {
        const detail = r.data?.detail || JSON.stringify(r.data) || "Ошибка регистрации";
        setMsg && setMsg(detail);
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
      <div className="bg-white p-2 sm:p-15 ml-5 mr-5 rounded-[30px] shadow-none md:shadow-md max-w-[518px] w-full mt-35 mb-35">
        <form className="justify-center items-center w-full" onSubmit={submit} noValidate>
          <img src={logo} className="w-[62px] h-[50px] justify-center items-center mx-auto mb-5"/>
          <p className="text-[24px] md:text-[28px] text-center font-medium">Регистрация</p>
          <p className="text-[#7D7D7D] text-center text-[15px] md:text-[17px]">Пожалуйста, зарегистрируйтесь</p>

          <div className="flex flex-col w-full max-w-[390px] mt-6">
            <label className="mb-1 text-[15px] md:text-[16px] text-black" htmlFor="reg-email">Почта</label>
            <input id="reg-email" className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" name="email" type="email" placeholder="email@email.com" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="flex flex-col w-full max-w-[390px] mt-4">
            <label className="mb-1 text-[15px] md:text-[16px] text-black" htmlFor="reg-password">Пароль</label>
            <input id="reg-password" name="password" className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" placeholder="Пароль  (не менее 9 символов)" aria-label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <div className="flex flex-col w-full max-w-[390px] mt-4">
            <label className="mb-1 text-[15px] md:text-[16px] text-black" htmlFor="reg-first">Имя</label>
            <input id="reg-first" name="first_name" className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" placeholder="Имя" aria-label="Имя" value={first} onChange={e => setFirst(e.target.value)} required />
          </div>

          <div className="flex flex-col w-full max-w-[390px] mt-4">
            <label className="mb-1 text-[15px] md:text-[16px] text-black" htmlFor="reg-last">Фамилия</label>
            <input id="reg-last" name="last_name" className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" placeholder="Фамилия" aria-label="Фамилия" value={last} onChange={e => setLast(e.target.value)} required/>
          </div>

          <div className="flex flex-col w-full max-w-[390px] mt-4">
            <label className="mb-1 text-[15px] md:text-[16px] text-black">Отчество</label>
            <input name="middle_name" className="mt-1 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" placeholder="Отчество (необязательно)" aria-label="Отчество" />
          </div>

          <div className="flex flex-col w-full max-w-[390px] mt-4">
            <label className="mb-1 text-[15px] md:text-[16px] text-black" htmlFor="reg-role">Роль</label>
            <Dropdown
              options={options}
              selected={role === "consumer" ? "Покупатель" : "Фермер"}
              onSelect={value => setRole(value === "Покупатель" ? "consumer" : "farmer")}
              label="Выберите роль"
            />
          </div>

          <div className="row w-full max-w-[390px] mt-5">
            <button className="w-full h-[48px] bg-black hover:bg-[#3C7D40] active:bg-[#3C7D40] transition-all duration-150 text-white cursor-pointer rounded-lg" type="submit" disabled={loading}>Зарегистрироваться</button>
          </div>

          <div className="text-center pt-3">
            <span className="text-[#7D7D7D] text-[13px] md:text-[15px]">Уже есть аккаунт? <a className="text-black hover:text-black/60 active:text-black/60 cursor-pointer transition-all duration-100" onClick={() => onNavigate("login")}>Войти</a></span>
          </div>
        </form>
      </div>
    </div>
    
  );
}
