from flask import Blueprint, jsonify, request
from src.models.user import Setor, Funcionario, db
from src.auth import token_required, admin_required, get_current_user

setores_bp = Blueprint('setores', __name__)

@setores_bp.route('/setores', methods=['GET'])
@token_required
def get_setores():
    """Lista todos os setores disponíveis"""
    try:
        setores = Setor.query.all()
        return jsonify([setor.to_dict() for setor in setores]), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/setores/<int:setor_id>', methods=['GET'])
@token_required
def get_setor(setor_id):
    """Obtém dados de um setor específico"""
    try:
        setor = Setor.query.get_or_404(setor_id)
        return jsonify(setor.to_dict()), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/setores', methods=['POST'])
@token_required
@admin_required
def create_setor():
    """Cria um novo setor (apenas admin)"""
    try:
        data = request.get_json()
        
        if not data or not data.get('nome'):
            return jsonify({'message': 'Nome do setor é obrigatório'}), 400
        
        # Verificar se setor já existe
        if Setor.query.filter_by(nome=data['nome']).first():
            return jsonify({'message': 'Setor já existe'}), 400
        
        setor = Setor(
            nome=data['nome'],
            descricao=data.get('descricao', ''),
            atributos_avaliacao=data.get('atributos_avaliacao', [])
        )
        
        db.session.add(setor)
        db.session.commit()
        
        return jsonify(setor.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/setores/<int:setor_id>', methods=['PUT'])
@token_required
@admin_required
def update_setor(setor_id):
    """Atualiza um setor (apenas admin)"""
    try:
        setor = Setor.query.get_or_404(setor_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'Dados não fornecidos'}), 400
        
        if 'nome' in data:
            # Verificar se nome já existe (exceto o próprio setor)
            existing_setor = Setor.query.filter_by(nome=data['nome']).first()
            if existing_setor and existing_setor.id != setor_id:
                return jsonify({'message': 'Nome do setor já existe'}), 400
            setor.nome = data['nome']
        
        if 'descricao' in data:
            setor.descricao = data['descricao']
        
        if 'atributos_avaliacao' in data:
            setor.atributos_avaliacao = data['atributos_avaliacao']
        
        db.session.commit()
        return jsonify(setor.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/setores/<int:setor_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_setor(setor_id):
    """Deleta um setor (apenas admin)"""
    try:
        setor = Setor.query.get_or_404(setor_id)
        
        # Verificar se há funcionários vinculados
        if setor.funcionarios:
            return jsonify({'message': 'Não é possível deletar setor com funcionários vinculados'}), 400
        
        db.session.delete(setor)
        db.session.commit()
        return '', 204
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/setores/<int:setor_id>/atributos', methods=['POST'])
@token_required
@admin_required
def add_attribute_to_setor(setor_id):
    """Adiciona um atributo de avaliação a um setor"""
    try:
        setor = Setor.query.get_or_404(setor_id)
        data = request.get_json()

        if not data or not data.get('atributo'):
            return jsonify({'message': 'Nome do atributo é obrigatório'}), 400

        atributo = data['atributo']
        if atributo not in setor.atributos_avaliacao:
            setor.atributos_avaliacao.append(atributo)
            db.session.commit()

        return jsonify(setor.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/setores/<int:setor_id>/atributos', methods=['DELETE'])
@token_required
@admin_required
def remove_attribute_from_setor(setor_id):
    """Remove um atributo de avaliação de um setor"""
    try:
        setor = Setor.query.get_or_404(setor_id)
        data = request.get_json()

        if not data or not data.get('atributo'):
            return jsonify({'message': 'Nome do atributo é obrigatório'}), 400

        atributo = data['atributo']
        if atributo in setor.atributos_avaliacao:
            setor.atributos_avaliacao.remove(atributo)
            db.session.commit()

        return jsonify(setor.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/funcionarios', methods=['GET'])
@token_required
def get_funcionarios():
    """Lista funcionários, opcionalmente filtrados por setor"""
    try:
        setor_nome = request.args.get('setor')
        setor_id = request.args.get('setor_id')
        
        query = Funcionario.query.filter_by(is_active=True)
        
        if setor_nome:
            setor = Setor.query.filter_by(nome=setor_nome).first()
            if setor:
                query = query.filter_by(setor_id=setor.id)
            else:
                return jsonify({'message': 'Setor não encontrado'}), 404
        
        if setor_id:
            query = query.filter_by(setor_id=setor_id)
        
        funcionarios = query.all()
        return jsonify([funcionario.to_dict() for funcionario in funcionarios]), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/funcionarios/<int:funcionario_id>', methods=['GET'])
@token_required
def get_funcionario(funcionario_id):
    """Obtém dados de um funcionário específico"""
    try:
        funcionario = Funcionario.query.get_or_404(funcionario_id)
        return jsonify(funcionario.to_dict()), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/funcionarios', methods=['POST'])
@token_required
@admin_required
def create_funcionario():
    """Cria um novo funcionário (apenas admin)"""
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['nome', 'setor_id']):
            return jsonify({'message': 'Nome e setor_id são obrigatórios'}), 400
        
        # Verificar se setor existe
        setor = Setor.query.get(data['setor_id'])
        if not setor:
            return jsonify({'message': 'Setor não encontrado'}), 404
        
        funcionario = Funcionario(
            nome=data['nome'],
            setor_id=data['setor_id'],
            cargo=data.get('cargo', '')
        )
        
        db.session.add(funcionario)
        db.session.commit()
        
        return jsonify(funcionario.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/funcionarios/<int:funcionario_id>', methods=['PUT'])
@token_required
@admin_required
def update_funcionario(funcionario_id):
    """Atualiza um funcionário (apenas admin)"""
    try:
        funcionario = Funcionario.query.get_or_404(funcionario_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'Dados não fornecidos'}), 400
        
        if 'nome' in data:
            funcionario.nome = data['nome']
        
        if 'setor_id' in data:
            # Verificar se setor existe
            setor = Setor.query.get(data['setor_id'])
            if not setor:
                return jsonify({'message': 'Setor não encontrado'}), 404
            funcionario.setor_id = data['setor_id']
        
        if 'cargo' in data:
            funcionario.cargo = data['cargo']
        
        if 'is_active' in data:
            funcionario.is_active = data['is_active']
        
        db.session.commit()
        return jsonify(funcionario.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/funcionarios/<int:funcionario_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_funcionario(funcionario_id):
    """Deleta um funcionário (apenas admin)"""
    try:
        funcionario = Funcionario.query.get_or_404(funcionario_id)
        
        # Em vez de deletar, marcar como inativo se houver feedbacks
        if funcionario.feedbacks:
            funcionario.is_active = False
            db.session.commit()
            return jsonify({'message': 'Funcionário marcado como inativo devido a feedbacks existentes'}), 200
        else:
            db.session.delete(funcionario)
            db.session.commit()
            return '', 204
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@setores_bp.route('/atributos', methods=['GET'])
@token_required
def get_atributos():
    """Retorna atributos de avaliação para um setor específico"""
    try:
        setor_nome = request.args.get('setor')
        setor_id = request.args.get('setor_id')
        
        if setor_nome:
            setor = Setor.query.filter_by(nome=setor_nome).first()
        elif setor_id:
            setor = Setor.query.get(setor_id)
        else:
            return jsonify({'message': 'Parâmetro setor ou setor_id é obrigatório'}), 400
        
        if not setor:
            return jsonify({'message': 'Setor não encontrado'}), 404
        
        return jsonify({
            'setor_id': setor.id,
            'setor_nome': setor.nome,
            'atributos': setor.atributos_avaliacao or []
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

