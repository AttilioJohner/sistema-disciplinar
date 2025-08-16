// ============================================
// RELATÓRIOS - LÓGICA ESPECÍFICA
// ============================================

// Variáveis específicas dos relatórios
let processedDataRelatorios = [];
let filteredDataRelatorios = [];

// ============================================
// CARREGAMENTO DE DADOS PARA RELATÓRIOS
// ============================================
async function carregarEstatisticas() {
    try {
        if (!isFirebaseReady()) return;

        // Carregar alunos
        const alunosSnapshot = await db.collection('alunos')
            .where('ativo', '==', true)
            .get();
        const totalAlunos = alunosSnapshot.size;

        // Carregar faltas
        const faltasSnapshot = await db.collection('faltas').get();
        const totalFaltas = faltasSnapshot.size;

        // Carregar medidas
        const medidasSnapshot = await db.collection('medidas').get();
        const totalMedidas = medidasSnapshot.size;

        // Calcular média
        const mediaFaltas = totalAlunos > 0 ? (totalFaltas / totalAlunos).toFixed(1) : 0;

        // Atualizar interface
        document.getElementById('totalAlunos').textContent = totalAlunos;
        document.getElementById('totalFaltas').textContent = totalFaltas;
        document.getElementById('totalMedidas').textContent = totalMedidas;
        document.getElementById('mediaFaltas').textContent = mediaFaltas;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function carregarDadosRelatorios() {
    try {
        if (!isFirebaseReady()) {
            throw new Error('Firebase não conectado');
        }

        showMessage('Processando dados...', 'loading');

        // Carregar todos os dados
        const alunosSnapshot = await db.collection('alunos')
            .where('ativo', '==', true)
            .get();
        
        const faltasSnapshot = await db.collection('faltas').get();
        const medidasSnapshot = await db.collection('medidas').get();

        // Processar dados
        processedDataRelatorios = processarDadosFirebaseRelatorios(alunosSnapshot, faltasSnapshot, medidasSnapshot);
        filteredDataRelatorios = [...processedDataRelatorios];

        // Atualizar filtros
        atualizarFiltrosRelatorios();

        // Exibir dados
        displayRelatorios();
        
        // Mostrar resumo estatístico
        exibirResumoEstatistico();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('relatorioContainer').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Erro ao carregar dados</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="carregarDadosRelatorios()">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function processarDadosFirebaseRelatorios(alunosSnapshot, faltasSnapshot, medidasSnapshot) {
    const alunos = [];
    const faltasMap = new Map();
    const medidasMap = new Map();

    // Processar faltas
    faltasSnapshot.forEach(doc => {
        const falta = doc.data();
        if (!faltasMap.has(falta.alunoId)) {
            faltasMap.set(falta.alunoId, []);
        }
        faltasMap.get(falta.alunoId).push({
            id: doc.id,
            ...falta
        });
    });

    // Processar medidas
    medidasSnapshot.forEach(doc => {
        const medida = doc.data();
        if (!medidasMap.has(medida.alunoId)) {
            medidasMap.set(medida.alunoId, []);
        }
        medidasMap.get(medida.alunoId).push({
            id: doc.id,
            ...medida
        });
    });

    // Processar alunos
    alunosSnapshot.forEach(doc => {
        const aluno = { id: doc.id, ...doc.data() };
        const faltas = faltasMap.get(aluno.id) || [];
        const medidas = medidasMap.get(aluno.id) || [];

        // Calcular estatísticas detalhadas
        let totalFaltas = 0;
        let faltasInjustificadas = 0;
        let faltasJustificadas = 0;
        let presencas = 0;

        // Estatísticas por disciplina
        const faltasPorDisciplina = new Map();

        faltas.forEach(falta => {
            if (falta.tipo === 'F') {
                totalFaltas++;
                faltasInjustificadas++;
            } else if (falta.tipo === 'A') {
                totalFaltas++;
                faltasJustificadas++;
            } else if (falta.tipo === 'P') {
                presencas++;
            }

            // Contar por disciplina
            const disciplina = falta.disciplina || 'Geral';
            faltasPorDisciplina.set(disciplina, (faltasPorDisciplina.get(disciplina) || 0) + 1);
        });

        // Análise de medidas por gravidade
        const medidasPorGravidade = {
            'Leve': 0,
            'Moderada': 0,
            'Grave': 0,
            'Gravíssima': 0
        };

        medidas.forEach(medida => {
            const gravidade = medida.gravidade || 'Leve';
            if (medidasPorGravidade.hasOwnProperty(gravidade)) {
                medidasPorGravidade[gravidade]++;
            }
        });

        // Calcular dados temporais
        const ultimaFalta = faltas.length > 0 ? 
            Math.max(...faltas.map(f => new Date(f.data).getTime())) : 0;
        
        const ultimaMedida = medidas.length > 0 ? 
            Math.max(...medidas.map(m => new Date(m.data).getTime())) : 0;

        // Calcular frequência (últimos 30 dias)
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);
        
        const faltasRecentes = faltas.filter(f => new Date(f.data) >= dataLimite);
        const medidasRecentes = medidas.filter(m => new Date(m.data) >= dataLimite);

        // Score de risco (algoritmo simples)
        const riskScore = calcularScoreRisco(faltasInjustificadas, medidas, medidasPorGravidade);

        alunos.push({
            id: aluno.id,
            nome: aluno.nome,
            turma: aluno.turma,
            responsavel: aluno.responsavel,
            telefoneResponsavel: aluno.telefoneResponsavel,
            emailResponsavel: aluno.emailResponsavel,
            faltas: faltas,
            medidas: medidas,
            totalFaltas: totalFaltas,
            faltasInjustificadas: faltasInjustificadas,
            faltasJustificadas: faltasJustificadas,
            presencas: presencas,
            totalMedidas: medidas.length,
            faltasPorDisciplina: faltasPorDisciplina,
            medidasPorGravidade: medidasPorGravidade,
            ultimaFalta: ultimaFalta,
            ultimaMedida: ultimaMedida,
            faltasRecentes: faltasRecentes.length,
            medidasRecentes: medidasRecentes.length,
            riskScore: riskScore,
            statusRisco: getRiskStatus(riskScore)
        });
    });

    return alunos.sort((a, b) => a.nome.localeCompare(b.nome));
}

function calcularScoreRisco(faltasInjustificadas, medidas, medidasPorGravidade) {
    let score = 0;
    
    // Pontos por faltas injustificadas
    score += faltasInjustificadas * 2;
    
    // Pontos por medidas com peso por gravidade
    score += medidasPorGravidade['Leve'] * 1;
    score += medidasPorGravidade['Moderada'] * 3;
    score += medidasPorGravidade['Grave'] * 6;
    score += medidasPorGravidade['Gravíssima'] * 10;
    
    return score;
}

function getRiskStatus(score) {
    if (score === 0) return 'Baixo';
    if (score <= 5) return 'Baixo';
    if (score <= 15) return 'Médio';
    if (score <= 30) return 'Alto';
    return 'Crítico';
}

// ============================================
// FILTROS E PESQUISA
// ============================================
function atualizarFiltrosRelatorios() {
    const filtroTurma = document.getElementById('filtroTurma');
    const filtroAluno = document.getElementById('filtroAluno');
    
    // Atualizar turmas
    const turmas = [...new Set(processedDataRelatorios.map(aluno => aluno.turma))].sort();
    filtroTurma.innerHTML = '<option value="">Todas as turmas</option>';
    turmas.forEach(turma => {
        filtroTurma.innerHTML += `<option value="${turma}">${turma}</option>`;
    });
    
    // Atualizar alunos
    const alunos = processedDataRelatorios
        .map(aluno => ({ id: aluno.id, nome: aluno.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    filtroAluno.innerHTML = '<option value="">Todos os alunos</option>';
    alunos.forEach(aluno => {
        filtroAluno.innerHTML += `<option value="${aluno.id}">${aluno.nome}</option>`;
    });
}

function aplicarFiltros() {
    const turmaFiltro = document.getElementById('filtroTurma').value;
    const alunoFiltro = document.getElementById('filtroAluno').value;
    const periodoFiltro = document.getElementById('filtroPeriodo').value;
    const tipoFiltro = document.getElementById('filtroTipo').value;
    const ordenacao = document.getElementById('filtroOrdenacao').value;
    const pesquisaTexto = document.getElementById('pesquisaTexto').value.toLowerCase().trim();

    // Aplicar filtros
    filteredDataRelatorios = processedDataRelatorios.filter(aluno => {
        const matchTurma = !turmaFiltro || aluno.turma === turmaFiltro;
        const matchAluno = !alunoFiltro || aluno.id === alunoFiltro;
        const matchPesquisa = !pesquisaTexto || aluno.nome.toLowerCase().includes(pesquisaTexto);
        
        let matchPeriodo = true;
        if (periodoFiltro && periodoFiltro !== 'todos') {
            const diasPeriodo = parseInt(periodoFiltro);
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - diasPeriodo);
            
            const temRegistroRecente = aluno.faltas.some(falta => 
                new Date(falta.data) >= dataLimite
            ) || aluno.medidas.some(medida => 
                new Date(medida.data) >= dataLimite
            );
            
            matchPeriodo = temRegistroRecente;
        }

        let matchTipo = true;
        if (tipoFiltro && tipoFiltro !== 'todos') {
            switch(tipoFiltro) {
                case 'faltas':
                    matchTipo = aluno.totalFaltas > 0;
                    break;
                case 'medidas':
                    matchTipo = aluno.totalMedidas > 0;
                    break;
                case 'criticos':
                    matchTipo = aluno.statusRisco === 'Alto' || aluno.statusRisco === 'Crítico';
                    break;
            }
        }
        
        return matchTurma && matchAluno && matchPesquisa && matchPeriodo && matchTipo;
    });

    // Aplicar ordenação
    switch(ordenacao) {
        case 'nome':
            filteredDataRelatorios.sort((a, b) => a.nome.localeCompare(b.nome));
            break;
        case 'nomeDesc':
            filteredDataRelatorios.sort((a, b) => b.nome.localeCompare(a.nome));
            break;
        case 'totalFaltas':
            filteredDataRelatorios.sort((a, b) => b.totalFaltas - a.totalFaltas);
            break;
        case 'faltasInjustificadas':
            filteredDataRelatorios.sort((a, b) => b.faltasInjustificadas - a.faltasInjustificadas);
            break;
        case 'totalMedidas':
            filteredDataRelatorios.sort((a, b) => b.totalMedidas - a.totalMedidas);
            break;
        case 'ultimaFalta':
            filteredDataRelatorios.sort((a, b) => b.ultimaFalta - a.ultimaFalta);
            break;
    }

    displayRelatorios();
    exibirResumoEstatistico();
    showMessage(`✅ Filtros aplicados - ${filteredDataRelatorios.length} aluno(s) encontrado(s)`, 'success');
}

function limparFiltros() {
    document.getElementById('filtroTurma').value = '';
    document.getElementById('filtroAluno').value = '';
    document.getElementById('filtroPeriodo').value = '30';
    document.getElementById('filtroTipo').value = 'todos';
    document.getElementById('filtroOrdenacao').value = 'nome';
    document.getElementById('pesquisaTexto').value = '';
    
    filteredDataRelatorios = [...processedDataRelatorios];
    displayRelatorios();
    exibirResumoEstatistico();
    showMessage('🔄 Filtros limpos', 'info');
}

// ============================================
// EXIBIÇÃO DE RELATÓRIOS
// ============================================
function displayRelatorios() {
    const container = document.getElementById('relatorioContainer');
    
    if (filteredDataRelatorios.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Nenhum aluno encontrado</h3>
                <p>Tente ajustar os filtros ou cadastre mais alunos</p>
            </div>
        `;
        return;
    }

    const html = filteredDataRelatorios.map(aluno => `
        <div class="student-card">
            <div class="student-header">
                <div class="student-name">${aluno.nome}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <div class="student-class">${aluno.turma}</div>
                    <span class="trend-indicator trend-${getRiskColor(aluno.statusRisco)}">
                        ${aluno.statusRisco}
                    </span>
                </div>
            </div>
            
            <div class="student-stats">
                <div class="stat-box">
                    <div class="stat-number" style="color: #dc3545;">${aluno.totalFaltas}</div>
                    <div class="stat-label">Total Faltas</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #dc3545;">${aluno.faltasInjustificadas}</div>
                    <div class="stat-label">Injustificadas</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #28a745;">${aluno.faltasJustificadas}</div>
                    <div class="stat-label">Justificadas</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #17a2b8;">${aluno.presencas}</div>
                    <div class="stat-label">Presenças</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #ffc107;">${aluno.totalMedidas}</div>
                    <div class="stat-label">Medidas</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #6f42c1;">${aluno.riskScore}</div>
                    <div class="stat-label">Score Risco</div>
                </div>
            </div>

            ${aluno.responsavel ? `
                <div class="details-section">
                    <div class="details-title">👤 Informações do Responsável</div>
                    <div class="detail-item">
                        <span><strong>Nome:</strong> ${aluno.responsavel}</span>
                    </div>
                    ${aluno.telefoneResponsavel ? `
                        <div class="detail-item">
                            <span><strong>Telefone:</strong> ${aluno.telefoneResponsavel}</span>
                        </div>
                    ` : ''}
                    ${aluno.emailResponsavel ? `
                        <div class="detail-item">
                            <span><strong>Email:</strong> ${aluno.emailResponsavel}</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            ${aluno.faltasPorDisciplina.size > 0 ? `
                <div class="details-section">
                    <div class="details-title">📚 Faltas por Disciplina</div>
                    ${Array.from(aluno.faltasPorDisciplina.entries()).map(([disciplina, count]) => `
                        <div class="detail-item">
                            <span>${disciplina}</span>
                            <span class="detail-type" style="background: #ffebee; color: #dc3545;">${count}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${aluno.faltas.length > 0 ? `
                <div class="details-section">
                    <div class="details-title">📅 Histórico de Faltas (Últimas 5)</div>
                    ${aluno.faltas.slice(-5).reverse().map(falta => `
                        <div class="detail-item">
                            <div>
                                <span class="detail-date">${formatarData(falta.data)}</span>
                                ${falta.disciplina ? `<span style="color: #666; font-size: 12px;"> - ${falta.disciplina}</span>` : ''}
                            </div>
                            <span class="detail-type ${falta.tipo}">
                                ${falta.tipo === 'F' ? 'Falta' : falta.tipo === 'A' ? 'Abonada' : 'Presente'}
                            </span>
                        </div>
                    `).join('')}
                    ${aluno.faltas.length > 5 ? `
                        <div style="text-align: center; padding: 10px; color: #666; font-style: italic;">
                            ... e mais ${aluno.faltas.length - 5} registros
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            ${aluno.medidas.length > 0 ? `
                <div class="details-section">
                    <div class="details-title">⚖️ Medidas Disciplinares (Últimas 3)</div>
                    ${aluno.medidas.slice(-3).reverse().map(medida => `
                        <div class="detail-item">
                            <div>
                                <div class="detail-date">${formatarData(medida.data)}</div>
                                <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                                    <strong>${medida.tipo}</strong>
                                    ${medida.gravidade ? `<span class="detail-type ${getRiskColor(medida.gravidade)}" style="margin-left: 8px; font-size: 10px;">${medida.gravidade}</span>` : ''}
                                    <br>
                                    ${medida.motivo.length > 100 ? medida.motivo.substring(0, 100) + '...' : medida.motivo}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${aluno.medidas.length > 3 ? `
                        <div style="text-align: center; padding: 10px; color: #666; font-style: italic;">
                            ... e mais ${aluno.medidas.length - 3} registros
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <div class="details-section">
                <div class="details-title">📊 Ações Recomendadas</div>
                <div style="padding: 10px; background: #f8f9fa; border-radius: 4px;">
                    ${gerarRecomendacoes(aluno)}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function getRiskColor(status) {
    switch(status) {
        case 'Baixo': case 'Leve': return 'down';
        case 'Médio': case 'Moderada': return 'stable';
        case 'Alto': case 'Grave': return 'up';
        case 'Crítico': case 'Gravíssima': return 'up';
        default: return 'stable';
    }
}

function gerarRecomendacoes(aluno) {
    const recomendacoes = [];

    if (aluno.faltasInjustificadas > 10) {
        recomendacoes.push('🚨 Aluno com muitas faltas injustificadas - contatar responsáveis urgentemente');
    } else if (aluno.faltasInjustificadas > 5) {
        recomendacoes.push('⚠️ Monitorar frequência e conversar com o aluno');
    }

    if (aluno.totalMedidas > 3) {
        recomendacoes.push('📋 Histórico de medidas disciplinares - considerar acompanhamento psicopedagógico');
    }

    if (aluno.medidasPorGravidade['Grave'] > 0 || aluno.medidasPorGravidade['Gravíssima'] > 0) {
        recomendacoes.push('🔴 Medidas graves aplicadas - reunião com coordenação necessária');
    }

    if (aluno.faltasRecentes > 5) {
        recomendacoes.push('📅 Muitas faltas recentes - investigar possíveis causas');
    }

    if (!aluno.responsavel || (!aluno.telefoneResponsavel && !aluno.emailResponsavel)) {
        recomendacoes.push('📞 Dados de contato incompletos - atualizar informações');
    }

    if (recomendacoes.length === 0) {
        if (aluno.totalFaltas === 0 && aluno.totalMedidas === 0) {
            recomendacoes.push('✅ Aluno sem registros disciplinares - manter acompanhamento preventivo');
        } else {
            recomendacoes.push('✅ Situação dentro da normalidade - manter monitoramento');
        }
    }

    return recomendacoes.map(rec => `<div style="margin-bottom: 5px;">${rec}</div>`).join('');
}

// ============================================
// RESUMO ESTATÍSTICO
// ============================================
function exibirResumoEstatistico() {
    const container = document.getElementById('estatisticasResumo');
    const resumoSection = document.getElementById('resumoEstatistico');
    
    if (filteredDataRelatorios.length === 0) {
        resumoSection.style.display = 'none';
        return;
    }

    const stats = calcularEstatisticasResumo(filteredDataRelatorios);
    
    const html = `
        <div class="stat-box">
            <div class="stat-number">${stats.totalAlunos}</div>
            <div class="stat-label">Alunos Filtrados</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${stats.mediaFaltas}</div>
            <div class="stat-label">Média Faltas</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${stats.alunosCriticos}</div>
            <div class="stat-label">Casos Críticos</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${stats.turmasAfetadas}</div>
            <div class="stat-label">Turmas Afetadas</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${stats.percentualComProblemas}%</div>
            <div class="stat-label">Com Problemas</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${stats.disciplinaMaisProblematica}</div>
            <div class="stat-label">Disciplina Crítica</div>
        </div>
    `;
    
    container.innerHTML = html;
    resumoSection.style.display = 'block';
}

function calcularEstatisticasResumo(dados) {
    const totalAlunos = dados.length;
    const totalFaltas = dados.reduce((sum, aluno) => sum + aluno.totalFaltas, 0);
    const mediaFaltas = totalAlunos > 0 ? (totalFaltas / totalAlunos).toFixed(1) : 0;
    
    const alunosCriticos = dados.filter(aluno => 
        aluno.statusRisco === 'Alto' || aluno.statusRisco === 'Crítico'
    ).length;
    
    const turmasAfetadas = new Set(
        dados.filter(aluno => aluno.totalFaltas > 0 || aluno.totalMedidas > 0)
             .map(aluno => aluno.turma)
    ).size;
    
    const alunosComProblemas = dados.filter(aluno => 
        aluno.totalFaltas > 0 || aluno.totalMedidas > 0
    ).length;
    const percentualComProblemas = totalAlunos > 0 ? 
        Math.round((alunosComProblemas / totalAlunos) * 100) : 0;
    
    // Disciplina mais problemática
    const disciplinasCount = new Map();
    dados.forEach(aluno => {
        aluno.faltasPorDisciplina.forEach((count, disciplina) => {
            disciplinasCount.set(disciplina, (disciplinasCount.get(disciplina) || 0) + count);
        });
    });
    
    let disciplinaMaisProblematica = 'N/A';
    if (disciplinasCount.size > 0) {
        disciplinaMaisProblematica = Array.from(disciplinasCount.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    return {
        totalAlunos,
        mediaFaltas,
        alunosCriticos,
        turmasAfetadas,
        percentualComProblemas,
        disciplinaMaisProblematica
    };
}

// ============================================
// EXPORTAÇÃO E RELATÓRIOS
// ============================================
function exportarRelatorio() {
    if (filteredDataRelatorios.length === 0) {
        showMessage('Nenhum dado para exportar', 'error');
        return;
    }
    
    try {
        const dadosExport = filteredDataRelatorios.map(aluno => ({
            'Nome': aluno.nome,
            'Turma': aluno.turma,
            'Total Faltas': aluno.totalFaltas,
            'Faltas Injustificadas': aluno.faltasInjustificadas,
            'Faltas Justificadas': aluno.faltasJustificadas,
            'Total Medidas': aluno.totalMedidas,
            'Score Risco': aluno.riskScore,
            'Status Risco': aluno.statusRisco,
            'Responsável': aluno.responsavel || '',
            'Telefone': aluno.telefoneResponsavel || '',
            'Email': aluno.emailResponsavel || '',
            'Última Falta': aluno.ultimaFalta ? formatarData(new Date(aluno.ultimaFalta)) : '',
            'Última Medida': aluno.ultimaMedida ? formatarData(new Date(aluno.ultimaMedida)) : ''
        }));

        const csv = convertToCSV(dadosExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_disciplinar_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showMessage('✅ Relatório exportado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        showMessage('Erro ao exportar relatório', 'error');
    }
}

function gerarRelatorioCompleto() {
    if (filteredDataRelatorios.length === 0) {
        showMessage('Nenhum dado para gerar relatório', 'error');
        return;
    }

    const stats = calcularEstatisticasResumo(filteredDataRelatorios);
    const dataAtual = formatarDataHora(new Date());

    const relatorioCompleto = `
RELATÓRIO DISCIPLINAR COMPLETO
===============================

Data de Geração: ${dataAtual}
Período Analisado: ${document.getElementById('filtroPeriodo').options[document.getElementById('filtroPeriodo').selectedIndex].text}

RESUMO EXECUTIVO
================
• Total de Alunos Analisados: ${stats.totalAlunos}
• Média de Faltas por Aluno: ${stats.mediaFaltas}
• Casos Críticos Identificados: ${stats.alunosCriticos}
• Turmas Afetadas: ${stats.turmasAfetadas}
• Percentual de Alunos com Problemas: ${stats.percentualComProblemas}%
• Disciplina Mais Problemática: ${stats.disciplinaMaisProblematica}

CASOS CRÍTICOS DETALHADOS
==========================
${filteredDataRelatorios
    .filter(aluno => aluno.statusRisco === 'Alto' || aluno.statusRisco === 'Crítico')
    .map(aluno => `
• ${aluno.nome} (${aluno.turma})
  - Faltas Injustificadas: ${aluno.faltasInjustificadas}
  - Total de Medidas: ${aluno.totalMedidas}
  - Score de Risco: ${aluno.riskScore}
  - Status: ${aluno.statusRisco}
  - Responsável: ${aluno.responsavel || 'Não informado'}
`).join('')}

RECOMENDAÇÕES GERAIS
====================
${stats.alunosCriticos > 0 ? 
    '• Priorizar atendimento aos casos críticos identificados' : ''}
${stats.percentualComProblemas > 20 ? 
    '• Implementar estratégias preventivas na escola' : ''}
${stats.disciplinaMaisProblematica !== 'N/A' ? 
    `• Atenção especial à disciplina: ${stats.disciplinaMaisProblematica}` : ''}
• Manter contato regular com responsáveis
• Considerar reuniões pedagógicas para casos recorrentes

---
Relatório gerado automaticamente pelo Dashboard Disciplinar
    `;

    // Criar arquivo de texto
    const blob = new Blob([relatorioCompleto], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_completo_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    showMessage('✅ Relatório completo gerado!', 'success');
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.carregarEstatisticas = carregarEstatisticas;
window.carregarDadosRelatorios = carregarDadosRelatorios;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.exportarRelatorio = exportarRelatorio;
window.gerarRelatorioCompleto = gerarRelatorioCompleto;
