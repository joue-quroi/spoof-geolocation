chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'geo-requested') {
    chrome.browserAction.setIcon({
      tabId: sender.tab.id,
      path: {
        '16': 'data/icons/' + (request.enabled ? 'granted' : 'denied') + '/16.png',
        '32': 'data/icons/' + (request.enabled ? 'granted' : 'denied') + '/32.png',
        '48': 'data/icons/' + (request.enabled ? 'granted' : 'denied') + '/48.png'
      }
    });
    chrome.browserAction.setTitle({
      tabId: sender.tab.id,
      title: request.enabled ? 'GEO is spoofed on this page' : 'GEO request is denied'
    });
  }
});

const context = () => chrome.storage.local.get({
  enabled: true
}, prefs => {
  chrome.contextMenus.create({
    title: 'Allow/Disallow GEO requests',
    id: 'enabled',
    contexts: ['browser_action'],
    type: 'checkbox',
    checked: prefs.enabled
  });
  chrome.contextMenus.create({
    title: 'Reset GEO data (ask for new values on first request)',
    id: 'reset',
    contexts: ['browser_action']
  });
  chrome.contextMenus.create({
    title: 'Test GEO location',
    id: 'test',
    contexts: ['browser_action']
  });
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'reset') {
    chrome.storage.local.set({
      latitude: -1,
      longitude: -1
    });
  }
  else if (info.menuItemId === 'enabled') {
    chrome.storage.local.set({
      enabled: info.checked
    });
  }
  else if (info.menuItemId === 'test') {
    chrome.tabs.create({
      url: 'https://webbrowsertools.com/geolocation/'
    });
  }
});
chrome.runtime.onStartup.addListener(context);
chrome.runtime.onInstalled.addListener(context);
