// Простейший endpoint для проверки
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'Unicorns API',
    timestamp: new Date().toISOString()
  });
}
