import arrow from "/images/arrow_faqs.svg"

export const FaqComponent = ({ faq, index, toggleFAQ }) => {
    return (
        <div className="max-w-[1330px] mx-auto mt-2">
            <div className="text-white flex-row h-auto border-b border-[#dbdbdb] lg:ml-[0] lg:mr-[0] ml-[15px] mr-[15px] transition-colors" key={index}>
                <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => toggleFAQ(index)}>
                    <p className="pt-[20px] pb-[20px] text-[17px] text-black font-medium leading-normal transition-all duration-100 active:text-black/70 hover:text-black/70">
                        {faq.question}
                    </p>
                    <img src={arrow} className={`w-[13px] ml-10 h-[13px] transition-transform duration-300 ease-in-out ${faq.open ? "rotate-[-90deg]" : "rotate-0"}`}/>
                </div>
                <div>
                    {faq.open && (
                        <div className="overflow-hidden pb-[20px] text-[17px] text-black/70 leading-normal">
                            <p>{faq.content}</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}