const script = document.createElement('script');

script.addEventListener('permission', () => chrome.storage.local.get({
  enabled: true
}, prefs => {
  script.dataset.enabled = prefs.enabled;
  script.dispatchEvent(new Event('resolve-permissions'));
}));
script.addEventListener('ask', () => chrome.storage.local.get({
  latitude: -1,
  longitude: -1,
  enabled: true
}, prefs => {
  const next = enabled => {
    script.dataset.latitude = prefs.latitude;
    script.dataset.longitude = prefs.longitude;
    script.dataset.enabled = prefs.enabled;

    script.dispatchEvent(new Event('resolve-geos'));

    chrome.runtime.sendMessage({
      method: 'geo-requested',
      enabled
    });
  };

  if (prefs.latitude === -1) {
    prefs.latitude = undefined;
  }
  if (prefs.longitude === -1) {
    prefs.longitude = undefined;
  }

  if (prefs.enabled === false) {
    next(false);
  }
  else if (prefs.latitude && prefs.longitude) {
    next(true);
  }
  else {
    const r = prompt(`Enter your spoofed "latitude" and "longitude" (e.g. values for London, UK)

The number of digits to appear after the decimal point must be greater than 4
Use https://www.latlong.net/ to find these values`, '51.507351, -0.127758');

    if (r === null) {
      next(false);
    }
    else {
      const [latitude, longitude] = r.split(/\s*,\s*/);

      if (
        latitude && latitude.split('.')[1].length > 3 && isNaN(latitude) === false &&
        longitude && longitude.split('.')[1].length > 3 && isNaN(longitude) === false
      ) {
        prefs.latitude = Number(Number(latitude).toFixed(6));
        prefs.longitude = Number(Number(longitude).toFixed(6));

        chrome.storage.local.set(prefs, () => next(true));
      }
      else {
        alert('Error: The number of digits to appear after the decimal point must be greater than 4. Example: 51.507351, -0.127758');

        next(false);
      }
    }
  }
}));

script.textContent = `
  navigator.geolocation = navigator.geolocation || {
    getCurrentPosition() {},
    watchPosition() {}
  };

  {
    const script = document.currentScript;

    function PositionError(code, message) {
      this.code = code;
      this.message = message;
    }
    PositionError.PERMISSION_DENIED = 1;
    PositionError.POSITION_UNAVAILABLE = 2;
    PositionError.TIMEOUT = 3;
    PositionError.prototype = new Error();

    let id = 0;
    let callbacks = {
      geo: [],
      permission: []
    };

    script.addEventListener('resolve-geos', e => {
      const prefs = {
        latitude: Number(script.dataset.latitude),
        longitude: Number(script.dataset.longitude),
        enabled: script.dataset.enabled === 'true'
      };

      for (const [success, error] of callbacks.geo) {
        try {
          if (prefs.latitude && prefs.longitude && prefs.enabled) {
            success({
              timestamp: Date.now(),
              coords: {
                latitude: prefs.latitude,
                longitude: prefs.longitude,
                altitude: null,
                accuracy: 64.0999,
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
      callbacks.geo.length = 0;
    });

    navigator.geolocation.getCurrentPosition = new Proxy(navigator.geolocation.getCurrentPosition, {
      apply(target, self, args) {
        callbacks.geo.push(args)
        script.dispatchEvent(new Event('ask'));
      }
    });

    navigator.geolocation.watchPosition = new Proxy(navigator.geolocation.watchPosition, {
      apply(target, self, args) {
        navigator.geolocation.getCurrentPosition(...args);
        id += 1;
        return id;
      }
    });

    script.addEventListener('resolve-permissions', e => {
      const prefs = {
        enabled: script.dataset.enabled === 'true'
      };

      for (const {resolve, result} of callbacks.permission) {
        try {
          Object.defineProperty(result, 'state', {
            value: prefs.enabled ? 'granted' : 'denied'
          });
          resolve(result);
        }
        catch (e) {}
      }
      callbacks.permission.length = 0;
    });

    navigator.permissions.query = new Proxy(navigator.permissions.query, {
      apply(target, self, args) {
        return Reflect.apply(target, self, args).then(result => {

          if (args[0] && args[0].name === 'geolocation') {
            return new Promise(resolve => {
              callbacks.permission.push({resolve, result});
              script.dispatchEvent(new Event('permission'));
            });
          }
          else {
            return result;
          }
        });
      }
    });
  }
`;
document.documentElement.appendChild(script);

