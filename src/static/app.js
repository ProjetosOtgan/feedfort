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
    showScreen('sectorScreen');
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
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = '<h3>Carregando...</h3>';

    const users = await apiRequest('/usuarios');

    if (users) {
        adminContent.innerHTML = `
            <h3>Gerenciamento de Usuários</h3>
            <div id="userFormContainer"></div>
            <div id="userList"></div>
        `;
        renderUserList(users);
        renderUserForm();
    }
}

function renderUserList(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = `
        <h4>Usuários Existentes</h4>
        <table class="management-table">
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
                        <td>${user.user_type}</td>
                        <td>
                            <button class="btn-edit" onclick="renderUserForm(${JSON.stringify(user).replace(/"/g, "'")})">Editar</button>
                            <button class="btn-delete" onclick="deleteUser(${user.id})">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderUserForm(user = null) {
    const userFormContainer = document.getElementById('userFormContainer');
    const isEditing = user !== null;

    userFormContainer.innerHTML = `
        <div class="form-card">
            <h4>${isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h4>
            <form id="userForm">
                <input type="hidden" name="id" value="${user ? user.id : ''}">
                <div class="form-group">
                    <label for="userUsername">Usuário</label>
                    <input type="text" id="userUsername" name="username" value="${user ? user.username : ''}" required>
                </div>
                <div class="form-group">
                    <label for="userEmail">Email</label>
                    <input type="email" id="userEmail" name="email" value="${user ? user.email : ''}" required>
                </div>
                <div class="form-group">
                    <label for="userPassword">Senha</label>
                    <input type="password" id="userPassword" name="password" ${isEditing ? '' : 'required'}>
                    ${isEditing ? '<small>Deixe em branco para não alterar</small>' : ''}
                </div>
                <div class="form-group">
                    <label for="userType">Tipo</label>
                    <select id="userType" name="user_type">
                        <option value="usuario" ${user && user.user_type === 'usuario' ? 'selected' : ''}>Usuário</option>
                        <option value="admin" ${user && user.user_type === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">${isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}</button>
                    ${isEditing ? '<button type="button" class="btn-secondary" onclick="renderUserForm()">Cancelar</button>' : ''}
                </div>
            </form>
        </div>
    `;

    document.getElementById('userForm').onsubmit = saveUser;
}

async function saveUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        user_type: formData.get('user_type')
    };

    if (id) { // Edit
        if (!data.password) delete data.password; // Não envia senha se estiver vazia
        await apiRequest(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else { // Create
        await apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data) });
    }

    showUserManagement(); // Recarrega a lista
}

async function deleteUser(id) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        await apiRequest(`/usuarios/${id}`, { method: 'DELETE' });
        showUserManagement(); // Recarrega a lista
    }
}

async function showSectorManagement() {
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = '<h3>Carregando...</h3>';

    const sectors = await apiRequest('/setores');

    if (sectors) {
        adminContent.innerHTML = `
            <h3>Gerenciamento de Setores</h3>
            <div id="sectorFormContainer"></div>
            <div id="sectorListContainer"></div>
        `;
        renderSectorList(sectors);
        renderSectorForm();
    }
}

function renderSectorList(sectors) {
    const sectorListContainer = document.getElementById('sectorListContainer');
    sectorListContainer.innerHTML = `
        <h4>Setores Existentes</h4>
        <table class="management-table">
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
                        <td>${sector.descricao || 'N/A'}</td>
                        <td>
                            <button class="btn-edit" onclick="renderSectorForm(${JSON.stringify(sector).replace(/"/g, "'")})">Editar</button>
                            <button class="btn-delete" onclick="deleteSector(${sector.id})">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderSectorForm(sector = null) {
    const sectorFormContainer = document.getElementById('sectorFormContainer');
    const isEditing = sector !== null;

    sectorFormContainer.innerHTML = `
        <div class="form-card">
            <h4>${isEditing ? 'Editar Setor' : 'Adicionar Novo Setor'}</h4>
            <form id="sectorForm">
                <input type="hidden" name="id" value="${sector ? sector.id : ''}">
                <div class="form-group">
                    <label for="sectorName">Nome</label>
                    <input type="text" id="sectorName" name="nome" value="${sector ? sector.nome : ''}" required>
                </div>
                <div class="form-group">
                    <label for="sectorDescription">Descrição</label>
                    <input type="text" id="sectorDescription" name="descricao" value="${sector ? sector.descricao : ''}">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">${isEditing ? 'Salvar Alterações' : 'Adicionar Setor'}</button>
                    ${isEditing ? '<button type="button" class="btn-secondary" onclick="renderSectorForm()">Cancelar</button>' : ''}
                </div>
            </form>
        </div>
    `;

    document.getElementById('sectorForm').onsubmit = saveSector;
}

