// Configuração da API base
const API_URL = 'http://localhost:3000';

// Armazenamento e estado
let linhas = [];
let pontoTemp = null;
let confirmedPoint = false;
let tempPoints = [];
let isPointsVisible = false;




// Function to save temporary point
async function salvarPonto(evento) {
    evento.preventDefault();

    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const linhaSelect = document.getElementById('linha-select');
    const linhaSelecionada = linhaSelect.value;

    if (!validarCoordenada(latitude) || !validarCoordenada(longitude)) {
        alert('Por favor, insira coordenadas válidas');
        return;
    }

    if (!linhaSelecionada) {
        alert('Por favor, selecione uma linha');
        return;
    }

    const newPoint = {
        linha: linhaSelecionada,
        latitude,
        longitude,
        tempId: Date.now() // Use timestamp as temporary ID
    };

    tempPoints.push(newPoint);
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    atualizarListaPontosTemporarios();
}

// Function to update temporary points list
// Update these functions in your script.js

function atualizarListaPontosTemporarios() {
    const tempPointsList = document.getElementById('temp-points-list');
    if (!tempPointsList) return;

    tempPointsList.innerHTML = tempPoints.map((ponto, index) => `
        <div class="point-card">
            <div class="point-data">
                #${index + 1}: 
                <span contenteditable="true" onblur="editarPontoTemp(${ponto.tempId}, 'latitude', this.textContent)">${ponto.latitude}</span>,
                <span contenteditable="true" onblur="editarPontoTemp(${ponto.tempId}, 'longitude', this.textContent)">${ponto.longitude}</span>
            </div>
            <div class="point-actions">
                <button onclick="removerPontoTemp(${ponto.tempId})" class="delete-btn">×</button>
            </div>
        </div>
    `).join('');
}

// Add keyboard shortcuts for faster input
document.addEventListener('DOMContentLoaded', () => {
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    function handleEnterKey(event) {
        if (event.key === 'Enter') {
            if (event.target === latitudeInput) {
                longitudeInput.focus();
            } else if (event.target === longitudeInput) {
                salvarPonto(new Event('click'));
                latitudeInput.focus();
            }
        }
    }

    latitudeInput?.addEventListener('keypress', handleEnterKey);
    longitudeInput?.addEventListener('keypress', handleEnterKey);
});


// Function to remove temporary point
function removerPontoTemp(tempId) {
    tempPoints = tempPoints.filter(p => p.tempId !== tempId);
    atualizarListaPontosTemporarios();
}

// Funções de utilidade
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        atualizarInterface();
    }
}

function validarCoordenada(valor) {
    return /^-?\d*\.?\d*$/.test(valor) && !isNaN(parseFloat(valor));
}

// Funções de API
async function fetchLinhas() {
    try {
        const response = await fetch(`${API_URL}/linhas`);
        linhas = await response.json();
        return linhas;
    } catch (error) {
        console.error('Erro ao buscar linhas:', error);
        return [];
    }
}

async function fetchPontos() {
    try {
        const response = await fetch(`${API_URL}/pontos`);
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar pontos:', error);
        return [];
    }
}

// Funções CRUD
// Função auxiliar para obter o próximo ID
async function getNextId(collection) {
    try {
        const response = await fetch(`${API_URL}/${collection}`);
        const items = await response.json();
        
        if (items.length === 0) return "1";
        
        const maxId = Math.max(...items.map(item => parseInt(item.id)));
        return (maxId + 1).toString();
    } catch (error) {
        console.error(`Erro ao obter próximo ID para ${collection}:`, error);
        return "1";
    }
}

