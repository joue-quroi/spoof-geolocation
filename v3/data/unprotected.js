// polyfill
navigator.geolocation = navigator.geolocation || {
  getCurrentPosition() {},
  watchPosition() {}
};

{
  class PositionError extends Error {
    constructor(code, message) {
      super();
      this.code = code;
      this.message = message;
    }
  }
  PositionError.PERMISSION_DENIED = 1;
  PositionError.POSITION_UNAVAILABLE = 2;
  PositionError.TIMEOUT = 3;

  let id = 0;
  const lazy = {
    geos: [],
    permissions: []
  };


  const root = document.documentElement;

  root.addEventListener('sp-response-geo-data', e => {
    const prefs = e.detail;

    for (const [success, error] of lazy.geos) {
      try {
        if (prefs.latitude && prefs.longitude && prefs.enabled) {
          success({
            timestamp: Date.now(),
            coords: {
              latitude: prefs.latitude,
              longitude: prefs.longitude,
              altitude: null,
              accuracy: prefs.accuracy,
              altitudeAccuracy: null,
              heading: parseInt('NaN', 10),
              velocity: null
            }
          });
        }
        else {
          error(new PositionError(PositionError.POSITION_UNAVAILABLE, 'Position unavailable'));
        }
      }
      catch (e) {}
    }
    lazy.geos.length = 0;
  });

  navigator.geolocation.getCurrentPosition = new Proxy(navigator.geolocation.getCurrentPosition, {
    apply(target, self, args) {
      lazy.geos.push(args);
      root.dispatchEvent(new Event('sp-request-geo-data'));
    }
  });

  navigator.geolocation.watchPosition = new Proxy(navigator.geolocation.watchPosition, {
    apply(target, self, args) {
      navigator.geolocation.getCurrentPosition(...args);
      id += 1;
      return id;
    }
  });

  root.addEventListener('sp-response-permission', e => {
    const prefs = e.detail;

    for (const {resolve, result} of lazy.permissions) {
      try {
        Object.defineProperty(result, 'state', {
          value: prefs.enabled ? 'granted' : 'denied'
        });
        resolve(result);
      }
      catch (e) {}
    }
    lazy.permissions.length = 0;
  });

  navigator.permissions.query = new Proxy(navigator.permissions.query, {
    apply(target, self, args) {
      return Reflect.apply(target, self, args).then(result => {
        if (args[0] && args[0].name === 'geolocation') {
          return new Promise(resolve => {
            lazy.permissions.push({resolve, result});
            root.dispatchEvent(new Event('sp-request-permission'));
          });
        }
        else {
          return result;
        }
      });
    }
  });
}
