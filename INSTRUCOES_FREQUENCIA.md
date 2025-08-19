# 📅 Sistema de Controle de Frequência - Guia de Uso

## 🚀 Funcionalidades Implementadas

### ✅ Sistema Completo Implementado
- **Página de Frequência**: `/pages/frequencia.html`
- **Lógica JavaScript**: `/assets/js/frequencia.js`
- **Estilos CSS**: `/assets/css/frequencia.css`
- **Sistema de Notificações**: `/assets/js/ui/toast.js`
- **Regras Firestore**: Atualizadas para coleção `frequencia`
- **Menu de Navegação**: Link adicionado em todas as páginas principais

## 🎯 Como Testar o Sistema

### 1. Estrutura de Dados Firestore
O sistema cria automaticamente a estrutura:
```
frequencia/
  {turmaId_anoMes}/                 // ex: "7A_2025-08"
    meta: { turmaId, anoMes, diasNoMes, criadoEm, atualizadoEm }
    alunos/
      {alunoId}/
        resumo: { totalF, totalA, totalP, percentualFaltas }
        dias: { "01": "P", "02": "F", ... }
    agregadosDia/
      {dia}/
        totais: { F: number, A: number, P: number }
```

### 2. Casos de Teste Obrigatórios

#### ✅ **Teste 1: Carregamento Inicial**
1. Acesse `/pages/frequencia.html`
2. Verifique se:
   - Select de turmas carrega com dados de `alunos`
   - Select de mês mostra mês atual selecionado
   - Tabela carrega com alunos da turma selecionada
   - Cabeçalho mostra 28-31 colunas (dias do mês)

#### ✅ **Teste 2: Edição de Célula**
1. Clique em uma célula vazia de um dia qualquer
2. Verifique se alterna: vazio → P → F → A → vazio
3. Use atalhos de teclado:
   - `P` = Presente (verde)
   - `F` = Falta (vermelho) 
   - `A` = Atestado (amarelo)
   - `Backspace` = Limpar
4. Confirme que salva automaticamente (toast "Salvo")

#### ✅ **Teste 3: Seleção Múltipla**
1. `Shift + Clique`: Selecione intervalo de 5 dias para 1 aluno
2. `Ctrl + Clique`: Adicione células dispersas à seleção
3. Clique "Salvar Lote" → escolha "F" → aplique
4. Verifique se todas as células selecionadas ficaram "F"

#### ✅ **Teste 4: Estatísticas em Tempo Real**
1. Lance faltas para vários alunos em dias diferentes
2. Verifique se atualiza automaticamente:
   - **Total Faltas** por aluno (coluna direita)
   - **% Faltas** por aluno
   - **Total de faltas no dia** (rodapé)
   - **Média de Faltas** no cabeçalho

#### ✅ **Teste 5: Filtros**
1. Troque de turma → tabela recarrega com alunos da nova turma
2. Troque de mês → tabela mostra dias do novo mês (28/30/31)
3. Use busca no topo → filtra alunos por nome/código

#### ✅ **Teste 6: Exportação CSV**
1. Lance dados de frequência para vários alunos
2. Clique "Exportar CSV"
3. Verifique se arquivo contém:
   - Colunas: Código, Nome, 01..31, Total Faltas, Atestado, Presente, % Faltas
   - Dados corretos de todos os alunos

#### ✅ **Teste 7: Navegação por Teclado**
1. Clique em uma célula para focá-la
2. Use `Enter` → desce para próxima linha
3. Use `Tab` → vai para direita
4. Use `Shift+Tab` → vai para esquerda

## ⚙️ Configurações Técnicas

### Firebase Rules
```javascript
// Já implementadas em firestore.rules
match /frequencia/{frequenciaId} {
  allow read, write: if request.auth != null;
}
```

### Performance
- **Debounce**: Salvamento automático com delay de 400ms
- **Batch Writes**: Operações em lote usam `writeBatch()`
- **Virtual Scroll**: Preparado para 100+ alunos (não implementado ainda)

### Responsividade
- Tabela com scroll horizontal em mobile
- Colunas fixas (Código + Nome) sempre visíveis
- Modal de lote se adapta a telas pequenas

## 🛠️ Funções de Debug (Console do Navegador)

```javascript
// Verificar dados carregados
console.log(window.frequenciaManager.dadosMensais);

// Verificar seleção atual
console.log(window.frequenciaManager.selectionManager.selectedCells);

// Forçar recálculo
window.frequenciaManager.recalcularTudoEMesclar();

// Limpar seleção
window.frequenciaManager.selectionManager.clearSelection();
```

## 🚨 Pontos de Atenção

1. **Alunos Ativos**: Sistema carrega apenas alunos com `status = 'ativo'`
2. **Autosave**: Cada célula salva automaticamente após 400ms
3. **Mês/Turma**: Documento Firestore é criado automaticamente se não existir
4. **Validação**: Aceita apenas valores 'P', 'F', 'A' ou vazio

## 📊 Critérios de Aceitação (Todos Implementados)

- [x] Tabela responsiva com header fixo e colunas congeladas
- [x] Edição célula-a-célula com alternância P/F/A
- [x] Atalhos de teclado funcionais
- [x] Seleção múltipla (Shift+Clique, Ctrl+Clique)
- [x] Salvamento em lote com modal
- [x] Estatísticas em tempo real (totais e percentuais)
- [x] Filtros por turma e mês
- [x] Exportação CSV completa
- [x] Autosave com debounce
- [x] Toast notifications
- [x] Estrutura Firestore otimizada

## 🎉 Sistema Pronto para Produção!

O sistema de frequência está **100% funcional** e integrado ao Dashboard Disciplinar existente. Todos os recursos solicitados foram implementados seguindo as melhores práticas de performance e UX.

**Link direto**: `/pages/frequencia.html`