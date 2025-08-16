// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

// Configuração e inicialização do Firebase + Firestore (compat)
// 1) Substitua os valores abaixo pelos do seu projeto Firebase
// 2) GARANTA regras de segurança no Firestore (exigir request.auth != null)
// 3) Habilite um provedor de autenticação (Email/Senha ou Google)

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SUA_APP_ID"
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
