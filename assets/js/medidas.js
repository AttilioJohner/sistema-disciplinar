// ============================================
// MEDIDAS DISCIPLINARES - LÓGICA ESPECÍFICA
// ============================================

// ============================================
// FIREBASE FUNCTIONS - FALTAS
// ============================================
async function salvarFalta(event) {
    event.preventDefault();
    
    const alunoId = document.getElementById('alunoFalta').value;
    const data = document.getElementById('dataFalta').value;
    const tipo = document.getElementById('tipoFalta').value;
    const disciplina = document.getElementById('disciplinaFalta')?.value.trim() || '';
    const observacoes = document.getElementById('observacoesFalta').value.trim();

    if (!alunoId || !data || !tipo) {
        showMessage('Todos os campos obrigatórios devem ser preenchidos!', 'error');
        return;
    }

    try {
        showMessage('Registrando falta...', 'loading');
        
        if (!isFirebaseReady()) {
            showMessage('Firebase não está conectado', 'error');
            return;
        }
        
        const aluno = alunosCache.find(a => a.id === alunoId);
        if (!aluno) {
            showMessage('Aluno não encontrado', 'error');
            return;
        }
        
        const faltaData = {
            alunoId: alunoId,
            alunoNome: aluno.nome,
            alunoTurma: aluno.turma,
            data: data,
            tipo: tipo,
            disciplina: disciplina || null,
            observacoes: observacoes || null,
            dataRegistro: new Date().toISOString(),
            registradoPor: 'Sistema' // Pode ser alterado para usuário logado
        };

        await db.collection('faltas').add(faltaData);

        showMessage('✅ Falta registrada com sucesso!', 'success');
        limparFormFalta();
        carregarRegistrosRecentes();
        carregarEstatisticasMedidas();

    } catch (error) {
        console.error('Erro ao registrar falta:', error);
        showMessage(`Erro ao registrar falta: ${error.message}`, 'error');
    }
}

