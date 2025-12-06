# -*- coding: utf-8 -*-
"""
AI Recommendation Utilities
----------------------------
Утилиты для генерации рекомендаций от ИИ с использованием NeuroAPI.
"""

import os
import logging
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ai_recommendation")

# Конфигурация NeuroAPI
NEUROAPI_URL = "https://neuroapi.host/v1/chat/completions"
NEUROAPI_KEY = os.getenv("NEUROAPI_KEY")
NEUROAPI_MODEL = os.getenv("NEUROAPI_MODEL", "gpt-5-nano")


def generate_product_recommendation(
    product_name: str,
    product_category: str,
    short_description: Optional[str] = None,
    passport_data: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Генерирует краткую рекомендацию для товара на основе его данных.
    
    Args:
        product_name (str): Название товара.
        product_category (str): Категория товара.
        short_description (Optional[str]): Краткое описание товара.
        passport_data (Optional[Dict[str, Any]]): Данные паспорта товара.
        
    Returns:
        Optional[str]: Сгенерированная рекомендация или None в случае ошибки.
    """
    try:
        # Формируем контекст из данных товара
        context_parts = [f"Название товара: {product_name}"]
        context_parts.append(f"Категория: {product_category}")
        
        if short_description:
            context_parts.append(f"Описание: {short_description}")
        
        if passport_data:
            origin = passport_data.get("origin")
            variety = passport_data.get("variety")
            harvest_date = passport_data.get("harvest_date")
            certifications = passport_data.get("certifications", [])
            sensor_data = passport_data.get("data", {})
            
            if origin:
                context_parts.append(f"Происхождение: {origin}")
            if variety:
                context_parts.append(f"Сорт/вид: {variety}")
            if harvest_date:
                context_parts.append(f"Дата сбора урожая: {harvest_date}")
            
            if certifications:
                cert_names = [c.get("name", "") for c in certifications if c.get("name")]
                if cert_names:
                    context_parts.append(f"Сертификаты: {', '.join(cert_names)}")
            
            # Добавляем важные данные сенсоров, если они есть
            if sensor_data:
                if sensor_data.get("Есть датчики"):
                    avg_ph = sensor_data.get("Средний pH за время выращивания")
                    if avg_ph:
                        context_parts.append(f"Средний pH за время выращивания: {avg_ph}")
                    
                    salinity = sensor_data.get("Средняя соленость почвы за время выращивания")
                    if salinity:
                        context_parts.append(f"Средняя соленость почвы: {salinity}")
                    
                    temp = sensor_data.get("Средняя температура за время выращивания")
                    if temp:
                        context_parts.append(f"Средняя температура: {temp}")
        
        context = "\n".join(context_parts)
        
        # Формируем промпт для ИИ
        system_message = """Ты эксперт по описанию фермерских продуктов. Твоя задача - создавать краткие, привлекательные рекомендации для покупателей, которые подчеркивают уникальные качества продукта."""
        
        user_message = f"""На основе следующей информации о товаре создай краткую рекомендацию для покупателей (3-4 предложения). 
Рекомендация должна быть привлекательной, информативной и подчеркивать уникальные качества продукта.

Постарайся не повторять информацию из описания товара. Выдай что нибудь общее и конкретное на основе информаци что тебе предоставлена

Информация о товаре:
{context}

Пример хорошей рекомендации:
"Этот нут отличается мягким, чуть сладковатым вкусом и равномерным размером зёрен. После варки сохраняет форму и кремовую текстуру — идеально подходит для хумуса и восточных блюд. Рекомендуется покупателям, которые ищут качественную альтернативу импортным бобовым с минимальным следом углерода."

Создай похожую рекомендацию для этого товара:"""

        # Выполняем запрос к NeuroAPI
        try:
            response = requests.post(
                NEUROAPI_URL,
                headers={
                    "Authorization": f"Bearer {NEUROAPI_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": NEUROAPI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_message}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1500
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"NeuroAPI returned status {response.status_code}: {response.text}")
                return None
            
            result = response.json()
        except requests.Timeout:
            logger.error("Timeout while generating AI recommendation")
            return None
        except requests.RequestException as e:
            logger.error(f"Request error while generating AI recommendation: {e}")
            return None
        recommendation = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        
        if not recommendation:
            logger.warning("Empty recommendation received from NeuroAPI")
            return None
        
        logger.info(f"Successfully generated recommendation for product: {product_name}")
        return recommendation
        
    except Exception as e:
        logger.exception(f"Unexpected error while generating AI recommendation: {e}")
        return None

