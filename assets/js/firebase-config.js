// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

// Configuração e inicialização do Firebase + Firestore (compat)
// 1) Substitua os valores abaixo pelos do seu projeto Firebase
// 2) GARANTA regras de segurança no Firestore (exigir request.auth != null)
// 3) Habilite um provedor de autenticação (Email/Senha ou Google)

const firebaseConfig = {
  apiKey: "AIzaSyD7V1GCtmteP_ccenLKJDhvzOsT1QlWdxg",
  authDomain: "sistema-disciplinar.firebaseapp.com",
  projectId: "sistema-disciplinar",
  storageBucket: "sistema-disciplinar.firebasestorage.app",
  messagingSenderId: "916562716910",
  appId: "1:916562716910:web:ac5c0b328cc3087489ebff",
  measurementId: "G-THVTKDV4LF"
};

// Inicializa (compat)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;

// Helpers globais
window.db = db;
window.isFirebaseReady = () =>
  (typeof firebase !== 'undefined') && !!db;
<!-- Firebase (app/auth compat) + sua config devem estar carregados antes -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="assets/js/firebase-config.js"></script>

<!-- Guard reutilizável -->
<script src="assets/js/auth-guard.js"></script>

<!-- Seus scripts -->
<script src="assets/js/main.js" defer></script>

<script>
  // Protege a página e, quando logado, carrega o dashboard e liga o botão Sair
  document.addEventListener('DOMContentLoaded', () => {
    requireAuth({
      loginPath: 'pages/login.html',
      onAuth: (user) => {
        // Aqui você coloca o que precisa rodar apenas logado:
        if (typeof carregarEstatisticasDashboard === 'function') {
          carregarEstatisticasDashboard();
        }
        const btn = document.getElementById('btnLogout');
        if (btn) btn.addEventListener('click', () => logout('pages/login.html'));
      }
    });
  });
</script>
