// Sistema de Autenticação Local (substitui Firebase Auth)
class LocalAuth {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  // Fazer login
  async signInWithEmailAndPassword(email, password) {
    return new Promise((resolve, reject) => {
      // Simular delay de rede
      setTimeout(() => {
        // Login básico para desenvolvimento
        if ((email === 'admin@escola.com' && password === 'admin123') || 
            (email === 'admin' && password === 'admin123')) {
          
          this.currentUser = {
            uid: 'admin-user',
            email: 'admin@escola.com',
            displayName: 'Administrador',
            emailVerified: true,
            updatePassword: async (newPassword) => {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (newPassword && newPassword.length >= 6) {
                    console.log('🔒 Senha atualizada (simulado)');
                    resolve();
                  } else {
                    reject(new Error('Senha deve ter pelo menos 6 caracteres'));
                  }
                }, 500);
              });
            }
          };
          
          this.isAuthenticated = true;
          
          // Salvar no localStorage
          localStorage.setItem('localAuth', JSON.stringify({
            user: this.currentUser,
            timestamp: Date.now()
          }));
          
          console.log('✅ Login realizado com sucesso');
          resolve({ user: this.currentUser });
        } else {
          reject(new Error('Email ou senha incorretos'));
        }
      }, 500);
    });
  }

  // Fazer logout
  async signOut() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('localAuth');
    console.log('🚪 Logout realizado');
    return Promise.resolve();
  }

  // Verificar se usuário está logado
  getCurrentUser() {
    return this.currentUser;
  }

  // Listener para mudanças de autenticação
  onAuthStateChanged(callback) {
    // Verificar se há sessão salva
    const savedAuth = localStorage.getItem('localAuth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        
        // Verificar se não expirou (24 horas)
        const isExpired = (Date.now() - authData.timestamp) > (24 * 60 * 60 * 1000);
        
        if (!isExpired) {
          this.currentUser = {
            ...authData.user,
            updatePassword: async (newPassword) => {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (newPassword && newPassword.length >= 6) {
                    console.log('🔒 Senha atualizada (simulado)');
                    resolve();
                  } else {
                    reject(new Error('Senha deve ter pelo menos 6 caracteres'));
                  }
                }, 500);
              });
            }
          };
          this.isAuthenticated = true;
          callback(this.currentUser);
          return;
        } else {
          localStorage.removeItem('localAuth');
        }
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
        localStorage.removeItem('localAuth');
      }
    }
    
    callback(null);
  }

  // Definir persistência (compatibilidade Firebase)
  async setPersistence(persistence) {
    // No sistema local, sempre persiste no localStorage
    return Promise.resolve();
  }

  // Redefinição de senha (simulada)
  async sendPasswordResetEmail(email) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'admin@escola.com' || email === 'admin') {
          console.log('📧 Email de redefinição enviado (simulado)');
          resolve();
        } else {
          reject(new Error('Email não encontrado'));
        }
      }, 500);
    });
  }

  // Criar usuário (para futuras implementações)
  async createUserWithEmailAndPassword(email, password) {
    return Promise.reject(new Error('Criação de usuários não implementada'));
  }
}

// Inicializar autenticação local
const localAuth = new LocalAuth();

// Compatibilidade com código existente do Firebase Auth
window.firebase = window.firebase || {};
window.firebase.auth = () => localAuth;

// Constantes de persistência para compatibilidade
window.firebase.auth.Auth = {
  Persistence: {
    LOCAL: 'local',
    SESSION: 'session',
    NONE: 'none'
  }
};

// Função requireAuth compatível
window.requireAuth = function(options = {}) {
  const loginPath = options.loginPath || 'login.html';
  const onAuth = options.onAuth || (() => {});
  
  localAuth.onAuthStateChanged((user) => {
    if (user) {
      onAuth(user);
    } else {
      // Redirecionar para login se não estiver na página de login
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = loginPath;
      }
    }
  });
};

// Expor para uso global
window.localAuth = localAuth;