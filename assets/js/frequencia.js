// assets/js/frequencia.js
// Sistema de Controle de Frequência com Firestore

class FrequenciaManager {
  constructor() {
    this.dadosMensais = {};
    this.alunosCache = [];
    this.selectionManager = new SelectionManager();
    this.turmaAtual = '';
    this.mesAtual = '';
    this.diasNoMes = 0;
    this.debounceTimeout = null;
    this.isLoading = false;
  }

  async init() {
    console.log('🚀 Inicializando FrequenciaManager...');
    
    await this.waitForFirebase();
    this.setupEventListeners();
    await this.loadTurmasOptions();
    this.setupDefaultMonth();
    await this.loadInitialData();
    
    console.log('✅ FrequenciaManager inicializado com sucesso');
  }

  async waitForFirebase() {
    while (!window.isFirebaseReady?.()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  setupEventListeners() {
    // Filtros
    document.getElementById('filtro-turma').addEventListener('change', (e) => {
      this.turmaAtual = e.target.value;
      this.loadData();
    });

    document.getElementById('filtro-mes').addEventListener('change', (e) => {
      this.mesAtual = e.target.value;
      this.loadData();
    });

    // Botões
    document.getElementById('btn-salvar-lote').addEventListener('click', () => {
      this.abrirModalLote();
    });

    document.getElementById('btn-limpar-selecao').addEventListener('click', () => {
      this.selectionManager.clearSelection();
      this.updateSelectionUI();
    });

    document.getElementById('btn-exportar-csv').addEventListener('click', () => {
      this.exportarCSV(this.turmaAtual, this.mesAtual);
    });

    document.getElementById('btn-recalcular').addEventListener('click', () => {
      this.recalcularTudoEMesclar();
    });

    // Busca
    document.getElementById('busca').addEventListener('input', (e) => {
      this.filtrarTabela(e.target.value);
    });

    // Modal
    document.querySelectorAll('.opcao-lote').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const valor = e.target.dataset.valor;
        this.aplicarLote(valor);
      });
    });

    // Keyboard shortcuts globais
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('celula-freq')) {
        this.handleCellKeyboard(e);
      }
    });
  }

  setupDefaultMonth() {
    const now = new Date();
    const selectMes = document.getElementById('filtro-mes');
    
    // Limpar opções existentes
    selectMes.innerHTML = '';
    
    // Adicionar últimos 6 meses e próximos 6 meses
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const text = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
      
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      
      if (i === 0) {
        option.selected = true;
        this.mesAtual = value;
      }
      
      selectMes.appendChild(option);
    }
  }

  async loadTurmasOptions() {
    try {
      const alunosSnapshot = await db.collection('alunos').get();
      const turmas = new Set();
      
      alunosSnapshot.docs.forEach(doc => {
        const aluno = doc.data();
        if (aluno.turma && aluno.status === 'ativo') {
          turmas.add(aluno.turma);
        }
      });

      const selectTurma = document.getElementById('filtro-turma');
      selectTurma.innerHTML = '<option value="">Todas as turmas</option>';
      
      Array.from(turmas).sort().forEach(turma => {
        const option = document.createElement('option');
        option.value = turma;
        option.textContent = turma;
        selectTurma.appendChild(option);
      });
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      showToast('Erro ao carregar turmas', 'error');
    }
  }

  async loadAlunosByTurma(turmaId) {
    try {
      let query = db.collection('alunos')
        .where('status', '==', 'ativo');
      
      if (turmaId) {
        query = query.where('turma', '==', turmaId);
      }
      
      const snapshot = await query.orderBy('nome').get();
      
      return snapshot.docs.map(doc => ({
        alunoId: doc.id,
        id: doc.id,
        nome: doc.data().nome,
        turma: doc.data().turma
      }));
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      showToast('Erro ao carregar alunos', 'error');
      return [];
    }
  }

  getDiasNoMes(ano, mes) {
    return new Date(ano, mes, 0).getDate();
  }

  async loadInitialData() {
    if (!this.mesAtual) return;
    
    // Se não há turma específica, pegar a primeira disponível
    if (!this.turmaAtual) {
      const selectTurma = document.getElementById('filtro-turma');
      if (selectTurma.options.length > 1) {
        this.turmaAtual = selectTurma.options[1].value;
        selectTurma.value = this.turmaAtual;
      }
    }
    
    await this.loadData();
  }

  async loadData() {
    if (!this.turmaAtual || !this.mesAtual) return;
    
    this.showLoading(true);
    
    try {
      // Calcular dias no mês
      const [ano, mes] = this.mesAtual.split('-').map(Number);
      this.diasNoMes = this.getDiasNoMes(ano, mes);
      
      // Carregar alunos
      this.alunosCache = await this.loadAlunosByTurma(this.turmaAtual);
      
      // Garantir documento mensal existe
      await this.ensureMensalDoc(this.turmaAtual, this.mesAtual);
      
      // Carregar dados mensais
      await this.loadMensalData(this.turmaAtual, this.mesAtual);
      
      // Renderizar tabela
      this.renderTabela(this.alunosCache, this.diasNoMes, this.dadosMensais);
      
      // Limpar seleção
      this.selectionManager.clearSelection();
      this.updateSelectionUI();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados de frequência', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async ensureMensalDoc(turmaId, anoMes) {
    const docId = `${turmaId}_${anoMes}`;
    const docRef = db.collection('frequencia').doc(docId);
    
    try {
      const doc = await docRef.get();
      
      if (!doc.exists) {
        const [ano, mes] = anoMes.split('-').map(Number);
        const diasNoMes = this.getDiasNoMes(ano, mes);
        
        await docRef.set({
          meta: {
            turmaId,
            anoMes,
            diasNoMes,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
          }
        });
        
        console.log(`📄 Documento mensal criado: ${docId}`);
      }
    } catch (error) {
      console.error('Erro ao criar documento mensal:', error);
      throw error;
    }
  }

  async loadMensalData(turmaId, anoMes) {
    const docId = `${turmaId}_${anoMes}`;
    
    try {
      // Carregar dados dos alunos
      const alunosSnapshot = await db.collection('frequencia').doc(docId)
        .collection('alunos').get();
      
      // Carregar agregados por dia
      const agregadosSnapshot = await db.collection('frequencia').doc(docId)
        .collection('agregadosDia').get();
      
      this.dadosMensais = {
        alunos: {},
        agregadosDia: {}
      };
      
      alunosSnapshot.docs.forEach(doc => {
        this.dadosMensais.alunos[doc.id] = doc.data();
      });
      
      agregadosSnapshot.docs.forEach(doc => {
        this.dadosMensais.agregadosDia[doc.id] = doc.data();
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados mensais:', error);
      this.dadosMensais = { alunos: {}, agregadosDia: {} };
    }
  }

  renderTabela(alunos, diasNoMes, dadosMensais) {
    const cabecalho = document.getElementById('cabecalho-frequencia');
    const corpo = document.getElementById('corpo-frequencia');
    const rodape = document.getElementById('rodape-frequencia');
    
    // Limpar tabela
    cabecalho.innerHTML = '';
    corpo.innerHTML = '';
    rodape.innerHTML = '';
    
    // Cabeçalho
    this.renderCabecalho(cabecalho, diasNoMes);
    
    // Corpo - alunos
    alunos.forEach(aluno => {
      this.renderLinhaAluno(corpo, aluno, diasNoMes, dadosMensais);
    });
    
    // Rodapé - totais por dia
    this.renderRodapeAgregados(rodape, diasNoMes, dadosMensais);
  }

  renderCabecalho(cabecalho, diasNoMes) {
    const tr = document.createElement('tr');
    
    // Colunas fixas
    tr.innerHTML = `
      <th class="col-codigo sticky-col">Código</th>
      <th class="col-nome sticky-col">Nome</th>
    `;
    
    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const th = document.createElement('th');
      th.className = 'col-dia';
      th.textContent = String(dia).padStart(2, '0');
      tr.appendChild(th);
    }
    
    // Colunas de resumo
    tr.innerHTML += `
      <th class="col-resumo">Total F</th>
      <th class="col-resumo">Total A</th>
      <th class="col-resumo">Total P</th>
      <th class="col-resumo">% Faltas</th>
    `;
    
    cabecalho.appendChild(tr);
  }

  renderLinhaAluno(corpo, aluno, diasNoMes, dadosMensais) {
    const tr = document.createElement('tr');
    tr.className = 'linha-aluno';
    tr.dataset.alunoId = aluno.alunoId;
    
    // Dados do aluno
    const dadosAluno = dadosMensais.alunos[aluno.alunoId] || { dias: {}, resumo: {} };
    
    // Colunas fixas
    const tdCodigo = document.createElement('td');
    tdCodigo.className = 'col-codigo sticky-col';
    tdCodigo.textContent = aluno.id;
    tr.appendChild(tdCodigo);
    
    const tdNome = document.createElement('td');
    tdNome.className = 'col-nome sticky-col';
    tdNome.textContent = aluno.nome;
    tr.appendChild(tdNome);
    
    // Células de dias
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const diaStr = String(dia).padStart(2, '0');
      const valor = dadosAluno.dias?.[diaStr] || '';
      
      const td = document.createElement('td');
      td.className = 'col-dia celula-freq';
      td.dataset.alunoId = aluno.alunoId;
      td.dataset.dia = diaStr;
      td.textContent = valor;
      td.tabIndex = 0;
      
      if (valor) {
        td.classList.add(`freq-${valor.toLowerCase()}`);
      }
      
      // Eventos de clique e seleção
      td.addEventListener('click', (e) => this.handleCellClick(e));
      td.addEventListener('focus', (e) => this.handleCellFocus(e));
      
      tr.appendChild(td);
    }
    
    // Colunas de resumo
    const resumo = dadosAluno.resumo || {};
    
    tr.innerHTML += `
      <td class="col-resumo total-f">${resumo.totalF || 0}</td>
      <td class="col-resumo total-a">${resumo.totalA || 0}</td>
      <td class="col-resumo total-p">${resumo.totalP || 0}</td>
      <td class="col-resumo percent-faltas">${(resumo.percentualFaltas || 0).toFixed(2)}%</td>
    `;
    
    corpo.appendChild(tr);
  }

  renderRodapeAgregados(rodape, diasNoMes, dadosMensais) {
    const tr = document.createElement('tr');
    tr.className = 'rodape-totais';
    
    // Colunas fixas
    tr.innerHTML = `
      <td class="sticky-col"><strong>Total do dia</strong></td>
      <td class="sticky-col"></td>
    `;
    
    // Totais por dia
    let totalGeralF = 0;
    let totalGeralA = 0;
    let totalGeralP = 0;
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const diaStr = String(dia).padStart(2, '0');
      const agregado = dadosMensais.agregadosDia?.[diaStr] || { totais: {} };
      const totalDia = agregado.totais?.F || 0;
      
      totalGeralF += totalDia;
      totalGeralA += agregado.totais?.A || 0;
      totalGeralP += agregado.totais?.P || 0;
      
      const td = document.createElement('td');
      td.className = 'col-dia-total';
      td.textContent = totalDia || '';
      tr.appendChild(td);
    }
    
    // Totais gerais
    tr.innerHTML += `
      <td class="col-resumo"><strong>${totalGeralF}</strong></td>
      <td class="col-resumo"><strong>${totalGeralA}</strong></td>
      <td class="col-resumo"><strong>${totalGeralP}</strong></td>
      <td class="col-resumo"></td>
    `;
    
    rodape.appendChild(tr);
    
    // Atualizar estatísticas
    this.updateEstatisticas(totalGeralF, totalGeralA, totalGeralP);
  }

  updateEstatisticas(totalF, totalA, totalP) {
    const total = totalF + totalA + totalP;
    const mediaFaltas = total > 0 ? (totalF / total * 100) : 0;
    
    document.getElementById('media-faltas').textContent = `${mediaFaltas.toFixed(2)}%`;
  }

  handleCellClick(event) {
    const cell = event.target;
    
    if (event.shiftKey && this.selectionManager.lastSelected) {
      // Seleção de intervalo
      this.selectionManager.selectRange(this.selectionManager.lastSelected, cell);
    } else if (event.ctrlKey || event.metaKey) {
      // Seleção múltipla
      this.selectionManager.toggleCell(cell);
    } else {
      // Seleção simples + edição
      this.selectionManager.selectSingle(cell);
      this.toggleCelula(cell.dataset.alunoId, cell.dataset.dia);
    }
    
    this.updateSelectionUI();
  }

  handleCellFocus(event) {
    const cell = event.target;
    this.selectionManager.selectSingle(cell);
    this.updateSelectionUI();
  }

  handleCellKeyboard(event) {
    const cell = event.target;
    const alunoId = cell.dataset.alunoId;
    const dia = cell.dataset.dia;
    
    switch (event.key) {
      case 'P':
      case 'p':
        event.preventDefault();
        this.setCelulaValor(alunoId, dia, 'P');
        break;
      case 'F':
      case 'f':
        event.preventDefault();
        this.setCelulaValor(alunoId, dia, 'F');
        break;
      case 'A':
      case 'a':
        event.preventDefault();
        this.setCelulaValor(alunoId, dia, 'A');
        break;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        this.setCelulaValor(alunoId, dia, '');
        break;
      case 'Enter':
        event.preventDefault();
        this.moveToNextRow(cell);
        break;
      case 'Tab':
        event.preventDefault();
        this.moveToNextCell(cell, event.shiftKey);
        break;
    }
  }

  moveToNextRow(currentCell) {
    const currentRow = currentCell.parentElement;
    const nextRow = currentRow.nextElementSibling;
    if (nextRow && nextRow.classList.contains('linha-aluno')) {
      const cellIndex = Array.from(currentRow.children).indexOf(currentCell);
      const nextCell = nextRow.children[cellIndex];
      if (nextCell && nextCell.classList.contains('celula-freq')) {
        nextCell.focus();
      }
    }
  }

  moveToNextCell(currentCell, backwards = false) {
    const cells = Array.from(document.querySelectorAll('.celula-freq'));
    const currentIndex = cells.indexOf(currentCell);
    const nextIndex = backwards ? currentIndex - 1 : currentIndex + 1;
    
    if (nextIndex >= 0 && nextIndex < cells.length) {
      cells[nextIndex].focus();
    }
  }

  toggleCelula(alunoId, dia) {
    const currentValue = this.getCelulaValue(alunoId, dia);
    let newValue;
    
    switch (currentValue) {
      case 'P': newValue = 'F'; break;
      case 'F': newValue = 'A'; break;
      case 'A': newValue = ''; break;
      default: newValue = 'P'; break;
    }
    
    this.setCelulaValor(alunoId, dia, newValue);
  }

  setCelulaValor(alunoId, dia, valor) {
    // Atualizar no cache local
    if (!this.dadosMensais.alunos[alunoId]) {
      this.dadosMensais.alunos[alunoId] = { dias: {}, resumo: {} };
    }
    
    this.dadosMensais.alunos[alunoId].dias[dia] = valor;
    
    // Atualizar UI
    const cell = document.querySelector(`[data-aluno-id="${alunoId}"][data-dia="${dia}"]`);
    if (cell) {
      cell.textContent = valor;
      cell.className = 'col-dia celula-freq';
      if (valor) {
        cell.classList.add(`freq-${valor.toLowerCase()}`);
      }
    }
    
    // Salvar com debounce
    this.saveCelulaDebounced(alunoId, dia, valor);
  }

  getCelulaValue(alunoId, dia) {
    return this.dadosMensais.alunos[alunoId]?.dias?.[dia] || '';
  }

  saveCelulaDebounced(alunoId, dia, valor) {
    // Cancelar timeout anterior
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    // Novo timeout
    this.debounceTimeout = setTimeout(async () => {
      try {
        await this.saveCelula(alunoId, dia, valor);
        showToast('Salvo automaticamente', 'success');
      } catch (error) {
        console.error('Erro ao salvar célula:', error);
        showToast('Erro ao salvar', 'error');
      }
    }, 400);
  }

  async saveCelula(alunoId, dia, valor) {
    const docId = `${this.turmaAtual}_${this.mesAtual}`;
    const alunoRef = db.collection('frequencia').doc(docId)
      .collection('alunos').doc(alunoId);
    
    try {
      // Salvar valor da célula
      await alunoRef.set({
        [`dias.${dia}`]: valor
      }, { merge: true });
      
      // Recalcular resumo do aluno
      await this.recalcularResumoAluno(alunoId);
      
      // Recalcular agregado do dia
      await this.recalcularAgregadoDia(dia);
      
    } catch (error) {
      console.error('Erro ao salvar célula:', error);
      throw error;
    }
  }

  async recalcularResumoAluno(alunoId) {
    const dadosAluno = this.dadosMensais.alunos[alunoId];
    if (!dadosAluno) return;
    
    const resumo = this.calcularResumoAluno(dadosAluno.dias || {});
    
    // Atualizar cache local
    this.dadosMensais.alunos[alunoId].resumo = resumo;
    
    // Salvar no Firestore
    const docId = `${this.turmaAtual}_${this.mesAtual}`;
    const alunoRef = db.collection('frequencia').doc(docId)
      .collection('alunos').doc(alunoId);
    
    await alunoRef.set({ resumo }, { merge: true });
    
    // Atualizar UI da linha
    this.updateResumoAlunoUI(alunoId, resumo);
  }

  calcularResumoAluno(diasMap) {
    const totais = { P: 0, F: 0, A: 0 };
    
    Object.values(diasMap).forEach(valor => {
      if (totais.hasOwnProperty(valor)) {
        totais[valor]++;
      }
    });
    
    const total = totais.P + totais.F + totais.A;
    const percentualFaltas = total > 0 ? (totais.F / total * 100) : 0;
    
    return {
      totalP: totais.P,
      totalF: totais.F,
      totalA: totais.A,
      percentualFaltas
    };
  }

  updateResumoAlunoUI(alunoId, resumo) {
    const linha = document.querySelector(`[data-aluno-id="${alunoId}"]`);
    if (!linha) return;
    
    linha.querySelector('.total-f').textContent = resumo.totalF;
    linha.querySelector('.total-a').textContent = resumo.totalA;
    linha.querySelector('.total-p').textContent = resumo.totalP;
    linha.querySelector('.percent-faltas').textContent = `${resumo.percentualFaltas.toFixed(2)}%`;
  }

  async recalcularAgregadoDia(dia) {
    const totais = { P: 0, F: 0, A: 0 };
    
    // Contar valores para este dia
    Object.values(this.dadosMensais.alunos).forEach(dadosAluno => {
      const valor = dadosAluno.dias?.[dia];
      if (totais.hasOwnProperty(valor)) {
        totais[valor]++;
      }
    });
    
    // Atualizar cache local
    if (!this.dadosMensais.agregadosDia[dia]) {
      this.dadosMensais.agregadosDia[dia] = { totais: {} };
    }
    this.dadosMensais.agregadosDia[dia].totais = totais;
    
    // Salvar no Firestore
    const docId = `${this.turmaAtual}_${this.mesAtual}`;
    const agregadoRef = db.collection('frequencia').doc(docId)
      .collection('agregadosDia').doc(dia);
    
    await agregadoRef.set({ totais }, { merge: true });
    
    // Atualizar UI do rodapé
    this.updateAgregadoDiaUI(dia, totais);
  }

  updateAgregadoDiaUI(dia, totais) {
    const diaNum = parseInt(dia);
    const rodape = document.querySelector('.rodape-totais');
    if (!rodape) return;
    
    // Encontrar a célula correta (pular as 2 primeiras colunas fixas)
    const cellIndex = diaNum + 1; // +1 porque começamos do 0
    const cell = rodape.children[cellIndex];
    if (cell) {
      cell.textContent = totais.F || '';
    }
  }

  updateSelectionUI() {
    const count = this.selectionManager.selectedCells.size;
    document.getElementById('celulas-selecionadas').textContent = count;
    document.getElementById('btn-salvar-lote').disabled = count === 0;
    document.getElementById('btn-limpar-selecao').disabled = count === 0;
  }

  abrirModalLote() {
    const count = this.selectionManager.selectedCells.size;
    if (count === 0) return;
    
    document.getElementById('total-selecionadas').textContent = count;
    document.getElementById('modal-lote').style.display = 'flex';
  }

  fecharModalLote() {
    document.getElementById('modal-lote').style.display = 'none';
  }

  async aplicarLote(valor) {
    const selectedCells = Array.from(this.selectionManager.selectedCells);
    if (selectedCells.length === 0) return;
    
    this.showLoading(true);
    
    try {
      // Usar batch write para melhor performance
      const batch = db.batch();
      const docId = `${this.turmaAtual}_${this.mesAtual}`;
      
      const updates = new Map();
      
      selectedCells.forEach(cell => {
        const alunoId = cell.dataset.alunoId;
        const dia = cell.dataset.dia;
        
        // Atualizar cache local
        if (!this.dadosMensais.alunos[alunoId]) {
          this.dadosMensais.alunos[alunoId] = { dias: {}, resumo: {} };
        }
        this.dadosMensais.alunos[alunoId].dias[dia] = valor;
        
        // Atualizar UI
        cell.textContent = valor;
        cell.className = 'col-dia celula-freq';
        if (valor) {
          cell.classList.add(`freq-${valor.toLowerCase()}`);
        }
        
        // Preparar update para batch
        if (!updates.has(alunoId)) {
          updates.set(alunoId, {});
        }
        updates.get(alunoId)[`dias.${dia}`] = valor;
      });
      
      // Adicionar updates ao batch
      updates.forEach((updateData, alunoId) => {
        const alunoRef = db.collection('frequencia').doc(docId)
          .collection('alunos').doc(alunoId);
        batch.set(alunoRef, updateData, { merge: true });
      });
      
      // Executar batch
      await batch.commit();
      
      // Recalcular estatísticas
      await this.recalcularTudoEMesclar();
      
      // Limpar seleção
      this.selectionManager.clearSelection();
      this.updateSelectionUI();
      
      // Fechar modal
      this.fecharModalLote();
      
      showToast(`Lote aplicado a ${selectedCells.length} células`, 'success');
      
    } catch (error) {
      console.error('Erro ao aplicar lote:', error);
      showToast('Erro ao aplicar lote', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async recalcularTudoEMesclar() {
    if (!this.turmaAtual || !this.mesAtual) return;
    
    this.showLoading(true);
    
    try {
      // Recalcular resumos de todos os alunos
      const alunosIds = Object.keys(this.dadosMensais.alunos);
      for (const alunoId of alunosIds) {
        await this.recalcularResumoAluno(alunoId);
      }
      
      // Recalcular agregados de todos os dias
      for (let dia = 1; dia <= this.diasNoMes; dia++) {
        const diaStr = String(dia).padStart(2, '0');
        await this.recalcularAgregadoDia(diaStr);
      }
      
      // Recarregar dados e rerender
      await this.loadMensalData(this.turmaAtual, this.mesAtual);
      this.renderTabela(this.alunosCache, this.diasNoMes, this.dadosMensais);
      
      showToast('Estatísticas recalculadas', 'success');
      
    } catch (error) {
      console.error('Erro ao recalcular:', error);
      showToast('Erro ao recalcular estatísticas', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  filtrarTabela(searchTerm) {
    const linhas = document.querySelectorAll('.linha-aluno');
    const term = searchTerm.toLowerCase().trim();
    
    linhas.forEach(linha => {
      const nome = linha.querySelector('.col-nome').textContent.toLowerCase();
      const codigo = linha.querySelector('.col-codigo').textContent.toLowerCase();
      
      const match = nome.includes(term) || codigo.includes(term);
      linha.style.display = match ? '' : 'none';
    });
  }

  exportarCSV(turmaId, anoMes) {
    if (!turmaId || !anoMes) {
      showToast('Selecione uma turma e mês', 'warning');
      return;
    }
    
    try {
      let csvContent = 'Código,Nome';
      
      // Cabeçalho - dias
      for (let dia = 1; dia <= this.diasNoMes; dia++) {
        csvContent += `,${String(dia).padStart(2, '0')}`;
      }
      csvContent += ',Total Faltas,Atestado,Presente,% Faltas\n';
      
      // Dados dos alunos
      this.alunosCache.forEach(aluno => {
        const dadosAluno = this.dadosMensais.alunos[aluno.alunoId] || { dias: {}, resumo: {} };
        
        let linha = `${aluno.id},"${aluno.nome}"`;
        
        // Dados por dia
        for (let dia = 1; dia <= this.diasNoMes; dia++) {
          const diaStr = String(dia).padStart(2, '0');
          const valor = dadosAluno.dias?.[diaStr] || '';
          linha += `,${valor}`;
        }
        
        // Resumo
        const resumo = dadosAluno.resumo || {};
        linha += `,${resumo.totalF || 0}`;
        linha += `,${resumo.totalA || 0}`;
        linha += `,${resumo.totalP || 0}`;
        linha += `,${(resumo.percentualFaltas || 0).toFixed(2)}%`;
        
        csvContent += linha + '\n';
      });
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `frequencia_${turmaId}_${anoMes}.csv`;
      link.click();
      
      showToast('CSV exportado com sucesso', 'success');
      
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      showToast('Erro ao exportar CSV', 'error');
    }
  }

  showLoading(show) {
    this.isLoading = show;
    const loading = document.getElementById('loading-frequencia');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }
}

class SelectionManager {
  constructor() {
    this.selectedCells = new Set();
    this.lastSelected = null;
  }

  selectSingle(cell) {
    this.clearSelection();
    this.selectedCells.add(cell);
    this.lastSelected = cell;
    this.updateCellAppearance();
  }

  toggleCell(cell) {
    if (this.selectedCells.has(cell)) {
      this.selectedCells.delete(cell);
    } else {
      this.selectedCells.add(cell);
    }
    this.lastSelected = cell;
    this.updateCellAppearance();
  }

  selectRange(startCell, endCell) {
    // Encontrar todas as células entre start e end
    const allCells = Array.from(document.querySelectorAll('.celula-freq'));
    const startIndex = allCells.indexOf(startCell);
    const endIndex = allCells.indexOf(endCell);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    // Selecionar intervalo
    for (let i = minIndex; i <= maxIndex; i++) {
      this.selectedCells.add(allCells[i]);
    }
    
    this.lastSelected = endCell;
    this.updateCellAppearance();
  }

  clearSelection() {
    this.selectedCells.clear();
    this.lastSelected = null;
    this.updateCellAppearance();
  }

  updateCellAppearance() {
    // Remover seleção de todas as células
    document.querySelectorAll('.celula-freq').forEach(cell => {
      cell.classList.remove('selected');
    });
    
    // Adicionar seleção às células selecionadas
    this.selectedCells.forEach(cell => {
      cell.classList.add('selected');
    });
  }
}

// Funções globais para compatibilidade
function initFrequenciaPage() {
  const manager = new FrequenciaManager();
  manager.init();
  window.frequenciaManager = manager;
}

function fecharModalLote() {
  if (window.frequenciaManager) {
    window.frequenciaManager.fecharModalLote();
  }
}

// Auto-inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tabela-frequencia')) {
    initFrequenciaPage();
  }
});

// Exportar para uso global
window.FrequenciaManager = FrequenciaManager;
window.initFrequenciaPage = initFrequenciaPage;