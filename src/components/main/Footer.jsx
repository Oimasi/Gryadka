import { useState } from "react";

export const Footer = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [message, setMessage] = useState("");

    const handleSendMessage = () => {
        setMessage("");
        setModalOpen(false);
    };
    return (
        <footer className="flex-col flex gap-auto justify-between max-w-[1330px] my-[8px] mx-auto">
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[500px] shadow-xl">
                        <h2 className="text-2xl font-semibold mb-6 text-left">
                            Написать в поддержку
                        </h2>
                        <textarea className="w-full h-[120px] p-3 border-gray-300 transition-all duration-200 border-1 rounded-lg focus:border-[#3E8D43]" placeholder="Введите ваше сообщение" value={message} onChange={(e) => setMessage(e.target.value)}/>
                        <div className="flex justify-between items-end mt-4">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-400 float-left mr-auto hover:bg-gray-100 cursor-pointer active:bg-gray-100 transition-all duration-200">
                            Отмена
                        </button>
                        <button onClick={handleSendMessage} className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left ml-3 cursor-pointer bg-[#3E8D43]/17">
                            Отправить
                        </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="border-t-1 border-[#CCCCCC] flex flex-row pb-4 justify-between gap-auto">
                <div className="flex-row flex gap-auto w-full justify-between mt-6">
                    <p>
                        © 2025 Gryadka
                    </p>
                    <p onClick={() => setModalOpen(true)} className="cursor-pointer" >
                        Задать вопрос
                    </p>
                </div>
            </div>
        </footer>
    )
}