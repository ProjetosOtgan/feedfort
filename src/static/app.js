document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = event.target.username.value;
            const password = event.target.password.value;
            login(username, password);
        });
    }
});

// Estado global da aplicação
const app = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    currentScreen: 'loginScreen',
    feedbackData: {
        type: null,
        sector: null,
        employee: null
    },
    sectors: [],
    employees: [],
    attributes: []
};

// Configuração da API
const API_BASE = '/api';

// Utilitários
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    // Definir ícone baseado no tipo
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = `toast-icon ${icons[type] || icons.info}`;
    messageEl.textContent = message;
    
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function showScreen(screenId) {
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar tela selecionada
    document.getElementById(screenId).classList.add('active');
    app.currentScreen = screenId;
    
    // Executar ações específicas da tela
    switch(screenId) {
        case 'dashboardScreen':
            updateUserInfo();
            break;
        case 'sectorScreen':
            loadSectors();
            break;
        case 'employeeScreen':
            loadEmployees();
            break;
        case 'historyScreen':
            loadHistory();
            break;
    }
}

// Autenticação
async function login(username, password) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', response);
        console.log('Login data:', data);
        
        if (response.ok) {
            app.token = data.token;
            app.user = data.user;
            
            localStorage.setItem('token', app.token);
            localStorage.setItem('user', JSON.stringify(app.user));
            
            showToast('Login realizado com sucesso!', 'success');
            showScreen('dashboardScreen');
        } else {
            showToast(data.message || 'Erro no login', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
        console.error('Erro no login:', error);
        console.log('Fetch error details:', error);
    } finally {
        hideLoading();
    }
}

function logout() {
    app.token = null;
    app.user = null;
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    showScreen('loginScreen');
    showToast('Logout realizado com sucesso!', 'info');
}

function updateUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    if (app.user) {
        userName.textContent = `${app.user.username} (${app.user.user_type})`;
        userInfo.classList.remove('hidden');
        
        // Mostrar/esconder elementos admin
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            if (app.user.user_type === 'admin') {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    } else {
        userInfo.classList.add('hidden');
    }
}

// API Helper
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(app.token && { 'Authorization': `Bearer ${app.token}` })
        },
        ...options
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                showToast('Sessão expirada. Faça login novamente.', 'error');
                return null;
            }
            throw new Error(data.message || 'Erro na requisição');
        }
        
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro na API:', error);
        return null;
    }
}

// Feedback Flow
function selectFeedbackType(type) {
    app.feedbackData.type = type;
    if (type === 'experiencia') {
        showScreen('experienceSubtypeScreen');
    } else {
        showScreen('sectorScreen');
    }
}

async function showDailyEvolutionChart() {
    showLoading();
    const data = await apiRequest('/feedback/stats/daily_evolution');
    hideLoading();

    if (data) {
        renderDailyEvolutionChart(data);
        showScreen('dailyEvolutionChartScreen');
    } else {
        showToast('Não foi possível carregar os dados de evolução.', 'error');
    }
}

