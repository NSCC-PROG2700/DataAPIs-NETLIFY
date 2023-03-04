const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const axios = require("axios");
const MomentoCache = require("@macaines/momento-cache").default;
const headers = require("../../headers");

const MomentoAuthToken = process.env.MOMENTO_AUTH_TOKEN;
const MomentoCacheName = process.env.MOMENTO_CACHE_NAME;
const MomentoHRMBusesKey = process.env.MOMENTO_CACHE_HRMBUSES_KEY;
const HRMBusesRefreshInterval = parseInt(process.env.HRMBUSES_INTERVAL_SECONDS);
const HRMBusesProtobufUrl = process.env.HRMBUSES_PROTOBUF_URL;

const cache = new MomentoCache(MomentoAuthToken, HRMBusesRefreshInterval);

exports.handler = async function (event, context) {
  try {
    let feed;
    let busesCache = await cache.getCache(MomentoCacheName, MomentoHRMBusesKey);

    if (busesCache) {
      console.log("RETURNED BUSES CACHE FROM MOMENTO");
      feed = JSON.parse(busesCache);
    } else {
      const response = await axios.get(HRMBusesProtobufUrl, {
        responseType: "arraybuffer",
      });
      feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        response.data
      );
      await cache.setCache(
        MomentoCacheName,
        MomentoHRMBusesKey,
        JSON.stringify(feed)
      );
      console.log("RETURNED BUSES FETCH");
    }

    if (!feed.entity) {
      feed.entity = [];
    } else if (event.queryStringParameters.route !== undefined) {
      feed.entity = feed.entity.filter((entity) =>
        event.queryStringParameters.route
          .replace(" ", "")
          .split(",")
          .includes(entity.vehicle.trip.routeId)
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(feed),
    };
  } catch (err) {
    console.log(err.message);
    return {
      statusCode: 500,
    };
  }
};
