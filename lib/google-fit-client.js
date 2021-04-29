import GoogleFit, { Scopes } from 'react-native-google-fit'

const DEFAULT_OPTIONS = {
  scopes: [
    Scopes.FITNESS_ACTIVITY_READ,
    Scopes.FITNESS_ACTIVITY_READ_WRITE,
    Scopes.FITNESS_BODY_READ_WRITE,
    Scopes.FITNESS_LOCATION_READ,
    Scopes.FITNESS_LOCATION_READ_WRITE
  ],
}

const authorize = async () => {
  return new Promise(async (resolve, reject) => {
    GoogleFit.authorize(DEFAULT_OPTIONS)
      .then(authResult => {
        if (authResult.success) {
          console.log("Google Fit AUTH_SUCCESS");
          resolve(authResult)
        } else {
          console.log("Google Fit AUTH_DENIED", authResult.message);
          reject(authResult)
        }
      })
      .catch((err) => {
        console.log("Google Fit AUTH_ERROR");
        console.log(err)
      })
  })
}

const getDailyStepCountSamples = (startDate, endDate) => {
  const dateRange = {
    startDate: startDate,
    endDate: endDate
  }
  return new Promise(async (resolve, reject) => {
    GoogleFit.getDailyStepCountSamples(dateRange)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        console.warn(err)
        reject(err)
      })
  })
}

const getBloodPressureSamples = (startDate, endDate) => {
  const dateRange = {
    startDate: startDate,
    endDate: endDate
  }
  return new Promise(async (resolve, reject) => {
    const authorization = await authorize()
    GoogleFit.getBloodPressureSamples(dateRange)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        console.warn(err)
        reject(err)
      })
  })
}

module.exports = {
  authorize: authorize,
  getDailyStepCountSamples: getDailyStepCountSamples,
  getBloodPressureSamples: getBloodPressureSamples
}
