const axios = require("axios");
const MomentoCache = require("@macaines/momento-cache").default;
const headers = require("../../headers");
const openskyManager = require("../../services/openskyManager");

const MomentoAuthToken = process.env.MOMENTO_AUTH_TOKEN;
const MomentoCacheName = process.env.MOMENTO_CACHE_NAME;
const MomentoOpenskyKey = process.env.MOMENTO_CACHE_OPENSKY_KEY;
const OpenskyRefreshInterval = parseInt(process.env.OPENSKY_INTERVAL_SECONDS);
const OpenskyAPIEndpointURL = process.env.OPENSKY_API_ENDPOINT;

const cache = new MomentoCache(MomentoAuthToken, OpenskyRefreshInterval);

// //THIS CODE IS IMPLEMENTED FOR OTHER PLATFORMS BUT WON'T WORK WITH 
// //NETLIFY FUNCTIONS BECAUSE EACH FUNCTION INVOCATION IS
// //COMPLETELY ISOLATED FROM THE OTHER...KEEPING HERE FOR POSTERITY
// //BUT IT DOESN'T WORK WITH SERVERLESS FUNCTIONS
// let fetchInProgress = false;
// const untilAnyExistingDataFetchFinishes = (clientIP) => {
//   return new Promise((resolve, reject) => {
//     const checkIfFetchInProgress = () => {
//       if (fetchInProgress) {
//         console.log(`${clientIP} - WAITING FOR EXISTING FETCH TO FINISH`);
//         setTimeout(checkIfFetchInProgress, 500);
//       } else {
//         resolve();
//       }
//     };
//     checkIfFetchInProgress();
//   });
// };

exports.handler = async function (event, context) {
  try {
    //DOESN'T WORK WITH NETLIFY FUNCTIONS
    //when we arrive here, it is possible that another request
    //has already triggered a fetch for new data which is still in progress
    //to avoid a second, unnecessary duplicate fetch...
    //wait for current fetch to finish if necessary
    //and for the newly fetched data to be cached before proceeding

    //await untilAnyExistingDataFetchFinishes(event.headers["x-nf-client-connection-ip"]); //checks every .5 seconds for existing data fetch to be completed

    let openskyCache = await cache.getCache(
      MomentoCacheName,
      MomentoOpenskyKey
    );

    if (openskyCache) {
      console.log("RETURNED OPENSKY CACHE FROM MOMENTO");
      return {
        statusCode: 200,
        headers,
        body: openskyCache,
      };
    } else {
      //fetchInProgress = true;
      const credentials = await openskyManager.getActiveCredentials();
      const response = await axios.get(OpenskyAPIEndpointURL, {
        auth: {
          username: credentials.username,
          password: credentials.password,
        },
      });

      console.log("CACHING TO MOMENTO");
      await cache.setCache(
        MomentoCacheName,
        MomentoOpenskyKey,
        JSON.stringify(response.data)
      );
      console.log(event.headers);
      console.log(
        `${event.headers["x-nf-client-connection-ip"]} - RETURNED OPENSKY FETCH - Account: ${credentials.username} - ${response.headers["x-rate-limit-remaining"]} fetches remaining`
      );

      if (response.headers["x-rate-limit-remaining"] <= 0) {
        openskyManager.switchToNextAccount().catch((err) => {
          console.log(`ERROR: Unable to switch accounts`);
          console.log(err);
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data),
      };
    }
  } catch (err) {
    if (err.response?.status === 429) {
      openskyManager.switchToNextAccount().catch((err) => {
        console.log(`ERROR: Unable to switch accounts`);
        console.log(err);
      });
      return {
        statusCode: 429,
        body: JSON.stringify({
          message: "Unable to retrieve data. Try again. ",
        }),
      };
    }
    return {
      statusCode: 500,
    };
  } finally {
    //reset flag in case it was set to true
    //fetchInProgress = false;
  }
};
