// МИНИМАЛЬНЫЙ рабочий код - БЕЗ ошибок
export default async function handler(request, response) {
  try {
    console.log('🟢 Function started');
    
    if (request.method === 'GET') {
      return response.status(200).json({
        success: true,
        message: 'GET request successful',
        timestamp: new Date().toISOString(),
        path: '/api/update-geo',
        env: {
          MONGODB_API_KEY: process.env.MONGODB_API_KEY ? 'SET' : 'NOT SET',
          MONGODB_APP_ID: process.env.MONGODB_APP_ID ? 'SET' : 'NOT SET'
        }
      });
    }
    
    if (request.method === 'POST') {
      return response.status(200).json({
        success: true,
        message: 'POST request successful',
        action: 'Would process unicorn location update',
        timestamp: new Date().toISOString()
      });
    }
    
    return response.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('🔴 Error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
}
