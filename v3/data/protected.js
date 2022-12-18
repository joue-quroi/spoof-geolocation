const root = document.documentElement;

root.addEventListener('sp-request-permission', () => chrome.storage.local.get({
  enabled: true,
  bypass: []
}, prefs => root.dispatchEvent(new CustomEvent('sp-response-permission', {
  detail: prefs
}))));

root.addEventListener('sp-request-geo-data', () => chrome.storage.local.get({
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

    root.dispatchEvent(new CustomEvent('sp-response-geo-data', {
      detail: prefs
    }));
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

root.addEventListener('sp-bypassed', () => chrome.runtime.sendMessage({
  method: 'geo-bypassed'
}));
root.addEventListener('sp-requested', e => chrome.runtime.sendMessage({
  method: 'geo-requested',
  enabled: e.detail
}));
