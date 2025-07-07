from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(20), nullable=False, default='comum')  # 'comum' ou 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'user_type': self.user_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Setor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    descricao = db.Column(db.Text)
    atributos_avaliacao = db.Column(db.JSON)  # Lista de atributos para avaliação diária
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento com funcionários
    funcionarios = db.relationship('Funcionario', backref='setor', lazy=True)

    def __repr__(self):
        return f'<Setor {self.nome}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'atributos_avaliacao': self.atributos_avaliacao,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Funcionario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    setor_id = db.Column(db.Integer, db.ForeignKey('setor.id'), nullable=False)
    cargo = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relacionamento com feedbacks
    feedbacks = db.relationship('Feedback', backref='funcionario', lazy=True)

    def __repr__(self):
        return f'<Funcionario {self.nome}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'setor_id': self.setor_id,
            'setor_nome': self.setor.nome if self.setor else None,
            'cargo': self.cargo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False)  # 'diario', 'positiva', 'negativa'
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionario.id'), nullable=False)
    autor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    data_feedback = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Para feedback diário - notas dos atributos
    avaliacoes = db.Column(db.JSON)  # {'atributo': nota}
    
    # Para ocorrências positivas/negativas
    descricao = db.Column(db.Text)
    
    # Controle de sincronização com Google Sheets
    sincronizado_sheets = db.Column(db.Boolean, default=False)
    data_sincronizacao = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamentos
    autor = db.relationship('User', backref='feedbacks_criados')

    def __repr__(self):
        return f'<Feedback {self.tipo} - {self.funcionario.nome if self.funcionario else "N/A"}>'

    def to_dict(self):
        return {
            'id': self.id,
            'tipo': self.tipo,
            'funcionario_id': self.funcionario_id,
            'funcionario_nome': self.funcionario.nome if self.funcionario else None,
            'setor_nome': self.funcionario.setor.nome if self.funcionario and self.funcionario.setor else None,
            'autor_id': self.autor_id,
            'autor_username': self.autor.username if self.autor else None,
            'data_feedback': self.data_feedback.isoformat() if self.data_feedback else None,
            'avaliacoes': self.avaliacoes,
            'descricao': self.descricao,
            'sincronizado_sheets': self.sincronizado_sheets,
            'data_sincronizacao': self.data_sincronizacao.isoformat() if self.data_sincronizacao else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

