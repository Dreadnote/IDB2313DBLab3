const axios = require('axios');

module.exports = async function handler(req, res) {
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Используйте POST метод',
      example: 'curl -X POST https://ваш-домен.vercel.app/api/update-geo' 
    });
  }

  const API_KEY = process.env.MONGODB_API_KEY;
  const APP_ID = process.env.MONGODB_APP_ID;
  const CLUSTER = process.env.MONGODB_CLUSTER || 'Cluster0';
  
  const DATA_API_URL = `https://data.mongodb-api.com/app/${APP_ID}/endpoint/data/v1`;
  
  console.log('🔄 Начинаю определение реального местоположения единорогов...');

  try {
    
    // 1. Ищем единорога С координатами, но БЕЗ real_country
    console.log('🔍 Ищу единорога с координатами, но без real_country...');
    const findResponse = await axios.post(
      `${DATA_API_URL}/action/findOne`,
      {
        dataSource: CLUSTER,
        database: 'Learn',
        collection: 'unicorns',
        filter: { 
          "location.coordinates": { $exists: true },
          "real_country": { $exists: false }
        },
        sort: { _id: 1 }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    const unicorn = findResponse.data.document;
    
    if (!unicorn) {
      console.log('✅ Все единороги уже имеют реальные местоположения');
      return res.status(200).json({ 
        message: 'Все единороги уже имеют реальные местоположения (real_country, real_town)',
        action: 'Добавьте новых единорогов с координатами' 
      });
    }

    console.log(`🎯 Найден единорог: ${unicorn.name || 'Без имени'}`);
    console.log(`📍 Координаты: ${unicorn.location.coordinates}`);
    
    const [lon, lat] = unicorn.location.coordinates;

    // 2. Reverse geocoding - по координатам получаем адрес
    console.log(`🗺️  Определяю адрес для координат: ${lon}, ${lat}...`);
    
    const osmResponse = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat: lat,
          lon: lon,
          format: 'json',
          'accept-language': 'en',
          zoom: 10  // Уровень детализации (город)
        },
        headers: {
          'User-Agent': 'UnicornsGeoService/1.0 (educational-project)'
        },
        timeout: 10000
      }
    );

    if (!osmResponse.data || osmResponse.data.error) {
      console.log('❌ Адрес не найден для этих координат');
      return res.status(404).json({ 
        error: 'Адрес не найден',
        coordinates: [lon, lat],
        suggestion: 'Координаты могут быть в океане или удаленном районе' 
      });
    }

    const address = osmResponse.data.address;
    const fullAddress = osmResponse.data.display_name;
    
    // 3. Извлекаем страну и город
    let country = address.country || address.state || address.region;
    let town = address.city || address.town || address.village || address.municipality;
    
    // Если город не найден, используем что есть
    if (!town) {
      town = address.county || address.state || 'Unknown location';
    }
    
    console.log(`🌍 Страна: ${country}`);
    console.log(`🏙️  Город: ${town}`);
    console.log(`📫 Полный адрес: ${fullAddress}`);

    // 4. Обновляем единорога в MongoDB
    console.log('💾 Сохраняю в MongoDB...');
    const updateResponse = await axios.post(
      `${DATA_API_URL}/action/updateOne`,
      {
        dataSource: CLUSTER,
        database: 'Learn',
        collection: 'unicorns',
        filter: { _id: unicorn._id },
        update: {
          $set: {
            real_country: country,
            real_town: town,
            real_address: fullAddress,
            reverse_geocoded: true,
            geo_source: 'OpenStreetMap Reverse Geocoding',
            geo_updated: new Date().toISOString()
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    const result = updateResponse.data;
    
    if (result.modifiedCount > 0) {
      console.log('✅ Успешно обновлено!');
      
      return res.status(200).json({
        success: true,
        message: 'Реальное местоположение определено',
        unicorn: {
          id: unicorn._id,
          name: unicorn.name,
          updated: true
        },
        location: {
          coordinates: [lon, lat],
          country: country,
          town: town,
          full_address: fullAddress
        },
        nextStep: 'Отправьте POST запрос еще раз для следующего единорога'
      });
      
    } else {
      console.log('⚠️  Документ не был изменен');
      return res.status(200).json({
        success: false,
        message: 'Документ не был изменен'
      });
    }

  } catch (error) {
    console.error('💥 Ошибка:', error.message);
    
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message,
      step: 'Проверьте переменные окружения и подключение к MongoDB',
      envCheck: 'Убедитесь что MONGODB_API_KEY и MONGODB_APP_ID установлены'
    });
  }
}
