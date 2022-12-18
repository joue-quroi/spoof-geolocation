/* global tld */

self.importScripts('tld.js');

const context = () => chrome.storage.local.get({
  enabled: true,
  history: [],
  randomize: false,
  accuracy: 64.0999
}, prefs => {
  chrome.contextMenus.create({
    title: 'Allow/Disallow GEO requests',
    id: 'enabled',
    contexts: ['action'],
    type: 'checkbox',
    checked: prefs.enabled
  });
  chrome.contextMenus.create({
    title: 'Reset GEO data (ask for new values on first request)',
    id: 'reset',
    contexts: ['action']
  });
  chrome.contextMenus.create({
    title: 'Test GEO location',
    id: 'test',
    contexts: ['action']
  });
  chrome.contextMenus.create({
    title: 'Options',
    id: 'options',
    contexts: ['action']
  });
  chrome.contextMenus.create({
    title: 'Randomize',
    id: 'randomize',
    contexts: ['action'],
    parentId: 'options'
  });
  chrome.contextMenus.create({
    title: 'Disabled',
    id: 'randomize:false',
    contexts: ['action'],
    checked: prefs.randomize === false,
    type: 'radio',
    parentId: 'randomize'
  });
  chrome.contextMenus.create({
    title: '0.1',
    id: 'randomize:0.1',
    contexts: ['action'],
    checked: prefs.randomize === 0.1,
    type: 'radio',
    parentId: 'randomize'
  });
  chrome.contextMenus.create({
    title: '0.01',
    id: 'randomize:0.01',
    contexts: ['action'],
    checked: prefs.randomize === 0.01,
    type: 'radio',
    parentId: 'randomize'
  });
  chrome.contextMenus.create({
    title: '0.001',
    id: 'randomize:0.001',
    contexts: ['action'],
    checked: prefs.randomize === 0.001,
    type: 'radio',
    parentId: 'randomize'
  });
  chrome.contextMenus.create({
    title: '0.0001',
    id: 'randomize:0.0001',
    contexts: ['action'],
    checked: prefs.randomize === 0.0001,
    type: 'radio',
    parentId: 'randomize'
  });
  chrome.contextMenus.create({
    title: '0.00001',
    id: 'randomize:0.00001',
    contexts: ['action'],
    checked: prefs.randomize === 0.00001,
    type: 'radio',
    parentId: 'randomize'
  });
  chrome.contextMenus.create({
    title: 'Accuracy',
    id: 'accuracy',
    contexts: ['action'],
    parentId: 'options'
  });
  chrome.contextMenus.create({
    title: '64.0999',
    id: 'accuracy:64.0999',
    contexts: ['action'],
    checked: prefs.accuracy === 64.0999,
    type: 'radio',
    parentId: 'accuracy'
  });
  chrome.contextMenus.create({
    title: '34.0999',
    id: 'accuracy:34.0999',
    contexts: ['action'],
    checked: prefs.accuracy === 34.0999,
    type: 'radio',
    parentId: 'accuracy'
  });
  chrome.contextMenus.create({
    title: '10.0999',
    id: 'accuracy:10.0999',
    contexts: ['action'],
    checked: prefs.accuracy === 10.0999,
    type: 'radio',
    parentId: 'accuracy'
  });
  chrome.contextMenus.create({
    title: 'GEO History',
    id: 'history',
    contexts: ['action'],
    visible: prefs.history.length !== 0,
    parentId: 'options'
  });
  for (const [a, b] of prefs.history) {
    chrome.contextMenus.create({
      title: a + ', ' + b,
      id: 'set:' + a + '|' + b,
      contexts: ['action'],
      parentId: 'history',
      type: 'radio',
      checked: prefs.latitude === a && prefs.longitude === b
    });
  }
  chrome.contextMenus.create({
    title: 'Bypass Spoofing',
    id: 'bypass',
    contexts: ['action'],
    parentId: 'options'
  });
  chrome.contextMenus.create({
    title: 'Add to the Exception List',
    id: 'add-exception',
    contexts: ['action'],
    parentId: 'bypass'
  });
  chrome.contextMenus.create({
    title: 'Remove from the Exception List',
    id: 'remove-exception',
    contexts: ['action'],
    parentId: 'bypass'
  });
  chrome.contextMenus.create({
    title: 'Open Exception List in Editor',
    id: 'exception-editor',
    contexts: ['action'],
    parentId: 'bypass'
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
      index: tab.index + 1
    });
  }
  else if (info.menuItemId.startsWith('set:')) {
    const [latitude, longitude] = info.menuItemId.slice(4).split('|').map(Number);
    chrome.storage.local.set({
      latitude,
      longitude
    });
  }
  else if (info.menuItemId === 'randomize:false') {
    chrome.storage.local.set({randomize: false});
  }
  else if (info.menuItemId.startsWith('randomize:')) {
    chrome.storage.local.set({
      randomize: parseFloat(info.menuItemId.slice(10))
    });
  }
  else if (info.menuItemId.startsWith('accuracy:')) {
    chrome.storage.local.set({
      accuracy: parseFloat(info.menuItemId.slice(9))
    });
  }
  else if (info.menuItemId === 'add-exception') {
    const url = tab.url;

    if (url.startsWith('http')) {
      chrome.storage.local.get({
        bypass: []
      }, prefs => {
        const d = tld.getDomain(tab.url);

        const hosts = new Set(prefs.bypass);
        hosts.add(d);
        hosts.add('*.' + d);
        console.info('adding', d, '*.' + d, 'to the exception list');

        chrome.storage.local.set({
          bypass: [...hosts]
        });
      });
    }
  }
  else if (info.menuItemId === 'remove-exception') {
    const url = tab.url;

    if (url.startsWith('http')) {
      chrome.storage.local.get({
        bypass: []
      }, prefs => {
        const d = tld.getDomain(tab.url);

        console.info('removing', d, '*.' + d, 'from the exception list');

        chrome.storage.local.set({
          bypass: prefs.bypass.filter(m => m !== d && m !== '*.' + d)
        });
      });
    }
  }
  else if (info.menuItemId === 'exception-editor') {
    const msg = `Insert one hostname per line. Press the "Save List" button to update the list.

Example of valid formats:

  example.com
  *.example.com
  https://example.com/*
  *://*.example.com/*`;
    chrome.windows.getCurrent(win => {
      chrome.windows.create({
        url: 'data/editor/index.html?msg=' + encodeURIComponent(msg) + '&storage=bypass',
        width: 600,
        height: 600,
        left: win.left + Math.round((win.width - 600) / 2),
        top: win.top + Math.round((win.height - 600) / 2),
        type: 'popup'
      });
    });
  }
});
chrome.runtime.onStartup.addListener(context);
chrome.runtime.onInstalled.addListener(context);

chrome.storage.onChanged.addListener(ps => {
  if (ps.history) {
    chrome.storage.local.get({
      latitude: -1,
      longitude: -1
    }, async prefs => {
      for (const [a, b] of ps.history.oldValue || []) {
        await chrome.contextMenus.remove('set:' + a + '|' + b);
      }
      for (const [a, b] of ps.history.newValue || []) {
        await chrome.contextMenus.create({
          title: a + ', ' + b,
          id: 'set:' + a + '|' + b,
          contexts: ['action'],
          parentId: 'history',
          type: 'radio',
          checked: a === prefs.latitude && b === prefs.longitude
        });
      }
      chrome.contextMenus.update('history', {
        visible: ps.history.newValue.length !== 0
      });
    });
  }
  else if (ps.latitude || ps.longitude) {
    chrome.storage.local.get({
      latitude: -1,
      longitude: -1
    }, prefs => {
      chrome.contextMenus.update('set:' + prefs.latitude + '|' + prefs.longitude, {
        checked: true
      });
    });
  }
});
