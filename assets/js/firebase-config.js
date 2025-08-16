// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

const firebaseConfig = {
    // Substitua pelas suas configurações do Firebase
   const firebaseConfig = {
  apiKey: "AIzaSyCaD2QFSUsr85ASm6IM_mCN6pAm9Vw0B40",
  authDomain: "controle-disciplinar.firebaseapp.com",
  projectId: "controle-disciplinar",
  storageBucket: "controle-disciplinar.firebasestorage.app",
  messagingSenderId: "301814043852",
  appId: "1:301814043852:web:0b648d9c3c424a5146de69"
};

// Inicializa (compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Helpers globais (se você usa em outros arquivos)
window.db = db;
window.isFirebaseReady = () =>
  typeof firebase !== 'undefined' && typeof db !== 'undefined';

// Variável global para o banco de dados
let db;

// Inicializar Firebase
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('🔥 Firebase conectado com sucesso!');
} catch (error) {
    console.error('Erro ao conectar Firebase:', error);
    if (typeof showMessage === 'function') {
        showMessage('⚠️ Erro ao conectar com o banco de dados', 'error');
    }
}

// ============================================
// FUNÇÕES FIREBASE AUXILIARES
// ============================================

// Testar conexão com Firebase
async function testarConexaoFirebase() {
    try {
        await db.collection('teste').limit(1).get();
        return true;
    } catch (error) {
        console.error('Erro na conexão Firebase:', error);
        return false;
    }
}

// Verificar se Firebase está pronto
function isFirebaseReady() {
    return typeof firebase !== 'undefined' && db !== undefined;
}

// Exportar configurações para uso global
window.firebaseConfig = firebaseConfig;
window.db = db;
window.isFirebaseReady = isFirebaseReady;
window.testarConexaoFirebase = testarConexaoFirebase;
