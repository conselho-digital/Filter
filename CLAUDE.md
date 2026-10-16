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

## ✅ Revisão ao Concluir Cada Etapa

Ao terminar **cada etapa** da lista de entregas incrementais, antes de começar a próxima, rode os dois agentes (em `.claude/agents/`):

1. **`bug-hunter`:** busca bugs de lógica, estado, 3D, performance, touch e acessibilidade.
2. **`security-auditor`:** busca falhas de segurança (XSS, segredos, dependências, formulários, quiosque).

Regras:

- Corrija todo achado **Crítico** ou **Alto** antes de seguir. Médio e Baixo viram pendências registradas.
- Só avance se os dois agentes disserem **APROVADO** ou **APROVADO COM RESSALVAS**.
- A skill `strix-pentest` (em `.claude/skills/`) só pode ser usada contra alvos que o dono do projeto autorizou, como este próprio projeto.
- Fluxo de git: commits pequenos e push direto na `main`.

## 📝 Pendências Registradas (achados Médios e Baixos das revisões)

**Backend (requisito antes de dados reais):**
- Preço e status vêm só do servidor, com autorização por perfil. Nunca embutir dados comerciais reais no bundle.
- Validar `id` no servidor; renderizar textos como texto (nunca `innerHTML`, nem no `Html` do drei).
- CSP, `Referrer-Policy` e `frame-ancestors` como cabeçalhos HTTP; listar domínios de mapa e mídia quando entrarem.

**Performance e polimento:**
- Instanciar lajes, prédios, árvores e unidades (`InstancedMesh`) e compartilhar materiais por status.
- Code-splitting da cena (bundle acima de 1 MB).
- Tratar perda de contexto WebGL (ErrorBoundary) e liberar o contexto do teste de WebGL.
- Voo de câmera: interpolar também o azimute para a fachada da unidade; deslocar o alvo para fora da área do painel.
- Selecionar só unidades visíveis (oclusão) e usar `occlude` na etiqueta; unidades das pontas saem dos cantos arredondados do núcleo.
- Foco gerenciado no painel e alternativa de teclado/lista para escolher unidades.
- Névoa e céu com tons diferentes no horizonte; estrelas com fade; carregar a fonte (Inter/Montserrat).
- Reset de sessão por inatividade no modo totem.

**Pendências da etapa 3:**
- Planta: proporções dos quartos (limitar largura, mais de um banheiro), separar varanda da área privativa e botão de ajuste de pan por ponto de pinça.
- Diálogo da planta: `inert` no fundo e armadilha de foco; `key` por unidade para evitar o quadro com pan antigo.
- Botões desabilitados: texto "em breve" com pelo menos 12 px e `aria-disabled` em vez de `disabled`.
- `stepUnit` ignora filtros (ajustar na etapa 5) e mantém preços revelados ao navegar.
- Impressão no quiosque: `--kiosk-printing` com impressora fixa ou PDF gerado no servidor; imprimir preço só por rota dedicada, nunca dentro de `.print-area`.
- Enviar planta e Agendar/Contato: validação no servidor, rate limit, anti-spam, sem dados pessoais em logs, aviso de privacidade e consentimento (LGPD), chaves só no servidor.

**Pendências da etapa 4:**
- Voo reto da câmera até a varanda pode atravessar a torre se a órbita estiver do lado oposto: passar por ponto externo ou interpolar o azimute.
- Último andar sem laje de cobertura completa (sem teto de varanda nas 5 unidades do andar 22).
- Foco: levar o foco à barra da varanda ao abrir e devolvê-lo ao botão "Window View" ao fechar.
- Dica "Arraste para olhar ao redor" some no primeiro `pointermove`; esconder só no arrasto real. Textos de 14 px e botões estreitos na barra (totem e 360 px).
- Resíduo de inércia da órbita ao reabilitar os controles; `timeOfDay` fora do reset por inatividade.
- CSP e cabeçalhos de segurança em produção (ver pendências de backend).

## 🏛️ Prédio de Referência (arquitetura implementada)

