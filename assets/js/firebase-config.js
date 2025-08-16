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
