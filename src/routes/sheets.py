from flask import Blueprint, jsonify, request
from src.google_sheets import sheets_manager
from src.auth import token_required, admin_required

sheets_bp = Blueprint('sheets', __name__)

@sheets_bp.route('/google-sheets-sync', methods=['POST'])
@token_required
def sync_feedback():
    """Sincroniza um feedback específico ou todos os feedbacks"""
    try:
        data = request.get_json(silent=True) or {}
        feedback_id = data.get('feedback_id')
        
        if feedback_id:
            # Sincronizar feedback específico
            success = sheets_manager.sync_feedback(feedback_id)
            if success:
                return jsonify({
                    'message': f'Feedback {feedback_id} sincronizado com sucesso',
                    'spreadsheet_url': sheets_manager.get_spreadsheet_url()
                }), 200
            else:
                return jsonify({'message': 'Erro ao sincronizar feedback'}), 500
        else:
            # Sincronizar todos os feedbacks não sincronizados
            success_count, total_count = sheets_manager.sync_all_feedbacks()
            return jsonify({
                'message': f'{success_count} de {total_count} feedbacks sincronizados',
                'success_count': success_count,
                'total_count': total_count,
                'spreadsheet_url': sheets_manager.get_spreadsheet_url()
            }), 200
            
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@sheets_bp.route('/google-sheets/config', methods=['GET'])
@token_required
@admin_required
def get_sheets_config():
    """Retorna configuração atual do Google Sheets"""
    try:
        return jsonify({
            'spreadsheet_id': sheets_manager.spreadsheet_id,
            'spreadsheet_url': sheets_manager.get_spreadsheet_url(),
            'credentials_file': sheets_manager.credentials_file,
            'authenticated': sheets_manager.client is not None
        }), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@sheets_bp.route('/google-sheets/config', methods=['POST'])
@token_required
@admin_required
def update_sheets_config():
    """Atualiza configuração do Google Sheets"""
    try:
        data = request.get_json(silent=True) or {}
        
        if not data:
            return jsonify({'message': 'Dados não fornecidos'}), 400
        
        if 'spreadsheet_id' in data:
            sheets_manager.spreadsheet_id = data['spreadsheet_id']
            sheets_manager.spreadsheet = None  # Reset para reautenticar
        
        # Tentar autenticar com nova configuração
        if sheets_manager.authenticate():
            return jsonify({
                'message': 'Configuração atualizada com sucesso',
                'spreadsheet_url': sheets_manager.get_spreadsheet_url()
            }), 200
        else:
            return jsonify({'message': 'Erro na autenticação com Google Sheets'}), 400
            
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@sheets_bp.route('/google-sheets/create', methods=['POST'])
@token_required
@admin_required
def create_spreadsheet():
    """Cria uma nova planilha Google Sheets"""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get('title', 'Sistema de Feedback - Funcionários')
        
        spreadsheet_id = sheets_manager.create_spreadsheet(title)
        
        if spreadsheet_id:
            return jsonify({
                'message': 'Planilha criada com sucesso',
                'spreadsheet_id': spreadsheet_id,
                'spreadsheet_url': sheets_manager.get_spreadsheet_url()
            }), 201
        else:
            return jsonify({'message': 'Erro ao criar planilha'}), 500
            
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@sheets_bp.route('/google-sheets/test', methods=['POST'])
@token_required
@admin_required
def test_sheets_connection():
    """Testa a conexão com Google Sheets"""
    try:
        if sheets_manager.authenticate():
            return jsonify({
                'message': 'Conexão com Google Sheets estabelecida com sucesso',
                'spreadsheet_url': sheets_manager.get_spreadsheet_url()
            }), 200
        else:
            return jsonify({'message': 'Erro na conexão com Google Sheets'}), 400
            
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@sheets_bp.route('/google-sheets/status', methods=['GET'])
@token_required
def get_sync_status():
    """Retorna status de sincronização dos feedbacks"""
    try:
        from src.models.user import Feedback
        
        total_feedbacks = Feedback.query.count()
        sincronizados = Feedback.query.filter_by(sincronizado_sheets=True).count()
        nao_sincronizados = total_feedbacks - sincronizados
        
        return jsonify({
            'total_feedbacks': total_feedbacks,
            'sincronizados': sincronizados,
            'nao_sincronizados': nao_sincronizados,
            'spreadsheet_url': sheets_manager.get_spreadsheet_url()
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