// Função atualizada para cadastrar linha com ID sequencial
async function cadastrarLinha(evento) {
    evento.preventDefault();
    const currentTab = getCurrentTab();

    const numero = document.getElementById('numero').value;
    const tipo = document.getElementById('tipo').value;

    if (!numero || !tipo) {
        alert('Por favor, preencha todos os campos');
        return;
    }

    try {
        const nextId = await getNextId('linhas');
        
        const response = await fetch(`${API_URL}/linhas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: nextId,
                numero,
                tipo
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        alert('Linha cadastrada com sucesso!');
        evento.target.reset();
        await atualizarInterface();
        showTab(currentTab);
    } catch (error) {
        console.error('Erro ao cadastrar linha:', error);
        alert('Erro ao cadastrar linha. Por favor, tente novamente.');
    }
}

// Função atualizada para confirmar pontos com IDs sequenciais
async function confirmarPontos() {
    const currentTab = getCurrentTab();
    
    if (tempPoints.length === 0) {
        alert('Não há pontos para confirmar');
        return;
    }

    try {
        for (const ponto of tempPoints) {
            const nextId = await getNextId('pontos');
            const { tempId, ...pontoData } = ponto;
            
            const response = await fetch(`${API_URL}/pontos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: nextId,
                    ...pontoData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }

        alert(`${tempPoints.length} pontos salvos com sucesso!`);
        tempPoints = [];
        atualizarListaPontosTemporarios();
        await atualizarInterface();
        showTab(currentTab);
    } catch (error) {
        console.error('Erro ao salvar pontos:', error);
        alert('Erro ao salvar pontos. Por favor, tente novamente.');
    }
}

async function removerLinha(id) {
    if (!confirm('Tem certeza que deseja remover esta linha?')) return;

    try {
        await fetch(`${API_URL}/linhas/${id}`, {
            method: 'DELETE'
        });

        const pontos = await fetchPontos();
        const linha = linhas.find(l => l.id === id);
        const pontosParaRemover = pontos.filter(p => p.linha === linha.numero);

        for (const ponto of pontosParaRemover) {
            await fetch(`${API_URL}/pontos/${ponto.id}`, {
                method: 'DELETE'
            });
        }

        await atualizarInterface();
    } catch (error) {
        console.error('Erro ao remover linha:', error);
    }
}