// ============================================
// FIREBASE FUNCTIONS - MEDIDAS
// ============================================
async function salvarMedida(event) {
    event.preventDefault();
    
    const alunoId = document.getElementById('alunoMedida').value;
    const data = document.getElementById('dataMedida').value;
    const tipo = document.getElementById('tipoMedida').value;
    const gravidade = document.getElementById('gravidadeMedida')?.value || '';
    const motivo = document.getElementById('motivoMedida').value.trim();
    const acoes = document.getElementById('acoesMedida')?.value.trim() || '';

    if (!alunoId || !data || !tipo || !motivo) {
        showMessage('Todos os campos obrigatórios devem ser preenchidos!', 'error');
        return;
    }

    try {
        showMessage('Registrando medida disciplinar...', 'loading');
        
        if (!isFirebaseReady()) {
            showMessage('Firebase não está conectado', 'error');
            return;
        }
        
        const aluno = alunosCache.find(a => a.id === alunoId);
        if (!aluno) {
            showMessage('Aluno não encontrado', 'error');
            return;
        }
        
        const medidaData = {
            alunoId: alunoId,
            alunoNome: aluno.nome,
            alunoTurma: aluno.turma,
            data: data,
            tipo: tipo,
            gravidade: gravidade || null,
            motivo: motivo,
            acoes: acoes || null,
            dataRegistro: new Date().toISOString(),
            registradoPor: 'Sistema', // Pode ser alterado para usuário logado
            status: 'Ativa' // Status da medida
        };

        await db.collection('medidas').add(medidaData);

        showMessage('✅ Medida disciplinar registrada com sucesso!', 'success');
        limparFormMedida();
        carregarRegistrosRecentes();
        carregarEstatisticasMedidas();
        carregarTabelaMedidas(alunoId);

        // Notificação especial para medidas graves
        if (gravidade === 'Grave' || gravidade === 'Gravíssima') {
            showMessage('⚠️ Medida de alta gravidade registrada - considere comunicar aos responsáveis', 'warning');
        }

    } catch (error) {
        console.error('Erro ao registrar medida:', error);
        showMessage(`Erro ao registrar medida: ${error.message}`, 'error');
    }
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
async function carregarSelectsAlunos() {
    try {
        // Se não temos alunos cache, carregar
        if (!alunosCache || alunosCache.length === 0) {
            const querySnapshot = await db.collection('alunos')
                .where('ativo', '==', true)
                .orderBy('nome')
                .get();
            
            alunosCache = [];
            querySnapshot.forEach((doc) => {
                alunosCache.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }

        const selectFalta = document.getElementById('alunoFalta');
        const selectMedida = document.getElementById('alunoMedida');

        selectFalta.innerHTML = '<option value="">Selecione o aluno...</option>';
        selectMedida.innerHTML = '<option value="">Selecione o aluno...</option>';
        
        alunosCache.forEach(aluno => {
            const option = `<option value="${aluno.id}">${aluno.nome} (${aluno.turma})</option>`;
            selectFalta.innerHTML += option;
            selectMedida.innerHTML += option;
        });

        selectMedida.addEventListener('change', e => {
            carregarTabelaMedidas(e.target.value);
        });

        carregarTabelaMedidas(selectMedida.value);

    } catch (error) {
        console.error('Erro ao carregar selects de alunos:', error);
        showMessage('Erro ao carregar lista de alunos', 'error');
    }
}

async function carregarRegistrosRecentes() {
    try {
        const container = document.getElementById('registrosRecentes');
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Carregando registros recentes...</p>
            </div>
        `;

        if (!isFirebaseReady()) {
            throw new Error('Firebase não conectado');
        }

        // Carregar faltas recentes
        const faltasSnapshot = await db.collection('faltas')
            .orderBy('dataRegistro', 'desc')
            .limit(15)
            .get();
        
        const faltas = [];
        faltasSnapshot.forEach(doc => {
            faltas.push({
                id: doc.id,
                ...doc.data(),
                categoria: 'falta'
            });
        });

        // Carregar medidas recentes
        const medidasSnapshot = await db.collection('medidas')
            .orderBy('dataRegistro', 'desc')
            .limit(15)
            .get();
        
        const medidas = [];
        medidasSnapshot.forEach(doc => {
            medidas.push({
                id: doc.id,
                ...doc.data(),
                categoria: 'medida'
            });
        });

        // Combinar e ordenar
        registrosCache = [...faltas, ...medidas]
            .sort((a, b) => new Date(b.dataRegistro) - new Date(a.dataRegistro))
            .slice(0, 20);

        displayRegistrosRecentes(registrosCache);

    } catch (error) {
        console.error('Erro ao carregar registros:', error);
        document.getElementById('registrosRecentes').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Erro ao carregar registros</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="carregarRegistrosRecentes()">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function displayRegistrosRecentes(registros) {
    const container = document.getElementById('registrosRecentes');
    
    if (registros.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Nenhum registro encontrado</h3>
                <p>Os registros de faltas e medidas aparecerão aqui</p>
            </div>
        `;
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${registros.map(registro => {
                    const dataFormatada = formatarData(registro.data);
                    let tipoDisplay, descricao, acoes;
                    
                    if (registro.categoria === 'falta') {
                        tipoDisplay = `<span class="detail-type ${registro.tipo}">
                            ${registro.tipo === 'F' ? 'Falta' : 
                              registro.tipo === 'A' ? 'Abonada' : 'Presença'}
                        </span>`;
                        descricao = `
                            ${registro.disciplina ? `<strong>${registro.disciplina}</strong><br>` : ''}
                            ${registro.observacoes || 
                                (registro.tipo === 'F' ? 'Falta Injustificada' :
                                 registro.tipo === 'A' ? 'Falta Justificada' : 'Presença')}
                        `;
                        acoes = `
                            <button class="btn btn-info btn-small" onclick="editarFalta('${registro.id}')" title="Editar">✏️</button>
                            <button class="btn btn-warning btn-small" onclick="excluirRegistro('faltas', '${registro.id}')" title="Excluir">🗑️</button>
                        `;
                    } else {
                        const gravidadeClass = {
                            'Leve': 'success',
                            'Moderada': 'warning', 
                            'Grave': 'danger',
                            'Gravíssima': 'danger'
                        }[registro.gravidade] || 'info';
                        
                        tipoDisplay = `<span class="detail-type" style="background: #fff5e6; color: #ffc107; border: 1px solid #ffc107;">MEDIDA</span>`;
                        descricao = `
                            <strong>${registro.tipo}</strong>
                            ${registro.gravidade ? `<span class="detail-type ${gravidadeClass}" style="margin-left: 5px; font-size: 10px;">${registro.gravidade}</span>` : ''}
                            <br><small>${registro.motivo.length > 100 ? registro.motivo.substring(0, 100) + '...' : registro.motivo}</small>
                        `;
                        acoes = `
                            <button class="btn btn-info btn-small" onclick="editarMedida('${registro.id}')" title="Editar">✏️</button>
                            <button class="btn btn-success btn-small" onclick="verDetalhesMedida('${registro.id}')" title="Detalhes">👁️</button>
                            <button class="btn btn-warning btn-small" onclick="excluirRegistro('medidas', '${registro.id}')" title="Excluir">🗑️</button>
                        `;
                    }
                    
                    return `
                        <tr>
                            <td>${dataFormatada}</td>
                            <td><strong>${registro.alunoNome}</strong></td>
                            <td><span class="student-class">${registro.alunoTurma}</span></td>
                            <td>${tipoDisplay}</td>
                            <td>${descricao}</td>
                            <td>${acoes}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

async function carregarEstatisticasMedidas() {
    try {
        if (!isFirebaseReady()) return;

        const hoje = new Date().toISOString().split('T')[0];
        const inicioSemana = getStartOfWeek();
        const inicioMes = getStartOfMonth();

        // Faltas hoje
        const faltasHoje = registrosCache.filter(r => 
            r.categoria === 'falta' && r.data === hoje
        ).length;

        // Medidas esta semana
        const medidasSemana = registrosCache.filter(r => 
            r.categoria === 'medida' && new Date(r.data) >= inicioSemana
        ).length;

        // Total de registros este mês
        const registrosMes = registrosCache.filter(r => 
            new Date(r.data) >= inicioMes
        ).length;

        // Alunos únicos afetados
        const alunosAfetados = new Set(
            registrosCache.map(r => r.alunoId)
        ).size;

        // Atualizar interface
        document.getElementById('totalFaltasHoje').textContent = faltasHoje;
        document.getElementById('totalMedidasSemana').textContent = medidasSemana;
        document.getElementById('totalRegistrosMes').textContent = registrosMes;
        document.getElementById('alunosAfetados').textContent = alunosAfetados;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ============================================
// AÇÕES DOS REGISTROS
// ============================================
async function excluirRegistro(colecao, registroId) {
    if (!confirm('Tem certeza que deseja excluir este registro?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }

    try {
        showMessage('Excluindo registro...', 'loading');
        
        await db.collection(colecao).doc(registroId).delete();
        
        showMessage('✅ Registro excluído com sucesso!', 'success');
        carregarRegistrosRecentes();
        carregarEstatisticasMedidas();

    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        showMessage(`Erro ao excluir registro: ${error.message}`, 'error');
    }
}

function verDetalhesMedida(medidaId) {
    const medida = registrosCache.find(r => r.id === medidaId && r.categoria === 'medida');
    if (!medida) {
        showMessage('Medida não encontrada', 'error');
        return;
    }

    const detalhes = `
DETALHES DA MEDIDA DISCIPLINAR

Aluno: ${medida.alunoNome} (${medida.alunoTurma})
Data da Ocorrência: ${formatarData(medida.data)}
Tipo: ${medida.tipo}
Gravidade: ${medida.gravidade || 'Não especificada'}

MOTIVO:
${medida.motivo}

${medida.acoes ? `AÇÕES TOMADAS:\n${medida.acoes}` : ''}

Registrado em: ${formatarDataHora(medida.dataRegistro)}
Registrado por: ${medida.registradoPor || 'Sistema'}
Status: ${medida.status || 'Ativa'}
    `;

    alert(detalhes);
}

function editarFalta(faltaId) {
    showMessage('Funcionalidade de edição em desenvolvimento', 'info');
}

function editarMedida(medidaId) {
    showMessage('Funcionalidade de edição em desenvolvimento', 'info');
}

// ============================================
// FILTROS E PESQUISA
// ============================================
function filtrarRegistrosRecentes(filtro) {
    let registrosFiltrados = [...registrosCache];
    
    if (filtro === 'faltas') {
        registrosFiltrados = registrosCache.filter(r => r.categoria === 'falta');
    } else if (filtro === 'medidas') {
        registrosFiltrados = registrosCache.filter(r => r.categoria === 'medida');
    }
    
    displayRegistrosRecentes(registrosFiltrados);
    showMessage(`🔍 Filtro aplicado: ${registrosFiltrados.length} registro(s)`, 'info');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function limparFormFalta() {
    document.getElementById('formFalta').reset();
    document.getElementById('dataFalta').value = new Date().toISOString().split('T')[0];
    document.getElementById('alunoFalta').focus();
}

function limparFormMedida() {
    document.getElementById('formMedida').reset();
    document.getElementById('dataMedida').value = new Date().toISOString().split('T')[0];
    document.getElementById('alunoMedida').focus();
}

function getStartOfWeek() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

function getStartOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function exportarRegistros() {
    if (registrosCache.length === 0) {
        showMessage('Nenhum registro para exportar', 'error');
        return;
    }
    
    try {
        const dadosExport = registrosCache.map(registro => ({
            'Data': formatarData(registro.data),
            'Aluno': registro.alunoNome,
            'Turma': registro.alunoTurma,
            'Categoria': registro.categoria === 'falta' ? 'Falta' : 'Medida Disciplinar',
            'Tipo': registro.categoria === 'falta' ? 
                (registro.tipo === 'F' ? 'Falta Injustificada' : 
                 registro.tipo === 'A' ? 'Falta Justificada' : 'Presença') :
                registro.tipo,
            'Gravidade': registro.gravidade || '',
            'Disciplina': registro.disciplina || '',
            'Descrição': registro.categoria === 'falta' ? 
                registro.observacoes || '' : 
                registro.motivo || '',
            'Registrado em': formatarDataHora(registro.dataRegistro)
        }));

        const csv = convertToCSV(dadosExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `registros_disciplinares_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showMessage('✅ Registros exportados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        showMessage('Erro ao exportar dados', 'error');
    }
}

async function carregarTabelaMedidas(alunoId) {
    const tabela = document.getElementById('medidasTable');
    if (!tabela) return;
    const tbody = tabela.querySelector('tbody');
    tbody.innerHTML = '';

    if (!alunoId) {
        const colCount = tabela.querySelectorAll('thead th').length;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${colCount}">Selecione um aluno para visualizar as medidas.</td>`;
        tbody.appendChild(tr);
        return;
    }

    try {
        const resp = await fetch(`/medidas?alunoId=${encodeURIComponent(alunoId)}`);
        const dados = await resp.json();
        if (!Array.isArray(dados) || dados.length === 0) {
            const colCount = tabela.querySelectorAll('thead th').length;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${colCount}">Nenhuma medida encontrada.</td>`;
            tbody.appendChild(tr);
            return;
        }

        dados.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.data ? new Date(m.data).toLocaleDateString('pt-BR') : ''}</td>
                <td>${m.peso ?? ''}</td>
                <td>${m.altura ?? ''}</td>
                <td>${m.imc ?? ''}</td>
                <td>${m.cintura ?? ''}</td>
                <td>${m.quadril ?? ''}</td>
                <td>${m.observacoes ?? ''}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar medidas:', error);
        const colCount = tabela.querySelectorAll('thead th').length;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${colCount}">Erro ao carregar medidas.</td>`;
        tbody.appendChild(tr);
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.salvarFalta = salvarFalta;
window.salvarMedida = salvarMedida;
window.carregarSelectsAlunos = carregarSelectsAlunos;
window.carregarRegistrosRecentes = carregarRegistrosRecentes;
window.carregarEstatisticasMedidas = carregarEstatisticasMedidas;
window.limparFormFalta = limparFormFalta;
window.limparFormMedida = limparFormMedida;
window.filtrarRegistrosRecentes = filtrarRegistrosRecentes;
window.excluirRegistro = excluirRegistro;
window.verDetalhesMedida = verDetalhesMedida;
window.editarFalta = editarFalta;
window.editarMedida = editarMedida;
window.exportarRegistros = exportarRegistros;
window.carregarTabelaMedidas = carregarTabelaMedidas;
