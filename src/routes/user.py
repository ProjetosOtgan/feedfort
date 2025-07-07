from flask import Blueprint, jsonify, request
from src.models.user import User, db
from src.auth import generate_token, token_required, admin_required, get_current_user

user_bp = Blueprint('user', __name__)

@user_bp.route('/login', methods=['POST'])
def login():
    """Endpoint de login"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'message': 'Username e password são obrigatórios'}), 400
        
        username = data['username']
        password = data['password']
        
        # Buscar usuário
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return jsonify({'message': 'Credenciais inválidas'}), 401
        
        if not user.is_active:
            return jsonify({'message': 'Usuário inativo'}), 401
        
        # Gerar token
        token = generate_token(user.id, user.user_type)
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'user_type': user.user_type
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/usuario/tipo', methods=['GET'])
@token_required
def get_user_type():
    """Retorna o tipo do usuário logado"""
    try:
        user = get_current_user()
        return jsonify({
            'user_type': user.user_type,
            'username': user.username,
            'id': user.id
        }), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/usuarios', methods=['GET'])
@token_required
@admin_required
def get_users():
    """Lista todos os usuários (apenas admin)"""
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/usuarios', methods=['POST'])
@token_required
@admin_required
def create_user():
    """Cria um novo usuário (apenas admin)"""
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['username', 'email', 'password']):
            return jsonify({'message': 'Username, email e password são obrigatórios'}), 400
        
        # Verificar se username já existe
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': 'Username já existe'}), 400
        
        # Verificar se email já existe
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email já existe'}), 400
        
        user = User(
            username=data['username'],
            email=data['email'],
            user_type=data.get('user_type', 'comum')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify(user.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/usuarios/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    """Obtém dados de um usuário específico"""
    try:
        current_user = get_current_user()
        
        # Usuários comuns só podem ver seus próprios dados
        if current_user.user_type != 'admin' and current_user.id != user_id:
            return jsonify({'message': 'Acesso negado'}), 403
        
        user = User.query.get_or_404(user_id)
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/usuarios/<int:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    """Atualiza dados de um usuário"""
    try:
        current_user = get_current_user()
        
        # Usuários comuns só podem editar seus próprios dados
        if current_user.user_type != 'admin' and current_user.id != user_id:
            return jsonify({'message': 'Acesso negado'}), 403
        
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'Dados não fornecidos'}), 400
        
        # Atualizar campos permitidos
        if 'username' in data:
            # Verificar se username já existe (exceto o próprio usuário)
            existing_user = User.query.filter_by(username=data['username']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'message': 'Username já existe'}), 400
            user.username = data['username']
        
        if 'email' in data:
            # Verificar se email já existe (exceto o próprio usuário)
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'message': 'Email já existe'}), 400
            user.email = data['email']
        
        if 'password' in data:
            user.set_password(data['password'])
        
        # Apenas admin pode alterar user_type
        if 'user_type' in data and current_user.user_type == 'admin':
            user.user_type = data['user_type']
        
        # Apenas admin pode alterar is_active
        if 'is_active' in data and current_user.user_type == 'admin':
            user.is_active = data['is_active']
        
        db.session.commit()
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/usuarios/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(user_id):
    """Deleta um usuário (apenas admin)"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Não permitir deletar o próprio usuário admin
        current_user = get_current_user()
        if user.id == current_user.id:
            return jsonify({'message': 'Não é possível deletar seu próprio usuário'}), 400
        
        db.session.delete(user)
        db.session.commit()
        return '', 204
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

