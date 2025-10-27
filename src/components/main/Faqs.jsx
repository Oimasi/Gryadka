import React, { useState } from "react";
import arrow from "/images/arrow_faqs.svg";
import { FaqComponent } from "../ui/faq_component";
import { Footer } from "./Footer";

export default function Faqs({ onNavigate }) {
  const [faqs, setFaqs] = useState([
    {
      question: "Как я могу оформить заказ?",
      content: "Выберите товары в каталоге, перейдите на карточку продукта, ознакомьтесь с паспортом и добавьте товар в корзину. После этого можно оплатить заказ.",
      open: false
    },
    {
      question: "Какие данные я вижу в паспорте продукта?",
      content: "Паспорт содержит таймлапсы, условия хранения (температура, влажность, освещённость), сертификаты и данные с датчиков фермы.",
      open: false
    },
    {
      question: "Как фермер загружает продукцию?",
      content: "Фермер создаёт продукт, загружает фото и таймлапсы, подключает датчики и указывает календарь урожаев. Данные попадают в цифровой паспорт и отображаются покупателям.",
      open: false
    },
    {
      question: "Как отслеживать доставку?",
      content: "Вы видите, где находится курьер, и когда он будет на месте, то отобразится уведомление.",
      open: false
    },
    {
      question: "Можно ли доверять продукту?",
      content: "Каждый товар проходит проверку: фермер сам вводит данные, часть данных фиксируется датчиками, а важные продукты могут иметь сертификаты.",
      open: false
    },
    {
      question: "Почему это фиджитал?",
      content: "Мы объединяем физические продукты с цифровыми паспортами: вы видите данные о продукте, а фермер получает удобный инструмент для продаж.",
      open: false
    },
    {
      question: "Как связаться с поддержкой?",
      content: "Вы можете написать нам, заполнив форму по ссылке ниже",
      open: false
    }
  ]);

  const toggleFAQ = (index) => {
    setFaqs(
      faqs.map((faq, i) => {
        if (i === index) {
          faq.open = !faq.open
          } else {
            faq.open = false
          }
            return faq
       })
    )
  }

  return (
    <div className="bg-white flex flex-col gap-4 max-w-[1330px] my-4 mx-auto px-4">
      <div className="flex flex-row">
        <div className="mr-3 cursor-pointer" onClick={() => onNavigate("main")}>
          <img src={arrow} className="mt-2 rotate-0 ml-1.5 mb-6 w-[17px] h-[12px]" />
        </div>
        <h2 className="text-xl font-semibold text-black">Часто задаваемые вопросы</h2>
      </div>
        <div className="bg-[#3E8D43] mt-4 flex flex-row h-full min-h-[150px] rounded-[20px] px-[30px] py-[25px] justify-between gap-auto">
            <div className="flex flex-col justify-between gap-auto">
                <div className="flex">
                    <p className="text-white/40">FAQ</p>
                </div>
                <div className="flex flex-col gap-3 mt-10 md:mt-0">
                    <p className="text-[15px] md:text-[18px] text-white">На этой странице мы собрали ответы на самые популярные вопросы о нашем сервисе</p>
                </div>
            </div>
      </div>      
      <section>
        {faqs.map((faq, index) => (
          <FaqComponent faq={faq} index={index} key={index} toggleFAQ={toggleFAQ} />
        ))}
      </section>
      <div className="w-full mt-10">
         <Footer />
      </div>
    </div>
  );
}