function renderDailyEvolutionChart(data) {
    const ctx = document.getElementById('dailyEvolutionChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: 'Média de Notas Diárias',
                data: data.averages,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

function selectExperienceSubtype(subtype) {
    app.feedbackData.subtype = subtype;
    app.feedbackData.sector = null; // Limpar setor para experiência
    loadEmployees(null, true); // Carregar funcionários em experiência
    showScreen('employeeScreen');
}

async function loadSectors() {
    showLoading();
    
    const sectors = await apiRequest('/setores');
    
    if (sectors) {
        app.sectors = sectors;
        renderSectors();
    }
    
    hideLoading();
}

// Gerenciamento
async function showUserManagement() {
    showLoading();
    
    const users = await apiRequest('/usuarios');
    
    if (users) {
        const modal = document.getElementById('userModal');
        modal.classList.remove('hidden');
        
        renderModalUserList(users);
        renderModalUserForm();
    }
    
    hideLoading();
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    modal.classList.add('hidden');
    
    // Limpar conteúdo do modal
    document.getElementById('modalUserFormContainer').innerHTML = '';
    document.getElementById('modalUserList').innerHTML = '';
}

function renderModalUserList(users) {
    const userList = document.getElementById('modalUserList');
    
    if (users.length === 0) {
        userList.innerHTML = `
            <div class="modal-empty-state">
                <i class="fas fa-users"></i>
                <p>Nenhum usuário cadastrado</p>
            </div>
        `;
        return;
    }
    
    userList.innerHTML = `
        <div class="modal-section">
            <h4><i class="fas fa-users"></i> Usuários Existentes</h4>
            <div class="modal-table-container">
                <table class="modal-table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Email</th>
                            <th>Tipo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.username}</td>
                                <td>${user.email}</td>
                                <td><span class="user-type-badge ${user.user_type}">${user.user_type}</span></td>
                                <td>
                                    <button class="btn-edit" onclick="renderModalUserForm(${JSON.stringify(user).replace(/"/g, "'")})"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete" onclick="deleteUser(${user.id})" title="Excluir usuário"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderModalUserForm(user = null) {
    const userFormContainer = document.getElementById('modalUserFormContainer');
    const isEditing = user !== null;

    userFormContainer.innerHTML = `
        <div class="modal-section">
            <h4><i class="fas fa-user-plus"></i> ${isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h4>
            <form id="modalUserForm" class="modal-form">
                <input type="hidden" name="id" value="${user ? user.id : ''}">
                <div class="form-group">
                    <label for="modalUserUsername">Usuário</label>
                    <input type="text" id="modalUserUsername" name="username" value="${user ? user.username : ''}" placeholder="Digite o nome de usuário" required>
                </div>
                <div class="form-group">
                    <label for="modalUserEmail">Email</label>
                    <input type="email" id="modalUserEmail" name="email" value="${user ? user.email : ''}" placeholder="Digite o email" required>
                </div>
                <div class="form-group">
                    <label for="modalUserPassword">Senha</label>
                    <input type="password" id="modalUserPassword" name="password" placeholder="${isEditing ? 'Deixe em branco para não alterar' : 'Digite a senha'}" ${isEditing ? '' : 'required'}>
                    ${isEditing ? '<small class="form-hint">Deixe em branco para não alterar</small>' : ''}
                </div>
                <div class="form-group">
                    <label for="modalUserType">Tipo</label>
                    <select id="modalUserType" name="user_type">
                        <option value="usuario" ${user && user.user_type === 'usuario' ? 'selected' : ''}>Usuário</option>
                        <option value="admin" ${user && user.user_type === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="modal-form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i>
                        ${isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}
                    </button>
                    ${isEditing ? '<button type="button" class="btn-secondary" onclick="renderModalUserForm()"><i class="fas fa-times"></i> Cancelar</button>' : ''}
                </div>
            </form>
        </div>
    `;

    document.getElementById('modalUserForm').onsubmit = saveUser;
}

async function saveUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');
    const username = formData.get('username').trim();
    const email = formData.get('email').trim();
    const password = formData.get('password');
    
    // Validação
    if (!username) {
        showToast('Nome de usuário é obrigatório', 'error');
        return;
    }
    
    if (!email) {
        showToast('Email é obrigatório', 'error');
        return;
    }
    
    const data = {
        username: username,
        email: email,
        password: password,
        user_type: formData.get('user_type')
    };

    try {
        if (id) { // Edit
            if (!data.password) delete data.password; // Não envia senha se estiver vazia
            await apiRequest(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('Usuário atualizado com sucesso!', 'success');
        } else { // Create
            await apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data) });
            showToast('Usuário criado com sucesso!', 'success');
        }
        
        // Limpar formulário e recarregar lista
        form.reset();
        renderModalUserForm();
        
        // Forçar recarregamento da lista de usuários
        showUserManagement();
    } catch (error) {
        showToast('Erro ao salvar usuário', 'error');
    }
}

async function deleteUser(id) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await apiRequest(`/usuarios/${id}`, { method: 'DELETE' });
            showToast('Usuário excluído com sucesso!', 'success');
            
            // Forçar recarregamento da lista de usuários
            showUserManagement();
        } catch (error) {
            showToast('Erro ao excluir usuário', 'error');
        }
    }
}

async function showSectorManagement() {
    showLoading();
    
    const sectors = await apiRequest('/setores');
    
    if (sectors) {
        const modal = document.getElementById('sectorModal');
        modal.classList.remove('hidden');
        
        renderModalSectorList(sectors);
        renderModalSectorForm();
    }
    
    hideLoading();
}

function closeSectorModal() {
    const modal = document.getElementById('sectorModal');
    modal.classList.add('hidden');
    
    // Limpar conteúdo do modal
    document.getElementById('modalSectorFormContainer').innerHTML = '';
    document.getElementById('modalSectorListContainer').innerHTML = '';
}

function renderModalSectorList(sectors) {
    const sectorListContainer = document.getElementById('modalSectorListContainer');
    
    if (sectors.length === 0) {
        sectorListContainer.innerHTML = `
            <div class="modal-empty-state">
                <i class="fas fa-building"></i>
                <p>Nenhum setor cadastrado</p>
            </div>
        `;
        return;
    }
    
    sectorListContainer.innerHTML = `
        <div class="modal-section">
            <h4><i class="fas fa-building"></i> Setores Existentes</h4>
            <div class="modal-table-container">
                <table class="modal-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sectors.map(sector => `
                            <tr>
                                <td>${sector.nome}</td>
                                <td>${sector.descricao || '<span class="text-muted">Sem descrição</span>'}</td>
                                <td>
                                    <button class="btn-edit" onclick="renderModalSectorForm(${JSON.stringify(sector).replace(/"/g, "'")})"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete" onclick="deleteSector(${sector.id})" title="Excluir setor"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderModalSectorForm(sector = null) {
    const sectorFormContainer = document.getElementById('modalSectorFormContainer');
    const isEditing = sector !== null;

    sectorFormContainer.innerHTML = `
        <div class="modal-section">
            <h4><i class="fas fa-plus-circle"></i> ${isEditing ? 'Editar Setor' : 'Adicionar Novo Setor'}</h4>
            <form id="modalSectorForm" class="modal-form">
                <input type="hidden" name="id" value="${sector ? sector.id : ''}">
                <div class="form-group">
                    <label for="modalSectorName">Nome</label>
                    <input type="text" id="modalSectorName" name="nome" value="${sector ? sector.nome : ''}" placeholder="Digite o nome do setor" required>
                </div>
                <div class="form-group">
                    <label for="modalSectorDescription">Descrição</label>
                    <input type="text" id="modalSectorDescription" name="descricao" value="${sector ? sector.descricao : ''}" placeholder="Digite a descrição do setor (opcional)">
                </div>
                <div class="modal-form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i>
                        ${isEditing ? 'Salvar Alterações' : 'Adicionar Setor'}
                    </button>
                    ${isEditing ? '<button type="button" class="btn-secondary" onclick="renderModalSectorForm()"><i class="fas fa-times"></i> Cancelar</button>' : ''}
                </div>
            </form>
        </div>
    `;

    document.getElementById('modalSectorForm').onsubmit = saveSector;
}

async function saveSector(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');
    const nome = formData.get('nome').trim();
    const descricao = formData.get('descricao').trim();
    
    // Validação
    if (!nome) {
        showToast('Nome do setor é obrigatório', 'error');
        return;
    }
    
    const data = {
        nome: nome,
        descricao: descricao
    };

    try {
        if (id) { // Edit
            await apiRequest(`/setores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('Setor atualizado com sucesso!', 'success');
        } else { // Create
            await apiRequest('/setores', { method: 'POST', body: JSON.stringify(data) });
            showToast('Setor criado com sucesso!', 'success');
        }
        
        // Limpar formulário e recarregar lista
        form.reset();
        renderModalSectorForm();
        
        // Forçar recarregamento da lista de setores
        showSectorManagement();
    } catch (error) {
        showToast('Erro ao salvar setor', 'error');
    }
}

async function deleteSector(id) {
    if (confirm('Tem certeza que deseja excluir este setor? A exclusão removerá funcionários e feedbacks associados.')) {
        try {
            await apiRequest(`/setores/${id}`, { method: 'DELETE' });
            showToast('Setor excluído com sucesso!', 'success');
            
            // Forçar recarregamento da lista de setores
            showSectorManagement();
        } catch (error) {
            showToast('Erro ao excluir setor', 'error');
        }
    }
}

async function showEmployeeManagement() {
    showLoading();
    
    const [employees, sectors] = await Promise.all([
        apiRequest('/funcionarios'),
        apiRequest('/setores')
    ]);

    if (employees && sectors) {
        const modal = document.getElementById('employeeModal');
        modal.classList.remove('hidden');
        
        renderModalEmployeeList(employees, sectors);
        renderModalEmployeeForm(null, sectors);
    }
    
    hideLoading();
}

function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    modal.classList.add('hidden');
    
    // Limpar conteúdo do modal
    document.getElementById('modalEmployeeFormContainer').innerHTML = '';
    document.getElementById('modalEmployeeList').innerHTML = '';
}

function renderModalEmployeeList(employees, sectors) {
    const employeeListContainer = document.getElementById('modalEmployeeList');
    
    if (employees.length === 0) {
        employeeListContainer.innerHTML = `
            <div class="modal-empty-state">
                <i class="fas fa-user-tie"></i>
                <p>Nenhum funcionário cadastrado</p>
            </div>
        `;
        return;
    }
    
    employeeListContainer.innerHTML = `
        <div class="modal-section">
            <h4><i class="fas fa-user-tie"></i> Funcionários Existentes</h4>
            <div class="modal-table-container">
                <table class="modal-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                        <th>Cargo</th>
                        <th>Setor</th>
                        <th>Experiência</th>
                        <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(employee => `
                            <tr>
                                <td>${employee.nome}</td>
                                <td>${employee.cargo || '<span class="text-muted">Sem cargo</span>'}</td>
                                <td><span class="sector-badge">${sectors.find(s => s.id === employee.setor_id)?.nome || 'N/A'}</span></td>
                                <td>
                                    ${employee.em_experiencia 
                                        ? `<span class="badge badge-warning">Sim (Fim: ${new Date(employee.data_fim_experiencia).toLocaleDateString('pt-BR')})</span>` 
                                        : '<span class="badge badge-secondary">Não</span>'}
                                </td>
                                <td>
                                    <button class="btn-edit" onclick="renderModalEmployeeForm(${JSON.stringify(employee).replace(/"/g, "'")}, ${JSON.stringify(sectors).replace(/"/g, "'")})"><i class="fas fa-edit"></i></button>
                                    <button class="btn-delete" onclick="deleteEmployee(${employee.id})" title="Excluir funcionário"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderModalEmployeeForm(employee = null, sectors) {
    const employeeFormContainer = document.getElementById('modalEmployeeFormContainer');
    const isEditing = employee !== null;

    employeeFormContainer.innerHTML = `
        <div class="modal-section">
            <h4><i class="fas fa-user-plus"></i> ${isEditing ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</h4>
            <form id="modalEmployeeForm" class="modal-form">
                <input type="hidden" name="id" value="${employee ? employee.id : ''}">
                <div class="form-group">
                    <label for="modalEmployeeName">Nome</label>
                    <input type="text" id="modalEmployeeName" name="nome" value="${employee ? employee.nome : ''}" placeholder="Digite o nome do funcionário" required>
                </div>
                <div class="form-group">
                    <label for="modalEmployeeRole">Cargo</label>
                    <input type="text" id="modalEmployeeRole" name="cargo" value="${employee ? employee.cargo : ''}" placeholder="Digite o cargo (opcional)">
                </div>
                <div class="form-group">
                    <label for="modalEmployeeSector">Setor</label>
                    <select id="modalEmployeeSector" name="setor_id" required>
                        <option value="">Selecione um setor</option>
                        ${sectors.map(sector => `<option value="${sector.id}" ${employee && employee.setor_id === sector.id ? 'selected' : ''}>${sector.nome}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="admissionDate">Data de Admissão</label>
                    <input type="date" id="admissionDate" name="data_admissao" value="${employee && employee.data_admissao ? employee.data_admissao.split('T')[0] : new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group form-check">
                    <input type="checkbox" id="inExperience" name="em_experiencia" ${employee && employee.em_experiencia ? 'checked' : ''} onchange="toggleExperienceFields(this.checked)">
                    <label for="inExperience">Em período de experiência?</label>
                </div>
                <div id="experienceFields" class="${employee && employee.em_experiencia ? '' : 'hidden'}">
                    <div class="form-group">
                        <label for="experienceEndDate">Data Fim da Experiência (1º Período)</label>
                        <input type="date" id="experienceEndDate" name="data_fim_experiencia" value="${employee && employee.data_fim_experiencia ? employee.data_fim_experiencia.split('T')[0] : ''}">
                        <small>Deixe em branco para calcular 45 dias da admissão. Você pode prorrogar por mais 45 dias editando este campo.</small>
                    </div>
                </div>
                <div class="modal-form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i>
                        ${isEditing ? 'Salvar Alterações' : 'Adicionar Funcionário'}
                    </button>
                    ${isEditing ? `<button type="button" class="btn-secondary" onclick="renderModalEmployeeForm(null, ${JSON.stringify(sectors).replace(/"/g, "'")})"><i class="fas fa-times"></i> Cancelar</button>` : ''}
                </div>
            </form>
        </div>
    `;

    document.getElementById('modalEmployeeForm').onsubmit = saveEmployee;
}

function toggleExperienceFields(checked) {
    const fields = document.getElementById('experienceFields');
    if (checked) {
        fields.classList.remove('hidden');
    } else {
        fields.classList.add('hidden');
    }
}

async function saveEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');
    const nome = formData.get('nome').trim();
    const cargo = formData.get('cargo').trim();
    const setor_id = formData.get('setor_id');
    
    // Validação
    if (!nome) {
        showToast('Nome do funcionário é obrigatório', 'error');
        return;
    }
    
    if (!setor_id) {
        showToast('Setor é obrigatório', 'error');
        return;
    }
    
    const em_experiencia = formData.get('em_experiencia') === 'on';
    const data_admissao = formData.get('data_admissao');
    let data_fim_experiencia = formData.get('data_fim_experiencia');

    if (em_experiencia && !data_fim_experiencia) {
        const admission = new Date(data_admissao);
        admission.setDate(admission.getDate() + 45);
        data_fim_experiencia = admission.toISOString().split('T')[0];
    }

    const data = {
        nome: nome,
        cargo: cargo || null,
        setor_id: parseInt(setor_id),
        em_experiencia: em_experiencia,
        data_admissao: data_admissao,
        data_fim_experiencia: em_experiencia ? data_fim_experiencia : null
    };

    try {
        if (id) { // Edit
            await apiRequest(`/funcionarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('Funcionário atualizado com sucesso!', 'success');
        } else { // Create
            await apiRequest('/funcionarios', { method: 'POST', body: JSON.stringify(data) });
            showToast('Funcionário criado com sucesso!', 'success');
        }
        
        // Forçar recarregamento da lista de funcionários
        showEmployeeManagement();
    } catch (error) {
        showToast('Erro ao salvar funcionário', 'error');
    }
}

async function deleteEmployee(id) {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
        try {
            await apiRequest(`/funcionarios/${id}`, { method: 'DELETE' });
            showToast('Funcionário excluído com sucesso!', 'success');
            
            // Forçar recarregamento da lista de funcionários
            showEmployeeManagement();
        } catch (error) {
            showToast('Erro ao excluir funcionário', 'error');
        }
    }
}

async function showAttributeManagement() {
    const modal = document.getElementById('attributeModal');
    const sectorSelect = document.getElementById('attributeSectorSelect');
    
    // Limpar conteúdo anterior
    sectorSelect.innerHTML = '<option value="">-- Selecione --</option>';
    document.getElementById('attributeListContainer').innerHTML = '';
    document.getElementById('attributeFormContainer').innerHTML = '';
    
    // Carregar setores
    const sectors = await apiRequest('/setores');
    
    if (sectors) {
        // Preencher select com setores
        sectors.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector.id;
            option.textContent = sector.nome;
            sectorSelect.appendChild(option);
        });
        
        window.sectorsForAttributes = sectors; // Store for later use
        
        // Mostrar modal
        modal.classList.remove('hidden');
    }
}

function closeAttributeModal() {
    const modal = document.getElementById('attributeModal');
    modal.classList.add('hidden');
    
    // Limpar conteúdo
    document.getElementById('attributeSectorSelect').value = '';
    document.getElementById('attributeListContainer').innerHTML = '';
    document.getElementById('attributeFormContainer').innerHTML = '';
}

// Adicionar listener para fechar modal com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const attributeModal = document.getElementById('attributeModal');
        const userModal = document.getElementById('userModal');
        const sectorModal = document.getElementById('sectorModal');
        const employeeModal = document.getElementById('employeeModal');
        
        if (attributeModal && !attributeModal.classList.contains('hidden')) {
            closeAttributeModal();
        } else if (userModal && !userModal.classList.contains('hidden')) {
            closeUserModal();
        } else if (sectorModal && !sectorModal.classList.contains('hidden')) {
            closeSectorModal();
        } else if (employeeModal && !employeeModal.classList.contains('hidden')) {
            closeEmployeeModal();
        }
    }
});