Especificação enviada pelo dono do projeto (a partir dos renders de referência), implementada de forma procedural em `src/components/scene/Tower.tsx` e `src/lib/tower.ts`:

1. **Estrutura e proporções:** torre esbelta e retangular de ~20 a 25 pisos; acabamento em concreto/reboco claro texturizado (off-white / cinza claro).
2. **Sistema de varandas (marca do prédio):** **tabuleiro de xadrez** assimétrico de blocos volumétricos de concreto em balanço, **nas quatro fachadas**. Cada célula da grade tem o tamanho de um vão × um andar (célula quase quadrada); num andar as colunas alternadas têm bloco e o andar de cima inverte (`facadeCells`). Cada bloco é maciço (laje inferior espessa, paredes grossas), com **guarda-corpo fino** de metal escuro e **jardineira embutida na borda** (arbustos, flores coloridas e folhagem que cai pela frente).
3. **Janelas:** ficam nas células vazias, **bem recuadas** atrás dos blocos, com **molduras escuras**; à noite, parte delas acende em tom quente.
4. **Coroamento:** o último andar **recua em penthouse**: caixa de vidro de piso a teto, caixilho de **bronze**, laje de cobertura plana com fachada de **madeira** e terraço em volta.
5. **Pódio:** base **larga e de pé-direito duplo**, sobre **pilotis robustos** de concreto aparente, cortina de vidro com caixilhos de **madeira quente**, cobertura verde, **café com mesas e cadeiras**, bananeiras em vasos e **praça pavimentada**.

Detalhes de implementação:
- Peças repetidas (blocos, janelas, plantas) são `InstancedMesh` gerados de forma determinística em `buildParts`.
- **Vista da varanda** usa o bloco mais próximo da orientação da unidade (Mar = fundos); do bloco do próprio apartamento somem a parede frontal, o guarda-corpo e a vegetação para liberar o panorama.
- **Sol:** ao meio-dia ilumina a face da frente (azimute 28°), como na referência.

**Pendências da etapa 5 (revisão):**
- Lightbox da galeria: foco no botão fechar, armadilha de foco, `inert` no fundo e `overscroll-contain`; restaurar foco ao fechar.
- `LocationPanel`: trocar `role="img"` por `role="group"` (há botões dentro); `img` da galeria sem `onError`.
- Desempenho dos filtros: calcular um `Set` de ids que passam (uma vez), compartilhar materiais por estado e usar `useDeferredValue` na lista.
- `stepUnit` anda em ordem crescente enquanto a lista mostra andar decrescente; avisar quando nenhuma outra unidade passa no filtro.
- O slider de preço máximo deixa descobrir preços por bisseção (contradiz "revelar sob demanda"): decidir entre faixas nomeadas ou aceitar.
- Rótulos de 12 px no menu inferior (pequeno para totem); layout do menu sobre o painel da unidade abaixo de ~890 px.
- Galeria: trocar os renders provisórios pelos renders reais do empreendimento (remover metadados EXIF antes de publicar).
- Walk 3D e botão de captura de tela (ainda não implementados).
- Prédio: trocar a geometria procedural por GLB real quando existir (manter a interface de `Unit`); crédito e uso da imagem de referência a confirmar com o dono.

## 📌 Empreendimento de Referência: Flower Tower Camellia (Vizta)

Fonte: página do projeto em vizta.pt e brochura em PDF (dados públicos, sujeitos a conferência com o dono do projeto).

- **Local:** Leça da Palmeira, Porto (Portugal), junto ao mar; cerca de 20 min do Porto e 8 min a pé do centro de Leça.
- **Arquitetura:** OODA. **Torre de 21 pisos**; a página cita 133 apartamentos e a brochura, 134.
- **Tipologias (brochura):** T1 Studio, T1 Smart, T2 Smart e T2. **Penthouses duplex T3 e T4** (ainda à venda, com grandes terraços).
- **Comodidades:** varandas e terraços, estacionamento e arrecadações, pré-instalação para carregador elétrico, sala multiusos de condomínio (cowork, festas, reuniões), espaço fitness, lobby com duplo pé-direito, hortas e terraços comuns.
- **Plantas desenhadas:** o site e a brochura NÃO publicam plantas por tipologia, só renders de interiores mobiliados. As plantas da plataforma são procedurais e provisórias (T1 a T3).
- **Próximo passo combinado:** o dono do projeto enviará uma versão mobiliada das plantas para modelarmos em 3D na plataforma.
- **Decisão pendente:** alinhar as tipologias do inventário mockado às reais (hoje: 3 apartamentos por andar, T2/T3/T2, 22 andares, 66 unidades).

