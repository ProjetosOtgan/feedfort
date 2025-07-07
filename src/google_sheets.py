import gspread
import os
import logging
from datetime import datetime
from google.oauth2.service_account import Credentials
from src.models.user import Feedback, Funcionario, Setor, User, db

# Configuração do logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class GoogleSheetsManager:
    def __init__(self):
        self.credentials_file = os.getenv('GOOGLE_SHEETS_CREDENTIALS_FILE', 'credentials.json')
        self.spreadsheet_id = os.getenv('GOOGLE_SHEETS_SPREADSHEET_ID', '')
        self.client = None
        self.spreadsheet = None
        
    def authenticate(self):
        """Autentica com Google Sheets API"""
        try:
            # Definir escopos necessários
            scopes = [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
            
            # Verificar se arquivo de credenciais existe
            if not os.path.exists(self.credentials_file):
                raise FileNotFoundError(f"Arquivo de credenciais não encontrado: {self.credentials_file}")
            
            # Autenticar
            credentials = Credentials.from_service_account_file(
                self.credentials_file, 
                scopes=scopes
            )
            
            self.client = gspread.authorize(credentials)
            
            if self.spreadsheet_id:
                self.spreadsheet = self.client.open_by_key(self.spreadsheet_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Erro na autenticação Google Sheets: {e}", exc_info=True)
            return False
    
    def create_spreadsheet(self, title="Sistema de Feedback - Funcionários"):
        """Cria uma nova planilha"""
        try:
            if not self.client:
                if not self.authenticate():
                    return None
            
            # Criar planilha
            spreadsheet = self.client.create(title)
            self.spreadsheet = spreadsheet
            self.spreadsheet_id = spreadsheet.id
            
            # Configurar planilha inicial
            self.setup_spreadsheet()
            
            return spreadsheet.id
            
        except Exception as e:
            logger.error(f"Erro ao criar planilha: {e}", exc_info=True)
            return None
    
    def setup_spreadsheet(self):
        """Configura a estrutura da planilha, criando a aba 'Feedbacks' e os cabeçalhos se não existirem."""
        try:
            if not self.spreadsheet:
                logger.warning("Nenhuma planilha aberta para configurar.")
                return False
            
            try:
                worksheet = self.spreadsheet.worksheet("Feedbacks")
                logger.info("Aba 'Feedbacks' já existe.")
            except gspread.exceptions.WorksheetNotFound:
                logger.info("Aba 'Feedbacks' não encontrada, criando...")
                worksheet = self.spreadsheet.add_worksheet(title="Feedbacks", rows="100", cols="20")
                
                if len(self.spreadsheet.worksheets()) > 1:
                    default_sheet = self.spreadsheet.sheet1
                    if default_sheet.title != "Feedbacks" and not default_sheet.get_all_values():
                        logger.info(f"Removendo aba padrão '{default_sheet.title}'.")
                        self.spreadsheet.del_worksheet(default_sheet)

            base_headers = [
                'ID', 'Data/Hora', 'Tipo Feedback', 'Setor', 'Funcionário', 'Autor'
            ]
            
            # Obter todos os atributos de avaliação possíveis
            all_attributes = sorted(list(set(attr for setor in Setor.query.all() for attr in setor.atributos_avaliacao)))
            
            # Cabeçalho final
            headers = base_headers + all_attributes + ['Descrição']
            
            # Verificar e inserir cabeçalhos
            header_row = worksheet.get('1:1')
            if not header_row or header_row[0] != headers:
                logger.info("Atualizando cabeçalhos na aba 'Feedbacks'.")
                worksheet.update('A1', [headers])
                worksheet.format(f'A1:{chr(65 + len(headers) - 1)}1', {
                    'backgroundColor': {'red': 0.8, 'green': 0.8, 'blue': 0.8},
                    'textFormat': {'bold': True}
                })
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao configurar planilha: {e}", exc_info=True)
            return False
    
    def sync_feedback(self, feedback_id):
        """Sincroniza um feedback específico com a planilha"""
        try:
            if not self.client:
                if not self.authenticate():
                    return False
            
            if not self.spreadsheet:
                if not self.spreadsheet_id:
                    logger.error("ID da planilha do Google Sheets não está configurado.")
                    return False
                try:
                    self.spreadsheet = self.client.open_by_key(self.spreadsheet_id)
                except gspread.exceptions.SpreadsheetNotFound:
                    logger.error(f"Planilha com ID '{self.spreadsheet_id}' não encontrada.")
                    return False

            if not self.setup_spreadsheet():
                logger.error("Falha ao verificar/configurar a planilha.")
                return False
            
            feedback = Feedback.query.get(feedback_id)
            if not feedback:
                logger.warning(f"Feedback com ID {feedback_id} não encontrado no banco de dados.")
                return False
            
            row_data = self.prepare_feedback_data(feedback)
            worksheet = self.spreadsheet.worksheet("Feedbacks")
            existing_row = self.find_feedback_row(worksheet, feedback_id)
            
            if existing_row:
                logger.info(f"Atualizando feedback ID {feedback_id} na linha {existing_row}.")
                worksheet.update(f'A{existing_row}:H{existing_row}', [row_data])
            else:
                logger.info(f"Adicionando novo feedback ID {feedback_id} na planilha.")
                worksheet.append_row(row_data)
            
            feedback.sincronizado_sheets = True
            feedback.data_sincronizacao = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Feedback {feedback_id} sincronizado com sucesso.")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao sincronizar feedback {feedback_id}: {e}", exc_info=True)
            db.session.rollback()
            return False
    
    def sync_all_feedbacks(self):
        """Sincroniza todos os feedbacks não sincronizados"""
        try:
            feedbacks = Feedback.query.filter_by(sincronizado_sheets=False).all()
            logger.info(f"Encontrados {len(feedbacks)} feedbacks para sincronizar.")

            if not feedbacks:
                return 0, 0

            success_count = 0
            for feedback in feedbacks:
                if self.sync_feedback(feedback.id):
                    success_count += 1
            
            return success_count, len(feedbacks)
            
        except Exception as e:
            logger.error(f"Erro ao sincronizar todos os feedbacks: {e}", exc_info=True)
            return 0, 0
    
    def prepare_feedback_data(self, feedback):
        """Prepara dados do feedback para inserção na planilha"""
        data_feedback = feedback.data_feedback.strftime('%d/%m/%Y %H:%M:%S') if feedback.data_feedback else ''
        
        base_data = [
            feedback.id,
            data_feedback,
            feedback.tipo.title(),
            feedback.funcionario.setor.nome if feedback.funcionario and feedback.funcionario.setor else '',
            feedback.funcionario.nome if feedback.funcionario else '',
            feedback.autor.username if feedback.autor else '',
        ]
        
        # Obter todos os atributos de avaliação possíveis
        all_attributes = sorted(list(set(attr for setor in Setor.query.all() for attr in setor.atributos_avaliacao)))
        
        # Mapear avaliações para as colunas corretas
        avaliacoes_data = [''] * len(all_attributes)
        if feedback.tipo == 'diario' and feedback.avaliacoes:
            for i, attr in enumerate(all_attributes):
                if attr in feedback.avaliacoes:
                    avaliacoes_data[i] = feedback.avaliacoes[attr]
        
        descricao = feedback.descricao if feedback.tipo != 'diario' else ''
        
        return base_data + avaliacoes_data + [descricao]
    
    def find_feedback_row(self, worksheet, feedback_id):
        """Encontra a linha de um feedback específico na planilha"""
        try:
            # Buscar na coluna A (ID)
            id_column = worksheet.col_values(1)
            
            for i, cell_value in enumerate(id_column):
                if str(cell_value) == str(feedback_id):
                    return i + 1  # +1 porque as linhas começam em 1
            
            return None
            
        except Exception as e:
            logger.error(f"Erro ao buscar feedback na planilha: {e}", exc_info=True)
            return None
    
    def get_spreadsheet_url(self):
        """Retorna a URL da planilha"""
        if self.spreadsheet:
            return f"https://docs.google.com/spreadsheets/d/{self.spreadsheet.id}"
        elif self.spreadsheet_id:
            return f"https://docs.google.com/spreadsheets/d/{self.spreadsheet_id}"
        return None

# Instância global do gerenciador
sheets_manager = GoogleSheetsManager()

