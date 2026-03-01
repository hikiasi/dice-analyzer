const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SALT = 'dice-analyzer-secret-salt-2024';
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');

function getHWID() {
  try {
    return machineIdSync();
  } catch (e) {
    return 'fallback-id-' + process.platform;
  }
}

function generateKey(hwid) {
  return crypto
    .createHash('sha256')
    .update(hwid + SALT)
    .digest('hex')
    .toUpperCase()
    .substring(0, 16);
}

function verifyKey(key) {
  const hwid = getHWID();
  const expectedKey = generateKey(hwid);
  return key === expectedKey;
}

function getLicenseStatus() {
  const hwid = getHWID();
  if (fs.existsSync(LICENSE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
      if (verifyKey(data.key)) {
        return { isActivated: true, hwid };
      }
    } catch (e) {
      console.error('Failed to read license file', e);
    }
  }
  return { isActivated: false, hwid };
}

function activate(key) {
  if (verifyKey(key)) {
    fs.writeFileSync(LICENSE_FILE, JSON.stringify({ key }));
    return true;
  }
  return false;
}

module.exports = {
  getHWID,
  getLicenseStatus,
  activate
};
