let dadosAlunos = [];
let dadosMedidas = [];

document.addEventListener("DOMContentLoaded", function() {
    console.log("Sistema carregando...");
    inicializar();
});

function inicializar() {
    log("Sistema inicializado");
    
    // Elementos para alunos
    const fileInput = document.getElementById("fileAlunos");
    const btnImport = document.getElementById("btnImportarAlunos");
    
    // Elementos para medidas
    const fileMedidas = document.getElementById("fileMedidas");
    const btnImportMedidas = document.getElementById("btnImportarMedidas");
    
    if (!fileInput || !btnImport) {
        log("Elementos de alunos não encontrados", "error");
        return;
    }
    
    if (!fileMedidas || !btnImportMedidas) {
        log("Elementos de medidas não encontrados", "error");
        return;
    }
    
    // Event listeners para alunos
    fileInput.addEventListener("change", handleFile);
    btnImport.addEventListener("click", importData);
    
    // Event listeners para medidas
    fileMedidas.addEventListener("change", handleMedidasFile);
    btnImportMedidas.addEventListener("click", importMedidasData);
    
    log("Pronto para usar!");
}

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    log("Arquivo: " + file.name);
    
    if (typeof XLSX === "undefined") {
        log("XLSX não carregado", "error");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: "array"});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});
            
            dadosAlunos = processData(jsonData);
            showPreview(dadosAlunos);
            
            document.getElementById("btnImportarAlunos").disabled = false;
            log(dadosAlunos.length + " alunos prontos");
        } catch (err) {
            log("Erro: " + err.message, "error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function processData(data) {
    const result = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] || row[1]) {
            result.push({
                codigo: row[0] ? String(row[0]).trim() : "",
                nome_completo: row[1] ? String(row[1]).trim() : "",
                turma: row[2] ? String(row[2]).trim() : "",
                responsavel: row[3] ? String(row[3]).trim() : "",
                cpf_responsavel: row[4] ? String(row[4]).trim() : "",
                telefone_responsavel: row[5] ? String(row[5]).trim() : ""
            });
        }
    }
    return result;
}

function showPreview(data) {
    const container = document.getElementById("previewAlunosContent");
    if (!container) return;
    
    let html = "<h4>Preview: " + data.length + " alunos</h4>";
    html += "<table border=1><tr><th>Código</th><th>Nome</th><th>Turma</th></tr>";
    
    for (let i = 0; i < Math.min(3, data.length); i++) {
        html += "<tr><td>" + data[i].codigo + "</td><td>" + data[i].nome_completo + "</td><td>" + data[i].turma + "</td></tr>";
    }
    html += "</table>";
    
    container.innerHTML = html;
    document.getElementById("previewAlunos").style.display = "block";
}

async function importData() {
    log("Importando...");
    
    // Verificar se o sistema de autenticação local está disponível
    const user = window.localAuth?.getCurrentUser();
    if (!user) {
        log("Erro: Você precisa estar logado para importar dados", "error");
        return;
    }
    
    log("Usuário autenticado: " + user.email);
    
    if (!window.db) {
        log("Sistema de banco local não carregado", "error");
        return;
    }
    
    let success = 0;
    let updated = 0;
    let errors = 0;
    
    for (const aluno of dadosAlunos) {
        try {
            let alunoExistente = null;
            let docId = null;

            // 1. Tentar encontrar por código (ID)
            if (aluno.codigo) {
                const docSnap = await db.collection("alunos").doc(aluno.codigo).get();
                if (docSnap.exists) {
                    alunoExistente = { id: docSnap.id, ...docSnap.data() };
                    docId = aluno.codigo;
                }
            }

            // 2. Se não encontrou, tentar buscar por nome completo
            if (!alunoExistente && aluno.nome_completo) {
                const querySnap = await db.collection("alunos")
                    .where("nome_completo", "==", aluno.nome_completo)
                    .limit(1)
                    .get();
                
                if (!querySnap.empty) {
                    const doc = querySnap.docs[0];
                    alunoExistente = { id: doc.id, ...doc.data() };
                    docId = doc.id;
                }
            }

            // 3. Se encontrou aluno existente, fazer merge dos dados
            if (alunoExistente) {
                const dadosMerge = {};
                
                // Mesclar apenas campos que não estão vazios na nova importação
                Object.keys(aluno).forEach(key => {
                    if (aluno[key] && aluno[key].toString().trim()) {
                        dadosMerge[key] = aluno[key];
                    }
                });

                await db.collection("alunos").doc(docId).update({
                    ...dadosMerge,
                    updated_at: new Date().toISOString(),
                    updated_by: user.uid
                });
                
                updated++;
                log("Atualizado: " + aluno.nome_completo + " (ID: " + docId + ")");
            } else {
                // 4. Criar novo aluno
                docId = aluno.codigo || "aluno_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
                
                await db.collection("alunos").doc(docId).set({
                    ...aluno,
                    created_at: new Date().toISOString(),
                    created_by: user.uid
                });
                
                success++;
                log("Criado: " + aluno.nome_completo + " (ID: " + docId + ")");
            }

        } catch (err) {
            errors++;
            log("Erro ao processar " + aluno.nome_completo + ": " + err.message, "error");
        }
    }
    
    log("Concluído: " + success + " novos alunos, " + updated + " atualizados, " + errors + " erros");
    
    // Inicializar notas disciplinares para novos alunos
    if (success > 0) {
        try {
            log("Inicializando notas disciplinares para novos alunos...");
            
            // Verificar se as funções estão disponíveis
            if (typeof window.inicializarNotasDisciplinares === 'function') {
                const resultado = await window.inicializarNotasDisciplinares();
                log(`✅ ${resultado.atualizados} notas disciplinares inicializadas para novos alunos!`);
            } else {
                log("Função de inicialização não disponível. Acesse a página de Medidas Disciplinares para inicializar.");
            }
        } catch (error) {
            log("Erro ao inicializar notas: " + error.message, "error");
        }
    }
}

