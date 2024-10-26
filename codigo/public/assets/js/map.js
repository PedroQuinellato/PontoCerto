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
function createBusStopIcon() {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background-color: #4285F4;
            border: 2px solid white;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);">
            </div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
}

// Função para desenhar a rota no mapa
function drawBusRoute(points) {
    // Limpar markers e path anteriores
    clearMap();
    
    // Criar array de coordenadas para a polyline
    const coordinates = points.map(point => [
        parseFloat(point.latitude),
        parseFloat(point.longitude)
    ]);

    // Criar e adicionar markers para cada ponto
    coordinates.forEach((coord, index) => {
        const marker = L.marker(coord, {
            icon: createBusStopIcon()
        }).addTo(map);
        
        // Adicionar popup com informação do ponto
        marker.bindPopup(`Ponto ${index + 1}`);
        
        markers.push(marker);
    });

    // Criar e desenhar a polyline
    currentPath = L.polyline(coordinates, {
        color: '#4285F4',
        weight: 3,
        opacity: 1
    }).addTo(map);

    // Ajustar o zoom para mostrar toda a rota
    map.fitBounds(currentPath.getBounds());
}

// Função para limpar o mapa
function clearMap() {
    // Limpar markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Limpar polyline
    if (currentPath) {
        map.removeLayer(currentPath);
    }
}

// Função para carregar e exibir a rota de uma linha
function loadBusLine(lineNumber) {
    fetch('/codigo/db/db.json')
        .then(response => response.json())
        .then(data => {
            const points = data.pontos.filter(point => point.linha === lineNumber);
            if (points.length > 0) {
                // Inicializar o mapa se ainda não foi inicializado
                if (!map) {
                    initMap();
                }
                drawBusRoute(points);

                // Adicionar informações da linha
                const linha = data.linhas.find(l => l.numero === lineNumber);
                if (linha) {
                    // Criar ou atualizar o elemento de informações
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
                    `;
                }
            } else {
                console.error(`Nenhum ponto encontrado para a linha ${lineNumber}`);
            }
        })
        .catch(error => console.error('Erro ao carregar dados da linha:', error));
}

// Inicializar o mapa quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', initMap);

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
`;
document.head.appendChild(style);