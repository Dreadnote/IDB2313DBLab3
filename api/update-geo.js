// api/update-geo.js - ДЕБАГ версия
export default async function handler(req, res) {
  
  console.log('=== DEBUG START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Проверка переменных окружения
  const envVars = {
    MONGODB_API_KEY: process.env.MONGODB_API_KEY ? 'SET' : 'NOT SET',
    MONGODB_APP_ID: process.env.MONGODB_APP_ID ? 'SET' : 'NOT SET',
    MONGODB_CLUSTER: process.env.MONGODB_CLUSTER || 'NOT SET (using default)'
  };
  
  console.log('Environment Variables:', envVars);

  if (req.method === 'GET') {
    return res.json({
      status: 'debug mode',
      env: envVars,
      endpoints: {
        test: 'GET /api/update-geo - This page',
        real: 'POST /api/update-geo - Real functionality'
      },
      note: 'Check Vercel Environment Variables'
    });
  }
  
  if (req.method === 'POST') {
    // Простейший ответ для теста
    return res.json({
      success: true,
      debug: true,
      env: envVars,
      message: 'POST received successfully',
      action: 'Environment variables check passed',
      next: 'Add MongoDB integration'
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
