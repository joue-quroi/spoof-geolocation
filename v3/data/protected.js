const root = document.documentElement;

root.addEventListener('sp-request-permission', async () => {
  const prefs = await chrome.storage.local.get({
    enabled: true,
    bypass: []
  });
  root.dispatchEvent(new CustomEvent('sp-response-permission', {
    detail: prefs
  }));
});

const save = async r => {
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
      throw Error('At least 5 digits must appear after the decimal point. Example: 51.507351, -0.127758');
    }

    const prefs = {
      latitude: Number(latitude),
      longitude: Number(longitude)
    };

    const ps = await chrome.storage.local.get({
      history: []
    });
    const names = [];
    ps.history.forEach(([a, b]) => names.push(a + '|' + b));
    if (names.includes(prefs.latitude + '|' + prefs.longitude) === false) {
      ps.history.unshift([prefs.latitude, prefs.longitude]);
      prefs.history = ps.history.slice(0, 10);
    }

    await chrome.storage.local.set(prefs);

    return prefs;
  }
  catch (e) {
    console.error(e);
    alert('GEO Request Denied\n\n' + e.message);
  }
};

const respond = async () => {
  if (respond.busy) {
    return;
  }
  respond.busy = true;

  const prefs = await chrome.storage.local.get({
    latitude: -1,
    longitude: -1,
    accuracy: 64.0999,
    enabled: true,
    randomize: false,
    bypass: []
  });
  if (prefs.latitude === -1) {
    prefs.latitude = undefined;
  }
  if (prefs.longitude === -1) {
    prefs.longitude = undefined;
  }

  if (prefs.enabled) {
    if (!prefs.latitude || !prefs.longitude) {
      const msg = 'Enter your spoofed "latitude" and "longitude" values. ' +
        'Ensure at least 5 digits follow the decimal point. ' +
        'Use "https://webbrowsertools.com/geolocation/" to find the values.';
      const r = prompt(msg, '51.507351, -0.127758');
      if (r) {
        const ps = await save(r);
        Object.assign(prefs, ps);
      }
    }
  }

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
  respond.busy = false;
};
respond.busy = false;

root.addEventListener('sp-request-geo-data', () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', respond);
  }
  else {
    respond();
  }
});

root.addEventListener('sp-bypassed', () => chrome.runtime.sendMessage({
  method: 'geo-bypassed'
}));
root.addEventListener('sp-requested', e => chrome.runtime.sendMessage({
  method: 'geo-requested',
  enabled: e.detail
}));


// accept configuration from "webbrowsertools"
if (location.href && location.href.startsWith('https://webbrowsertools.com/geolocation/')) {
  addEventListener('message', e => {
    if (e.data && e.data.method === 'configure-geolocation') {
      setTimeout(() => top.postMessage({
        method: 'configuration-accepted'
      }, '*'), 750);
      save(e.data.geo).catch(e => {
        console.error(e);
        alert(e.message);
      });
    }
  });
}
