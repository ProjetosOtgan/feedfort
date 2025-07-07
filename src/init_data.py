from src.models.user import db, User, Setor, Funcionario

def init_default_data():
    """Inicializa dados padrão do sistema"""
    
    # Criar usuário administrador padrão
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User(
            username='admin',
            email='admin@feedback.com',
            user_type='admin'
        )
        admin_user.set_password('admin123')
        db.session.add(admin_user)
    
    # Criar usuário comum padrão
    common_user = User.query.filter_by(username='usuario').first()
    if not common_user:
        common_user = User(
            username='usuario',
            email='usuario@feedback.com',
            user_type='comum'
        )
        common_user.set_password('usuario123')
        db.session.add(common_user)
    
    # Definir setores e seus atributos de avaliação
    setores_data = [
        {
            'nome': 'Açougue',
            'descricao': 'Setor responsável pelo corte e venda de carnes',
            'atributos_avaliacao': ['Limpeza', 'Qualidade do Corte', 'Atendimento', 'Organização', 'Pontualidade']
        },
        {
            'nome': 'Padaria',
            'descricao': 'Setor responsável pela produção e venda de pães e doces',
            'atributos_avaliacao': ['Limpeza', 'Qualidade dos Produtos', 'Atendimento', 'Organização', 'Pontualidade']
        },
        {
            'nome': 'Frente de Loja',
            'descricao': 'Setor responsável pelo atendimento ao cliente e caixas',
            'atributos_avaliacao': ['Limpeza', 'Atendimento', 'Controle de Sacolas', 'Vendas', 'Pontualidade']
        },
        {
            'nome': 'Mercearia',
            'descricao': 'Setor responsável pelos produtos de mercearia e abastecimento',
            'atributos_avaliacao': ['Limpeza', 'Abastecimento', 'Pontualidade', 'Atendimento', 'Apoio']
        },
        {
            'nome': 'Administrativo',
            'descricao': 'Setor responsável pelas atividades administrativas',
            'atributos_avaliacao': ['Organização', 'Pontualidade', 'Comunicação', 'Eficiência', 'Apoio']
        },
        {
            'nome': 'Lanchonete',
            'descricao': 'Setor responsável pela preparação e venda de lanches',
            'atributos_avaliacao': ['Limpeza', 'Qualidade dos Produtos', 'Atendimento', 'Agilidade', 'Pontualidade']
        }
    ]
    
    # Criar setores
    for setor_data in setores_data:
        setor = Setor.query.filter_by(nome=setor_data['nome']).first()
        if not setor:
            setor = Setor(
                nome=setor_data['nome'],
                descricao=setor_data['descricao'],
                atributos_avaliacao=setor_data['atributos_avaliacao']
            )
            db.session.add(setor)
    
    # Criar alguns funcionários de exemplo
    funcionarios_exemplo = [
        {'nome': 'João Silva', 'setor': 'Açougue', 'cargo': 'Açougueiro'},
        {'nome': 'Maria Santos', 'setor': 'Padaria', 'cargo': 'Padeira'},
        {'nome': 'Pedro Costa', 'setor': 'Frente de Loja', 'cargo': 'Operador de Caixa'},
        {'nome': 'Ana Oliveira', 'setor': 'Mercearia', 'cargo': 'Repositora'},
        {'nome': 'Carlos Ferreira', 'setor': 'Administrativo', 'cargo': 'Assistente Administrativo'},
        {'nome': 'Lucia Pereira', 'setor': 'Lanchonete', 'cargo': 'Atendente'},
    ]
    
    for func_data in funcionarios_exemplo:
        funcionario = Funcionario.query.filter_by(nome=func_data['nome']).first()
        if not funcionario:
            setor = Setor.query.filter_by(nome=func_data['setor']).first()
            if setor:
                funcionario = Funcionario(
                    nome=func_data['nome'],
                    setor_id=setor.id,
                    cargo=func_data['cargo']
                )
                db.session.add(funcionario)
    
    try:
        db.session.commit()
        print("Dados padrão inicializados com sucesso!")
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao inicializar dados padrão: {e}")

if __name__ == '__main__':
    from src.main import app
    with app.app_context():
        init_default_data()

