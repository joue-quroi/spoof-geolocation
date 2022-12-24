const script = document.createElement('script');

script.addEventListener('sp-request-permission', () => chrome.storage.local.get({
  enabled: true,
  bypass: []
}, prefs => {
  script.dataset.prefs = JSON.stringify(prefs);
  script.dispatchEvent(new Event('sp-response-permission'));
}));

script.addEventListener('sp-request-geo-data', () => chrome.storage.local.get({
  latitude: -1,
  longitude: -1,
  accuracy: 64.0999,
  enabled: true,
  randomize: false,
  bypass: []
}, prefs => {
  const next = () => {
    if (prefs.randomize) {
      try {
        const m = prefs.latitude.toString().split('.')[1].length;
        prefs.latitude = prefs.latitude +
          (Math.random() > 0.5 ? 1 : -1) * prefs.randomize * Math.random();
        prefs.latitude = Number(prefs.latitude.toFixed(m));

        const n = prefs.longitude.toString().split('.')[1].length;
        prefs.longitude = prefs.longitude +
          (Math.random() > 0.5 ? 1 : -1) * prefs.randomize * Math.random();
        prefs.longitude = Number(prefs.longitude.toFixed(n));
      }
      catch (e) {
        console.warn('Cannot randomize GEO', e);
      }
    }

    script.dataset.prefs = JSON.stringify(prefs);
    script.dispatchEvent(new Event('sp-response-geo-data'));
  };

  if (prefs.latitude === -1) {
    prefs.latitude = undefined;
  }
  if (prefs.longitude === -1) {
    prefs.longitude = undefined;
  }

  if (prefs.enabled === false) {
    next();
  }
  else if (prefs.latitude && prefs.longitude) {
    next();
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

      try {
        // validate latitude
        if (!isFinite(latitude) || Math.abs(latitude) > 90) {
          throw Error('Latitude must be a number between -90 and 90');
        }
        if (!isFinite(longitude) || Math.abs(longitude) > 180) {
          throw Error('Longitude must a number between -180 and 180');
        }
        if (latitude.split('.')[1].length < 4 || longitude.split('.')[1].length < 4) {
          throw Error('The number of digits to appear after the decimal point must be greater than 4. Example: 51.507351, -0.127758');
        }

        prefs.latitude = Number(latitude);
        prefs.longitude = Number(longitude);

        chrome.storage.local.get({
          history: []
        }, ps => {
          const names = [];
          ps.history.forEach(([a, b]) => names.push(a + '|' + b));
          if (names.includes(prefs.latitude + '|' + prefs.longitude) === false) {
            ps.history.unshift([prefs.latitude, prefs.longitude]);
            prefs.history = ps.history.slice(0, 10);
          }

          chrome.storage.local.set(prefs, () => next(true));
        });
      }
      catch (e) {
        console.error(e);
        next(false);
        alert('GEO Request Denied\n\n' + e.message);
      }
    }
  }
}));

script.addEventListener('sp-bypassed', () => chrome.runtime.sendMessage({
  method: 'geo-bypassed'
}));
script.addEventListener('sp-requested', () => chrome.runtime.sendMessage({
  method: 'geo-requested',
  enabled: script.dataset.enabled === 'true'
}));


script.textContent = `
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

  const script = document.currentScript;

  const matchURL = (url, pattern) => {
    const patternParts = pattern.split('://');
    const urlParts = url.split('://');

    if (patternParts.length !== urlParts.length) {
      return false;
    }

    if (patternParts[0] !== '*' && patternParts[0] !== urlParts[0]) {
      return false;
    }

    const patternSegments = patternParts[1].split('/');
    const urlSegments = urlParts[1].split('/');

    if (patternSegments.length > urlSegments.length) {
      return false;
    }

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      const urlSegment = urlSegments[i];

      if (patternSegment === '*') {
        continue;
      }

      if (patternSegment !== urlSegment) {
        return false;
      }
    }

    return true;
  };

  const bypass = prefs => {
    for (let host of prefs.bypass) {
      try {
        // fix the formatting
        if (host.includes('://') === false) {
          host = '*://' + host;
        }
        if (host.endsWith('*') === false && host.endsWith('/') === false) {
          host += '/*';
        }

        if (typeof self.URLPattern === 'undefined') {
          if (matchURL(location.href, host)) {
            if (window.top === window) {
              script.dispatchEvent(new Event('sp-bypassed'));
            }

            return true;
          }

        }
        else {
          const pattern = new self.URLPattern(host);
          const v = pattern.test(location.href);

          if (v) {
            if (window.top === window) {
              script.dispatchEvent(new Event('sp-bypassed'));
            }

            return true;
          }
        }
      }
      catch (e) {
        console.info('Cannot use this host matching rule', host);
      }
    }

    script.dataset.enabled = prefs.enabled;
    script.dispatchEvent(new Event('sp-requested'));
    return false;
  };

  script.addEventListener('sp-response-geo-data', e => {
    const prefs = JSON.parse(script.dataset.prefs);

    // bypass
    if (bypass(prefs)) {
      for (const o of lazy.geos) {
        Reflect.apply(o.target, o.self, o.args);
      }
    }
    else {
      for (const o of lazy.geos) {
        try {
          const [success, error] = o.args;
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
    }

    lazy.geos.length = 0;
  });

  navigator.geolocation.getCurrentPosition = new Proxy(navigator.geolocation.getCurrentPosition, {
    apply(target, self, args) {
      lazy.geos.push({target, self, args});
      script.dispatchEvent(new Event('sp-request-geo-data'));
    }
  });

  navigator.geolocation.watchPosition = new Proxy(navigator.geolocation.watchPosition, {
    apply(target, self, args) {
      navigator.geolocation.getCurrentPosition(...args);
      id += 1;
      return id;
    }
  });

  script.addEventListener('sp-response-permission', e => {
    const prefs = JSON.parse(script.dataset.prefs);

    const b = bypass(prefs);

    for (const {resolve, result} of lazy.permissions) {
      try {
        if (!b) {
          Object.defineProperty(result, 'state', {
            value: prefs.enabled ? 'granted' : 'denied'
          });
        }

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
            script.dispatchEvent(new Event('sp-request-permission'));
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
if (document.contentType && document.contentType.endsWith('xml') === false) {
  document.documentElement.append(script);
}