// FUNÇÕES PARA MEDIDAS DISCIPLINARES
function handleMedidasFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    log("Arquivo de medidas: " + file.name);
    
    if (typeof XLSX === "undefined") {
        log("XLSX não carregado", "error");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: "array"});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});
            
            dadosMedidas = processMedidasData(jsonData);
            showMedidasPreview(dadosMedidas);
            
            document.getElementById("btnImportarMedidas").disabled = false;
            log(dadosMedidas.length + " medidas prontas");
        } catch (err) {
            log("Erro: " + err.message, "error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function processMedidasData(data) {
    const result = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] || row[1]) {
            result.push({
                codigo_aluno: row[0] ? String(row[0]).trim() : "",
                nome_aluno: row[1] ? String(row[1]).trim() : "",
                turma: row[2] ? String(row[2]).trim() : "",
                data: row[3] ? String(row[3]).trim() : "",
                especificacao: row[4] ? String(row[4]).trim() : "",
                observacao: row[5] ? String(row[5]).trim() : "",
                tipo_medida: row[6] ? String(row[6]).trim() : "",
                nr_medida: row[7] ? String(row[7]).trim() : ""
            });
        }
    }
    return result;
}

function showMedidasPreview(data) {
    const container = document.getElementById("previewMedidasContent");
    if (!container) return;
    
    let html = "<h4>Preview: " + data.length + " medidas</h4>";
    html += "<table border=1><tr><th>Código</th><th>Nome</th><th>Data</th><th>Especificação</th></tr>";
    
    for (let i = 0; i < Math.min(3, data.length); i++) {
        html += "<tr><td>" + data[i].codigo_aluno + "</td><td>" + data[i].nome_aluno + "</td><td>" + data[i].data + "</td><td>" + data[i].especificacao + "</td></tr>";
    }
    html += "</table>";
    
    container.innerHTML = html;
    document.getElementById("previewMedidas").style.display = "block";
}

async function importMedidasData() {
    log("Importando medidas...");
    
    // Verificar se o sistema de autenticação local está disponível
    const user = window.localAuth?.getCurrentUser();
    if (!user) {
        log("Erro: Você precisa estar logado para importar medidas", "error");
        return;
    }
    
    log("Usuário autenticado: " + user.email);
    
    if (!window.db) {
        log("Sistema de banco local não carregado", "error");
        return;
    }
    
    let success = 0;
    let updated = 0;
    let errors = 0;
    
    for (const medida of dadosMedidas) {
        try {
            let medidaExistente = null;
            let docId = null;

            // Tentar encontrar medida existente (mesmo aluno, mesma data, mesma especificação)
            if (medida.codigo_aluno && medida.data && medida.especificacao) {
                const querySnap = await db.collection("medidas_disciplinares")
                    .where("codigo_aluno", "==", medida.codigo_aluno)
                    .where("data", "==", medida.data)
                    .where("especificacao", "==", medida.especificacao)
                    .limit(1)
                    .get();
                
                if (!querySnap.empty) {
                    const doc = querySnap.docs[0];
                    medidaExistente = { id: doc.id, ...doc.data() };
                    docId = doc.id;
                }
            }

            if (medidaExistente) {
                // Atualizar medida existente com novos dados (se houver)
                const dadosMerge = {};
                
                Object.keys(medida).forEach(key => {
                    if (medida[key] && medida[key].toString().trim()) {
                        dadosMerge[key] = medida[key];
                    }
                });

                await db.collection("medidas_disciplinares").doc(docId).update({
                    ...dadosMerge,
                    updated_at: new Date().toISOString(),
                    updated_by: user.uid
                });
                
                updated++;
                log("Atualizada: " + medida.nome_aluno + " - " + medida.especificacao);
            } else {
                // Criar nova medida
                docId = "medida_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
                
                await db.collection("medidas_disciplinares").doc(docId).set({
                    ...medida,
                    created_at: new Date().toISOString(),
                    created_by: user.uid
                });
                
                success++;
                log("Criada: " + medida.nome_aluno + " - " + medida.especificacao);
            }

        } catch (err) {
            errors++;
            log("Erro ao processar medida de " + medida.nome_aluno + ": " + err.message, "error");
        }
    }
    
    log("Medidas concluídas: " + success + " novas, " + updated + " atualizadas, " + errors + " erros");
    
    // Recalcular notas disciplinares automaticamente após importação
    if (success > 0 || updated > 0) {
        try {
            log("Recalculando notas disciplinares automaticamente...");
            
            // Verificar se as funções estão disponíveis
            if (typeof window.recalcularTodasNotas === 'function') {
                const resultado = await window.recalcularTodasNotas();
                log(`✅ ${resultado.contador} notas disciplinares recalculadas automaticamente!`);
            } else {
                log("Função de recálculo não disponível. Acesse a página de Medidas Disciplinares para recalcular.");
            }
        } catch (error) {
            log("Erro ao recalcular notas: " + error.message, "error");
        }
    }
}

function log(msg, type) {
    const container = document.getElementById("logImportacao");
    if (!container) {
        console.log(msg);
        return;
    }
    
    const time = new Date().toLocaleTimeString();
    container.textContent += time + " - " + msg + "\n";
    container.scrollTop = container.scrollHeight;
    console.log(msg);
}
