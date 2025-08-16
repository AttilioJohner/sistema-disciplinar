// assets/js/auth-guard.js
(function () {
  function isReady() {
    return (typeof firebase !== 'undefined')
      && firebase.apps && firebase.apps.length
      && typeof firebase.auth === 'function';
  }
  function onReady(cb) {
    if (isReady()) return cb();
    const t = setInterval(() => { if (isReady()) { clearInterval(t); cb(); } }, 100);
  }

  window.requireAuth = function requireAuth(opts = {}) {
    const loginPath = opts.loginPath || 'pages/login.html';
    const onAuth = typeof opts.onAuth === 'function' ? opts.onAuth : function () {};

    onReady(function () {
      firebase.auth().onAuthStateChanged(function (user) {
        if (!user) window.location.href = loginPath;
        else onAuth(user);
      });
    });
  };

  window.logout = async function logout(redirectTo) {
    await firebase.auth().signOut();
    if (redirectTo) window.location.href = redirectTo;
  };

  window.waitForAuthReady = function waitForAuthReady() {
    return new Promise((resolve) => onReady(resolve));
  };
})();
