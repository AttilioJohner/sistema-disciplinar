// ============================================
// ANÁLISES - LÓGICA ESPECÍFICA
// ============================================

// Variáveis específicas das análises
let analyticsPeriod = '30';
let charts = {};
let dadosAnalises = [];
let processedDataRelatorios = [];

// ============================================
// CARREGAMENTO DE DADOS DO FIREBASE
// ============================================
async function carregarDadosRelatorios() {
    try {
        if (!window.db) {
            if (typeof firebase !== "undefined") {
                window.db = firebase.firestore();
            } else {
                throw new Error('Firebase não carregado');
            }
        }

        showMessage('Carregando dados para análises...', 'loading');

        // Carregar alunos
        const alunosSnapshot = await db.collection('alunos').get();
        const alunos = {};
        alunosSnapshot.forEach(doc => {
            const data = doc.data();
            alunos[doc.id] = {
                id: doc.id,
                codigo: data.codigo || doc.id,
                nome: data.nome_completo || data.nome || '',
                turma: data.turma || '',
                responsavel: data.responsavel || '',
                telefone: data.telefone_responsavel || data.telefone || ''
            };
        });

        // Carregar medidas disciplinares
        const medidasSnapshot = await db.collection('medidas_disciplinares').get();
        const medidas = [];
        medidasSnapshot.forEach(doc => {
            const data = doc.data();
            medidas.push({
                id: doc.id,
                alunoId: data.codigo_aluno,
                data: data.data,
                tipo: data.tipo_medida || 'Não especificado',
                especificacao: data.especificacao || '',
                observacao: data.observacao || '',
                gravidade: data.gravidade || 'Leve',
                ...data
            });
        });

        // Processar dados combinados
        processedDataRelatorios = [];
        
        Object.values(alunos).forEach(aluno => {
            const medidasAluno = medidas.filter(m => m.alunoId === aluno.codigo || m.alunoId === aluno.id);
            
            processedDataRelatorios.push({
                id: aluno.id,
                codigo: aluno.codigo,
                nome: aluno.nome,
                turma: aluno.turma,
                responsavel: aluno.responsavel,
                telefone: aluno.telefone,
                faltas: [], // Por enquanto vazio até implementarmos faltas
                faltasInjustificadas: 0,
                medidas: medidasAluno,
                totalMedidas: medidasAluno.length,
                statusRisco: calcularStatusRisco(0, medidasAluno.length), // (faltas, medidas)
                ultimaOcorrencia: medidasAluno.length > 0 ? 
                    new Date(Math.max(...medidasAluno.map(m => new Date(m.data).getTime()))) : null
            });
        });

        console.log(`Dados carregados: ${Object.keys(alunos).length} alunos, ${medidas.length} medidas`);
        window.processedDataRelatorios = processedDataRelatorios;
        
    } catch (error) {
        console.error('Erro ao carregar dados para análises:', error);
        throw error;
    }
}

function calcularStatusRisco(faltas, medidas) {
    const score = faltas + (medidas * 2);
    if (score >= 10) return 'Crítico';
    if (score >= 6) return 'Alto';
    if (score >= 3) return 'Médio';
    return 'Baixo';
}

// ============================================
// CONTROLES DE PERÍODO
// ============================================
function setPeriod(days) {
    analyticsPeriod = days;
    
    // Atualizar botões ativos
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    atualizarAnalises();
}

// ============================================
// ATUALIZAÇÃO DE ANÁLISES
// ============================================
async function atualizarAnalises() {
    try {
        showMessage('Gerando análises...', 'loading');
        
        // Verificar se temos dados
        if (!processedDataRelatorios || processedDataRelatorios.length === 0) {
            if (isFirebaseReady()) {
                await carregarDadosRelatorios();
            } else {
                throw new Error('Dados não disponíveis');
            }
        }

        // Filtrar dados por período
        dadosAnalises = filtrarDadosPorPeriodo(processedDataRelatorios, analyticsPeriod);

        // Gerar todas as análises
        gerarInsights();
        gerarGraficos();
        gerarRanking();
        gerarHeatmap();
        gerarAnalisePreditiva();
        
        showMessage('✅ Análises atualizadas com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar análises:', error);
        showMessage('Erro ao gerar análises. Tente novamente.', 'error');
        
        // Mostrar estado de erro
        document.getElementById('insightsContainer').innerHTML = `
            <div class="insight-item">
                <div class="insight-text">⚠️ Erro ao carregar análises: ${error.message}</div>
            </div>
        `;
    }
}

