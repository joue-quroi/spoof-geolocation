const args = new URLSearchParams(location.search);

document.getElementById('msg').textContent = args.get('msg');

const key = args.get('storage');

chrome.storage.local.get({
  [key]: []
}, prefs => {
  console.log(prefs);
  document.getElementById('editor').value = prefs[key].join('\n');
});

document.querySelector('form').onsubmit = e => {
  e.preventDefault();
  chrome.storage.local.set({
    [key]: document.getElementById('editor').value.split('\n').filter((s, i, l) => {
      return s.trim() && l.indexOf(s) === i;
    })
  }, () => {
    const e = document.getElementById('save');
    e.value = 'List Saved!';

    setTimeout(() => e.value = 'Save List', 750);
  });
};
