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
    this.diasUteis = ['1','4','5','6','7','8','11','12','13','14','15','18','19','20','21','22','25','26','27','28','29']; // Dias úteis de agosto
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

    // Carregar dados de agosto
    document.getElementById('btn-carregar-dados').addEventListener('click', () => {
      this.carregarDadosAgosto();
    });
  }

  async carregarDados() {
    this.showLoading(true);
    
    try {
      // Carregar dados de frequência do Firebase
      const frequenciaSnapshot = await db.collection('frequencia_diaria').get();
      
      this.dados = [];
      this.turmas.clear();

      frequenciaSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.codigo && data.nome && data.turma) {
          this.dados.push({
            id: doc.id,
            codigo: data.codigo,
            nome: data.nome,
            turma: data.turma,
            diasFrequencia: data.diasFrequencia || {},
            presencas: data.presencas || 0,
            faltas: data.faltas || 0,
            atestados: data.atestados || 0,
            dataUltimaFalta: data.dataUltimaFalta || null,
            percentualPresenca: data.percentualPresenca || 0,
            criadoEm: data.criadoEm || new Date(),
            atualizadoEm: data.atualizadoEm || new Date()
          });
          
          this.turmas.add(data.turma);
        }
      });

      // Se não há dados, não criar dados de exemplo para aguardar os dados reais
      if (this.dados.length === 0) {
        console.log('Aguardando dados de frequência...');
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

  // Processa dados CSV diários e converte para o formato do sistema
  processarDadosCSV(dadosCSV) {
    console.log('📊 Processando dados CSV...');
    
    const dadosProcessados = dadosCSV.map(linha => {
      const codigo = linha.codigo || linha.Código;
      const nome = linha.nome || linha.Nome;
      const turma = linha.turma || linha.Turma;
      
      // Processar dias de frequência
      const diasFrequencia = {};
      let totalPresencas = 0;
      let totalFaltas = 0;
      let totalAtestados = 0;
      let dataUltimaFalta = null;
      
      this.diasUteis.forEach(dia => {
        const valor = linha[dia];
        if (valor) {
          diasFrequencia[dia] = valor;
          
          if (valor === 'P') {
            totalPresencas++;
          } else if (valor === 'F') {
            totalFaltas++;
            // Assumindo agosto de 2024 para data da última falta
            dataUltimaFalta = new Date(2024, 7, parseInt(dia)); // Mês 7 = agosto
          } else if (valor === 'A') {
            totalAtestados++;
          }
        }
      });
      
      const totalDias = totalPresencas + totalFaltas + totalAtestados;
      const percentualPresenca = totalDias > 0 ? (totalPresencas / totalDias * 100) : 0;
      
      return {
        codigo: codigo,
        nome: nome,
        turma: turma,
        diasFrequencia: diasFrequencia,
        presencas: totalPresencas,
        faltas: totalFaltas,
        atestados: totalAtestados,
        percentualPresenca: percentualPresenca,
        dataUltimaFalta: dataUltimaFalta,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      };
    });
    
    console.log(`📈 Processados ${dadosProcessados.length} registros`);
    return dadosProcessados;
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
        item.nome.toLowerCase().includes(termoBusca) ||
        item.turma.toLowerCase().includes(termoBusca) ||
        item.codigo.toString().includes(termoBusca)
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
              <p class="empty-subtitle">Aguardando dados de frequência ou ajuste os filtros</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.dadosFiltrados.map(item => {
      const status = item.percentualPresenca >= this.thresholdPercentual ? 'Adequada' : 'Baixa';
      const statusClass = item.percentualPresenca >= this.thresholdPercentual ? 'status-success' : 'status-warning';
      
      const ultimaFalta = item.dataUltimaFalta ? 
        (item.dataUltimaFalta.toDate ? item.dataUltimaFalta.toDate().toLocaleDateString('pt-BR') : 
         new Date(item.dataUltimaFalta).toLocaleDateString('pt-BR')) : 
        'N/A';

      return `
        <tr>
          <td><strong>${item.codigo}</strong><br><small>${item.nome}</small></td>
          <td>${item.turma}</td>
          <td>${item.presencas}</td>
          <td>${item.faltas}</td>
          <td><strong>${item.percentualPresenca.toFixed(1)}%</strong></td>
          <td>${ultimaFalta}</td>
          <td><span class="status ${statusClass}">${status}</span></td>
        </tr>
      `;
    }).join('');
  }

  atualizarAlunosBaixaFrequencia() {
    const alunosBaixaFrequencia = this.dadosFiltrados.filter(item => {
      return item.percentualPresenca < this.thresholdPercentual;
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
      return `
        <div class="alert-item">
          <div class="alert-info">
            <strong>${item.nome}</strong> (${item.codigo}) - ${item.turma}
            <span class="alert-percentage">${item.percentualPresenca.toFixed(1)}% de presença</span>
          </div>
          <div class="alert-details">
            ${item.faltas} faltas de ${item.presencas + item.faltas + item.atestados} dias letivos
          </div>
        </div>
      `;
    }).join('');
  }

  exportarRelatorio() {
    const dados = this.dadosFiltrados.map(item => {
      return {
        Código: item.codigo,
        Nome: item.nome,
        Turma: item.turma,
        Presenças: item.presencas,
        Faltas: item.faltas,
        Atestados: item.atestados,
        'Taxa de Presença': `${item.percentualPresenca.toFixed(1)}%`,
        'Última Falta': item.dataUltimaFalta ? 
          (item.dataUltimaFalta.toDate ? item.dataUltimaFalta.toDate().toLocaleDateString('pt-BR') : 
           new Date(item.dataUltimaFalta).toLocaleDateString('pt-BR')) : 
          'N/A'
      };
    });

    const csv = this.convertToCSV(dados);
    this.downloadCSV(csv, 'relatorio_frequencia_agosto_2024.csv');
    
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

  // Método para adicionar dados processados do CSV
  async adicionarDadosFrequencia(dadosCSV) {
    try {
      this.showLoading(true);
      
      const dadosProcessados = this.processarDadosCSV(dadosCSV);
      
      // Usar batch para melhor performance
      const batch = db.batch();
      
      dadosProcessados.forEach(item => {
        const docRef = db.collection('frequencia_diaria').doc();
        batch.set(docRef, item);
      });

      await batch.commit();
      console.log('✅ Dados salvos no Firebase');
      
      // Recarregar dados
      await this.carregarDados();
      
      showToast(`${dadosProcessados.length} registros de frequência adicionados com sucesso`, 'success');
      
    } catch (error) {
      console.error('Erro ao adicionar dados:', error);
      showToast('Erro ao adicionar dados de frequência', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Método para carregar dados de agosto
  async carregarDadosAgosto() {
    try {
      this.showLoading(true);
      
      if (typeof carregarDadosFrequenciaAgosto === 'function') {
        const dadosAgosto = carregarDadosFrequenciaAgosto();
        await this.adicionarDadosFrequencia(dadosAgosto);
        showToast('Dados de agosto carregados com sucesso!', 'success');
      } else {
        showToast('Erro: Função de carregamento não encontrada', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de agosto:', error);
      showToast('Erro ao carregar dados de agosto', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Método para ver detalhes diários de um aluno
  verDetalhesAluno(alunoId) {
    const aluno = this.dados.find(item => item.id === alunoId);
    if (!aluno) return;
    
    console.log(`📅 Detalhes de ${aluno.nome}:`);
    console.log('Dias de frequência:', aluno.diasFrequencia);
    
    // Aqui pode ser implementado um modal com os detalhes diários
    return aluno.diasFrequencia;
  }
}

// Função para processar dados do CSV que você forneceu
function processarCSVFrequencia() {
  const dadosCSV = `2639458,Alberto de Jesus Sousa Pereira,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2590632,Ana Clara da Silva Coelho,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2230465,Ana Júlia da Silva,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2208832,Aysha Micaelly dos Santos B. Lemos,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2308886,Azaff Gabriel Souza Pereira da Cunha,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2257848,Bruna Santos Oliveira,6A,P,P,P,P,F,P,P,P,P,P,P,P,,,,,,,,,
2235078,Davi de Lima Trevisan Araújo,6A,P,P,P,P,F,P,P,P,P,P,F,P,,,,,,,,,
2590882,Eduarda Gomes da Silva,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2557498,Enzo Gabriel Oliveira Costa,6A,P,F,F,P,F,P,F,F,P,F,F,P,,,,,,,,,
2595270,Enzo Samuel Alves R. Carvalho,6A,F,P,P,P,P,F,P,P,P,P,P,F,,,,,,,,,
2221844,Everton Peris dos Santos,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2611953,Felipe Santana Silva Fonseca,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2572796,Gabriela da Silva Conceição,6A,P,P,P,F,P,F,F,P,P,P,F,P,,,,,,,,,
2221796,Graziely Soyane Brito Januário,6A,P,P,P,P,P,P,A,A,F,P,P,P,,,,,,,,,
2590991,Hector Harthur Morais Rodrigues,6A,P,F,P,P,P,F,F,P,P,P,P,P,,,,,,,,,
2218077,José Bruno Xavier Pereira,6A,P,P,P,P,P,P,P,P,P,P,F,P,,,,,,,,,
2238497,Kamila Cristina de Oliveira da Silva,6A,P,F,P,P,P,P,A,A,A,A,A,P,,,,,,,,,
2410707,Kawanny Latyffa Carvalho Neto,6A,P,F,P,P,P,P,F,P,P,F,P,P,,,,,,,,,
2590602,Ludmila Silva Figueiredo,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2590937,Luna Samya Ferreira da Silva,6A,P,P,P,P,P,F,F,P,P,P,P,F,,,,,,,,,
2642036,Malvina Sophie Barbosa R. Goffi Savi,6A,F,F,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2264960,Maria Vitória Ramos dos Santos,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2579209,Mariana Prado Fujii,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2229922,Nathiely Nunes Oliveira,6A,P,P,P,P,P,F,P,P,P,P,P,P,,,,,,,,,
2415239,Nicolly Soffie Freitas Marczal,6A,P,P,F,P,F,P,F,P,P,P,P,P,,,,,,,,,
2266996,Nikolas Cézar Dias da Silva,6A,P,P,P,P,P,P,P,P,F,P,P,P,,,,,,,,,
2590976,Pedro Henrique Carneiro,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2260814,Pedro Henrique Magalhães Neves,6A,P,F,P,P,P,P,P,P,P,P,F,P,,,,,,,,,
2231253,Rafael Augusto Nunes Rodrigues - MP,6A,P,P,P,P,P,F,P,P,P,P,P,P,,,,,,,,,
2492468,Rafael Rosalvo de Souza,6A,P,P,P,P,P,P,P,P,P,P,P,P,,,,,,,,,
2467698,Ruan Gregório Fonseca Barboza,6A,F,F,F,P,P,F,F,P,P,P,P,F,,,,,,,,,
2483240,Wenia Pereira Gomes,6A,P,F,P,P,P,F,P,P,P,P,P,P,,,,,,,,,`;

  // Converter string CSV em array de objetos
  const linhas = dadosCSV.trim().split('\n');
  const diasUteis = ['1','4','5','6','7','8','11','12','13','14','15','18','19','20','21','22','25','26','27','28','29'];
  
  const dados = linhas.map(linha => {
    const valores = linha.split(',');
    const objeto = {
      codigo: valores[0],
      nome: valores[1],
      turma: valores[2]
    };
    
    // Mapear dias úteis
    diasUteis.forEach((dia, index) => {
      objeto[dia] = valores[3 + index] || '';
    });
    
    return objeto;
  });
  
  return dados;
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

// Função para processar e adicionar os dados que você forneceu
window.processarDadosCSV = processarCSVFrequencia;

window.carregarDadosExemplo = function() {
  const dados = processarCSVFrequencia();
  if (window.frequenciaManager) {
    window.frequenciaManager.adicionarDadosFrequencia(dados);
  }
};