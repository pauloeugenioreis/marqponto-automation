require('dotenv').config();

module.exports = {
  // Nome do sistema (prefixo nas notificações Telegram)
  sistemaPonto: process.env.SISTEMA_PONTO || '',

  // Credenciais (vêm do .env)
  user: process.env.MARQPONTO_USER,
  password: process.env.MARQPONTO_PASS,

  // URLs (vêm do .env)
  loginUrl: process.env.LOGIN_URL,
  pontoUrl: process.env.PONTO_URL,

  // Telegram
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,

  // GitHub Gist (persistência de datas desativadas)
  gistToken: process.env.GH_GIST_TOKEN,
  gistId: process.env.GIST_ID,

  // Geolocalização simulada (por dia da semana)
  // Segunda/Terça/Quarta
  geoLatSegTerQua: parseFloat(process.env.GEO_LAT_SEG_TER_QUA) || -3.0920902438448383,
  geoLngSegTerQua: parseFloat(process.env.GEO_LNG_SEG_TER_QUA) || -60.00604977562166,
  // Quinta/Sexta
  geoLatQuiSex: parseFloat(process.env.GEO_LAT_QUI_SEX) || -3.054679,
  geoLngQuiSex: parseFloat(process.env.GEO_LNG_QUI_SEX) || -60.032772,

  // Puppeteer
  headless: process.env.HEADLESS !== 'false',
  debug: process.env.DEBUG === 'true',
  dryRun: process.env.DRY_RUN === 'true',
  slowMo: process.env.DEBUG === 'true' ? 80 : 0,
  timeout: 60_000,
};
