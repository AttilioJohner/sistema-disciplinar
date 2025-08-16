// ============================================
// GESTÃO DE ALUNOS - LÓGICA ESPECÍFICA
// ============================================

// ============================================
// FIREBASE FUNCTIONS - ALUNOS
// ============================================
async function salvarAluno(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nomeAluno').value.trim();
    const turma = document.getElementById('turmaAluno').value.trim();
    const nascimento = document.getElementById('nascimentoAluno').value;
    const responsavel = document.getElementById('responsavelAluno').value.trim();
    const telefone = document.getElementById('telefoneResponsavel')?.value.trim() || '';
    const email = document.getElementById('emailResponsavel')?.value.trim() || '';

    if (!nome || !turma) {
        showMessage('Nome e turma são obrigatórios!', 'error');
        return;
    }

    try {
        showMessage('Cadastrando aluno...', 'loading');
        
        if (!isFirebaseReady()) {
            showMessage('Firebase não está conectado', 'error');
            return;
        }
        
        const alunoData = {
            nome: nome,
            turma: turma,
            nascimento: nascimento || null,
            responsavel: responsavel || null,
            telefoneResponsavel: telefone || null,
            emailResponsavel: email || null,
            dataCadastro: new Date().toISOString(),
            ativo: true
        };

        await db.collection('alunos').add(alunoData);

        showMessage('✅ Aluno cadastrado com sucesso!', 'success');
        limparFormAluno();
        carregarAlunos();
        carregarEstatisticasGestao();

    } catch (error) {
        console.error('Erro ao cadastrar aluno:', error);
        showMessage(`Erro ao cadastrar aluno: ${error.message}`, 'error');
    }
}

