const https = require('https');
const config = require('./config');
const logger = require('./logger');

/**
 * Envia mensagem via Telegram Bot API.
 * @param {string} message - Texto da mensagem (suporta HTML básico)
 */
async function sendTelegram(message) {
  if (!config.telegramToken || !config.telegramChatId) {
    logger.info('Telegram não configurado — notificação ignorada');
    return;
  }

  const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
  const body = JSON.stringify({
    chat_id: config.telegramChatId,
    text: message,
    parse_mode: 'HTML',
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          logger.info('Notificação Telegram enviada com sucesso');
          resolve(data);
        } else {
          logger.warn(`Telegram respondeu com status ${res.statusCode}: ${data}`);
          resolve(data); // não rejeita para não travar o fluxo
        }
      });
    });

    req.on('error', (err) => {
      logger.warn(`Falha ao enviar Telegram: ${err.message}`);
      resolve(); // não rejeita
    });

    req.write(body);
    req.end();
  });
}

/**
 * Notifica sucesso na batida de ponto
 */
async function notifySuccess() {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  const prefix = config.sistemaPonto ? `${config.sistemaPonto} - ` : '';
  await sendTelegram(`✅ <b>${prefix}Ponto registrado!</b>\n📅 ${now} (Manaus)`);
}

/**
 * Notifica erro na batida de ponto
 * @param {string} errorMsg - Mensagem de erro
 */
async function notifyError(errorMsg) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  const prefix = config.sistemaPonto ? `${config.sistemaPonto} - ` : '';
  await sendTelegram(`❌ <b>${prefix}Erro ao bater ponto</b>\n📅 ${now} (Manaus)\n⚠️ ${errorMsg}`);
}

module.exports = { sendTelegram, notifySuccess, notifyError };
