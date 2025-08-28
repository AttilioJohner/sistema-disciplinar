// Sistema de Banco de Dados Local usando JSON
class LocalDatabase {
  constructor() {
    this.data = null;
    this.loaded = false;
    this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? '../data/db.json' 
      : 'https://raw.githubusercontent.com/AttilioJohner/sistema-disciplinar-revisado/main/data/db.json';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  // Carregar dados do localStorage primeiro, depois do arquivo JSON como backup
=======
  // Carregar dados do arquivo JSON
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
  // Carregar dados do localStorage primeiro, depois do arquivo JSON como backup
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
  async loadData() {
    try {
      console.log('🔄 Carregando banco de dados local...');
      
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
      // Primeiro tenta carregar do localStorage
      const localData = localStorage.getItem('db');
      if (localData) {
        try {
          this.data = JSON.parse(localData);
          this.loaded = true;
          
          console.log('✅ Banco de dados local carregado do localStorage:', {
            alunos: Object.keys(this.data.alunos || {}).length,
            medidas: (this.data.medidas || this.data.medidas_disciplinares || {}).length || Object.keys(this.data.medidas_disciplinares || {}).length,
            frequencia: Object.keys(this.data.frequencia || this.data.frequencia_diaria || {}).length
          });
          
          return this.data;
        } catch (parseError) {
          console.warn('⚠️ Erro ao parsear dados do localStorage:', parseError.message);
          localStorage.removeItem('db');
        }
      }
      
      // Se não há dados no localStorage, carrega do arquivo remoto
      console.log('📡 Carregando dados iniciais do arquivo remoto...');
<<<<<<< HEAD
=======
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`Erro ao carregar dados: ${response.status}`);
      }
      
      this.data = await response.json();
      this.loaded = true;
      
<<<<<<< HEAD
<<<<<<< HEAD
      console.log('✅ Banco de dados local carregado do arquivo remoto:', {
=======
      console.log('✅ Banco de dados local carregado:', {
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
      console.log('✅ Banco de dados local carregado do arquivo remoto:', {
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
        alunos: Object.keys(this.data.alunos || {}).length,
        medidas: Object.keys(this.data.medidas_disciplinares || {}).length,
        frequencia: Object.keys(this.data.frequencia_diaria || {}).length
      });
      
<<<<<<< HEAD
<<<<<<< HEAD
      // Salva no localStorage para próxima vez
      await this.saveData();
      
=======
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
      // Salva no localStorage para próxima vez
      await this.saveData();
      
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
      return this.data;
    } catch (error) {
      console.error('❌ Erro ao carregar banco de dados local:', error);
      
      // Dados de fallback se não conseguir carregar
      this.data = {
        alunos: {},
        medidas_disciplinares: {},
        frequencia_diaria: {},
        usuarios: {},
        configuracoes: {},
        metadata: { ultimo_backup: null, versao_db: "1.0.0", total_registros: 0 }
      };
      this.loaded = true;
      
      return this.data;
    }
  }

  // Aguardar carregamento
  async waitForLoad() {
    while (!this.loaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.data;
  }

  // Simular coleção do Firestore
  collection(name) {
    return new LocalCollection(this, name);
  }

  // Gerar ID único
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

<<<<<<< HEAD
<<<<<<< HEAD
  // Salvar dados no localStorage
  async saveData() {
    try {
      localStorage.setItem('db', JSON.stringify(this.data));
      console.log('💾 Dados salvos no localStorage:', Object.keys(this.data).map(key => `${key}: ${Object.keys(this.data[key] || {}).length}`));
      
      // Se GitHub sync está configurado, também sincronizar
      if (window.gitHubSync && window.gitHubSync.podeEscrever()) {
        try {
          await window.gitHubSync.sincronizarAutomatico();
          console.log('🐙 Dados sincronizados com GitHub');
        } catch (error) {
          console.warn('⚠️ Falha na sincronização com GitHub:', error.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      return false;
    }
=======
  // Salvar dados (simulação - em produção seria read-only)
  async saveData() {
    console.log('💾 Dados seriam salvos:', this.data);
    // Em um sistema real, enviaria para GitHub via API ou webhook
    return true;
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
  // Salvar dados no localStorage
  async saveData() {
    try {
      localStorage.setItem('db', JSON.stringify(this.data));
      console.log('💾 Dados salvos no localStorage:', Object.keys(this.data).map(key => `${key}: ${Object.keys(this.data[key] || {}).length}`));
      
      // Se GitHub sync está configurado, também sincronizar
      if (window.gitHubSync && window.gitHubSync.podeEscrever()) {
        try {
          await window.gitHubSync.sincronizarAutomatico();
          console.log('🐙 Dados sincronizados com GitHub');
        } catch (error) {
          console.warn('⚠️ Falha na sincronização com GitHub:', error.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      return false;
    }
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
  }
}

class LocalCollection {
  constructor(db, collectionName) {
    this.db = db;
    this.name = collectionName;
  }

  // Obter todos os documentos
  async get() {
    await this.db.waitForLoad();
    const data = this.db.data[this.name] || {};
    
    return {
      docs: Object.keys(data).map(id => ({
        id,
        data: () => data[id],
        exists: true
      })),
      size: Object.keys(data).length,
      empty: Object.keys(data).length === 0,
      forEach: (callback) => {
        Object.keys(data).forEach(id => {
          callback({
            id,
            data: () => data[id]
          });
        });
      }
    };
  }

  // Obter documento por ID
  doc(id) {
    return new LocalDocument(this.db, this.name, id);
  }

  // Adicionar documento
  async add(data) {
    await this.db.waitForLoad();
    const id = this.db.generateId();
    
    if (!this.db.data[this.name]) {
      this.db.data[this.name] = {};
    }
    
    this.db.data[this.name][id] = {
      ...data,
      id,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
    
    await this.db.saveData();
    
    return {
      id,
      get: async () => ({
        id,
        data: () => this.db.data[this.name][id],
        exists: true
      })
    };
  }

  // Filtrar por campo (simulação básica)
  where(field, operator, value) {
    return new LocalQuery(this.db, this.name, [{ field, operator, value }]);
  }
}

class LocalDocument {
  constructor(db, collectionName, docId) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = docId;
  }

  // Obter documento
  async get() {
    await this.db.waitForLoad();
    const data = this.db.data[this.collectionName]?.[this.id];
    
    return {
      id: this.id,
      data: () => data || {},
      exists: !!data
    };
  }

  // Definir documento
  async set(data) {
    await this.db.waitForLoad();
    
    if (!this.db.data[this.collectionName]) {
      this.db.data[this.collectionName] = {};
    }
    
    this.db.data[this.collectionName][this.id] = {
      ...data,
      id: this.id,
      atualizadoEm: new Date().toISOString()
    };
    
    await this.db.saveData();
    return true;
  }

  // Atualizar documento
  async update(data) {
    await this.db.waitForLoad();
    
    if (this.db.data[this.collectionName]?.[this.id]) {
      this.db.data[this.collectionName][this.id] = {
        ...this.db.data[this.collectionName][this.id],
        ...data,
        atualizadoEm: new Date().toISOString()
      };
      
      await this.db.saveData();
    }
    
    return true;
  }

  // Deletar documento
  async delete() {
    await this.db.waitForLoad();
    
    if (this.db.data[this.collectionName]?.[this.id]) {
      delete this.db.data[this.collectionName][this.id];
      await this.db.saveData();
    }
    
    return true;
  }

  // Simular batch para subcoleções
  collection(subCollection) {
    return new LocalCollection(this.db, `${this.collectionName}_${this.id}_${subCollection}`);
  }
}

class LocalQuery {
<<<<<<< HEAD
<<<<<<< HEAD
  constructor(db, collectionName, filters = [], limitCount = null) {
    this.db = db;
    this.collectionName = collectionName;
    this.filters = filters;
    this.limitCount = limitCount;
=======
  constructor(db, collectionName, filters = []) {
    this.db = db;
    this.collectionName = collectionName;
    this.filters = filters;
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
  constructor(db, collectionName, filters = [], limitCount = null) {
    this.db = db;
    this.collectionName = collectionName;
    this.filters = filters;
    this.limitCount = limitCount;
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
  }

  where(field, operator, value) {
    return new LocalQuery(this.db, this.collectionName, [
      ...this.filters,
      { field, operator, value }
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
    ], this.limitCount);
  }

  limit(count) {
    return new LocalQuery(this.db, this.collectionName, this.filters, count);
<<<<<<< HEAD
=======
    ]);
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
  }

  async get() {
    await this.db.waitForLoad();
    const data = this.db.data[this.collectionName] || {};
    
    let results = Object.keys(data).map(id => ({
      id,
      data: () => data[id]
    }));

    // Aplicar filtros
    for (const filter of this.filters) {
      results = results.filter(doc => {
        const docData = doc.data();
        const fieldValue = docData[filter.field];
        
        switch (filter.operator) {
          case '==':
            return fieldValue === filter.value;
          case '!=':
            return fieldValue !== filter.value;
          case '>':
            return fieldValue > filter.value;
          case '>=':
            return fieldValue >= filter.value;
          case '<':
            return fieldValue < filter.value;
          case '<=':
            return fieldValue <= filter.value;
          case 'array-contains':
            return Array.isArray(fieldValue) && fieldValue.includes(filter.value);
          default:
            return true;
        }
      });
    }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
    // Aplicar limit se especificado
    if (this.limitCount !== null && this.limitCount > 0) {
      results = results.slice(0, this.limitCount);
    }

<<<<<<< HEAD
=======
>>>>>>> 97fc6879a73eb779770aaa1fce2f0abb666a7c4e
=======
>>>>>>> 84f14b8738d1023f6421e935c877eb1de1dbb84d
    return {
      docs: results,
      size: results.length,
      empty: results.length === 0,
      forEach: (callback) => results.forEach(callback)
    };
  }
}

// Classe para Batch Operations
class LocalBatch {
  constructor(db) {
    this.db = db;
    this.operations = [];
  }

  set(docRef, data) {
    this.operations.push({
      type: 'set',
      collection: docRef.collectionName,
      id: docRef.id,
      data
    });
  }

  update(docRef, data) {
    this.operations.push({
      type: 'update',
      collection: docRef.collectionName,
      id: docRef.id,
      data
    });
  }

  delete(docRef) {
    this.operations.push({
      type: 'delete',
      collection: docRef.collectionName,
      id: docRef.id
    });
  }

  async commit() {
    await this.db.waitForLoad();
    
    for (const op of this.operations) {
      if (!this.db.data[op.collection]) {
        this.db.data[op.collection] = {};
      }

      switch (op.type) {
        case 'set':
          this.db.data[op.collection][op.id] = {
            ...op.data,
            id: op.id,
            atualizadoEm: new Date().toISOString()
          };
          break;
        case 'update':
          if (this.db.data[op.collection][op.id]) {
            this.db.data[op.collection][op.id] = {
              ...this.db.data[op.collection][op.id],
              ...op.data,
              atualizadoEm: new Date().toISOString()
            };
          }
          break;
        case 'delete':
          delete this.db.data[op.collection][op.id];
          break;
      }
    }

    await this.db.saveData();
    this.operations = [];
    return true;
  }
}

// Inicializar banco local
const localDb = new LocalDatabase();

// Compatibilidade com código existente do Sistema Local
window.db = {
  collection: (name) => localDb.collection(name),
  batch: () => new LocalBatch(localDb),
  enableNetwork: () => Promise.resolve(),
  disableNetwork: () => Promise.resolve()
};

// Função para verificar se está pronto
window.localDbReady = () => localDb.loaded;

// Auto-carregar
localDb.loadData().then(() => {
  console.log('🎯 Banco de dados local inicializado');
  
  // Disparar evento personalizado para compatibilidade
  window.dispatchEvent(new CustomEvent('localDbReady'));
});

// Expor para uso global
window.localDb = localDb;