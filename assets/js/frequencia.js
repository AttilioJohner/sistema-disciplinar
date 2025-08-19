// Sistema de Controle de Frequência
class FrequenciaManager {
  constructor() {
    this.dados = [];
    this.dadosFiltrados = [];
    this.turmas = new Set();
    this.currentFilters = {
      turma: '',
      periodo: 'todos'
    };
    this.thresholdPercentual = 75;
  }

  async init() {
    console.log('🚀 Inicializando FrequenciaManager...');
    
    await this.waitForFirebase();
    this.setupEventListeners();
    await this.carregarDados();
    this.atualizarInterface();
    
    console.log('✅ FrequenciaManager inicializado');
  }

  async waitForFirebase() {
    while (!window.isFirebaseReady?.()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  setupEventListeners() {
    // Filtros
    document.getElementById('btn-filtrar').addEventListener('click', () => {
      this.aplicarFiltros();
    });

    document.getElementById('btn-atualizar').addEventListener('click', () => {
      this.carregarDados();
    });

    // Busca
    document.getElementById('busca').addEventListener('input', (e) => {
      this.filtrarPorBusca(e.target.value);
    });

    // Threshold
    document.getElementById('btn-apply-threshold').addEventListener('click', () => {
      this.thresholdPercentual = parseInt(document.getElementById('threshold-input').value);
      this.atualizarAlunosBaixaFrequencia();
    });

    // Exportar
    document.getElementById('btn-exportar').addEventListener('click', () => {
      this.exportarRelatorio();
    });
  }

  async carregarDados() {
    this.showLoading(true);
    
    try {
      // Carregar dados de frequência do Firebase
      const frequenciaSnapshot = await db.collection('frequencia').get();
      
      this.dados = [];
      this.turmas.clear();

      for (const doc of frequenciaSnapshot.docs) {
        const data = doc.data();
        if (data.aluno && data.turma) {
          this.dados.push({
            id: doc.id,
            aluno: data.aluno,
            turma: data.turma,
            presencas: data.presencas || 0,
            faltas: data.faltas || 0,
            dataUltimaFalta: data.dataUltimaFalta || null,
            observacoes: data.observacoes || '',
            criadoEm: data.criadoEm || new Date(),
            atualizadoEm: data.atualizadoEm || new Date()
          });
          
          this.turmas.add(data.turma);
        }
      }

      // Se não há dados, criar dados de exemplo
      if (this.dados.length === 0) {
        await this.criarDadosExemplo();
      }

      this.dadosFiltrados = [...this.dados];
      this.atualizarSelectTurmas();
      this.atualizarInterface();

      showToast('Dados carregados com sucesso', 'success');
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados de frequência', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async criarDadosExemplo() {
    console.log('Criando dados de exemplo...');
    
    const dadosExemplo = [
      { aluno: 'Ana Silva', turma: '1º Ano A', presencas: 85, faltas: 15 },
      { aluno: 'Bruno Santos', turma: '1º Ano A', presencas: 92, faltas: 8 },
      { aluno: 'Carlos Oliveira', turma: '1º Ano B', presencas: 78, faltas: 22 },
      { aluno: 'Diana Costa', turma: '1º Ano B', presencas: 95, faltas: 5 },
      { aluno: 'Eduardo Lima', turma: '2º Ano A', presencas: 68, faltas: 32 },
      { aluno: 'Fernanda Rocha', turma: '2º Ano A', presencas: 88, faltas: 12 },
      { aluno: 'Gabriel Mendes', turma: '2º Ano B', presencas: 91, faltas: 9 },
      { aluno: 'Helena Ferreira', turma: '2º Ano B', presencas: 73, faltas: 27 },
      { aluno: 'Igor Barbosa', turma: '3º Ano A', presencas: 96, faltas: 4 },
      { aluno: 'Julia Araújo', turma: '3º Ano A', presencas: 82, faltas: 18 }
    ];

    const batch = db.batch();
    
    dadosExemplo.forEach((item, index) => {
      const docRef = db.collection('frequencia').doc();
      batch.set(docRef, {
        aluno: item.aluno,
        turma: item.turma,
        presencas: item.presencas,
        faltas: item.faltas,
        dataUltimaFalta: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        observacoes: '',
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    console.log('Dados de exemplo criados');
  }

  aplicarFiltros() {
    this.currentFilters.turma = document.getElementById('filtro-turma').value;
    this.currentFilters.periodo = document.getElementById('filtro-periodo').value;

    this.dadosFiltrados = this.dados.filter(item => {
      // Filtro por turma
      if (this.currentFilters.turma && item.turma !== this.currentFilters.turma) {
        return false;
      }

      // Filtro por período (para futuras implementações)
      // Por enquanto, mostrar todos os dados
      
      return true;
    });

    this.atualizarInterface();
    showToast('Filtros aplicados', 'info');
  }

  filtrarPorBusca(termo) {
    if (!termo.trim()) {
      this.dadosFiltrados = [...this.dados];
    } else {
      const termoBusca = termo.toLowerCase();
      this.dadosFiltrados = this.dados.filter(item => 
        item.aluno.toLowerCase().includes(termoBusca) ||
        item.turma.toLowerCase().includes(termoBusca)
      );
    }
    
    this.atualizarTabela();
    this.atualizarEstatisticas();
  }

  atualizarSelectTurmas() {
    const select = document.getElementById('filtro-turma');
    select.innerHTML = '<option value="">Todas as turmas</option>';
    
    Array.from(this.turmas).sort().forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      select.appendChild(option);
    });
  }

  atualizarInterface() {
    this.atualizarEstatisticas();
    this.atualizarTabela();
    this.atualizarAlunosBaixaFrequencia();
  }

  atualizarEstatisticas() {
    const totalAlunos = this.dadosFiltrados.length;
    const totalPresencas = this.dadosFiltrados.reduce((sum, item) => sum + item.presencas, 0);
    const totalFaltas = this.dadosFiltrados.reduce((sum, item) => sum + item.faltas, 0);
    const totalRegistros = totalPresencas + totalFaltas;
    const percentualPresenca = totalRegistros > 0 ? (totalPresencas / totalRegistros * 100) : 0;

    document.getElementById('stat-total-alunos').textContent = totalAlunos;
    document.getElementById('stat-presencas').textContent = totalPresencas.toLocaleString();
    document.getElementById('stat-faltas').textContent = totalFaltas.toLocaleString();
    document.getElementById('stat-percentual').textContent = `${percentualPresenca.toFixed(1)}%`;
  }

  atualizarTabela() {
    const tbody = document.getElementById('frequencia-tbody');
    
    if (this.dadosFiltrados.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-state">
          <td colspan="7">
            <div class="empty-message">
              <div class="empty-icon">📊</div>
              <p>Nenhum dado encontrado</p>
              <p class="empty-subtitle">Ajuste os filtros ou aguarde o carregamento</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.dadosFiltrados.map(item => {
      const totalRegistros = item.presencas + item.faltas;
      const percentualPresenca = totalRegistros > 0 ? (item.presencas / totalRegistros * 100) : 0;
      const status = percentualPresenca >= this.thresholdPercentual ? 'Adequada' : 'Baixa';
      const statusClass = percentualPresenca >= this.thresholdPercentual ? 'status-success' : 'status-warning';
      
      const ultimaFalta = item.dataUltimaFalta ? 
        new Date(item.dataUltimaFalta.seconds * 1000).toLocaleDateString('pt-BR') : 
        'N/A';

      return `
        <tr>
          <td>${item.aluno}</td>
          <td>${item.turma}</td>
          <td>${item.presencas}</td>
          <td>${item.faltas}</td>
          <td>${percentualPresenca.toFixed(1)}%</td>
          <td>${ultimaFalta}</td>
          <td><span class="status ${statusClass}">${status}</span></td>
        </tr>
      `;
    }).join('');
  }

  atualizarAlunosBaixaFrequencia() {
    const alunosBaixaFrequencia = this.dadosFiltrados.filter(item => {
      const totalRegistros = item.presencas + item.faltas;
      const percentualPresenca = totalRegistros > 0 ? (item.presencas / totalRegistros * 100) : 0;
      return percentualPresenca < this.thresholdPercentual;
    });

    const container = document.getElementById('low-attendance-list');
    
    if (alunosBaixaFrequencia.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <div class="empty-icon">✅</div>
          <p>Todos os alunos estão com frequência adequada</p>
          <p class="empty-subtitle">Acima de ${this.thresholdPercentual}% de presença</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alunosBaixaFrequencia.map(item => {
      const totalRegistros = item.presencas + item.faltas;
      const percentualPresenca = totalRegistros > 0 ? (item.presencas / totalRegistros * 100) : 0;
      
      return `
        <div class="alert-item">
          <div class="alert-info">
            <strong>${item.aluno}</strong> - ${item.turma}
            <span class="alert-percentage">${percentualPresenca.toFixed(1)}% de presença</span>
          </div>
          <div class="alert-details">
            ${item.faltas} faltas de ${totalRegistros} registros
          </div>
        </div>
      `;
    }).join('');
  }

  exportarRelatorio() {
    const dados = this.dadosFiltrados.map(item => {
      const totalRegistros = item.presencas + item.faltas;
      const percentualPresenca = totalRegistros > 0 ? (item.presencas / totalRegistros * 100) : 0;
      
      return {
        Aluno: item.aluno,
        Turma: item.turma,
        Presenças: item.presencas,
        Faltas: item.faltas,
        'Taxa de Presença': `${percentualPresenca.toFixed(1)}%`,
        'Última Falta': item.dataUltimaFalta ? 
          new Date(item.dataUltimaFalta.seconds * 1000).toLocaleDateString('pt-BR') : 
          'N/A'
      };
    });

    const csv = this.convertToCSV(dados);
    this.downloadCSV(csv, 'relatorio_frequencia.csv');
    
    showToast('Relatório exportado com sucesso', 'success');
  }

  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  // Método para adicionar dados via código (quando você enviar os dados)
  async adicionarDadosFrequencia(dadosCSV) {
    try {
      const batch = db.batch();
      
      dadosCSV.forEach(item => {
        const docRef = db.collection('frequencia').doc();
        batch.set(docRef, {
          aluno: item.aluno,
          turma: item.turma,
          presencas: parseInt(item.presencas) || 0,
          faltas: parseInt(item.faltas) || 0,
          dataUltimaFalta: item.dataUltimaFalta ? new Date(item.dataUltimaFalta) : null,
          observacoes: item.observacoes || '',
          criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      await this.carregarDados();
      
      showToast(`${dadosCSV.length} registros adicionados com sucesso`, 'success');
      
    } catch (error) {
      console.error('Erro ao adicionar dados:', error);
      showToast('Erro ao adicionar dados de frequência', 'error');
    }
  }
}

// Inicialização
let frequenciaManager;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('frequencia-table')) {
    frequenciaManager = new FrequenciaManager();
    frequenciaManager.init();
    
    // Expor globalmente para facilitar testes
    window.frequenciaManager = frequenciaManager;
  }
});

// Função global para adicionar dados (você usará esta)
window.adicionarDadosFrequencia = function(dados) {
  if (window.frequenciaManager) {
    return window.frequenciaManager.adicionarDadosFrequencia(dados);
  } else {
    console.error('FrequenciaManager não inicializado');
  }
};