async function carregarAlunos() {
    try {
        const container = document.getElementById('listaAlunos');
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Carregando alunos...</p>
            </div>
        `;
        
        if (!isFirebaseReady()) {
            throw new Error('Firebase não conectado');
        }
        
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

        displayListaAlunos();

    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        document.getElementById('listaAlunos').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Erro ao carregar alunos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="carregarAlunos()">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function displayListaAlunos() {
    const container = document.getElementById('listaAlunos');
    
    if (alunosCache.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👤</div>
                <h3>Nenhum aluno cadastrado</h3>
                <p>Comece cadastrando o primeiro aluno usando o formulário acima</p>
            </div>
        `;
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Turma</th>
                    <th>Responsável</th>
                    <th>Contato</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${alunosCache.map(aluno => `
                    <tr>
                        <td>
                            <div style="font-weight: 600;">${aluno.nome}</div>
                            ${aluno.nascimento ? `<div style="font-size: 12px; color: #605e5c;">Nascimento: ${formatarData(aluno.nascimento)}</div>` : ''}
                        </td>
                        <td>
                            <span class="student-class">${aluno.turma}</span>
                        </td>
                        <td>${aluno.responsavel || '-'}</td>
                        <td>
                            ${aluno.telefoneResponsavel ? `<div style="font-size: 12px;">📞 ${aluno.telefoneResponsavel}</div>` : ''}
                            ${aluno.emailResponsavel ? `<div style="font-size: 12px;">📧 ${aluno.emailResponsavel}</div>` : ''}
                            ${!aluno.telefoneResponsavel && !aluno.emailResponsavel ? '-' : ''}
                        </td>
                        <td>${formatarData(aluno.dataCadastro)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-small" onclick="editarAluno('${aluno.id}')" title="Editar">
                                    ✏️
                                </button>
                                <button class="btn btn-info btn-small" onclick="verDetalhesAluno('${aluno.id}')" title="Ver Detalhes">
                                    👁️
                                </button>
                                <button class="btn btn-warning btn-small" onclick="inativarAluno('${aluno.id}', '${aluno.nome}')" title="Inativar">
                                    ⚠️
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

async function carregarEstatisticasGestao() {
    try {
        if (!isFirebaseReady()) return;

        // Total de alunos ativos
        const alunosSnapshot = await db.collection('alunos')
            .where('ativo', '==', true)
            .get();
        const totalAtivos = alunosSnapshot.size;

        // Total de turmas únicas
        const turmas = new Set();
        alunosSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.turma) turmas.add(data.turma);
        });

        // Cadastros de hoje
        const hoje = new Date().toISOString().split('T')[0];
        const cadastrosHoje = alunosCache.filter(aluno => 
            aluno.dataCadastro && aluno.dataCadastro.startsWith(hoje)
        ).length;

        // Dados incompletos (sem responsável ou contato)
        const dadosIncompletos = alunosCache.filter(aluno => 
            !aluno.responsavel || (!aluno.telefoneResponsavel && !aluno.emailResponsavel)
        ).length;

        // Atualizar interface
        document.getElementById('totalAlunosAtivos').textContent = totalAtivos;
        document.getElementById('totalTurmas').textContent = turmas.size;
        document.getElementById('cadastrosHoje').textContent = cadastrosHoje;
        document.getElementById('dadosIncompletos').textContent = dadosIncompletos;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ============================================
// AÇÕES DOS ALUNOS
// ============================================
async function editarAluno(alunoId) {
    try {
        const aluno = alunosCache.find(a => a.id === alunoId);
        if (!aluno) {
            showMessage('Aluno não encontrado', 'error');
            return;
        }

        // Preencher formulário com dados do aluno
        document.getElementById('nomeAluno').value = aluno.nome || '';
        document.getElementById('turmaAluno').value = aluno.turma || '';
        document.getElementById('nascimentoAluno').value = aluno.nascimento || '';
        document.getElementById('responsavelAluno').value = aluno.responsavel || '';
        
        if (document.getElementById('telefoneResponsavel')) {
            document.getElementById('telefoneResponsavel').value = aluno.telefoneResponsavel || '';
        }
        if (document.getElementById('emailResponsavel')) {
            document.getElementById('emailResponsavel').value = aluno.emailResponsavel || '';
        }

        // Alterar o formulário para modo edição
        const form = document.getElementById('formAluno');
        form.setAttribute('data-editing', alunoId);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '✅ Atualizar Aluno';
        submitBtn.className = 'btn btn-warning';

        // Scroll para o formulário
        document.querySelector('.management-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });

        showMessage(`Editando: ${aluno.nome}`, 'info');

    } catch (error) {
        console.error('Erro ao editar aluno:', error);
        showMessage('Erro ao carregar dados do aluno', 'error');
    }
}

async function atualizarAluno(alunoId, dadosAtualizados) {
    try {
        showMessage('Atualizando aluno...', 'loading');
        
        await db.collection('alunos').doc(alunoId).update({
            ...dadosAtualizados,
            dataAtualizacao: new Date().toISOString()
        });

        showMessage('✅ Aluno atualizado com sucesso!', 'success');
        resetarFormulario();
        carregarAlunos();
        carregarEstatisticasGestao();

    } catch (error) {
        console.error('Erro ao atualizar aluno:', error);
        showMessage(`Erro ao atualizar aluno: ${error.message}`, 'error');
    }
}

async function inativarAluno(alunoId, nomeAluno) {
    if (!confirm(`Tem certeza que deseja inativar o aluno "${nomeAluno}"?\n\nEle será removido da listagem mas os registros históricos serão mantidos.`)) {
        return;
    }

    try {
        showMessage('Inativando aluno...', 'loading');
        
        await db.collection('alunos').doc(alunoId).update({
            ativo: false,
            dataInativacao: new Date().toISOString()
        });

        showMessage('✅ Aluno inativado com sucesso!', 'success');
        carregarAlunos();
        carregarEstatisticasGestao();

    } catch (error) {
        console.error('Erro ao inativar aluno:', error);
        showMessage(`Erro ao inativar aluno: ${error.message}`, 'error');
    }
}

function verDetalhesAluno(alunoId) {
    const aluno = alunosCache.find(a => a.id === alunoId);
    if (!aluno) {
        showMessage('Aluno não encontrado', 'error');
        return;
    }

    // Criar modal com detalhes (implementação simples)
    const detalhes = `
        Nome: ${aluno.nome}
        Turma: ${aluno.turma}
        Nascimento: ${aluno.nascimento ? formatarData(aluno.nascimento) : 'Não informado'}
        Responsável: ${aluno.responsavel || 'Não informado'}
        Telefone: ${aluno.telefoneResponsavel || 'Não informado'}
        Email: ${aluno.emailResponsavel || 'Não informado'}
        Cadastrado em: ${formatarDataHora(aluno.dataCadastro)}
    `;

    alert(`Detalhes do Aluno:\n\n${detalhes}`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function limparFormAluno() {
    document.getElementById('formAluno').reset();
    resetarFormulario();
    document.getElementById('nomeAluno').focus();
}

function resetarFormulario() {
    const form = document.getElementById('formAluno');
    form.removeAttribute('data-editing');
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '✅ Cadastrar Aluno';
    submitBtn.className = 'btn btn-success';
}

// Modificar a função salvarAluno para suportar edição
const originalSalvarAluno = salvarAluno;
salvarAluno = async function(event) {
    event.preventDefault();
    
    const form = document.getElementById('formAluno');
    const editingId = form.getAttribute('data-editing');
    
    if (editingId) {
        // Modo edição
        const nome = document.getElementById('nomeAluno').value.trim();
        const turma = document.getElementById('turmaAluno').value.trim();
        const nascimento = document.getElementById('nascimentoAluno').value;
        const responsavel = document.getElementById('responsavelAluno').value.trim();
        const telefone = document.getElementById('telefoneResponsavel')?.value.trim() || '';
        const email = document.getElementById('emailResponsavel')?.value.trim() || '';

        if (!nome || !turma) {
            showMessage('Nome e turma são obrigatórios!', 'error');
            return;
        }

        const dadosAtualizados = {
            nome: nome,
            turma: turma,
            nascimento: nascimento || null,
            responsavel: responsavel || null,
            telefoneResponsavel: telefone || null,
            emailResponsavel: email || null
        };

        await atualizarAluno(editingId, dadosAtualizados);
    } else {
        // Modo criação
        await originalSalvarAluno(event);
    }
};

function exportarAlunos() {
    if (alunosCache.length === 0) {
        showMessage('Nenhum aluno para exportar', 'error');
        return;
    }
    
    try {
        // Preparar dados para export
        const dadosExport = alunosCache.map(aluno => ({
            'Nome': aluno.nome,
            'Turma': aluno.turma,
            'Data Nascimento': aluno.nascimento ? formatarData(aluno.nascimento) : '',
            'Responsável': aluno.responsavel || '',
            'Telefone': aluno.telefoneResponsavel || '',
            'Email': aluno.emailResponsavel || '',
            'Data Cadastro': formatarData(aluno.dataCadastro)
        }));

        // Converter para CSV
        const csv = convertToCSV(dadosExport);
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `alunos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showMessage('✅ Lista de alunos exportada!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        showMessage('Erro ao exportar dados', 'error');
    }
}

function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
        Object.values(row).map(value => 
            `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
    );
    
    return [headers, ...rows].join('\n');
}

// ============================================
// CONFIGURAÇÕES ESPECÍFICAS DA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Configurar máscara de telefone
    const telefoneInput = document.getElementById('telefoneResponsavel');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 11) {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (value.length >= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            } else if (value.length >= 6) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length >= 2) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            }
            e.target.value = value;
        });
    }
});

// Exportar funções para uso global
window.salvarAluno = salvarAluno;
window.carregarAlunos = carregarAlunos;
window.limparFormAluno = limparFormAluno;
window.editarAluno = editarAluno;
window.inativarAluno = inativarAluno;
window.verDetalhesAluno = verDetalhesAluno;
window.exportarAlunos = exportarAlunos;
window.carregarEstatisticasGestao = carregarEstatisticasGestao;
