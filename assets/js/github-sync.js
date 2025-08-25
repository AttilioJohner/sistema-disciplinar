// Sistema de Sincronização com GitHub
class GitHubDataSync {
    constructor() {
        this.baseUrl = 'https://raw.githubusercontent.com/AttilioJohner/sistema-disciplinar-revisado/main';
        this.dataFiles = {
            frequencia: '/dados/frequencia.json',
            alunos: '/dados/alunos.json',
            medidas: '/dados/medidas.json'
        };
    }

    // Carregar dados do GitHub
    async carregarDadosGitHub(tipo = 'frequencia') {
        try {
            console.log(`🔄 Carregando dados de ${tipo} do GitHub...`);
            
            const url = this.baseUrl + this.dataFiles[tipo];
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Dados de ${tipo} carregados do GitHub:`, data);
            
            return data;
        } catch (error) {
            console.warn(`⚠️ Não foi possível carregar dados de ${tipo} do GitHub:`, error.message);
            return null;
        }
    }

    // Salvar dados no localStorage com estrutura GitHub
    async salvarDadosLocal(tipo, registros) {
        try {
            const dadosGitHub = {
                lastUpdate: new Date().toISOString(),
                version: "1.0",
                registros: registros || []
            };

            // Salvar no localStorage para backup
            localStorage.setItem(`github_${tipo}`, JSON.stringify(dadosGitHub));
            
            console.log(`💾 Dados de ${tipo} salvos localmente para sincronização`);
            return dadosGitHub;
        } catch (error) {
            console.error(`Erro ao salvar dados de ${tipo}:`, error);
            return null;
        }
    }

    // Carregar dados locais
    carregarDadosLocal(tipo) {
        try {
            const dados = localStorage.getItem(`github_${tipo}`);
            return dados ? JSON.parse(dados) : null;
        } catch (error) {
            console.error(`Erro ao carregar dados locais de ${tipo}:`, error);
            return null;
        }
    }

    // Sincronizar dados (carrega do GitHub ou local)
    async sincronizarDados(tipo = 'frequencia') {
        try {
            // Tentar carregar do GitHub primeiro
            let dadosGitHub = await this.carregarDadosGitHub(tipo);
            
            if (dadosGitHub && dadosGitHub.registros) {
                console.log(`📡 Usando dados do GitHub para ${tipo}`);
                
                // Salvar localmente para cache
                localStorage.setItem(`github_${tipo}`, JSON.stringify(dadosGitHub));
                
                return dadosGitHub.registros;
            }
            
            // Se não conseguir do GitHub, usar dados locais
            const dadosLocais = this.carregarDadosLocal(tipo);
            if (dadosLocais && dadosLocais.registros) {
                console.log(`💻 Usando dados locais para ${tipo}`);
                return dadosLocais.registros;
            }
            
            console.log(`📝 Nenhum dado encontrado para ${tipo}`);
            return [];
            
        } catch (error) {
            console.error(`Erro na sincronização de ${tipo}:`, error);
            return [];
        }
    }

    // Gerar arquivo JSON para commit manual
    gerarArquivoParaCommit(tipo, registros) {
        try {
            const dadosParaCommit = {
                lastUpdate: new Date().toISOString(),
                version: "1.0",
                total: registros.length,
                registros: registros
            };

            const json = JSON.stringify(dadosParaCommit, null, 2);
            
            // Criar e baixar arquivo
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tipo}.json`;
            a.click();
            URL.revokeObjectURL(url);

            console.log(`📥 Arquivo ${tipo}.json gerado para commit`);
            
            // Mostrar instrução para o usuário
            this.mostrarInstrucaoCommit(tipo);
            
            return dadosParaCommit;
        } catch (error) {
            console.error(`Erro ao gerar arquivo para commit:`, error);
            return null;
        }
    }

    // Mostrar instrução para commit
    mostrarInstrucaoCommit(tipo) {
        const instrucao = `
🔄 INSTRUÇÕES PARA SINCRONIZAR:

1. O arquivo ${tipo}.json foi baixado
2. Copie o arquivo para a pasta 'dados/' do projeto
3. Execute os comandos:
   git add dados/${tipo}.json
   git commit -m "Atualizar dados de ${tipo}"
   git push origin main

4. Aguarde alguns minutos e recarregue a página
        `;
        
        if (typeof showMessage === 'function') {
            showMessage('Arquivo gerado! Veja instruções no console.', 'info');
        }
        
        console.log(instrucao);
        alert(`Arquivo ${tipo}.json baixado!\n\nVeja as instruções no console para sincronizar com o GitHub.`);
    }

    // Verificar se há dados mais recentes no GitHub
    async verificarAtualizacoes(tipo = 'frequencia') {
        try {
            const dadosGitHub = await this.carregarDadosGitHub(tipo);
            const dadosLocais = this.carregarDadosLocal(tipo);
            
            if (!dadosGitHub || !dadosLocais) return false;
            
            const dataGitHub = new Date(dadosGitHub.lastUpdate);
            const dataLocal = new Date(dadosLocais.lastUpdate);
            
            return dataGitHub > dataLocal;
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
            return false;
        }
    }

    // Obter estatísticas dos dados
    obterEstatisticas(registros) {
        if (!registros || !Array.isArray(registros)) return {};

        const stats = {
            total: registros.length,
            alunos: new Set(registros.map(r => r.codigo_aluno)).size,
            turmas: new Set(registros.map(r => r.turma)).size,
            dias: new Set(registros.map(r => r.data)).size,
            marcacoes: {
                P: registros.filter(r => r.marcacao === 'P').length,
                F: registros.filter(r => r.marcacao === 'F').length,
                FC: registros.filter(r => r.marcacao === 'FC').length,
                A: registros.filter(r => r.marcacao === 'A').length
            }
        };

        return stats;
    }
}

// Instância global
window.gitHubSync = new GitHubDataSync();

// Funções de conveniência
window.sincronizarFrequencia = () => window.gitHubSync.sincronizarDados('frequencia');
window.salvarFrequenciaGitHub = (registros) => window.gitHubSync.gerarArquivoParaCommit('frequencia', registros);
window.verificarAtualizacoesFrequencia = () => window.gitHubSync.verificarAtualizacoes('frequencia');