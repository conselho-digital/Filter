# CLAUDE.md - Guia de Desenvolvimento: Plataforma Imobiliária 3D Interativa (Vendas na Planta)

> Referência visual: vídeo de um totem touchscreen vertical (4K, em pé) em stand de vendas, mostrando uma torre residencial de luxo frente ao mar. Tudo abaixo descreve o que aparece nesse vídeo, com a adaptação para web.

## 🏢 Visão Geral

Aplicação web de alto padrão para lançamento e venda de empreendimentos na planta. Funciona como software de vendas de um stand digital: o corretor (ou o cliente) toca no prédio, escolhe uma unidade, vê planta, preço e a vista da varanda em qualquer horário do dia.

**Fluxo principal da experiência:**

1. **Cena aérea do empreendimento:** vista de drone sobre a cidade com as torres, piscina, áreas verdes e entorno.
2. **Zoom em uma torre:** a câmera aproxima e orbita; os pavimentos ficam translúcidos.
3. **Seleção de unidade:** toque numa laje/apartamento colorido por status.
4. **Painel da unidade + planta baixa.**
5. **Window View:** câmera vai para a varanda da unidade, com panorama do mar e controle do horário.
6. **Voltar** para a maquete geral e comparar com outras unidades.

## 🛠️ Stack Tecnológica Recomendada

- **Framework:** React + Vite (preferido para kiosk/SPA) ou Next.js (App Router).
- **Estilização:** Tailwind CSS, com tokens de tema de luxo e utilitários de glassmorphism.
- **3D:** Three.js + React Three Fiber + `@react-three/drei` (`OrbitControls`/`CameraControls`, `Sky`, `Environment`, `Html`, `useGLTF`). Fallback 2D/isométrico (imagens pré-renderizadas) quando não houver WebGL.
- **Animação de UI:** Framer Motion.
- **Ícones:** Lucide React.
- **Estado:** Zustand (store único, ver "Modelo de estado").
- **Mapa (Location):** Leaflet ou MapLibre.

## 📐 Funcionalidades e Requisitos

### 1. Visualizador 3D principal

- **Câmera:** órbita 360°, zoom e pan suaves com inércia; gestos touch (arrastar = orbitar, pinça = zoom, dois dedos = pan). Limites de câmera (não atravessar o solo, distância mín./máx.).
- **Cena aérea:** várias torres, edifícios vizinhos em massa simplificada (azulados), piscina, árvores, ruas, mar ao fundo.
- **Transições:** voo de câmera animado (ease in-out, ~1,2 s) entre aérea → torre → unidade → varanda.
- **Estilo da torre selecionada:** fachada com varandas curvas e sobrepostas (lajes onduladas); ao selecionar, o restante do prédio fica translúcido/azulado para destacar as unidades.

### 2. Controle de horário do dia (Time of Day)

- **Barra superior** com slider horizontal e quatro marcos com ícone: **Amanhecer → Dia → Pôr do sol (golden hour) → Noite**.
- O slider controla, em tempo real: posição/cor do sol e da luz, céu, sombras, névoa, reflexo no mar e **janelas e iluminação da piscina acesas à noite**.
- **Engrenagem** ao lado do slider abre configurações (qualidade gráfica, idioma, unidade m²/ft²).
- **Toggle de clima** (nuvens/chuva) ao lado da engrenagem, alterando céu e partículas.
- O horário escolhido **persiste** entre a maquete e o Window View.

### 3. Unidades: status e hotspots

- Cada apartamento é uma **laje/volume translúcido clicável** sobre o prédio, com **etiqueta flutuante** (número da unidade ou preço) e nível de detalhe por distância.
- **Cores por status:**
  - Disponível: azul
  - Reservado: amarelo
  - Vendido: vermelho
- Hover/toque: realce e tooltip. Toque: abre o painel da unidade.
- Seleção por pavimento inteiro também deve existir.

### 4. Painel de filtros (lateral direita, recolhível)

- Abre/fecha por botão de seta; botão **X** fecha.
- Filtros: **Rooms** (quartos), **Size** (m², faixa), **Floor** (andar), **Price** (faixa), **busca** por número, checkbox **"Show only available"** e seção **Advanced** (vista, orientação, varanda).
- Unidades que não passam no filtro ficam apagadas (cinza/transparentes) na maquete.
- Contador de resultados ao vivo.

### 5. Painel de detalhes da unidade (drawer lateral direito)

- Cabeçalho: **APARTMENT B1804** (nome da unidade), botões **fechar (X)**, **favoritar (coração)** e **setas anterior/próxima unidade**.
- Dados: **área (ex.: 142,55 m²)**, botão **"Show price"** (preço revelado sob demanda), **quartos**, **andar**, **número**, bloco.
- **Ações (botões empilhados):**
  - **Window View**
  - **Apartment Blueprint** (volta/mostra a planta)
  - **Print Blueprint**
  - **Send Blueprint** (envio por e-mail/WhatsApp)
  - **Show on Investment** (simulação de investimento/fluxo de pagamento)
  - **Compare Unit** (adiciona ao comparador; contador no menu inferior)
  - **Schedule / Contact**

### 6. Planta baixa (blueprint)

