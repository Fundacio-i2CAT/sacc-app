const APPLE_HEALTH_KIT = require('rn-apple-healthkit');

const DEFAULT_OPTIONS = {
  permissions: {
    read: ['Height', 'Weight', 'StepCount', 'DateOfBirth', 'BodyMassIndex'],
    write: ['Weight', 'StepCount', 'BodyMassIndex'],
  },
};

const authorize = async () => {
  return new Promise(async (resolve, reject) => {
    APPLE_HEALTH_KIT.initHealthKit(DEFAULT_OPTIONS, (err, res) => {
      if (err) {
        console.log('error initializing healthkit: ', err);
        reject(res);
      } else {
        resolve(res);
      }
    });
  });
};

const getDateOfBirth = () => {
  return new Promise((resolve, reject) => {
    APPLE_HEALTH_KIT.getDateOfBirth(null, (err, res) => {
      if (err) {
        console.log('error healthkit: ', err);
        reject(res);
      } else {
        resolve(res);
      }
    });
  });
};

module.exports = {
  authorize,
  getDateOfBirth,
};
