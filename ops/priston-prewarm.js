// VelluM Classic: prepare the most common first-run assets in the background.
// This is capped to the character selection and Ricarten assets (about 45MB).
// No blocking of login: files arrive in Cache Storage as the game is running.
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && (connection.saveData || /(^|-)2g/.test(connection.effectiveType || ''))) return;
  var started = false;
  function begin() {
    if (started) return;
    started = true;
    navigator.serviceWorker.ready.then(async function () {
      if (!navigator.serviceWorker.controller) return;
      var response = await fetch('data_manifest.txt');
      if (!response.ok) return;
      var data = await response.text(), names = [], bytes = 0;
      var prefixes = ['cSelect/', 'Field/Ricarten/'];
      for (var k = 0; k < prefixes.length; k++) {
        var prefix = prefixes[k];
        for (var line of data.split('\n')) {
          var fields = line.split('\t');
          if (fields.length < 3 || !fields[0].startsWith(prefix)) continue;
          var size = Number(fields[1]) || 0;
          if (bytes + size > 52 * 1024 * 1024) break;
          names.push(fields[0]);
          bytes += size;
        }
      }
      if (!names.length) return;
      await fetch('__pt_prefetch', {
        method: 'POST',
        body: names.join('\n'),
        headers: { 'Content-Type': 'text/plain' }
      });
      console.info('[VelluM] Preparing first areas in the background:', names.length, 'files');
    }).catch(function (e) { console.warn('[VelluM] Prefetch skipped:', String(e)); });
  }
  // Avoid competing with the 84 MB start-up pack on the first visit.
  var watch = setInterval(function () {
    var status = document.getElementById('status');
    if (!status || status.textContent.trim() !== 'Running') return;
    clearInterval(watch);
    setTimeout(begin, 3000);
  }, 1200);
  setTimeout(function () { clearInterval(watch); }, 180000);
})();