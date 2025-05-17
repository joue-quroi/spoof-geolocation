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

  const bypass = prefs => {
    for (let host of prefs.bypass) {
      try {
        let v;
        if (typeof URLPattern === 'undefined') {
          v = location.host.includes(host);
        }
        else {
          // fix the formatting
          if (host.includes('://') === false) {
            host = '*://' + host;
          }
          if (host.endsWith('*') === false && host.endsWith('/') === false) {
            host += '/*';
          }

          const pattern = new self.URLPattern(host);
          v = pattern.test(location.href);
        }

        if (v) {
          if (window.top === window) {
            root.dispatchEvent(new Event('sp-bypassed'));
          }

          return true;
        }
      }
      catch (e) {
        console.info('Cannot use this host matching rule', host);
      }
    }

    root.dispatchEvent(new CustomEvent('sp-requested', {
      detail: prefs.enabled
    }));
    return false;
  };

  const root = document.documentElement;

  root.addEventListener('sp-response-geo-data', e => {
    const prefs = e.detail;

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