// Prevenir fechamento do modal ao clicar no conteúdo e adicionar listeners para fechar ao clicar fora
document.addEventListener('DOMContentLoaded', function() {
    // Prevenir fechamento ao clicar no conteúdo dos modais
    const modalContents = document.querySelectorAll('.modal-content');
    modalContents.forEach(modalContent => {
        modalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
    
    // Fechar modais ao clicar fora
    const attributeModal = document.getElementById('attributeModal');
    const userModal = document.getElementById('userModal');
    const sectorModal = document.getElementById('sectorModal');
    const employeeModal = document.getElementById('employeeModal');
    
    if (attributeModal) {
        attributeModal.addEventListener('click', closeAttributeModal);
    }
    
    if (userModal) {
        userModal.addEventListener('click', closeUserModal);
    }
    
    if (sectorModal) {
        sectorModal.addEventListener('click', closeSectorModal);
    }
    
    if (employeeModal) {
        employeeModal.addEventListener('click', closeEmployeeModal);
    }
});

async function renderAttributeList(sectorId) {
    if (!sectorId) {
        document.getElementById('attributeListContainer').innerHTML = '';
        document.getElementById('attributeFormContainer').innerHTML = '';
        return;
    }

    const attributesData = await apiRequest(`/atributos?setor_id=${sectorId}`);
    const attributes = attributesData.atributos || [];

    const attributeListContainer = document.getElementById('attributeListContainer');
    
    if (attributes.length > 0) {
        attributeListContainer.innerHTML = `
            <h4><i class="fas fa-list"></i> Atributos do Setor</h4>
            <ul>
                ${attributes.map(attr => `
                    <li>
                        <span><i class="fas fa-tag"></i> ${attr}</span>
                        <button onclick="deleteAttribute('${sectorId}', '${attr}')" title="Excluir atributo">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </li>
                `).join('')}
            </ul>
        `;
    } else {
        attributeListContainer.innerHTML = `
            <h4><i class="fas fa-list"></i> Atributos do Setor</h4>
            <p style="color: #666; font-style: italic; text-align: center; padding: 20px;">
                <i class="fas fa-info-circle"></i> Nenhum atributo cadastrado para este setor.
            </p>
        `;
    }

    renderAttributeForm(sectorId);
}

function renderAttributeForm(sectorId) {
    const attributeFormContainer = document.getElementById('attributeFormContainer');
    attributeFormContainer.innerHTML = `
        <h4>Adicionar Novo Atributo</h4>
        <form id="attributeForm">
            <input type="hidden" name="setor_id" value="${sectorId}">
            <div class="form-group">
                <label for="attributeName">Nome do Atributo</label>
                <input type="text" id="attributeName" name="atributo" required placeholder="Digite o nome do atributo">
            </div>
            <button type="submit">
                <i class="fas fa-plus"></i>
                Adicionar Atributo
            </button>
        </form>
    `;

    document.getElementById('attributeForm').onsubmit = saveAttribute;
}

async function saveAttribute(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const sectorId = formData.get('setor_id');
    const attributeName = formData.get('atributo');

    if (!attributeName.trim()) {
        showToast('Por favor, digite um nome para o atributo', 'error');
        return;
    }

    const result = await apiRequest(`/setores/${sectorId}/atributos`, {
        method: 'POST',
        body: JSON.stringify({ atributo: attributeName.trim() })
    });

    if (result) {
        showToast('Atributo adicionado com sucesso!', 'success');
        form.reset(); // Limpar formulário
        renderAttributeList(sectorId); // Recarrega a lista
    }
}

async function deleteAttribute(sectorId, attributeName) {
    if (confirm(`Tem certeza que deseja excluir o atributo '${attributeName}'?`)) {
        const result = await apiRequest(`/setores/${sectorId}/atributos`, {
            method: 'DELETE',
            body: JSON.stringify({ atributo: attributeName })
        });
        
        if (result) {
            showToast('Atributo excluído com sucesso!', 'success');
            renderAttributeList(sectorId); // Recarrega a lista
        }
    }
}

function renderSectors() {
    const sectorList = document.getElementById('sectorList');
    
    sectorList.innerHTML = app.sectors.map(sector => `
        <div class="list-item" onclick="selectSector(${sector.id}, '${sector.nome}')">
            <h4>${sector.nome}</h4>
            <p>${sector.descricao || 'Sem descrição'}</p>
        </div>
    `).join('');
}

function selectSector(sectorId, sectorName) {
    app.feedbackData.sector = { id: sectorId, name: sectorName };
    loadEmployees(sectorId);
    showScreen('employeeScreen');
}

async function loadEmployees(sectorId = null, inExperience = false) {
    let url = '/funcionarios';
    const params = new URLSearchParams();

    if (inExperience) {
        params.append('em_experiencia', 'true');
    } else if (sectorId) {
        params.append('setor_id', sectorId);
    } else if (app.feedbackData.sector) {
        params.append('setor_id', app.feedbackData.sector.id);
    } else {
        // Se nenhum filtro for especificado, não carregar nada ou carregar todos?
        // Por enquanto, não faz nada se não houver setor (exceto para experiência)
        return;
    }

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    showLoading();
    const employees = await apiRequest(url);
    if (employees) {
        app.employees = employees;
        renderEmployees();
    }
    hideLoading();
}

function renderEmployees() {
    const employeeList = document.getElementById('employeeList');
    
    employeeList.innerHTML = app.employees.map(employee => {
        let experienceInfo = '';
        if (employee.em_experiencia) {
            const endDate = new Date(employee.data_fim_experiencia);
            const today = new Date();
            const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            const badgeClass = remainingDays <= 7 ? 'badge-danger' : remainingDays <= 15 ? 'badge-warning' : 'badge-info';
            experienceInfo = `<span class="badge ${badgeClass}">Experiência: ${remainingDays} dias restantes</span>`;
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            experienceInfo = `<span class="experience-badge">Expira em ${diffDays} dias</span>`;
        }
        
        return `
            <div class="list-item" onclick="selectEmployee(${employee.id}, '${employee.nome}')">
                <h4>${employee.nome} ${experienceInfo}</h4>
                <p>${employee.cargo || 'Cargo não informado'}</p>
            </div>
        `;
    }).join('');
}

function selectEmployee(employeeId, employeeName) {
    app.feedbackData.employee = { id: employeeId, name: employeeName };
    showFeedbackForm();
}

async function showFeedbackForm() {
    showScreen('feedbackFormScreen');
    
    const employee = app.employees.find(e => e.id === app.feedbackData.employee.id);
    const sector = app.feedbackData.sector ? app.sectors.find(s => s.id === app.feedbackData.sector.id) : null;

    // Atualizar informações do feedback
    document.getElementById('selectedType').textContent = app.feedbackData.type;
    document.getElementById('selectedSector').textContent = sector ? sector.nome : 'N/A';
    document.getElementById('selectedEmployee').textContent = app.feedbackData.employee.name;
    
    const formTitle = document.getElementById('feedbackFormTitle');
    
    if (app.feedbackData.type === 'diario') {
        formTitle.textContent = 'Avaliação Diária';
        await renderDailyForm();
    } else if (app.feedbackData.type === 'diario_experiencia') {
        formTitle.textContent = 'Avaliação Diária de Experiência';
        await renderDailyExperienceForm();
    } else if (app.feedbackData.type === 'final_experiencia') {
        formTitle.textContent = 'Avaliação Final de Experiência';
        await renderFinalExperienceForm();
    } else {
        formTitle.textContent = app.feedbackData.type === 'positiva' ? 'Ocorrência Positiva' : 'Ocorrência Negativa';
        renderOccurrenceForm();
    }
}

async function renderDailyForm() {
    showLoading();
    
    const attributes = await apiRequest(`/atributos?setor_id=${app.feedbackData.sector.id}`);
    
    if (attributes && attributes.atributos) {
        app.attributes = attributes.atributos;
        
        const feedbackForm = document.getElementById('feedbackForm');
        
        feedbackForm.innerHTML = `
            ${app.attributes.map(attr => `
                <div class="rating-group">
                    <label>${attr}</label>
                    <div class="rating-stars" data-attribute="${attr}">
                        ${[1,2,3,4,5].map(i => `
                            <span class="star" data-value="${i}" onclick="setRating('${attr}', ${i})">★</span>
                        `).join('')}
                        <span class="rating-value" id="rating-${attr}">0/5</span>
                    </div>
                </div>
            `).join('')}
            <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i>
                Salvar Feedback
            </button>
        `;
        
        feedbackForm.onsubmit = submitDailyFeedback;
    }
    
    hideLoading();
}

async function renderDailyExperienceForm() {
    showLoading();
    const employee = app.employees.find(e => e.id === app.feedbackData.employee.id);
    const endDate = new Date(employee.data_fim_experiencia);
    const attributes = await apiRequest(`/atributos?setor_id=${app.feedbackData.sector.id}`);
    
    if (attributes && attributes.atributos) {
        app.attributes = attributes.atributos;
        
        const feedbackForm = document.getElementById('feedbackForm');
        
        feedbackForm.innerHTML = `
            <div class="experience-info">
                <p><strong>Fim do período de experiência:</strong> ${endDate.toLocaleDateString('pt-BR')}</p>
            </div>
            ${app.attributes.map(attr => `
                <div class="rating-group">
                    <label>${attr}</label>
                    <div class="rating-stars" data-attribute="${attr}">
                        ${[1,2,3,4,5].map(i => `
                            <span class="star" data-value="${i}" onclick="setRating('${attr}', ${i})">★</span>
                        `).join('')}
                        <span class="rating-value" id="rating-${attr}">0/5</span>
                    </div>
                </div>
            `).join('')}
            <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i>
                Salvar Feedback
            </button>
        `;
        
        feedbackForm.onsubmit = submitDailyFeedback;
    }
    
    hideLoading();
}

async function renderFinalExperienceForm() {
    const form = document.getElementById('feedbackForm');
    const employee = app.employees.find(e => e.id === app.feedbackData.employee.id);

    if (!employee) {
        showToast('Funcionário não encontrado.', 'error');
        return;
    }

    const endDate = new Date(employee.data_fim_experiencia);
    const remainingDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    form.innerHTML = `
        <div class="experience-info">
            <p><strong>Fim do período de experiência:</strong> ${endDate.toLocaleDateString('pt-BR')}</p>
            <p><strong>Dias restantes:</strong> ${remainingDays}</p>
        </div>
        <div class="form-group">
            <label for="experience_details">Relatório do líder sobre os motivos da efetivação ou não</label>
            <textarea id="experience_details" name="detalhes" rows="5" required></textarea>
        </div>
        <div class="form-group">
            <label>Recomendação</label>
            <div class="radio-group">
                <input type="radio" id="recomenda_sim" name="recomenda" value="true" required>
                <label for="recomenda_sim">Recomendo a efetivação</label>
            </div>
            <div class="radio-group">
                <input type="radio" id="recomenda_nao" name="recomenda" value="false">
                <label for="recomenda_nao">Não recomendo a efetivação</label>
            </div>
        </div>
        <button type="submit" class="btn-primary">Enviar Feedback</button>
    `;

    form.onsubmit = submitExperienceFeedback;
}

function renderOccurrenceForm() {
    const feedbackForm = document.getElementById('feedbackForm');
    
    feedbackForm.innerHTML = `
        <div class="form-group">
            <label for="description">
                <i class="fas fa-comment"></i>
                Descrição da ocorrência
            </label>
            <textarea id="description" name="description" required 
                placeholder="Descreva detalhadamente o que aconteceu..."></textarea>
        </div>
        <button type="submit" class="btn-primary">
            <i class="fas fa-save"></i>
            Salvar Feedback
        </button>
    `;
    
    feedbackForm.onsubmit = submitOccurrenceFeedback;
}

function setRating(attribute, value) {
    const stars = document.querySelectorAll(`[data-attribute="${attribute}"] .star`);
    const ratingValue = document.getElementById(`rating-${attribute}`);
    
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    
    ratingValue.textContent = `${value}/5`;
}

async function submitDailyFeedback(event) {
    event.preventDefault();
    
    const ratings = {};
    app.attributes.forEach(attr => {
        const activeStars = document.querySelectorAll(`[data-attribute="${attr}"] .star.active`);
        ratings[attr] = activeStars.length;
    });
    
    // Verificar se todas as avaliações foram feitas
    const hasEmptyRatings = Object.values(ratings).some(rating => rating === 0);
    if (hasEmptyRatings) {
        showToast('Por favor, avalie todos os atributos', 'error');
        return;
    }
    
    await submitFeedback({
        tipo: app.feedbackData.type,
        funcionario_id: app.feedbackData.employee.id,
        avaliacoes: ratings
    });
}

async function submitExperienceFeedback(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {
        tipo: app.feedbackData.type, // será 'final_experiencia'
        detalhes: formData.get('detalhes'),
        recomenda_efetivacao: formData.get('recomenda') === 'true',
        funcionario_id: app.feedbackData.employee.id,
    };

    await submitFeedback(data);
}

async function submitOccurrenceFeedback(event) {
    event.preventDefault();
    
    const description = document.getElementById('description').value.trim();
    
    if (!description) {
        showToast('Por favor, preencha a descrição', 'error');
        return;
    }
    
    await submitFeedback({
        tipo: app.feedbackData.type,
        funcionario_id: app.feedbackData.employee.id,
        descricao: description
    });
}

async function submitFeedback(feedbackData) {
    showLoading();
    
    const result = await apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify(feedbackData)
    });
    
    if (result) {
        showToast('Feedback salvo com sucesso!', 'success');
        
        // Reset feedback data
        app.feedbackData = { type: null, sector: null, employee: null };
        
        // Forçar recarregamento da tela inicial
        showScreen('dashboardScreen');
    }
    
    hideLoading();
}