**Regras de interface definidas pelo dono do projeto:**
- Cores de status das unidades (disponível, reservado, vendido) **só aparecem quando o botão de marcar correspondente está ativo**; por padrão a fachada fica limpa e as unidades continuam clicáveis.
- As varandas formam um **tabuleiro de xadrez** de blocos em balanço (ver especificação do prédio acima); não são faixas contínuas.

## 🛋️ Apartamento Mobiliado em 3D (recorte isométrico)

O dono do projeto enviou a planta T3 com móveis desenhados e um exemplo de recorte isométrico 3D como referência de estilo. Implementado em `src/lib/apartment3d.ts` (gerador) e `src/components/apartment/Apartment3DView.tsx` (cena), com o botão **"Apartamento em 3D"** no painel da unidade.

- **Gerado a partir da planta da unidade** (`buildFloorPlan`), então funciona para T1, T2 e T3: paredes (fundos e lateral direita altas, lateral esquerda e divisórias em corte, portas), fachada de vidro com montantes finos, pisos de madeira com textura de tábuas (canvas, sem arquivo externo), deck da varanda, laje-base e mar à frente.
- **Mobília procedural por cômodo:** sala (TV, sofá em L, mesa de centro, tapete, jantar com aparador), cozinha aberta (bancadas, ilha com banquetas, geladeira), serviço, suíte e quartos (cama, criado-mudo, guarda-roupa, mesa de estudo), banho (bancada, vaso, box de vidro) e varanda (lounge, mesa, bananeiras).
- **Controles:** arrastar para girar, roda e pinça para zoom, botão de etiquetas (nomes e medidas dos cômodos), recentralizar e Esc para voltar.
- **Próximo passo:** o dono enviará a planta mobiliada das outras tipologias; trocar os móveis procedurais por modelos 3D (GLB) quando existirem e ajustar a disposição dos móveis a cada planta enviada.

## 🌆 Cena: Torre Única e Terreno a partir da Foto Aérea

- **Uma só torre** (`MAIN_TOWER`); as outras duas e `City.tsx` foram removidas.
- **Dimensões:** `FLOOR_HEIGHT=0.62`, núcleo 7,4 × 5,0; cada bloco de varanda tem 49% da altura do andar (`BLOCK_H`), para as portas de vidro aparecerem; células alternam em xadrez (há células e andares sem varanda).
- **Bairro** (`Terrain.tsx`, `src/data/terrain.ts`, `public/terrain/bairro.jpg` e `mar.jpg`): foto da maquete do bairro enviada pelo dono; o foguete marca a torre (pixel 330,727 = `TOWER_PIXEL`) e o azul grande é o mar. Mapeamento `photoToWorld(u,v)` com giro `ALPHA=27°` (avenida beira-mar paralela ao eixo x, mar em -z) e `S = 0,6 m/px × 0,62/3` unidades/px. O chão é a foto num plano girado, com a foto espelhada ao redor (plano externo) e o mar aberto à esquerda da borda (trecho `mar.jpg` repetido espelhado). A textura final (`bairro.jpg`, 1108×3998) é a foto sem o topo, com mar estendido à esquerda e a costa/avenida estendida ao norte e ao sul por cisalhamento e desfoque (sem espelho), para o mar nunca parecer um lago.
- **Prédios e árvores** foram detectados por cor (OpenCV: telhados laranja, bege e brancos → retângulos orientados, com divisão por watershed) e ficam em `BUILDINGS` (273 pegadas: u, v, largura, profundidade, ângulo, andares por área, cor do telhado) e `TREES` (214). Uma única `InstancedMesh` com shader: parede com janelas por UV em metros, telhado na cor da foto, janelas acesas à noite (`uNight`). As cópias espelhadas da foto também recebem prédios (`tilesFor`).
- **Reprodução:** o script de detecção ficou no scratchpad da sessão (não versionado); refazer com a mesma lógica se a foto mudar (retirar o foguete com inpaint e preencher as margens de madeira/branco espelhando o mar).
- **Pendências:** alturas dos prédios são estimadas pela área; foto em perspectiva (tratada como vista de cima); casas de telhado cinza-bege podem faltar; texturas de prédios iguais; confirmar direitos de uso da foto (manter repositório privado).
- **Localização exata do prédio (Google Maps do dono):** 41.201353, -8.708498 (Leça da Palmeira). Usar como centro do mapa em `Location`.

