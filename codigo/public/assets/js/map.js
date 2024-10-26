// Variáveis globais
let map;
let currentPath;
let markers = [];

// Função para inicializar o mapa
function initMap() {
    // Se o mapa já existe, remova-o
    if (map) {
        map.remove();
    }

    // Limpar o conteúdo placeholder
    const mapContainer = document.querySelector('.map-placeholder');
    mapContainer.innerHTML = '';
    mapContainer.style.height = '500px'; // Definir altura para o mapa

    // Coordenadas iniciais de Belo Horizonte
    const initialPosition = [-19.8868, -43.9265];
    
    // Criar o mapa usando OpenStreetMap
    map = L.map(mapContainer).setView(initialPosition, 13);
    
    // Adicionar camada do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Função para criar um ícone personalizado para os pontos de ônibus
function createBusStopIcon(pointInfo) {
    return L.marker([pointInfo.latitude, pointInfo.longitude], {
        icon: L.divIcon({
            html: `<div class="bus-stop-marker" style="
                width: 12px;
                height: 12px;
                background-color: #4285F4;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 0 4px rgba(0,0,0,0.3);
            "></div>`,
            className: 'custom-div-icon',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).bindPopup(`
        <div class="popup-content">
            <h3 class="font-bold mb-2">Ponto de Ônibus</h3>
            <p><strong>Linha:</strong> ${pointInfo.linha}</p>
            <p><strong>Sequência:</strong> ${pointInfo.sequencia || 'N/A'}</p>
            <p><strong>Coordenadas:</strong> ${pointInfo.latitude}, ${pointInfo.longitude}</p>
        </div>
    `, {
        maxWidth: 300
    });
}

// Função para desenhar a rota do ônibus
function drawBusRoute(points) {
    // Limpar o mapa antes de desenhar nova rota
    clearMap();
    
    const coordinates = points.map(point => [
        parseFloat(point.latitude),
        parseFloat(point.longitude)
    ]);

    // Criar e adicionar markers para cada ponto
    points.forEach((point, index) => {
        const marker = createBusStopIcon({
            ...point,
            sequencia: index + 1
        });
        marker.addTo(map);
        markers.push(marker);
    });

    // Criar e desenhar a polyline
    currentPath = L.polyline(coordinates, {
        color: '#4285F4',
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '5, 10'
    }).addTo(map);

    // Ajustar o zoom para mostrar toda a rota
    map.fitBounds(currentPath.getBounds(), {
        padding: [50, 50]
    });
}

// Função para limpar o mapa
function clearMap() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    if (currentPath) {
        map.removeLayer(currentPath);
    }
}

// Função para configurar a pesquisa
function setupSearch() {
    const searchContainer = document.querySelector('.search-container');
    
    // Criar input de pesquisa se não existir
    if (!searchContainer.querySelector('input')) {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar linha...';
        searchInput.className = 'w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:border-blue-500';
        searchContainer.appendChild(searchInput);
    }

    const searchInput = searchContainer.querySelector('input');
    const searchResults = document.getElementById('searchResults') || (() => {
        const resultsDiv = document.createElement('div');
        resultsDiv.id = 'searchResults';
        resultsDiv.className = 'absolute w-full bg-white mt-2 rounded-xl shadow-lg hidden z-50';
        searchContainer.appendChild(resultsDiv);
        return resultsDiv;
    })();

    // Função para realizar a pesquisa
    function performSearch(query) {
        fetch('/codigo/db/db.json')
            .then(response => response.json())
            .then(data => {
                const lines = data.linhas.filter(linha => 
                    linha.numero.toLowerCase().includes(query.toLowerCase())
                );

                if (lines.length > 0) {
                    const resultsHTML = lines.map(linha => `
                        <div class="p-4 hover:bg-gray-100 cursor-pointer border-b" 
                             onclick="handleLineSelection('${linha.numero}')">
                            <div class="font-semibold">Linha ${linha.numero}</div>
                            <div class="text-sm text-gray-600">${linha.tipo}</div>
                        </div>
                    `).join('');
                    
                    searchResults.innerHTML = resultsHTML;
                    searchResults.classList.remove('hidden');
                } else {
                    searchResults.innerHTML = `
                        <div class="p-4 text-gray-600">
                            Nenhuma linha encontrada
                        </div>
                    `;
                    searchResults.classList.remove('hidden');
                }
            })
            .catch(error => {
                console.error('Erro ao carregar dados:', error);
                searchResults.innerHTML = `
                    <div class="p-4 text-red-600">
                        Erro ao buscar linhas
                    </div>
                `;
                searchResults.classList.remove('hidden');
            });
    }

    // Event listeners
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            performSearch(query);
        } else {
            searchResults.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResults.classList.add('hidden');
        }
    });
}

// Função para lidar com a seleção de linha
function handleLineSelection(lineNumber) {
    if (!map) {
        initMap();
    }

    fetch('/codigo/db/db.json')
        .then(response => response.json())
        .then(data => {
            const points = data.pontos.filter(point => point.linha === lineNumber);
            
            if (points.length > 0) {
                drawBusRoute(points);
                
                const linha = data.linhas.find(l => l.numero === lineNumber);
                if (linha) {
                    let infoDiv = document.querySelector('.line-info');
                    if (!infoDiv) {
                        infoDiv = document.createElement('div');
                        infoDiv.className = 'line-info p-4 bg-white rounded-xl shadow-md mt-4';
                        document.querySelector('.map-placeholder').insertAdjacentElement('afterend', infoDiv);
                    }
                    infoDiv.innerHTML = `
                        <h3 class="text-lg font-bold mb-2">Linha ${linha.numero}</h3>
                        <p class="text-gray-600">Tipo: ${linha.tipo}</p>
                        <p class="text-gray-600">Total de pontos: ${points.length}</p>
                        <p class="text-gray-600">Primeiro ponto: ${points[0].latitude}, ${points[0].longitude}</p>
                        <p class="text-gray-600">Último ponto: ${points[points.length-1].latitude}, ${points[points.length-1].longitude}</p>
                    `;
                }
                
                document.getElementById('searchResults').classList.add('hidden');
            } else {
                console.error(`Nenhum ponto encontrado para a linha ${lineNumber}`);
            }
        })
        .catch(error => console.error('Erro ao carregar dados da linha:', error));
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupSearch();
});

// Adicionar estilos necessários
const style = document.createElement('style');
style.textContent = `
    .map-placeholder {
        min-height: 500px;
        border-radius: 0.75rem;
        overflow: hidden;
    }
    .custom-div-icon {
        background: transparent;
        border: none;
    }
    .bus-stop-marker {
        transition: transform 0.2s;
    }
    .bus-stop-marker:hover {
        transform: scale(1.2);
    }
`;
document.head.appendChild(style);