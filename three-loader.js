/* CDN loader: pinned Three.js r160 UMD build, with fallbacks. */
(function(){
  var srcs = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js',
    'https://unpkg.com/three@0.160.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'
  ];
  var booted = false;
  function fail() {
    if (booted) return;
    document.getElementById('loaderr').classList.remove('hidden');
    document.getElementById('title').classList.add('hidden');
  }
  function next(i) {
    if (i >= srcs.length) { fail(); return; }
    var s = document.createElement('script');
    s.src = srcs[i];
    s.onload = function() {
      if (window.THREE) {
        try { bootGame(); booted = (window.__emberwatchBooted === true); }
        catch (e) { fail(); return; }
        if (!booted) next(i + 1);
      } else next(i + 1);
    };
    s.onerror = function() { next(i + 1); };
    document.head.appendChild(s);
  }
  next(0);
  // last resort: if the CDN hangs entirely, show the error after 25s
  setTimeout(function(){ if (!window.__emberwatchBooted) fail(); }, 25000);
})();