**Pendências da revisão do terreno/torre única (restantes):**
- Mar do terreno é só textura: sem cor do céu/reflexo no pôr do sol; a foto já tem luz embutida e ainda recebe sol (considerar material básico tingido); alturas das casas pequenas superestimadas; janelas acendem todas juntas.
- Foto do terreno não é liberada (`useLoader` guarda em cache); sem LOD nas árvores.
- Voo reto até a varanda ainda pode atravessar o núcleo (ver etapa 4).
- Resolvido: dispose de texturas/materiais, z-fighting (polygonOffset), ErrorBoundary + Suspense da foto com `BASE_URL`, sombra 2048/4096 por tela, chão estendido, estrelas, `distanceFactor` do rótulo, constantes de câmera em `lib/cameraConsts.ts`.

## 🧱 Fachada pelas fotos de referência e 3 apartamentos por andar

- **Posição da torre:** girada 90° (`MAIN_TOWER.rotation = -π/2`) e centrada no lote verde (pixel 342,712 da foto): o lado maior segue a rua transversal, a maior dimensão do lote; a empena do apartamento 1 aponta para o mar. A torre só aceita rotação via `TowerConfig` (poses de câmera e Window View já a consideram).
- **Inventário:** 3 apartamentos por andar em fila, do lado do mar ao lado da cidade (`UNITS_PER_FLOOR = 3`): Mar (T3, empena para o mar), Norte (T2, fachada para a costa), Leste (T2, empena para a cidade); 22 andares, 66 unidades. A grade de 9 colunas dá 3 colunas por apartamento (`unitSpan`, `unitBalcony`), então cada apartamento tem sempre ao menos um bloco de varanda.
- **Fachada** (fotos do dono, dia e pôr do sol): estuque areia quente; blocos de varanda maciços com **jardineira no topo do parapeito** (arbustos, flores e folhagem que cai pela frente) e guarda-corpo fino recuado; **janelas pequenas e fundas** com moldura bronze escura e montante central; porta de vidro no fundo de cada varanda; vidros refletem um ambiente gerado no código (`lib/roomEnv.ts`, sem HDR externo). Coroa: caixa de vidro com caixilhos e travessa de bronze, **pilares de concreto**, fascia escura de ripas, guarda-corpo, casa de máquinas e antena. Pódio: **pilotis quadrados de concreto**, marquise de madeira na entrada, praça de pedra com juntas.
- **Skill `3d-website-architect`** (deveshpunjabi, github.com/deveshpunjabi/3d-website-skill; o CLAUDE.md prevalece: stack Vite, sem instalar pacotes ou trocar de stack por causa dela) instalada em `.claude/skills/`; usada para: instanciar e compartilhar geometrias, ambiente de reflexo, carregamento sob demanda do 3D (`React.lazy` + `Suspense` + ErrorBoundary de WebGL em `App.tsx`).

## 🎥 Recursos vistos no vídeo do totem (segundo vídeo do dono)

