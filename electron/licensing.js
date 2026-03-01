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
  let usageCount = 0;
  if (fs.existsSync(LICENSE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
      usageCount = data.usageCount || 0;
      if (data.key && verifyKey(data.key)) {
        return { isActivated: true, hwid, usageCount };
      }
    } catch (e) {
      console.error('Failed to read license file', e);
    }
  }
  return { isActivated: false, hwid, usageCount };
}

function activate(key) {
  if (verifyKey(key)) {
    let data = {};
    if (fs.existsSync(LICENSE_FILE)) {
      data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
    }
    data.key = key;
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(data));
    return true;
  }
  return false;
}

function incrementUsage() {
  let data = { usageCount: 0 };
  if (fs.existsSync(LICENSE_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
    } catch (e) {}
  }
  data.usageCount = (data.usageCount || 0) + 1;
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(data));
  return data.usageCount;
}

module.exports = {
  getHWID,
  getLicenseStatus,
  activate,
  incrementUsage
};
