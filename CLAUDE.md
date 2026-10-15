# CLAUDE.md - Guia de Desenvolvimento: Plataforma Imobiliária 3D Interativa (Vendas na Planta)

## 🏢 Visão Geral do Projeto

Aplicação web de alto padrão voltada para o lançamento e comercialização de empreendimentos imobiliários na planta. A interface simula um software interativo de vendas de alta performance (estilo stand de vendas digital/touchscreen e web).

## 🛠️ Stack Tecnológica Recomendada

- **Framework front-end:** React.js / Next.js (App Router) ou Vite + React.
- **Estilização:** Tailwind CSS com classes personalizadas para efeitos de glassmorphism e temas de luxo.
- **Gráficos 3D:** Three.js / React Three Fiber (R3F) / @react-three/drei, com fallback em 2D/isométrico caso o dispositivo não suporte WebGL pesado.
- **Ícones:** Lucide React.
- **Gerenciamento de estado:** Zustand ou React Context (apartamento selecionado, horário do dia, filtros e modo de visualização atual).

## 📐 Funcionalidades e Requisitos Principais

### 1. Visualizador 3D Principal (Canvas / Isométrico)

- **Modelo 3D:** exibição dos edifícios do empreendimento com navegação 30°/360°, zoom e rotação suave.
- **Controle de iluminação / horário do dia (Time of Day):**
  - Barra deslizante superior com ícones: Amanhecer, Dia/Sol pleno, Pôr do sol/Golden Hour, Noite com janelas iluminadas.
  - Atualização dinâmica das sombras, céu e iluminação da cena 3D conforme o slider.
- **Hotspots e status das unidades:**
  - Camada interativa sobre o prédio indicando o status por cor (Disponível = Azul/Verde, Reservado = Amarelo, Vendido = Vermelho).
  - Clique direto na unidade ou pavimento abre os detalhes.

### 2. Painel de Detalhes da Unidade (Modal / Drawer Lateral)

- Exibido ao selecionar uma unidade (ex.: Apartamento B1804, 18º andar, 2 quartos, 142,55 m², preço dinâmico).
- **Planta baixa (blueprint):** visualização técnica 2D com medidas e divisão de cômodos.
- **Ações disponíveis:**
  - Botão "Window View" (simulação de vista da janela/varanda).
  - Botão "Print / Download Blueprint".
  - Botão "Compare Unit".
  - Botão "Schedule / Contact".

### 3. Modo "Window View" (Simulação Imersiva da Varanda)

- Transição de câmera para primeira pessoa (ponto de vista da varanda do apartamento escolhido).
- Panorama externo realista (paisagem urbana, mar, horizonte).
- O controle de horário do dia continua ativo, permitindo ver o pôr do sol da sacada simulada.
- Botão "Back to Apartment" retorna à maquete geral.

### 4. Menu de Navegação Inferior (Glassmorphism Toolbar)

- **Apartments:** filtros avançados por preço, tamanho (m²), número de quartos e disponibilidade.
- **Compare:** matriz comparativa lado a lado das unidades selecionadas.
- **Location:** mapa interativo com pontos de interesse (praia, comércio, escolas, acessos).
- **Gallery:** galeria de renders fotorrealistas e vídeos do projeto.
- **Highlights:** diferenciais arquitetônicos, lazer, sustentabilidade e comodidades.

## 🎨 Diretrizes de UI/UX & Design System

- **Estética:** luxo, sofisticação, minimalismo moderno.
- **Cores:** tons escuros profundos (`#0A0F1D`, `#111827`), detalhes em branco e cinza claro, acentos em azul corporativo/dourado sutil.
- **Efeitos:** vidro fosco (glassmorphism), transições fluidas e modais flutuantes limpos.
- **Responsividade:** totalmente adaptado a telas touch de grandes dimensões (kiosks de stands de vendas), desktops e dispositivos móveis.

## 💻 Padrões de Código

- **Componentização:** componentes limpos, modulares e reutilizáveis.
- **Organização:** código organizado, com componentes funcionais React e Hooks modernos (`useState`, `useMemo`, `useCallback`).
- **Simulações e mocks:** dados mockados estruturados para o inventário de apartamentos (andares, blocos, preços, status e metadados), para que a aplicação seja totalmente interativa de imediato.
