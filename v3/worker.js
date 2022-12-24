self.importScripts('context.js');

chrome.runtime.onMessage.addListener((request, sender) => {
  console.log(request);

  if (request.method === 'geo-requested') {
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        '16': 'data/icons/' + (request.enabled ? 'granted' : 'denied') + '/16.png',
        '32': 'data/icons/' + (request.enabled ? 'granted' : 'denied') + '/32.png',
        '48': 'data/icons/' + (request.enabled ? 'granted' : 'denied') + '/48.png'
      }
    });
    chrome.action.setTitle({
      tabId: sender.tab.id,
      title: request.enabled ? 'GEO is spoofed on this page' : 'GEO request is denied'
    });
  }
  else if (request.method === 'geo-bypassed') {
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        '16': 'data/icons/bypassed/16.png',
        '32': 'data/icons/bypassed/32.png',
        '48': 'data/icons/bypassed/48.png'
      }
    });
    chrome.action.setTitle({
      tabId: sender.tab.id,
      title: 'Spoofing is bypassed. This website is in the exception list'
    });
  }
});

const activate = () => chrome.storage.local.get({
  active: true
}, async prefs => {
  await chrome.scripting.unregisterContentScripts();
  if (prefs.active) {
    await chrome.scripting.registerContentScripts([{
      'id': 'unprotected',
      'matches': ['*://*/*'],
      'excludeMatches': ['*://*/*.xml'],
      'allFrames': true,
      'matchOriginAsFallback': true,
      'runAt': 'document_start',
      'js': ['/data/unprotected.js'],
      'world': 'MAIN'
    }, {
      'id': 'protected',
      'matches': ['*://*/*'],
      'excludeMatches': ['*://*/*.xml'],
      'allFrames': true,
      'matchOriginAsFallback': true,
      'runAt': 'document_start',
      'js': ['/data/protected.js'],
      'world': 'ISOLATED'
    }]);
  }
});
chrome.runtime.onStartup.addListener(activate);
chrome.runtime.onInstalled.addListener(activate);

chrome.action.onClicked.addListener(tab => chrome.tabs.create({
  url: 'https://webbrowsertools.com/geolocation/',
  index: tab.index + 1
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