// Histórico
async function loadHistory() {
    showLoading();
    
    const filterType = document.getElementById('filterType').value;
    const endpoint = filterType ? `/feedback?tipo=${filterType}` : '/feedback';
    
    const feedbacks = await apiRequest(endpoint);
    
    if (feedbacks) {
        renderHistory(feedbacks);
    }
    
    hideLoading();
}

function renderHistory(feedbacks) {
    const historyList = document.getElementById('historyList');

    if (feedbacks.length === 0) {
        historyList.innerHTML = '<p class="text-center">Nenhum feedback encontrado.</p>';
        return;
    }

    // Adicionando estilos CSS dinamicamente
    const style = document.createElement('style');
    style.textContent = `
        .feedback-list {
            display: grid;
            gap: 1.5rem;
        }
        
        .feedback-card {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .feedback-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .employee-info h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 0.25rem 0;
        }
        
        .employee-info .date {
            font-size: 0.875rem;
            color: #718096;
            margin: 0;
        }
        
        .status-badge {
            padding: 0.4rem 0.8rem;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-shrink: 0;
            margin-top: 4px;
        }
        
        .status-badge.diario {
            background-color: #dbeafe;
            color: #3b82f6;
        }
        
        .status-badge.diario_experiencia {
            background-color: #e9d5ff;
            color: #8b5cf6;
        }
        
        .status-badge.final_experiencia {
            background-color: #fee2e2;
            color: #ef4444;
        }
        
        .status-badge.experiencia {
            background-color: #ffeccc;
            color: #f59e0b;
        }

        .card-body p {
            margin-bottom: 0.5rem; /* Add some space below paragraphs */
        }

        .card-body .content {
            padding-left: 1rem; /* Indent content for better readability */
            border-left: 2px solid #e2e8f0;
        }

        .card-body .content ul {
            margin-top: 0.5rem;
            margin-bottom: 0;
            padding-left: 1.5rem;
        }

        .card-body .content li {
            margin-bottom: 0.2rem;
        }
    `;
    document.head.appendChild(style);

    historyList.innerHTML = feedbacks.map(feedback => {
        const date = new Date(feedback.data_feedback).toLocaleString('pt-BR');
        const isAdmin = app.user && app.user.user_type === 'admin';

        let content = '';
        if ((feedback.tipo === 'diario' || feedback.tipo === 'diario_experiencia') && feedback.avaliacoes) {
            content = '<ul>' + Object.entries(feedback.avaliacoes)
                .map(([attr, nota]) => `<li>${attr}: ${nota}/5</li>`)
                .join('') + '</ul>';
        } else if (feedback.tipo === 'final_experiencia') {
            content = `<p><strong>Relatório:</strong> ${feedback.detalhes || 'Não informado'}</p>` +
                      `<p><strong>Recomendação:</strong> ${feedback.recomenda_efetivacao ? 'Efetivar' : 'Não efetivar'}</p>`;
        } else if (feedback.tipo === 'experiencia') {
             content = `<p><strong>Detalhes:</strong> ${feedback.detalhes || 'Não informado'}</p>` +
                       `<p><strong>Recomendação:</strong> ${feedback.recomenda_efetivacao ? 'Efetivar' : 'Não efetivar'}</p>`;
        } else {
            content = feedback.descricao || 'Sem descrição';
        }

        let iconClass = '';
        let typeDisplayName = feedback.tipo.replace('_', ' ');

        switch (feedback.tipo) {
            case 'diario':
                iconClass = 'fa-circle-info';
                typeDisplayName = 'Informativo';
                break;
            case 'diario_experiencia':
                iconClass = 'fa-lightbulb';
                typeDisplayName = 'Sugestão';
                break;
            case 'final_experiencia':
                iconClass = 'fa-triangle-exclamation';
                typeDisplayName = 'Problema';
                break;
            case 'experiencia':
                iconClass = 'fa-star'; // Or another appropriate icon
                typeDisplayName = 'Experiência';
                break;
            default:
                iconClass = 'fa-comment';
                break;
        }

        return `
            <article class="feedback-card">
                <header class="card-header">
                    <div class="employee-info">
                        <h2><i class="fa-solid fa-user-tie"></i> ${feedback.funcionario_nome}</h2>
                        <p class="date"><i class="fa-solid fa-calendar-days"></i> ${date}</p>
                    </div>
                    <div class="status-badge ${feedback.tipo}">
                        <i class="fa-solid ${iconClass}"></i> 
                        ${typeDisplayName}
                    </div>
                </header>
                <div class="card-body">
                    ${isAdmin ? `<p><strong><i class="fa-solid fa-user"></i> Usuário:</strong> ${feedback.autor_username}</p>` : ''}
                    <p><strong><i class="fa-solid fa-building"></i> Setor:</strong> ${feedback.setor_nome}</p>
                    <div class="content">
                        <p><strong><i class="fa-solid fa-comment"></i> Conteúdo:</strong></p>
                        ${content}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// Administração
async function syncGoogleSheets() {
    if (app.user.user_type !== 'admin') {
        showToast('Acesso negado', 'error');
        return;
    }
    
    showLoading();
    
    const result = await apiRequest('/google-sheets-sync', {
        method: 'POST'
    });
    
    if (result) {
        showToast(result.message, 'success');
        
        if (result.spreadsheet_url) {
            const adminContent = document.getElementById('adminContent');
            adminContent.innerHTML = `
                <h3>Sincronização Concluída</h3>
                <p>${result.message}</p>
                <p><strong>Planilha:</strong> <a href="${result.spreadsheet_url}" target="_blank">Abrir Google Sheets</a></p>
            `;
        }
    }
    
    hideLoading();
}

async function showStats() {
    if (app.user.user_type !== 'admin') {
        showToast('Acesso negado', 'error');
        return;
    }
    
    showLoading();
    
    const stats = await apiRequest('/feedback/stats');
    
    if (stats) {
        const adminContent = document.getElementById('adminContent');
        adminContent.innerHTML = `
            <h3>Estatísticas do Sistema</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <h4>Total de Feedbacks</h4>
                    <p class="stat-number">${stats.total_feedbacks}</p>
                </div>
                <div class="stat-item">
                    <h4>Feedbacks Diários</h4>
                    <p class="stat-number">${stats.feedbacks_diarios}</p>
                </div>
                <div class="stat-item">
                    <h4>Ocorrências Positivas</h4>
                    <p class="stat-number">${stats.feedbacks_positivos}</p>
                </div>
                <div class="stat-item">
                    <h4>Ocorrências Negativas</h4>
                    <p class="stat-number">${stats.feedbacks_negativos}</p>
                </div>
                <div class="stat-item">
                    <h4>Feedbacks de Experiência</h4>
                    <p class="stat-number">${stats.feedbacks_experiencia || 0}</p>
                </div>
            </div>
            ${stats.stats_por_setor ? `
                <h4>Por Setor</h4>
                <div class="sector-stats">
                    ${stats.stats_por_setor.map(setor => `
                        <div class="sector-stat">
                            <h5>${setor.setor_nome}</h5>
                            <p>Total: ${setor.total_feedbacks}</p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }
    
    hideLoading();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        login(username, password);
    });
    
    // Verificar se já está logado
    if (app.token && app.user) {
        showScreen('dashboardScreen');
    } else {
        showScreen('loginScreen');
    }
    
    // Filter history
    document.getElementById('filterType').addEventListener('change', loadHistory);
});

// CSS adicional para estatísticas
const additionalCSS = `
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.stat-item {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    border-left: 4px solid #e74c3c;
}

.stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #e74c3c;
    margin: 10px 0;
}

.sector-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 20px;
}

.sector-stat {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    border-left: 3px solid #3498db;
}
`;

// Adicionar CSS adicional
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

