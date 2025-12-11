import axios from 'axios';

export default async function handler(req, res) {
  
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
  
  console.log('🔄 Начинаю обновление геоданных единорогов...');

  try {
    
    // 1. Ищем единорога без геоданных
    console.log('🔍 Ищу единорога без координат...');
    const findResponse = await axios.post(
      `${DATA_API_URL}/action/findOne`,
      {
        dataSource: CLUSTER,
        database: 'Learn',
        collection: 'unicorns',
        filter: { 
          location: { $exists: false },
          name: { $exists: true }
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
      console.log('✅ Все единороги уже имеют геоданные');
      return res.status(200).json({ 
        message: 'Все единороги уже имеют геоданные',
        action: 'Добавьте новых единорогов или удалите поле location' 
      });
    }

    console.log(`🎯 Найден единорог: ${unicorn.name || 'Без имени'} (ID: ${unicorn._id})`);

    // 2. Определяем что искать в OpenStreetMap
    const searchQuery = unicorn.habitat || unicorn.city || 'forest';
    console.log(`🗺️  Ищу в OSM: "${searchQuery}"`);
    
    // 3. Запрашиваем у OpenStreetMap
    const osmResponse = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: searchQuery,
          format: 'json',
          limit: 1,
          countrycodes: 'af' // Афганистан
        },
        headers: {
          'User-Agent': 'UnicornsGeoService/1.0 (educational-project)'
        },
        timeout: 10000
      }
    );

    if (!osmResponse.data || osmResponse.data.length === 0) {
      console.log('❌ Локация не найдена в OpenStreetMap');
      return res.status(404).json({ 
        error: 'Локация не найдена',
        searchQuery: searchQuery,
        suggestion: 'Попробуйте добавить поле city или habitat единорогу' 
      });
    }

    const location = osmResponse.data[0];
    console.log(`📍 Найдено: ${location.display_name}`);
    console.log(`📌 Координаты: ${location.lon}, ${location.lat}`);

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
            location: {
              type: 'Point',
              coordinates: [
                parseFloat(location.lon),
                parseFloat(location.lat)
              ]
            },
            address: location.display_name,
            geoSource: 'OpenStreetMap',
            geoUpdated: new Date().toISOString()
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
        message: 'Единорог обновлен',
        unicorn: {
          id: unicorn._id,
          name: unicorn.name,
          updated: true
        },
        location: {
          name: location.display_name,
          coordinates: [location.lon, location.lat],
          source: 'OpenStreetMap'
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