async function saveSector(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');
    const data = {
        nome: formData.get('nome'),
        descricao: formData.get('descricao')
    };

    if (id) { // Edit
        await apiRequest(`/setores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else { // Create
        await apiRequest('/setores', { method: 'POST', body: JSON.stringify(data) });
    }

    showSectorManagement(); // Recarrega a lista
}

async function deleteSector(id) {
    if (confirm('Tem certeza que deseja excluir este setor? A exclusão removerá funcionários e feedbacks associados.')) {
        await apiRequest(`/setores/${id}`, { method: 'DELETE' });
        showSectorManagement(); // Recarrega a lista
    }
}

async function showEmployeeManagement() {
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = '<h3>Carregando...</h3>';

    const [employees, sectors] = await Promise.all([
        apiRequest('/funcionarios'),
        apiRequest('/setores')
    ]);

    if (employees && sectors) {
        adminContent.innerHTML = `
            <h3>Gerenciamento de Funcionários</h3>
            <div id="employeeFormContainer"></div>
            <div id="employeeListContainer"></div>
        `;
        renderEmployeeList(employees, sectors);
        renderEmployeeForm(null, sectors);
    }
}

function renderEmployeeList(employees, sectors) {
    const employeeListContainer = document.getElementById('employeeListContainer');
    employeeListContainer.innerHTML = `
        <h4>Funcionários Existentes</h4>
        <table class="management-table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Cargo</th>
                    <th>Setor</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map(employee => `
                    <tr>
                        <td>${employee.nome}</td>
                        <td>${employee.cargo || 'N/A'}</td>
                        <td>${sectors.find(s => s.id === employee.setor_id)?.nome || 'N/A'}</td>
                        <td>
                            <button class="btn-edit" onclick="renderEmployeeForm(${JSON.stringify(employee).replace(/"/g, "'")}, ${JSON.stringify(sectors).replace(/"/g, "'")})">Editar</button>
                            <button class="btn-delete" onclick="deleteEmployee(${employee.id})">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderEmployeeForm(employee = null, sectors) {
    const employeeFormContainer = document.getElementById('employeeFormContainer');
    const isEditing = employee !== null;

    employeeFormContainer.innerHTML = `
        <div class="form-card">
            <h4>${isEditing ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</h4>
            <form id="employeeForm">
                <input type="hidden" name="id" value="${employee ? employee.id : ''}">
                <div class="form-group">
                    <label for="employeeName">Nome</label>
                    <input type="text" id="employeeName" name="nome" value="${employee ? employee.nome : ''}" required>
                </div>
                <div class="form-group">
                    <label for="employeeRole">Cargo</label>
                    <input type="text" id="employeeRole" name="cargo" value="${employee ? employee.cargo : ''}">
                </div>
                <div class="form-group">
                    <label for="employeeSector">Setor</label>
                    <select id="employeeSector" name="setor_id" required>
                        <option value="">Selecione um setor</option>
                        ${sectors.map(sector => `<option value="${sector.id}" ${employee && employee.setor_id === sector.id ? 'selected' : ''}>${sector.nome}</option>`).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">${isEditing ? 'Salvar Alterações' : 'Adicionar Funcionário'}</button>
                    ${isEditing ? `<button type="button" class="btn-secondary" onclick="renderEmployeeForm(null, ${JSON.stringify(sectors).replace(/"/g, "'")})">Cancelar</button>` : ''}
                </div>
            </form>
        </div>
    `;

    document.getElementById('employeeForm').onsubmit = saveEmployee;
}

async function saveEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');
    const data = {
        nome: formData.get('nome'),
        cargo: formData.get('cargo'),
        setor_id: parseInt(formData.get('setor_id'))
    };

    if (id) { // Edit
        await apiRequest(`/funcionarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else { // Create
        await apiRequest('/funcionarios', { method: 'POST', body: JSON.stringify(data) });
    }

    showEmployeeManagement(); // Recarrega a lista
}

async function deleteEmployee(id) {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
        await apiRequest(`/funcionarios/${id}`, { method: 'DELETE' });
        showEmployeeManagement(); // Recarrega a lista
    }
}

async function showAttributeManagement() {
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = '<h3>Carregando...</h3>';

    const sectors = await apiRequest('/setores');

    if (sectors) {
        adminContent.innerHTML = `
            <h3>Gerenciamento de Atributos por Setor</h3>
            <div class="form-group">
                <label for="attributeSectorSelect">Selecione um Setor</label>
                <select id="attributeSectorSelect" onchange="renderAttributeList(this.value)">
                    <option value="">-- Selecione --</option>
                    ${sectors.map(sector => `<option value="${sector.id}">${sector.nome}</option>`).join('')}
                </select>
            </div>
            <div id="attributeListContainer"></div>
            <div id="attributeFormContainer"></div>
        `;
        window.sectorsForAttributes = sectors; // Store for later use
    }
}

async function renderAttributeList(sectorId) {
    if (!sectorId) {
        document.getElementById('attributeListContainer').innerHTML = '';
        document.getElementById('attributeFormContainer').innerHTML = '';
        return;
    }

    const attributesData = await apiRequest(`/atributos?setor_id=${sectorId}`);
    const attributes = attributesData.atributos || [];

    const attributeListContainer = document.getElementById('attributeListContainer');
    attributeListContainer.innerHTML = `
        <h4>Atributos do Setor</h4>
        <ul>
            ${attributes.map(attr => `
                <li>
                    ${attr}
                    <button onclick="deleteAttribute('${sectorId}', '${attr}')">Excluir</button>
                </li>
            `).join('')}
        </ul>
    `;

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
                <input type="text" id="attributeName" name="atributo" required>
            </div>
            <button type="submit">Adicionar Atributo</button>
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

    await apiRequest(`/setores/${sectorId}/atributos`, {
        method: 'POST',
        body: JSON.stringify({ atributo: attributeName })
    });

    renderAttributeList(sectorId); // Recarrega a lista
}

async function deleteAttribute(sectorId, attributeName) {
    if (confirm(`Tem certeza que deseja excluir o atributo '${attributeName}'?`)) {
        await apiRequest(`/setores/${sectorId}/atributos`, {
            method: 'DELETE',
            body: JSON.stringify({ atributo: attributeName })
        });
        renderAttributeList(sectorId); // Recarrega a lista
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
    showScreen('employeeScreen');
}

async function loadEmployees() {
    if (!app.feedbackData.sector) return;
    
    showLoading();
    
    const employees = await apiRequest(`/funcionarios?setor_id=${app.feedbackData.sector.id}`);
    
    if (employees) {
        app.employees = employees;
        renderEmployees();
    }
    
    hideLoading();
}

function renderEmployees() {
    const employeeList = document.getElementById('employeeList');
    
    employeeList.innerHTML = app.employees.map(employee => `
        <div class="list-item" onclick="selectEmployee(${employee.id}, '${employee.nome}')">
            <h4>${employee.nome}</h4>
            <p>${employee.cargo || 'Cargo não informado'}</p>
        </div>
    `).join('');
}

function selectEmployee(employeeId, employeeName) {
    app.feedbackData.employee = { id: employeeId, name: employeeName };
    showFeedbackForm();
}

async function showFeedbackForm() {
    showScreen('feedbackFormScreen');
    
    // Atualizar informações do feedback
    document.getElementById('selectedType').textContent = app.feedbackData.type;
    document.getElementById('selectedSector').textContent = app.feedbackData.sector.name;
    document.getElementById('selectedEmployee').textContent = app.feedbackData.employee.name;
    
    const formTitle = document.getElementById('feedbackFormTitle');
    const feedbackForm = document.getElementById('feedbackForm');
    
    if (app.feedbackData.type === 'diario') {
        formTitle.textContent = 'Avaliação Diária';
        await renderDailyForm();
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
    
    historyList.innerHTML = feedbacks.map(feedback => {
        const date = new Date(feedback.data_feedback).toLocaleString('pt-BR');
        
        let content = '';
        if (feedback.tipo === 'diario' && feedback.avaliacoes) {
            content = Object.entries(feedback.avaliacoes)
                .map(([attr, nota]) => `${attr}: ${nota}/5`)
                .join(', ');
        } else {
            content = feedback.descricao || 'Sem descrição';
        }
        
        return `
            <div class="history-item ${feedback.tipo}">
                <div class="history-header">
                    <span class="history-type ${feedback.tipo}">${feedback.tipo}</span>
                    <span class="history-date">${date}</span>
                </div>
                <div class="history-details">
                    <p><strong>Funcionário:</strong> ${feedback.funcionario_nome}</p>
                    <p><strong>Setor:</strong> ${feedback.setor_nome}</p>
                    <p><strong>Conteúdo:</strong> ${content}</p>
                </div>
            </div>
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