async function editarLinha(id) {
    const linha = linhas.find(l => l.id === id);
    const novoNumero = prompt('Novo número da linha:', linha.numero);
    const novoTipo = prompt('Novo tipo de ônibus:', linha.tipo);

    if (novoNumero && novoTipo) {
        try {
            await fetch(`${API_URL}/linhas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...linha,
                    numero: novoNumero,
                    tipo: novoTipo
                })
            });

            await atualizarInterface();
        } catch (error) {
            console.error('Erro ao editar linha:', error);
        }
    }
}

async function atualizarInterface() {
    // Atualizar lista de linhas no select
    const linhaSelect = document.getElementById('linha-select');
    if (linhaSelect) {
        const linhas = await fetchLinhas();
        linhaSelect.innerHTML = '<option value="">Selecione uma linha</option>';
        linhas.forEach(linha => {
            linhaSelect.innerHTML += `<option value="${linha.numero}">${linha.numero} - ${linha.tipo}</option>`;
        });
    }

    // Atualizar tabela de linhas
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        const linhas = await fetchLinhas();
        const pontos = await fetchPontos();

        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Tipo</th>
                        <th>Pontos</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        linhas.forEach(linha => {
            const pontosDaLinha = pontos.filter(p => p.linha === linha.numero);
            html += `
                <tr>
                    <td>${linha.numero}</td>
                    <td>${linha.tipo}</td>
                    <td>${pontosDaLinha.length}</td>
                    <td>
                        <button onclick="visualizarPontos('${linha.numero}')" class="view-btn">Ver Pontos</button>
                        <button onclick="editarLinha(${linha.id})" class="edit-btn">Editar</button>
                        <button onclick="removerLinha(${linha.id})" class="delete-btn">Remover</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    // Atualizar lista de pontos quando uma linha está selecionada
    const pointsList = document.getElementById('points-list');
    if (pointsList && window.selectedLine) {
        const pontos = await fetchPontos();
        const pontosDaLinha = pontos.filter(ponto => ponto.linha === window.selectedLine);

        pointsList.innerHTML = pontosDaLinha.map((ponto, index) => `
            <div class="point-item">
                <div class="point-info">
                    <h4>Ponto ${index + 1}</h4>
                    <p>Latitude: ${ponto.latitude}</p>
                    <p>Longitude: ${ponto.longitude}</p>
                </div>
                <div class="point-actions">
                    <button onclick="removerPonto(${ponto.id})" class="delete-btn">Remover</button>
                </div>
            </div>
        `).join('');
    }
}

// Updated visualizarPontos function to toggle visibility
async function visualizarPontos(linhaNumero) {
    const pointsList = document.getElementById('points-list');
    if (!pointsList) return;

    if (window.selectedLine === linhaNumero && isPointsVisible) {
        // Hide points
        window.selectedLine = null;
        isPointsVisible = false;
        pointsList.innerHTML = '';
        return;
    }

    // Show points
    window.selectedLine = linhaNumero;
    isPointsVisible = true;
    const pontos = await fetchPontos();
    const pontosDaLinha = pontos.filter(ponto => ponto.linha === linhaNumero);

    pointsList.innerHTML = pontosDaLinha.map((ponto, index) => `
        <div class="point-item">
            <div class="point-info">
                <h4>Ponto ${index + 1}</h4>
                <p>Latitude: ${ponto.latitude}</p>
                <p>Longitude: ${ponto.longitude}</p>
                <br>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarInterface();

    const linhaForm = document.getElementById('linha-form');
    if (linhaForm) linhaForm.addEventListener('submit', cadastrarLinha);

    const pontoForm = document.getElementById('ponto-form');
    if (pontoForm) pontoForm.addEventListener('submit', cadastrarPonto);
});

// Função atualizada para edição de linha
async function editarLinha(id, numeroAtual, tipoAtual) {
    const novoNumero = prompt('Novo número da linha:', numeroAtual);
    if (!novoNumero) return;

    const tipoOptions = ['Comum', 'Executivo', 'Articulado'];
    let novoTipo = prompt(`Novo tipo de ônibus (${tipoOptions.join('/')}):`, tipoAtual);

    if (!tipoOptions.includes(novoTipo)) {
        alert('Tipo de ônibus inválido. Use: Comum, Executivo ou Articulado');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/linhas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero: novoNumero,
                tipo: novoTipo
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Atualizar os pontos relacionados com o novo número da linha
        const pontos = await fetchPontos();
        const pontosParaAtualizar = pontos.filter(p => p.linha === numeroAtual);

        for (const ponto of pontosParaAtualizar) {
            await fetch(`${API_URL}/pontos/${ponto.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...ponto,
                    linha: novoNumero
                })
            });
        }
        alert('Linha atualizada com sucesso!');
        await atualizarInterface();
    } catch (error) {
        console.error('Erro ao editar linha:', error);
        alert('Erro ao editar linha. Por favor, tente novamente.');
    }
}

// Função atualizada para remover linha
async function removerLinha(id) {
    if (!confirm('Tem certeza que deseja remover esta linha? Todos os pontos associados também serão removidos.')) {
        return;
    }

    try {
        // Primeiro, buscar todos os pontos da linha
        const linha = await fetch(`${API_URL}/linhas/${id}`).then(r => r.json());
        const pontos = await fetchPontos();
        const pontosParaRemover = pontos.filter(p => p.linha === linha.numero);

        // Remover todos os pontos associados
        for (const ponto of pontosParaRemover) {
            await fetch(`${API_URL}/pontos/${ponto.id}`, {
                method: 'DELETE'
            });
        }

        // Remover a linha
        const response = await fetch(`${API_URL}/linhas/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        alert('Linha e pontos associados removidos com sucesso!');
        await atualizarInterface();
    } catch (error) {
        console.error('Erro ao remover linha:', error);
        alert('Erro ao remover linha. Por favor, tente novamente.');
    }
}



function getCurrentTab() {
    const activeTab = document.querySelector('.tab-content.active');
    return activeTab ? activeTab.id : 'linhas';
}

// Função auxiliar para validar coordenadas
function validarCoordenada(valor) {
    const numero = parseFloat(valor);
    return !isNaN(numero) && isFinite(numero);
}

function getCurrentTab() {
    const activeTab = document.querySelector('.tab-content.active');
    return activeTab ? activeTab.id : 'linhas';
}

const Linha = sequelize.define('Linha', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
})