- Tela clara (fundo branco/cinza claro) sobre a maquete, mostrando a **planta 2D** com cômodos nomeados, medidas, varanda e posição da unidade no andar (mini-planta do pavimento, "Level 18").
- Pan e zoom por toque; exportação/impressão em PDF.

### 7. Window View (simulação da varanda)

- Câmera em **primeira pessoa na varanda** da unidade escolhida: laje/teto da varanda visível na parte superior, o próprio prédio e o litoral à frente, mar até o horizonte.
- **Arrastar** para olhar ao redor (dica de gesto com ícone de mão na primeira vez).
- **Barra inferior:** **View 1**, **View 2** (ângulos/direções pré-definidos) e **Back to apartment**.
- Slider de horário **continua ativo**: dá para ver amanhecer, pôr do sol dourado com reflexo no mar e noite com cidade iluminada.

### 8. Menu de navegação inferior (toolbar glassmorphism)

- Itens: **Apartments**, **Compare (n)** (com contador), **Location**, **Gallery**, **Highlights**.
- No canto inferior direito: botão **Walk 3D** (modo caminhada/tour), botão de **captura de tela** e botão de **informações/ajuda**.
- **Apartments:** lista/grade das unidades com os filtros acima.
- **Compare:** matriz lado a lado (área, quartos, andar, vista, preço, status).
- **Location:** mapa interativo com pontos de interesse (praia, comércio, escolas, acessos) e distâncias.
- **Gallery:** renders fotorrealistas e vídeos, com lightbox.
- **Highlights:** diferenciais arquitetônicos, lazer, sustentabilidade, comodidades.

## 🎨 UI/UX e Design System

- **Estética:** luxo, sofisticação, minimalismo moderno; a maquete 3D é a protagonista, UI discreta por cima.
- **Cores:** fundos escuros profundos `#0A0F1D` e `#111827`; branco e cinza claro para texto; azul corporativo como cor primária (status "disponível" e CTAs) e dourado sutil como acento.
- **Glassmorphism:** `backdrop-blur`, fundo semitransparente, borda de 1px clara com baixa opacidade, cantos arredondados.
- **Tipografia:** sans-serif geométrica fina (ex.: Montserrat/Inter), títulos em caixa alta com espaçamento entre letras.
- **Movimento:** transições fluidas (200–400 ms na UI, ~1,2 s em câmera), sem saltos.
- **Touch-first:** alvos de toque ≥ 48 px, sem dependência de hover, sem texto minúsculo (legível a 1–2 m em totem).
- **Responsividade:** totem vertical 4K (prioridade), desktop e mobile; no mobile, painéis viram bottom sheets.
- **Performance:** meta de 60 fps no totem, 30 fps no mobile; usar instancing, LOD, texturas comprimidas, `Suspense` com loading elegante e qualidade adaptativa (DPR dinâmico).

## 🧱 Arquitetura Sugerida

```
src/
  app/                 # entrada, providers, rotas
  components/
    scene/             # Canvas, câmera, luzes, céu, mar, torres, unidades
    ui/                # toolbar, slider de horário, drawer, filtros, modais
    blueprint/         # visualizador de planta
    windowview/        # modo varanda
  data/                # mocks (inventário, pontos de interesse, galeria)
  store/               # Zustand
  hooks/
  lib/                 # utilitários (cores de status, formatação, câmera)
```

### Modelo de estado (Zustand)

- `viewMode`: `'aerial' | 'tower' | 'unit' | 'blueprint' | 'windowView' | 'map' | 'gallery' | 'highlights'`
- `selectedUnitId`, `hoveredUnitId`, `compareIds[]`, `favoriteIds[]`
- `timeOfDay` (0–1), `weather`, `quality`
- `filters`: `{ rooms, sizeRange, floor, priceRange, onlyAvailable, query, advanced }`
- `windowViewPreset`: `'view1' | 'view2'`

### Modelo de dados (mock)

```ts
type UnitStatus = 'available' | 'reserved' | 'sold';

interface Unit {
  id: string;            // "B1804"
  block: string;         // "B"
  floor: number;         // 18
  number: string;        // "04"
  bedrooms: number;      // 2
  area: number;          // 142.55 (m²)
  price: number;
  status: UnitStatus;
  orientation: string;
  blueprintUrl: string;
  windowViews: { id: 'view1' | 'view2'; position: [number, number, number]; target: [number, number, number] }[];
}
```

## 💻 Padrões de Código

- **Componentização:** componentes funcionais pequenos, modulares e reutilizáveis; Hooks modernos (`useState`, `useMemo`, `useCallback`, `useRef`).
- **TypeScript** estrito sempre que possível.
- **Mocks:** inventário mockado e determinístico (~20 andares × 4–6 unidades por torre, com mistura realista de status, áreas e preços) para a aplicação ser 100% interativa desde o início, sem backend.
- **Assets 3D:** enquanto não houver modelo real, usar geometria procedural (lajes extrudadas com varandas curvas) e trocar por GLB depois, mantendo a mesma interface de `Unit`.
- **Acessibilidade:** contraste adequado, `aria-label` nos botões de ícone, foco visível, respeitar `prefers-reduced-motion`.
- **Entregas incrementais:** 1) cena + câmera + horário; 2) unidades e status; 3) painel + planta; 4) Window View; 5) filtros, comparar, mapa, galeria, destaques.
