const root = document.documentElement;

root.addEventListener('sp-request-permission', () => chrome.storage.local.get({
  enabled: true
}, prefs => root.dispatchEvent(new CustomEvent('sp-response-permission', {
  detail: prefs
}))));

root.addEventListener('sp-request-geo-data', () => chrome.storage.local.get({
  latitude: -1,
  longitude: -1,
  accuracy: 64.0999,
  enabled: true,
  randomize: false
}, prefs => {
  const next = enabled => {
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
      else {
        alert('Error: The number of digits to appear after the decimal point must be greater than 4. Example: 51.507351, -0.127758');

        next(false);
      }
    }
  }
}));
