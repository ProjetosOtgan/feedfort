from flask import Blueprint, jsonify, request
from datetime import datetime
from src.models.user import Feedback, Funcionario, Setor, db
from sqlalchemy import func
from src.auth import token_required, admin_required, get_current_user

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/feedback', methods=['POST'])
@token_required
def create_feedback():
    """Cria um novo feedback"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        if not data:
            return jsonify({'message': 'Dados não fornecidos'}), 400
        
        # Validar campos obrigatórios
        required_fields = ['tipo', 'funcionario_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'Campo {field} é obrigatório'}), 400
        
        # Validar tipo de feedback
        allowed_types = ['diario', 'positiva', 'negativa', 'experiencia', 'diario_experiencia', 'final_experiencia']
        if data['tipo'] not in allowed_types:
            return jsonify({'message': f'Tipo de feedback deve ser um de: {allowed_types}'}), 400
        
        # Verificar se funcionário existe
        funcionario = Funcionario.query.get(data['funcionario_id'])
        if not funcionario or not funcionario.is_active:
            return jsonify({'message': 'Funcionário não encontrado ou inativo'}), 404
        
        # Validar dados específicos por tipo
        if data['tipo'] == 'diario':
            if 'avaliacoes' not in data or not data['avaliacoes']:
                return jsonify({'message': 'Avaliações são obrigatórias para feedback diário'}), 400
            
            # Verificar se as avaliações são válidas (notas de 0 a 5)
            for atributo, nota in data['avaliacoes'].items():
                if not isinstance(nota, (int, float)) or nota < 0 or nota > 5:
                    return jsonify({'message': f'Nota para {atributo} deve ser entre 0 e 5'}), 400
        
        elif data['tipo'] in ['positiva', 'negativa']:
            if 'descricao' not in data or not data['descricao'].strip():
                return jsonify({'message': 'Descrição é obrigatória para ocorrências'}), 400
        elif data['tipo'] == 'diario_experiencia':
            if 'avaliacoes' not in data or not data['avaliacoes']:
                return jsonify({'message': 'Avaliações são obrigatórias para feedback diário de experiência'}), 400
            for atributo, nota in data['avaliacoes'].items():
                if not isinstance(nota, (int, float)) or nota < 0 or nota > 5:
                    return jsonify({'message': f'Nota para {atributo} deve ser entre 0 e 5'}), 400
        elif data['tipo'] == 'final_experiencia':
            if 'detalhes' not in data or not data['detalhes'].strip():
                return jsonify({'message': 'Detalhes são obrigatórios para feedback final de experiência'}), 400
            if 'recomenda_efetivacao' not in data:
                return jsonify({'message': 'Recomendação de efetivação é obrigatória'}), 400
        
        # Criar feedback
        feedback = Feedback(
            tipo=data['tipo'],
            funcionario_id=data['funcionario_id'],
            autor_id=current_user.id,
            avaliacoes=data.get('avaliacoes'),
            descricao=data.get('descricao', '').strip() if data.get('descricao') else None,
            detalhes=data.get('detalhes'),
            recomenda_efetivacao=data.get('recomenda_efetivacao'),
            data_feedback=datetime.utcnow()
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify(feedback.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@feedback_bp.route('/feedback', methods=['GET'])
@token_required
def get_feedbacks():
    """Lista feedbacks com filtros opcionais"""
    try:
        current_user = get_current_user()
        
        # Parâmetros de filtro
        funcionario_id = request.args.get('funcionario_id', type=int)
        setor_id = request.args.get('setor_id', type=int)
        tipo = request.args.get('tipo')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        autor_id = request.args.get('autor_id', type=int)
        
        # Construir query
        query = Feedback.query
        
        # Usuários comuns só veem seus próprios feedbacks, admins veem todos
        if current_user.user_type != 'admin':
            query = query.filter_by(autor_id=current_user.id)
        
        # Aplicar filtros
        if funcionario_id:
            query = query.filter_by(funcionario_id=funcionario_id)
        
        if setor_id:
            query = query.join(Funcionario).filter(Funcionario.setor_id == setor_id)
        
        if tipo:
            query = query.filter_by(tipo=tipo)
        
        if autor_id and current_user.user_type == 'admin':
            query = query.filter_by(autor_id=autor_id)
        
        if data_inicio:
            try:
                data_inicio_dt = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
                query = query.filter(Feedback.data_feedback >= data_inicio_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_inicio inválido. Use ISO format'}), 400
        
        if data_fim:
            try:
                data_fim_dt = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
                query = query.filter(Feedback.data_feedback <= data_fim_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_fim inválido. Use ISO format'}), 400
        
        # Ordenar por data mais recente
        feedbacks = query.order_by(Feedback.data_feedback.desc()).all()
        
        return jsonify([feedback.to_dict() for feedback in feedbacks]), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@feedback_bp.route('/feedback/<int:feedback_id>', methods=['GET'])
@token_required
def get_feedback(feedback_id):
    """Obtém um feedback específico"""
    try:
        current_user = get_current_user()
        feedback = Feedback.query.get_or_404(feedback_id)
        
        # Usuários comuns só podem ver seus próprios feedbacks
        if current_user.user_type != 'admin' and feedback.autor_id != current_user.id:
            return jsonify({'message': 'Acesso negado'}), 403
        
        return jsonify(feedback.to_dict()), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@feedback_bp.route('/feedback/stats/daily_evolution', methods=['GET'])
@token_required
@admin_required
def get_daily_evolution_stats():
    """Calcula a evolução da média diária de notas para feedbacks de experiência."""
    try:
        # Subquery para extrair a nota de cada avaliação
        # Acessa a chave 'nota' dentro do JSON 'avaliacoes'
        subquery = db.session.query(
            Feedback.data_feedback,
            func.json_extract(Feedback.avaliacoes, '$.nota').label('nota')
        ).filter(
            Feedback.tipo == 'diario_experiencia',
            Feedback.avaliacoes.isnot(None)
        ).subquery()

        # Query principal para agrupar por dia e calcular a média
        results = db.session.query(
            func.date(subquery.c.data_feedback).label('data'),
            func.avg(subquery.c.nota).label('media_nota')
        ).group_by('data').order_by('data').all()

        # Formatar os resultados
        dates = [res.data.strftime('%d/%m/%Y') for res in results]
        averages = [float(res.media_nota) for res in results]

        return jsonify({'dates': dates, 'averages': averages}), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@feedback_bp.route('/feedback/<int:feedback_id>', methods=['PUT'])
@token_required
def update_feedback(feedback_id):
    """Atualiza um feedback"""
    try:
        current_user = get_current_user()
        feedback = Feedback.query.get_or_404(feedback_id)
        
        # Usuários comuns só podem editar seus próprios feedbacks
        if current_user.user_type != 'admin' and feedback.autor_id != current_user.id:
            return jsonify({'message': 'Acesso negado'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'message': 'Dados não fornecidos'}), 400
        
        # Atualizar campos permitidos
        if 'tipo' in data:
            if data['tipo'] not in ['diario', 'positiva', 'negativa']:
                return jsonify({'message': 'Tipo de feedback deve ser: diario, positiva ou negativa'}), 400
            feedback.tipo = data['tipo']
        
        if 'funcionario_id' in data:
            funcionario = Funcionario.query.get(data['funcionario_id'])
            if not funcionario or not funcionario.is_active:
                return jsonify({'message': 'Funcionário não encontrado ou inativo'}), 404
            feedback.funcionario_id = data['funcionario_id']
        
        if 'avaliacoes' in data:
            # Validar avaliações se for feedback diário
            if feedback.tipo == 'diario':
                for atributo, nota in data['avaliacoes'].items():
                    if not isinstance(nota, (int, float)) or nota < 0 or nota > 5:
                        return jsonify({'message': f'Nota para {atributo} deve ser entre 0 e 5'}), 400
            feedback.avaliacoes = data['avaliacoes']
        
        if 'descricao' in data:
            feedback.descricao = data['descricao'].strip() if data['descricao'] else None
        
        # Marcar como não sincronizado se houve alterações
        feedback.sincronizado_sheets = False
        feedback.data_sincronizacao = None
        
        db.session.commit()
        return jsonify(feedback.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@feedback_bp.route('/feedback/<int:feedback_id>', methods=['DELETE'])
@token_required
def delete_feedback(feedback_id):
    """Deleta um feedback"""
    try:
        current_user = get_current_user()
        feedback = Feedback.query.get_or_404(feedback_id)
        
        # Usuários comuns só podem deletar seus próprios feedbacks
        if current_user.user_type != 'admin' and feedback.autor_id != current_user.id:
            return jsonify({'message': 'Acesso negado'}), 403
        
        db.session.delete(feedback)
        db.session.commit()
        return '', 204
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@feedback_bp.route('/feedback/stats', methods=['GET'])
@token_required
def get_feedback_stats():
    """Retorna estatísticas de feedbacks"""
    try:
        current_user = get_current_user()
        
        # Base query
        query = Feedback.query
        
        # Usuários comuns só veem estatísticas dos seus feedbacks
        if current_user.user_type != 'admin':
            query = query.filter_by(autor_id=current_user.id)
        
        # Filtros opcionais
        setor_id = request.args.get('setor_id', type=int)
        funcionario_id = request.args.get('funcionario_id', type=int)
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        if setor_id:
            query = query.join(Funcionario).filter(Funcionario.setor_id == setor_id)
        
        if funcionario_id:
            query = query.filter_by(funcionario_id=funcionario_id)
        
        if data_inicio:
            try:
                data_inicio_dt = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
                query = query.filter(Feedback.data_feedback >= data_inicio_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_inicio inválido'}), 400
        
        if data_fim:
            try:
                data_fim_dt = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
                query = query.filter(Feedback.data_feedback <= data_fim_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_fim inválido'}), 400
        
        # Calcular estatísticas
        total_feedbacks = query.count()
        feedbacks_diarios = query.filter_by(tipo='diario').count()
        feedbacks_positivos = query.filter_by(tipo='positiva').count()
        feedbacks_negativos = query.filter_by(tipo='negativa').count()
        feedbacks_experiencia = query.filter_by(tipo='experiencia').count()
        
        # Estatísticas por setor (apenas para admin)
        stats_por_setor = []
        if current_user.user_type == 'admin':
            setores = Setor.query.all()
            for setor in setores:
                setor_query = query.join(Funcionario).filter(Funcionario.setor_id == setor.id)
                stats_por_setor.append({
                    'setor_id': setor.id,
                    'setor_nome': setor.nome,
                    'total_feedbacks': setor_query.count(),
                    'feedbacks_diarios': setor_query.filter(Feedback.tipo == 'diario').count(),
                    'feedbacks_positivos': setor_query.filter(Feedback.tipo == 'positiva').count(),
                    'feedbacks_negativos': setor_query.filter(Feedback.tipo == 'negativa').count(),
                    'feedbacks_experiencia': setor_query.filter(Feedback.tipo == 'experiencia').count()
                })
        
        return jsonify({
            'total_feedbacks': total_feedbacks,
            'feedbacks_diarios': feedbacks_diarios,
            'feedbacks_positivos': feedbacks_positivos,
            'feedbacks_experiencia': feedbacks_experiencia,
            'feedbacks_negativos': feedbacks_negativos,
            'stats_por_setor': stats_por_setor
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