- **Clima** (botão ao lado da engrenagem): céu limpo, nublado (nuvens instanciadas, sol mais fraco) e chuva (riscos animados, névoa fechada).
- **Engrenagem:** qualidade (DPR 1 ou até 2), unidade de área m²/ft² (`setAreaUnitFormat`) e idioma (só português por enquanto).
- **Canto inferior direito (só na vista aérea):** **Walk 3D** (tour automático com `autoRotate`, para no primeiro toque), **captura de tela** (PNG só da cena, `lib/capture.ts`) e **ajuda** (diálogo com os gestos).
- **Etiqueta da torre** ("Torre B · N disponíveis") em sprite sobre a coroa; **números dentro das lajes** quando um status está marcado e a câmera está perto.
- **Ainda não feito do vídeo:** cartão flutuante com a planta ligado à laje por uma linha; várias torres com letras A/B/C (o dono pediu só uma); caminhada em primeira pessoa de verdade.

**Pendências da revisão dos recursos do vídeo (restantes):**
- Rótulos de número nas lajes atravessam o prédio visto por trás (usar `occlude`); `roundRect` sem fallback em navegadores antigos; captura com `toBlob`, aviso e checagem de contexto perdido; PMREM sem dispose; nuvens cobrem a torre no zoom máximo e o céu fica azul na chuva.
- Diálogo de ajuda e configurações: `inert`, armadilha de foco, fechar ao tocar fora e devolver foco à engrenagem; `quality` não zera no reset de sessão (decidir regra).

## 🧭 Planta no prédio e gesto de três dedos

- **"Planta do apartamento"** abre o modo `floorplan`: a torre é cortada no pavimento da unidade (some tudo acima, o fuste é encurtado e a coroa sai) e as plantas dos **3 apartamentos do andar** aparecem sobre a laje (`FloorPlanLayer.tsx`), com paredes baixas em corte e os números dos vizinhos (tocar num vizinho troca a seleção); o **apartamento escolhido aparece mobiliado em 3D** (mesmo gerador do "Apartamento em 3D", `buildApartment3D(unit, size)` encaixado no trecho do pavimento, contorno azul e nomes dos cômodos). No andar cortado as varandas ficam **só com o piso** (sem paredes, guarda-corpo nem plantas) e as lajes do andar de cima não aparecem. No celular, o painel da unidade some na planta (a barra inferior tem as ações). A câmera voa para cima do pavimento (`CameraRig`, elevação 58°). Barra inferior: andar de baixo/cima, **Planta 2D** (a tela clara antiga, usada também para imprimir), **Em 3D** e **Voltar ao prédio** (Esc também volta).
- As plantas são as procedurais (`buildFloorPlan` com `size` = trecho do apartamento no pavimento): o site e a brochura não publicam plantas por tipologia; trocar pelas plantas reais quando o dono enviar.
- **Rolagem vertical como numa página** (`FloorSwipe.tsx`): no toque, **três dedos** arrastados para cima/baixo sobem e descem a câmera (o conteúdo acompanha os dedos; órbita e pinça param enquanto há três dedos); dois dedos continuam sendo pinça/zoom. No computador, **rolagem do trackpad ou roda do mouse** faz o mesmo, e **Ctrl + roda / pinça do trackpad** dá zoom. Na planta em corte, a rolagem troca de andar. Page Up / Page Down e os **botões ▲▼ à direita** (`FloorButtons.tsx`, via `lib/floorStep.ts`) sobem/descem um andar.
- O número do apartamento escolhido não flutua mais na cena (já está no painel); só o realce do mouse mostra etiqueta.
- **Celular e computador:** a câmera mira o centro da torre (`AERIAL_TARGET` na posição da torre) e o ângulo vertical fica **travado olhando para baixo** (`MOBILE_POLAR = 0,8 rad` em `minPolarAngle`/`maxPolarAngle`, na vista aérea e da unidade), para o horizonte não aparecer; girar em volta continua livre.
- **Arrastar para girar só começa fora do prédio** (`DragGuard.tsx`: raio no grupo `tower` no primeiro toque/clique; sobre a torre o giro fica desligado até soltar, o toque ainda escolhe o apartamento e a pinça dá zoom). Na varanda e na planta em corte o arrasto continua livre.
