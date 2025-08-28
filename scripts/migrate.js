// Script para criar tabelas no NeonDB
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🚀 Iniciando migração do banco de dados...');

  try {
    // Tabela de usuários
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'professor',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tabela users criada');

    // Tabela de alunos
    await sql`
      CREATE TABLE IF NOT EXISTS alunos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        turma VARCHAR(20) NOT NULL,
        matricula VARCHAR(50) UNIQUE,
        data_nascimento DATE,
        responsavel_nome VARCHAR(255),
        responsavel_telefone VARCHAR(20),
        observacoes TEXT,
        active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tabela alunos criada');

    // Tabela de medidas disciplinares
    await sql`
      CREATE TABLE IF NOT EXISTS medidas (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        data DATE NOT NULL,
        providencias TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tabela medidas criada');

    // Tabela de frequência
    await sql`
      CREATE TABLE IF NOT EXISTS frequencia (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,
        data DATE NOT NULL,
        status CHAR(2) NOT NULL, -- P, F, FJ, A
        observacao TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(aluno_id, data)
      )
    `;
    console.log('✅ Tabela frequencia criada');

    // Índices para performance
    await sql`CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medidas_aluno ON medidas(aluno_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medidas_data ON medidas(data)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_frequencia_data ON frequencia(data)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_frequencia_aluno ON frequencia(aluno_id)`;
    
    console.log('✅ Índices criados');

    console.log('🎉 Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrate();