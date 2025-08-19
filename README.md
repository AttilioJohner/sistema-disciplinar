# Sistema Disciplinar - Versão Local

## 🎯 Sobre o Sistema

Sistema de gestão disciplinar escolar que agora funciona **completamente offline** com banco de dados local em JSON, eliminando custos e dependências externas.

## 🔧 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Banco de Dados**: JSON local (sem Firebase)
- **Autenticação**: Sistema local com localStorage
- **Hospedagem**: GitHub Pages

## 🚀 Como Usar

### 1. Acesso ao Sistema
- **URL**: https://attiliojohner.github.io/sistema-disciplinar-revisado/
- **Login**: `admin@escola.com` ou `admin`
- **Senha**: `admin123`

### 2. Módulos Disponíveis

#### 📅 Controle de Frequência
- Dados de agosto 2025 já carregados
- 400+ alunos de 12 turmas (6A, 6B, 7A, 7B, 8A, 8B, 9A, 9B, 9E, 1B, 1C, 2A)
- Relatórios automáticos de presença/falta
- Alertas para baixa frequência
- Exportação em CSV

#### 👥 Gestão de Alunos
- Cadastro e edição de alunos
- Organização por turmas
- Histórico disciplinar

#### ⚖️ Medidas Disciplinares
- Registro de ocorrências
- Tipos de medidas aplicadas
- Acompanhamento por aluno

#### 📊 Relatórios
- Estatísticas gerais
- Relatórios detalhados
- Análises por período e turma

## 💾 Banco de Dados Local

### Estrutura
```
data/
└── db.json          # Banco principal
```

### Coleções
- `alunos`: Dados dos estudantes
- `medidas_disciplinares`: Ocorrências registradas  
- `frequencia_diaria`: Dados de presença/falta
- `usuarios`: Contas de acesso
- `configuracoes`: Parâmetros do sistema

### Vantagens
- ✅ **Sem custos** de banco de dados
- ✅ **Sem limites** de operações
- ✅ **Funciona offline** (após primeiro carregamento)
- ✅ **Dados versionados** no GitHub
- ✅ **Backup automático** via commits
- ✅ **Performance** rápida

## 🔐 Autenticação

### Sistema Local
- Login: `admin@escola.com` / `admin123`
- Sessão: 24 horas no localStorage
- Sem dependências externas

## 📊 Dados de Demonstração

### Frequência de Agosto 2025
- **Total**: 400+ registros
- **Turmas**: 6A, 6B, 7A, 7B, 8A, 8B, 9A, 9B, 9E, 1B, 1C, 2A
- **Período**: Dias úteis de agosto (1,4,5,6,7,8,11,12,13,14,15,18,19,20,21,22,25,26,27,28,29)
- **Formato**: P (Presente), F (Falta), A (Atestado)

## 🛠️ Como Rodar

### Online (Recomendado)
Acesse: https://attiliojohner.github.io/sistema-disciplinar-revisado/

### Local
```bash
# Servir localmente
python -m http.server 8000
# ou
npx serve .
```

## 📝 Funcionalidades

### ✅ Implementado
- [x] Sistema de banco local
- [x] Autenticação local
- [x] Controle de frequência
- [x] Dados de agosto 2025
- [x] Relatórios básicos
- [x] Interface responsiva

### 🔄 Em Desenvolvimento  
- [ ] Gestão completa de alunos
- [ ] Sistema de medidas disciplinares
- [ ] Relatórios avançados
- [ ] Dashboard com gráficos

## 🔄 Atualizações

### Como Atualizar Dados
1. Editar `data/db.json`
2. Fazer commit no GitHub
3. Dados são atualizados automaticamente

---

**Versão**: 2.0.0 (Sistema Local)  
**Última atualização**: Agosto 2025