// ============================================
// FILTROS E PREPARAÇÃO DE DADOS
// ============================================
function filtrarDadosPorPeriodo(dados, periodo) {
    if (periodo === 'todos') return dados;
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - parseInt(periodo));
    
    return dados.map(aluno => ({
        ...aluno,
        faltas: aluno.faltas.filter(falta => new Date(falta.data) >= dataLimite),
        medidas: aluno.medidas.filter(medida => new Date(medida.data) >= dataLimite)
    })).filter(aluno => aluno.faltas.length > 0 || aluno.medidas.length > 0);
}

// ============================================
// GERAÇÃO DE INSIGHTS
// ============================================
function gerarInsights() {
    const insights = [];
    
    if (dadosAnalises.length === 0) {
        document.getElementById('insightsContainer').innerHTML = `
            <div class="insight-item">
                <div class="insight-text">📊 Nenhum dado no período selecionado. Tente ampliar o período de análise.</div>
            </div>
        `;
        return;
    }

    // Insight 1: Total de casos no período
    const totalFaltas = dadosAnalises.reduce((sum, aluno) => sum + aluno.faltas.length, 0);
    const totalMedidas = dadosAnalises.reduce((sum, aluno) => sum + aluno.medidas.length, 0);
    
    insights.push({
        text: `No período analisado: <span class="insight-highlight">${totalFaltas}</span> faltas e <span class="insight-highlight">${totalMedidas}</span> medidas disciplinares.`,
        trend: totalFaltas > 50 ? 'up' : totalFaltas < 10 ? 'down' : 'stable'
    });

    // Insight 2: Turma com mais problemas
    const faltasPorTurma = calcularDadosPorTurma(dadosAnalises);
    if (faltasPorTurma.labels.length > 0) {
        const maxIndex = faltasPorTurma.values.indexOf(Math.max(...faltasPorTurma.values));
        const turmaProblem = faltasPorTurma.labels[maxIndex];
        const maxFaltas = faltasPorTurma.values[maxIndex];
        
        insights.push({
            text: `A turma <span class="insight-highlight">${turmaProblem}</span> registrou ${maxFaltas} faltas no período.`,
            trend: maxFaltas > 20 ? 'up' : 'stable'
        });
    }

    // Insight 3: Dia da semana mais problemático
    const faltasPorDia = calcularFaltasPorDiaSemana(dadosAnalises);
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const maxDiaIndex = faltasPorDia.indexOf(Math.max(...faltasPorDia));
    
    if (faltasPorDia[maxDiaIndex] > 0) {
        insights.push({
            text: `<span class="insight-highlight">${diasSemana[maxDiaIndex]}</span> é o dia com mais faltas (${faltasPorDia[maxDiaIndex]} registros).`,
            trend: 'stable'
        });
    }

    // Insight 4: Disciplina mais afetada
    const disciplinasProblematicas = calcularDisciplinasProblematicas(dadosAnalises);
    if (disciplinasProblematicas.length > 0) {
        const [disciplina, count] = disciplinasProblematicas[0];
        insights.push({
            text: `<span class="insight-highlight">${disciplina}</span> teve ${count} faltas registradas.`,
            trend: count > 15 ? 'up' : 'stable'
        });
    }

    // Insight 5: Tendência
    const tendencia = calcularTendencia(dadosAnalises);
    if (tendencia.length > 1) {
        const ultimaSemana = tendencia.slice(-7).reduce((sum, val) => sum + val, 0);
        const penultimaSemana = tendencia.slice(-14, -7).reduce((sum, val) => sum + val, 0);
        
        if (ultimaSemana > penultimaSemana) {
            insights.push({
                text: `Tendência de <span class="insight-highlight">aumento</span> nas ocorrências recentes.`,
                trend: 'up'
            });
        } else if (ultimaSemana < penultimaSemana) {
            insights.push({
                text: `Tendência de <span class="insight-highlight">redução</span> nas ocorrências recentes.`,
                trend: 'down'
            });
        } else {
            insights.push({
                text: `Ocorrências <span class="insight-highlight">estáveis</span> nas últimas semanas.`,
                trend: 'stable'
            });
        }
    }

    // Insight 6: Medidas mais aplicadas
    const tiposMedidas = calcularTiposMedidas(dadosAnalises);
    if (tiposMedidas.labels.length > 0) {
        const medidaMaisUsada = tiposMedidas.labels[0];
        const countMedida = tiposMedidas.values[0];
        
        insights.push({
            text: `Medida mais aplicada: <span class="insight-highlight">${medidaMaisUsada}</span> (${countMedida} vezes).`,
            trend: 'stable'
        });
    }

    // Renderizar insights
    const container = document.getElementById('insightsContainer');
    container.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <div class="insight-text">
                ${insight.text}
            </div>
            <span class="trend-indicator trend-${insight.trend}">
                ${insight.trend === 'up' ? '📈 Atenção' : 
                  insight.trend === 'down' ? '📉 Positivo' : 
                  '📊 Estável'}
            </span>
        </div>
    `).join('');
}

// ============================================
// GERAÇÃO DE GRÁFICOS
// ============================================
function gerarGraficos() {
    // Destruir gráficos anteriores
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};

    // Gráfico de tendência
    const ctx1 = document.getElementById('trendChart')?.getContext('2d');
    if (ctx1) {
        const trendData = calcularTendenciaFaltas(dadosAnalises);
        charts.trend = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Faltas por Período',
                    data: trendData.values,
                    borderColor: '#0078d4',
                    backgroundColor: 'rgba(0, 120, 212, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#0078d4',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#f3f2f1' }
                    }
                }
            }
        });
    }

    // Gráfico por turma
    const ctx2 = document.getElementById('turmaChart')?.getContext('2d');
    if (ctx2) {
        const turmasData = calcularDadosPorTurma(dadosAnalises);
        charts.turma = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: turmasData.labels,
                datasets: [{
                    label: 'Faltas por Turma',
                    data: turmasData.values,
                    backgroundColor: [
                        '#0078d4', '#dc3545', '#28a745', '#ffc107', '#17a2b8',
                        '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#6c757d'
                    ],
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#f3f2f1' }
                    }
                }
            }
        });
    }

    // Gráfico de tipos de faltas
    const ctx3 = document.getElementById('tipoChart')?.getContext('2d');
    if (ctx3) {
        const tiposData = calcularTiposFaltas(dadosAnalises);
        charts.tipo = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: ['Injustificadas', 'Justificadas', 'Presenças'],
                datasets: [{
                    data: [tiposData.injustificadas, tiposData.justificadas, tiposData.presencas],
                    backgroundColor: ['#dc3545', '#28a745', '#17a2b8'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
                    }
                }
            }
        });
    }

    // Gráfico de medidas
    const ctx4 = document.getElementById('medidasChart')?.getContext('2d');
    if (ctx4) {
        const medidasData = calcularTiposMedidas(dadosAnalises);
        charts.medidas = new Chart(ctx4, {
            type: 'pie',
            data: {
                labels: medidasData.labels,
                datasets: [{
                    data: medidasData.values,
                    backgroundColor: [
                        '#0078d4', '#dc3545', '#ffc107', '#28a745', '#17a2b8',
                        '#6f42c1', '#fd7e14', '#20c997'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15, usePointStyle: true, font: { size: 11 } }
                    }
                }
            }
        });
    }

    // Gráfico por disciplina
    const ctx5 = document.getElementById('disciplinaChart')?.getContext('2d');
    if (ctx5) {
        const disciplinasData = calcularDadosPorDisciplina(dadosAnalises);
        charts.disciplina = new Chart(ctx5, {
            type: 'horizontalBar',
            data: {
                labels: disciplinasData.labels,
                datasets: [{
                    label: 'Faltas por Disciplina',
                    data: disciplinasData.values,
                    backgroundColor: '#17a2b8',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        beginAtZero: true,
                        grid: { color: '#f3f2f1' }
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // Gráfico de gravidade das medidas
    const ctx6 = document.getElementById('gravidadeChart')?.getContext('2d');
    if (ctx6) {
        const gravidadeData = calcularGravidadeMedidas(dadosAnalises);
        charts.gravidade = new Chart(ctx6, {
            type: 'doughnut',
            data: {
                labels: ['Leve', 'Moderada', 'Grave', 'Gravíssima'],
                datasets: [{
                    data: gravidadeData,
                    backgroundColor: ['#28a745', '#ffc107', '#fd7e14', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15, usePointStyle: true }
                    }
                }
            }
        });
    }
}

// ============================================
// FUNÇÕES AUXILIARES PARA GRÁFICOS
// ============================================
function calcularTendenciaFaltas(dados) {
    const diasPeriodo = analyticsPeriod === 'todos' ? 30 : parseInt(analyticsPeriod);
    const labels = [];
    const values = [];
    
    for (let i = diasPeriodo - 1; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        
        const dataStr = data.toISOString().split('T')[0];
        const faltasDia = dados.reduce((total, aluno) => {
            return total + aluno.faltas.filter(falta => falta.data === dataStr).length;
        }, 0);
        
        labels.push(data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        values.push(faltasDia);
    }
    
    return { labels, values };
}

function calcularDadosPorTurma(dados) {
    const turmasMap = new Map();
    
    dados.forEach(aluno => {
        const turma = aluno.turma;
        if (!turmasMap.has(turma)) {
            turmasMap.set(turma, 0);
        }
        turmasMap.set(turma, turmasMap.get(turma) + aluno.faltas.length);
    });
    
    const entries = Array.from(turmasMap.entries())
        .filter(([turma, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
    
    return {
        labels: entries.map(entry => entry[0]),
        values: entries.map(entry => entry[1])
    };
}

function calcularTiposFaltas(dados) {
    let injustificadas = 0;
    let justificadas = 0;
    let presencas = 0;
    
    dados.forEach(aluno => {
        aluno.faltas.forEach(falta => {
            switch(falta.tipo) {
                case 'F': injustificadas++; break;
                case 'A': justificadas++; break;
                case 'P': presencas++; break;
            }
        });
    });
    
    return { injustificadas, justificadas, presencas };
}

function calcularTiposMedidas(dados) {
    const tiposMap = new Map();
    
    dados.forEach(aluno => {
        aluno.medidas.forEach(medida => {
            const tipo = medida.tipo;
            tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + 1);
        });
    });
    
    const entries = Array.from(tiposMap.entries()).sort((a, b) => b[1] - a[1]);
    
    return {
        labels: entries.map(entry => entry[0]),
        values: entries.map(entry => entry[1])
    };
}

function calcularDadosPorDisciplina(dados) {
    const disciplinasMap = new Map();
    
    dados.forEach(aluno => {
        aluno.faltas.forEach(falta => {
            const disciplina = falta.disciplina || 'Geral';
            disciplinasMap.set(disciplina, (disciplinasMap.get(disciplina) || 0) + 1);
        });
    });
    
    const entries = Array.from(disciplinasMap.entries()).sort((a, b) => b[1] - a[1]);
    
    return {
        labels: entries.map(entry => entry[0]),
        values: entries.map(entry => entry[1])
    };
}

function calcularGravidadeMedidas(dados) {
    const gravidade = { 'Leve': 0, 'Moderada': 0, 'Grave': 0, 'Gravíssima': 0 };
    
    dados.forEach(aluno => {
        aluno.medidas.forEach(medida => {
            const grav = medida.gravidade || 'Leve';
            if (gravidade.hasOwnProperty(grav)) {
                gravidade[grav]++;
            }
        });
    });
    
    return [gravidade.Leve, gravidade.Moderada, gravidade.Grave, gravidade.Gravíssima];
}

function calcularFaltasPorDiaSemana(dados) {
    const faltasPorDia = new Array(7).fill(0);
    
    dados.forEach(aluno => {
        aluno.faltas.forEach(falta => {
            const dia = new Date(falta.data).getDay();
            faltasPorDia[dia]++;
        });
    });

    return faltasPorDia;
}

function calcularDisciplinasProblematicas(dados) {
    const disciplinasMap = new Map();
    
    dados.forEach(aluno => {
        aluno.faltas.forEach(falta => {
            const disciplina = falta.disciplina || 'Geral';
            disciplinasMap.set(disciplina, (disciplinasMap.get(disciplina) || 0) + 1);
        });
    });
    
    return Array.from(disciplinasMap.entries()).sort((a, b) => b[1] - a[1]);
}

function calcularTendencia(dados) {
    const diasPeriodo = analyticsPeriod === 'todos' ? 30 : parseInt(analyticsPeriod);
    const values = [];
    
    for (let i = diasPeriodo - 1; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];
        
        const faltasDia = dados.reduce((total, aluno) => {
            return total + aluno.faltas.filter(falta => falta.data === dataStr).length;
        }, 0);
        
        values.push(faltasDia);
    }
    
    return values;
}

// ============================================
// RANKING DE ALUNOS
// ============================================
function gerarRanking() {
    // Ordenar alunos por maior número de problemas
    const ranking = [...dadosAnalises]
        .filter(aluno => aluno.faltas.length > 0 || aluno.medidas.length > 0)
        .sort((a, b) => {
            const scoreA = (a.faltas.filter(f => f.tipo === 'F').length * 2) + (a.medidas.length * 3);
            const scoreB = (b.faltas.filter(f => f.tipo === 'F').length * 2) + (b.medidas.length * 3);
            return scoreB - scoreA;
        })
        .slice(0, 10);

    const container = document.getElementById('rankingContainer');
    
    if (ranking.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <div class="empty-icon">🎉</div>
                <h3>Excelente!</h3>
                <p>Nenhum aluno com registros problemáticos no período</p>
            </div>
        `;
        return;
    }

    const html = ranking.map((aluno, index) => {
        const faltasInjustificadas = aluno.faltas.filter(f => f.tipo === 'F').length;
        const score = (faltasInjustificadas * 2) + (aluno.medidas.length * 3);
        
        return `
            <div class="ranking-item">
                <div class="ranking-position ${index < 3 ? 'top-3' : ''}">${index + 1}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${aluno.nome}</div>
                    <div class="ranking-details">
                        ${aluno.turma} • ${faltasInjustificadas} faltas • ${aluno.medidas.length} medidas
                    </div>
                </div>
                <div class="ranking-value">${score}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================
// HEATMAP SEMANAL
// ============================================
function gerarHeatmap() {
    const container = document.getElementById('heatmapContainer');
    
    // Calcular dados por dia da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const faltasPorDia = calcularFaltasPorDiaSemana(dadosAnalises);
    const maxFaltas = Math.max(...faltasPorDia);
    
    const html = diasSemana.map((dia, index) => {
        const faltas = faltasPorDia[index];
        let className = 'heatmap-low';
        
        if (faltas === 0) {
            className = 'heatmap-header';
        } else if (faltas <= maxFaltas * 0.3) {
            className = 'heatmap-low';
        } else if (faltas <= maxFaltas * 0.7) {
            className = 'heatmap-medium';
        } else {
            className = 'heatmap-high';
        }
        
        return `
            <div class="heatmap-day ${className}" title="${dia}: ${faltas} faltas">
                <div style="font-size: 10px;">${dia}</div>
                <div style="font-weight: bold;">${faltas}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================
// ANÁLISE PREDITIVA
// ============================================
function gerarAnalisePreditiva() {
    const container = document.getElementById('predicaoContainer');
    
    if (dadosAnalises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔮</div>
                <h3>Análise Preditiva</h3>
                <p>Dados insuficientes para gerar predições</p>
            </div>
        `;
        return;
    }

    // Calcular tendências e predições simples
    const tendencia = calcularTendencia(dadosAnalises);
    const mediaRecente = tendencia.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
    const mediaAnterior = tendencia.slice(-14, -7).reduce((sum, val) => sum + val, 0) / 7;
    
    const crescimento = ((mediaRecente - mediaAnterior) / Math.max(mediaAnterior, 1)) * 100;
    
    // Identificar alunos em risco
    const alunosEmRisco = dadosAnalises.filter(aluno => {
        const faltasRecentes = aluno.faltas.filter(falta => {
            const dataFalta = new Date(falta.data);
            const seteDiasAtras = new Date();
            seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
            return dataFalta >= seteDiasAtras;
        }).length;
        
        return faltasRecentes >= 3 || aluno.medidas.length >= 2;
    });

    const html = `
        <div class="student-stats">
            <div class="stat-box">
                <div class="stat-number" style="color: ${crescimento > 0 ? '#dc3545' : '#28a745'};">
                    ${crescimento.toFixed(1)}%
                </div>
                <div class="stat-label">Tendência Semanal</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${mediaRecente.toFixed(1)}</div>
                <div class="stat-label">Média Diária</div>
            </div>
            <div class="stat-box">
                <div class="stat-number" style="color: #dc3545;">${alunosEmRisco.length}</div>
                <div class="stat-label">Alunos em Risco</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${Math.ceil(mediaRecente * 7)}</div>
                <div class="stat-label">Predição Semanal</div>
            </div>
        </div>
        
        <div class="details-section">
            <div class="details-title">🎯 Recomendações Preditivas</div>
            <div style="padding: 15px; background: #f8f9fa; border-radius: 6px;">
                ${gerarRecomendacoesPreditivas(crescimento, alunosEmRisco, mediaRecente)}
            </div>
        </div>
        
        ${alunosEmRisco.length > 0 ? `
            <div class="details-section">
                <div class="details-title">⚠️ Alunos Requerendo Atenção</div>
                ${alunosEmRisco.slice(0, 5).map(aluno => `
                    <div class="detail-item">
                        <span><strong>${aluno.nome}</strong> (${aluno.turma})</span>
                        <span class="detail-type" style="background: #ffebee; color: #dc3545;">
                            ${aluno.faltas.length}F + ${aluno.medidas.length}M
                        </span>
                    </div>
                `).join('')}
                ${alunosEmRisco.length > 5 ? `
                    <div style="text-align: center; padding: 10px; color: #666; font-style: italic;">
                        ... e mais ${alunosEmRisco.length - 5} alunos
                    </div>
                ` : ''}
            </div>
        ` : ''}
    `;
    
    container.innerHTML = html;
}

function gerarRecomendacoesPreditivas(crescimento, alunosEmRisco, mediaRecente) {
    const recomendacoes = [];
    
    if (crescimento > 20) {
        recomendacoes.push('🚨 Tendência de crescimento preocupante - implementar ações preventivas imediatas');
    } else if (crescimento > 10) {
        recomendacoes.push('⚠️ Leve aumento nas ocorrências - monitorar de perto');
    } else if (crescimento < -10) {
        recomendacoes.push('✅ Excelente redução nas ocorrências - manter estratégias atuais');
    } else {
        recomendacoes.push('📊 Situação estável - continuar monitoramento regular');
    }
    
    if (alunosEmRisco.length > 5) {
        recomendacoes.push('👥 Muitos alunos em situação de risco - considerar intervenção em grupo');
    } else if (alunosEmRisco.length > 0) {
        recomendacoes.push('🎯 Focar atenção individualizada nos alunos identificados');
    }
    
    if (mediaRecente > 5) {
        recomendacoes.push('📅 Média diária elevada - investigar causas sistêmicas');
    }
    
    if (recomendacoes.length === 0) {
        recomendacoes.push('✅ Situação dentro dos parâmetros normais - manter acompanhamento');
    }
    
    return recomendacoes.map(rec => `<div style="margin-bottom: 8px;">${rec}</div>`).join('');
}

// ============================================
// EXPORTAÇÃO E RELATÓRIOS
// ============================================
function exportarAnalises() {
    if (dadosAnalises.length === 0) {
        showMessage('Nenhum dado para exportar', 'error');
        return;
    }
    
    try {
        const analiseData = {
            periodo: `${analyticsPeriod} dias`,
            dataGeracao: new Date().toISOString(),
            totalAlunos: dadosAnalises.length,
            totalFaltas: dadosAnalises.reduce((sum, aluno) => sum + aluno.faltas.length, 0),
            totalMedidas: dadosAnalises.reduce((sum, aluno) => sum + aluno.medidas.length, 0),
            faltasPorTurma: calcularDadosPorTurma(dadosAnalises),
            tiposFaltas: calcularTiposFaltas(dadosAnalises),
            tiposMedidas: calcularTiposMedidas(dadosAnalises),
            disciplinasProblematicas: calcularDisciplinasProblematicas(dadosAnalises),
            faltasPorDiaSemana: calcularFaltasPorDiaSemana(dadosAnalises)
        };

        const blob = new Blob([JSON.stringify(analiseData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analises_${analyticsPeriod}dias_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showMessage('✅ Dados de análise exportados!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        showMessage('Erro ao exportar análises', 'error');
    }
}

function gerarRelatorioAnalitico() {
    if (dadosAnalises.length === 0) {
        showMessage('Nenhum dado para gerar relatório', 'error');
        return;
    }

    const stats = {
        totalFaltas: dadosAnalises.reduce((sum, aluno) => sum + aluno.faltas.length, 0),
        totalMedidas: dadosAnalises.reduce((sum, aluno) => sum + aluno.medidas.length, 0),
        tiposFaltas: calcularTiposFaltas(dadosAnalises),
        faltasPorTurma: calcularDadosPorTurma(dadosAnalises),
        disciplinasProblematicas: calcularDisciplinasProblematicas(dadosAnalises)
    };

    const relatorio = `
RELATÓRIO ANALÍTICO DETALHADO
==============================

Período: ${analyticsPeriod === 'todos' ? 'Todos os registros' : `Últimos ${analyticsPeriod} dias`}
Data de Geração: ${formatarDataHora(new Date())}

RESUMO QUANTITATIVO
===================
• Total de Alunos com Registros: ${dadosAnalises.length}
• Total de Faltas: ${stats.totalFaltas}
• Total de Medidas Disciplinares: ${stats.totalMedidas}

DISTRIBUIÇÃO DE FALTAS
======================
• Faltas Injustificadas: ${stats.tiposFaltas.injustificadas}
• Faltas Justificadas: ${stats.tiposFaltas.justificadas}
• Presenças Registradas: ${stats.tiposFaltas.presencas}

ANÁLISE POR TURMA
=================
${stats.faltasPorTurma.labels.map((turma, index) => 
    `• ${turma}: ${stats.faltasPorTurma.values[index]} faltas`
).join('\n')}

DISCIPLINAS MAIS AFETADAS
=========================
${stats.disciplinasProblematicas.slice(0, 5).map(([disciplina, count]) => 
    `• ${disciplina}: ${count} faltas`
).join('\n')}

INDICADORES DE PERFORMANCE
==========================
• Média de Faltas por Aluno: ${(stats.totalFaltas / dadosAnalises.length).toFixed(2)}
• Taxa de Medidas por Falta: ${(stats.totalMedidas / Math.max(stats.totalFaltas, 1)).toFixed(2)}
• Turma com Maior Incidência: ${stats.faltasPorTurma.labels[0] || 'N/A'}

---
Relatório gerado pelo Sistema de Análises Disciplinares
    `;

    const blob = new Blob([relatorio], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_analitico_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    showMessage('✅ Relatório analítico gerado!', 'success');
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.setPeriod = setPeriod;
window.atualizarAnalises = atualizarAnalises;
window.exportarAnalises = exportarAnalises;
window.gerarRelatorioAnalitico = gerarRelatorioAnalitico;
