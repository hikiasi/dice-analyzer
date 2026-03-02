const crypto = require('crypto');

const SALT = 'dice-analyzer-secret-salt-2024';

function generateKey(hwid) {
  if (!hwid) {
    console.error('Ошибка: Необходимо указать HWID');
    console.log('Пример использования: node tools/generate_key.js <HWID>');
    process.exit(1);
  }

  const key = crypto
    .createHash('sha256')
    .update(hwid + SALT)
    .digest('hex')
    .toUpperCase()
    .substring(0, 16);

  console.log('\n--- DICE ANALYZER LICENSE GENERATOR ---');
  console.log(`HWID:  ${hwid}`);
  console.log(`КЛЮЧ:  ${key}`);
  console.log('---------------------------------------\n');
}

const hwidArg = process.argv[2];
generateKey(hwidArg);
