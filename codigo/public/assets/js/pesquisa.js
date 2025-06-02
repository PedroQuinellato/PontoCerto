const API_URL = 'http://localhost:3000';

// Função para carregar e exibir os resultados da pesquisa
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
    const searchResults = document.getElementById('searchResults');

    // Garantir que o container de resultados existe
    if (!searchResults) {
        const resultsDiv = document.createElement('div');
        resultsDiv.id = 'searchResults';
        resultsDiv.className = 'absolute w-full bg-white mt-2 rounded-xl shadow-lg hidden z-50';
        searchContainer.appendChild(resultsDiv);
    }

    // Função para realizar a pesquisa
    function performSearch(query) {
        fetch('../db/db.json')
            .then(response => response.json())
            .then(data => {
                const lines = data.linhas.filter(linha => 
                    linha.numero.toLowerCase().includes(query.toLowerCase())
                );

                if (lines.length > 0) {
                    const resultsHTML = lines.map(linha => `
                        <div class="p-4 hover:bg-gray-100 cursor-pointer border-b" 
                             onclick="loadBusLine('${linha.numero}')">
                            <div class="font-semibold">Linha ${linha.numero}</div>
                            <div class="text-sm text-gray-600">${linha.tipo}</div>
                        </div>
                    `).join('');
                    
                    searchResults.innerHTML = resultsHTML;
                    searchResults.classList.remove('hidden');

                } 
                
                else {
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

    // Event listener para input de pesquisa
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query.length > 0) {
            performSearch(query);
        } else {
            searchResults.classList.add('hidden');
        }
    });

    // Event listener para fechar resultados quando clicar fora
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    // Event listener para teclas especiais
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResults.classList.add('hidden');
        }
    });
}

// Função para carregar linha selecionada
function loadBusLine(lineNumber) {
    fetch('../db/db.json')
        .then(response => response.json())
        .then(data => {
            const points = data.pontos.filter(point => point.linha === lineNumber);
            if (points.length > 0) {
                // Aqui você pode implementar a lógica para exibir a linha no mapa
                // ---------------------------------------------
                    new montarMapa(data)
                    salvarHistoricoLocal(lineNumber, points, data)
                    function montarMapa (dadosLocais) {
                        mapboxgl.accessToken = 'pk.eyJ1IjoiZ2xlYW9yciIsImEiOiJjbTJ2MHVjMG8wN2I0MmpxM3R6cjZmMWY5In0.4g00GInd7lPM1rUGDb0RYQ';
                        map = new mapboxgl.Map({
                            container: 'map',
                            style: 'mapbox://styles/mapbox/streets-v12',
                            center: centralLatLong,
                            zoom: 9
                        })
                        let popup = new mapboxgl.Popup({ offset: 25 })
                            
                            //teoricamente passa por cada item da database em pontos e converte os dois valores separados de latitude e longitude em um só, utilizavel pelo mapbox
                            let pairedCoordinates = points.map(item => ({
                                id: item.id,
                                coordinates: [item.longitude, item.latitude]
                            }))

                            
                        for (let index = 0; index < pairedCoordinates.length; index++) {
                        const marker = new mapboxgl.Marker()
                            .setLngLat(pairedCoordinates[index].coordinates)
                            .setPopup(popup)
                            .addTo(map);
                        }
                    
                        
                    // Limpar resultados da pesquisa
                    document.getElementById('searchResults').classList.add('hidden');
                }} else {
                console.log(`Nenhum ponto encontrado para a linha ${lineNumber}`);
            }
        })
        .catch(error => console.error('Erro ao carregar dados da linha:', error));
}

function salvarHistoricoLocal(lineNumber, points) {
    try {
        // Recuperar histórico existente
        let historico = JSON.parse(localStorage.getItem('historicoLinhas')) || [];
        
        // Criar novo item do histórico
        const novoItem = {
            numero: lineNumber,
            quantidadePontos: points.length,
            dataPesquisa: new Date().toISOString()
        };
        
        // Verificar se a linha já existe no histórico
        const indexExistente = historico.findIndex(item => item.numero === lineNumber);
        
        if (indexExistente !== -1) {
            // Atualizar item existente
            historico[indexExistente] = novoItem;
        } else {
            // Adicionar novo item no início do array
            historico.unshift(novoItem);
            
            // Manter apenas as 10 pesquisas mais recentes
            if (historico.length > 10) {
                historico = historico.slice(0, 10);
            }
        }
        
        // Salvar histórico atualizado
        localStorage.setItem('historicoLinhas', JSON.stringify(historico));
        
    } catch (erro) {
        console.error('Erro ao salvar histórico local:', erro);
    }
}
// Inicializar a busca quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', setupSearch);