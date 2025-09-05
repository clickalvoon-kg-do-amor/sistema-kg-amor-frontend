-- Schema do Sistema KG do Amor - PostgreSQL
-- Congregação O Alvo Curitiba

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Redes
CREATE TABLE redes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cor VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Supervisões
CREATE TABLE supervisoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    responsavel VARCHAR(100),
    telefone VARCHAR(20),
    email VARCHAR(100),
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Células
CREATE TABLE celulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    rede_id UUID REFERENCES redes(id),
    supervisao_id UUID REFERENCES supervisoes(id),
    lideres VARCHAR(200) NOT NULL,
    endereco TEXT,
    telefone VARCHAR(20),
    observacoes TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Categorias de Produtos
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#FF6B35', -- Cor hexadecimal para UI
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    categoria_id UUID REFERENCES categorias(id),
    unidade_medida VARCHAR(10) NOT NULL CHECK (unidade_medida IN ('kg', 'lt', 'und', 'cx', 'pct')),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nome, categoria_id)
);

-- Tabela de Usuários (para controle de acesso)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(20) DEFAULT 'operador' CHECK (papel IN ('admin', 'supervisor', 'operador')),
    celula_id UUID REFERENCES celulas(id), -- Usuário pode estar vinculado a uma célula
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Recebimentos (Entregas das células)
CREATE TABLE recebimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_recebimento DATE NOT NULL,
    celula_id UUID REFERENCES celulas(id) NOT NULL,
    kg_total DECIMAL(10,2) NOT NULL CHECK (kg_total > 0),
    responsavel_entrega VARCHAR(100) NOT NULL,
    responsavel_recebimento UUID REFERENCES usuarios(id),
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'recebido' CHECK (status IN ('recebido', 'triado', 'distribuido')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens do Estoque (produtos triados)
CREATE TABLE estoque_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID REFERENCES produtos(id) NOT NULL,
    recebimento_id UUID REFERENCES recebimentos(id), -- Opcional, pode ser entrada manual
    quantidade DECIMAL(10,2) NOT NULL CHECK (quantidade >= 0),
    lote VARCHAR(50),
    data_validade DATE,
    data_entrada DATE DEFAULT CURRENT_DATE,
    status_produto VARCHAR(20) DEFAULT 'normal' CHECK (status_produto IN ('normal', 'uso_imediato', 'vencido', 'distribuido')),
    localizacao VARCHAR(100), -- Onde está armazenado
    observacoes TEXT,
    usuario_cadastro UUID REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Movimentações do Estoque (saídas/distribuições)
CREATE TABLE movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estoque_item_id UUID REFERENCES estoque_itens(id) NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'ajuste', 'perda')),
    quantidade DECIMAL(10,2) NOT NULL,
    data_movimentacao DATE DEFAULT CURRENT_DATE,
    destino VARCHAR(200), -- Para onde foi (família, evento, etc.)
    responsavel UUID REFERENCES usuarios(id),
    motivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Log de Atividades (auditoria)
CREATE TABLE log_atividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    acao VARCHAR(50) NOT NULL,
    tabela_afetada VARCHAR(50),
    registro_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_celulas_rede ON celulas(rede_id);
CREATE INDEX idx_celulas_supervisao ON celulas(supervisao_id);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_recebimentos_data ON recebimentos(data_recebimento);
CREATE INDEX idx_recebimentos_celula ON recebimentos(celula_id);
CREATE INDEX idx_estoque_produto ON estoque_itens(produto_id);
CREATE INDEX idx_estoque_status ON estoque_itens(status_produto);
CREATE INDEX idx_estoque_validade ON estoque_itens(data_validade);
CREATE INDEX idx_movimentacoes_item ON movimentacoes_estoque(estoque_item_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);

