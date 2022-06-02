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
chrome.contextMenus.onClicked.addListener((info, tab) => {
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
      url: 'https://webbrowsertools.com/geolocation/',
      index: tab.index
    });
  }
});
chrome.runtime.onStartup.addListener(context);
chrome.runtime.onInstalled.addListener(context);

chrome.browserAction.onClicked.addListener(tab => chrome.tabs.create({
  url: 'https://webbrowsertools.com/geolocation/',
  index: tab.index
}));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
