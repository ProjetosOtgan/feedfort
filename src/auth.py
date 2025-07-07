import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from src.models.user import User

def generate_token(user_id, user_type):
    """Gera um token JWT para o usuário"""
    payload = {
        'user_id': user_id,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(hours=24),  # Token válido por 24 horas
        'iat': datetime.utcnow()
    }
    
    secret_key = current_app.config.get('JWT_SECRET_KEY', 'jwt_secret_key_feedback_system_2024')
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    return token

def verify_token(token):
    """Verifica e decodifica um token JWT"""
    try:
        secret_key = current_app.config.get('JWT_SECRET_KEY', 'jwt_secret_key_feedback_system_2024')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator para rotas que requerem autenticação"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Verificar se o token está no header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Token inválido'}), 401
        
        if not token:
            return jsonify({'message': 'Token não fornecido'}), 401
        
        # Verificar o token
        payload = verify_token(token)
        if payload is None:
            return jsonify({'message': 'Token inválido ou expirado'}), 401
        
        # Verificar se o usuário ainda existe e está ativo
        user = User.query.get(payload['user_id'])
        if not user or not user.is_active:
            return jsonify({'message': 'Usuário não encontrado ou inativo'}), 401
        
        # Adicionar informações do usuário ao contexto da requisição
        request.current_user = user
        request.user_payload = payload
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator para rotas que requerem acesso de administrador"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'user_payload') or request.user_payload.get('user_type') != 'admin':
            return jsonify({'message': 'Acesso negado. Permissão de administrador necessária'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

def get_current_user():
    """Retorna o usuário atual da requisição"""
    return getattr(request, 'current_user', None)

def get_user_payload():
    """Retorna o payload do token JWT da requisição atual"""
    return getattr(request, 'user_payload', None)