-- Triggers para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas principais
CREATE TRIGGER update_redes_updated_at BEFORE UPDATE ON redes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supervisoes_updated_at BEFORE UPDATE ON supervisoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_celulas_updated_at BEFORE UPDATE ON celulas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recebimentos_updated_at BEFORE UPDATE ON recebimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estoque_itens_updated_at BEFORE UPDATE ON estoque_itens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular estoque atual de um produto
CREATE OR REPLACE FUNCTION calcular_estoque_produto(produto_uuid UUID)
RETURNS TABLE(
    total_normal DECIMAL,
    total_uso_imediato DECIMAL,
    total_vencido DECIMAL,
    total_geral DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN ei.status_produto = 'normal' THEN ei.quantidade ELSE 0 END), 0) as total_normal,
        COALESCE(SUM(CASE WHEN ei.status_produto = 'uso_imediato' THEN ei.quantidade ELSE 0 END), 0) as total_uso_imediato,
        COALESCE(SUM(CASE WHEN ei.status_produto = 'vencido' THEN ei.quantidade ELSE 0 END), 0) as total_vencido,
        COALESCE(SUM(ei.quantidade), 0) as total_geral
    FROM estoque_itens ei
    WHERE ei.produto_id = produto_uuid 
    AND ei.status_produto != 'distribuido';
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de arrecadação por período
CREATE OR REPLACE FUNCTION relatorio_arrecadacao(
    data_inicio DATE,
    data_fim DATE
)
RETURNS TABLE(
    celula_nome VARCHAR,
    rede_cor VARCHAR,
    total_kg DECIMAL,
    total_entregas BIGINT,
    lideres VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.nome as celula_nome,
        r.cor as rede_cor,
        COALESCE(SUM(rec.kg_total), 0) as total_kg,
        COUNT(rec.id) as total_entregas,
        c.lideres
    FROM celulas c
    LEFT JOIN redes r ON c.rede_id = r.id
    LEFT JOIN recebimentos rec ON c.id = rec.celula_id 
        AND rec.data_recebimento BETWEEN data_inicio AND data_fim
    WHERE c.ativa = true
    GROUP BY c.id, c.nome, r.cor, c.lideres
    ORDER BY total_kg DESC;
END;
$$ LANGUAGE plpgsql;

-- View para dashboard principal
CREATE OR REPLACE VIEW dashboard_principal AS
SELECT 
    (SELECT COUNT(*) FROM celulas WHERE ativa = true) as total_celulas,
    (SELECT COUNT(*) FROM recebimentos WHERE data_recebimento >= CURRENT_DATE - INTERVAL '30 days') as entregas_mes,
    (SELECT COALESCE(SUM(kg_total), 0) FROM recebimentos WHERE data_recebimento >= CURRENT_DATE - INTERVAL '30 days') as kg_mes,
    (SELECT COUNT(DISTINCT produto_id) FROM estoque_itens WHERE status_produto != 'distribuido') as produtos_estoque,
    (SELECT COALESCE(SUM(quantidade), 0) FROM estoque_itens WHERE status_produto = 'uso_imediato') as itens_uso_imediato,
    (SELECT COALESCE(SUM(quantidade), 0) FROM estoque_itens WHERE status_produto = 'vencido') as itens_vencidos;

-- Dados iniciais
INSERT INTO redes (cor, descricao) VALUES 
('Vermelha', 'Rede de células da zona norte'),
('Azul', 'Rede de células da zona sul'),
('Verde', 'Rede de células da zona leste'),
('Amarela', 'Rede de células da zona oeste'),
('Laranja', 'Rede de células do centro'),
('Roxa', 'Rede de células especiais'),
('Rosa', 'Rede de células femininas'),
('Branca', 'Rede de células jovens');

INSERT INTO supervisoes (nome, responsavel) VALUES 
('Supervisão Norte', 'Pastor João Silva'),
('Supervisão Sul', 'Pastor Maria Santos'),
('Supervisão Leste', 'Pastor Carlos Oliveira'),
('Supervisão Oeste', 'Pastora Ana Costa'),
('Supervisão Centro', 'Pastor Pedro Lima');

INSERT INTO categorias (nome, descricao, cor) VALUES 
('GRÃOS E CEREAIS', 'Feijões, arroz, lentilhas e similares', '#8B4513'),
('ÓLEOS E TEMPEROS', 'Óleos, sal, açúcar e condimentos', '#FFD700'),
('FARINHAS E MASSAS', 'Farinhas, massas e derivados', '#DEB887'),
('LATICÍNIOS', 'Leites, queijos e derivados', '#87CEEB'),
('CARNES E PROTEÍNAS', 'Carnes, ovos e proteínas', '#CD5C5C'),
('HIGIENE E LIMPEZA', 'Produtos de higiene e limpeza', '#90EE90'),
('ENLATADOS E CONSERVAS', 'Produtos enlatados e conservas', '#DAA520');

-- Comentários nas tabelas para documentação
COMMENT ON TABLE redes IS 'Cores das redes de células da congregação';
COMMENT ON TABLE supervisoes IS 'Supervisões responsáveis pelas células';
COMMENT ON TABLE celulas IS 'Células da congregação que fazem doações';
COMMENT ON TABLE categorias IS 'Categorias dos produtos doados';
COMMENT ON TABLE produtos IS 'Produtos que podem ser doados';
COMMENT ON TABLE usuarios IS 'Usuários do sistema com diferentes níveis de acesso';
COMMENT ON TABLE recebimentos IS 'Registro das entregas feitas pelas células';
COMMENT ON TABLE estoque_itens IS 'Itens individuais do estoque após triagem';
COMMENT ON TABLE movimentacoes_estoque IS 'Histórico de movimentações do estoque';
COMMENT ON TABLE log_atividades IS 'Log de auditoria de todas as ações do sistema';