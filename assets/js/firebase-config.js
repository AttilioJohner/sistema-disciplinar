// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

const firebaseConfig = {
    // Substitua pelas suas configurações do Firebase
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

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
