const isFF = navigator.userAgent.includes('Firefox');

const state = active => {
  if (active) {
    self.power.classList.add('on');
    self.power.classList.remove('off');
  }
  else {
    self.power.classList.add('off');
    self.power.classList.remove('on');
  }
};

chrome.storage.local.get({
  active: true
}).then(prefs => state(prefs.active));

self.power.onclick = () => {
  const active = self.power.classList.contains('on') === false;
  chrome.storage.local.set({
    active
  });
  state(active);
};

self.refresh.onclick = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });
  if (tab) {
    chrome.tabs.reload(tab.id);
  }
};

self.reset.onclick = async () => {
  if (isFF) { // Firefox issue
    document.body.style.width = '500px';
  }

  if (confirm('Are you sure you want to reset the current geolocation?')) {
    await chrome.storage.local.set({
      latitude: -1,
      longitude: -1
    });
    self.geo.textContent = 'Will be asked';
  }

  if (isFF) {
    document.body.style.width = '200px';
  }
};

self.enabled.onchange = e => chrome.storage.local.set({
  enabled: e.target.checked
});

chrome.storage.local.get({
  latitude: -1,
  longitude: -1,
  enabled: true
}).then(prefs => {
  if (prefs.latitude !== -1 && prefs.longitude !== -1) {
    self.geo.textContent = `[${prefs.latitude}, ${prefs.longitude}]`;
  }
  self.enabled.checked = prefs.enabled;
});
