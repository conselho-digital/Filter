/** Conteúdo ilustrativo (mock) de Localização, Destaques e Galeria. Trocar pelos dados reais do empreendimento. */

export interface Poi {
  id: string
  name: string
  category: 'praia' | 'comercio' | 'educacao' | 'saude' | 'transporte'
  km: number
  /** minutos a pé ou de carro, já formatado */
  time: string
  /** posição no mapa estilizado, em % (x, y) */
  pos: [number, number]
}

export const POIS: Poi[] = [
  { id: 'praia', name: 'Praia', category: 'praia', km: 0.3, time: '4 min a pé', pos: [50, 14] },
  { id: 'shopping', name: 'Shopping', category: 'comercio', km: 1.2, time: '4 min de carro', pos: [78, 48] },
  { id: 'escola', name: 'Escola bilíngue', category: 'educacao', km: 0.8, time: '10 min a pé', pos: [22, 52] },
  { id: 'hospital', name: 'Hospital', category: 'saude', km: 2.1, time: '7 min de carro', pos: [84, 78] },
  { id: 'metro', name: 'Estação de metrô', category: 'transporte', km: 1.5, time: '5 min de carro', pos: [16, 80] },
  { id: 'mercado', name: 'Supermercado', category: 'comercio', km: 0.6, time: '8 min a pé', pos: [66, 34] },
]

export interface Highlight {
  id: string
  title: string
  group: 'Arquitetura' | 'Lazer' | 'Sustentabilidade' | 'Comodidades'
  text: string
}

export const HIGHLIGHTS: Highlight[] = [
  { id: 'fachada', group: 'Arquitetura', title: 'Fachada em lajes onduladas', text: 'Varandas curvas e sobrepostas que dão movimento à torre e sombreiam as fachadas.' },
  { id: 'vista', group: 'Arquitetura', title: 'Vista livre para o mar', text: 'Apartamentos orientados para o litoral, com varandas amplas e pé-direito generoso.' },
  { id: 'piscina', group: 'Lazer', title: 'Piscina e deck', text: 'Piscina iluminada no térreo, com deck, solário e paisagismo.' },
  { id: 'fitness', group: 'Lazer', title: 'Fitness e bem-estar', text: 'Academia equipada, espaço de yoga e área gourmet para eventos.' },
  { id: 'solar', group: 'Sustentabilidade', title: 'Energia solar nas áreas comuns', text: 'Painéis fotovoltaicos reduzem o consumo de energia do condomínio.' },
  { id: 'agua', group: 'Sustentabilidade', title: 'Reúso de água', text: 'Captação e reaproveitamento de água da chuva para irrigação e limpeza.' },
  { id: 'seguranca', group: 'Comodidades', title: 'Segurança 24 h', text: 'Portaria com controle de acesso, monitoramento e acesso por biometria.' },
  { id: 'garagem', group: 'Comodidades', title: 'Garagem com carregador elétrico', text: 'Vagas cobertas e infraestrutura para carros elétricos.' },
]

export interface GalleryImage {
  id: string
  src: string
  title: string
  alt: string
}

export const GALLERY: GalleryImage[] = [
  { id: 'aereo-dia', src: '/gallery/aereo-dia.jpg', title: 'Vista aérea, dia', alt: 'Vista aérea do empreendimento durante o dia, com o mar ao fundo' },
  { id: 'aereo-poente', src: '/gallery/aereo-poente.jpg', title: 'Vista aérea, pôr do sol', alt: 'Vista aérea do empreendimento ao pôr do sol' },
  { id: 'aereo-noite', src: '/gallery/aereo-noite.jpg', title: 'Vista aérea, noite', alt: 'Vista aérea do empreendimento à noite, com as janelas acesas' },
  { id: 'torre', src: '/gallery/torre.jpg', title: 'A torre', alt: 'Fachada da torre principal com os apartamentos' },
  { id: 'varanda-dia', src: '/gallery/varanda-dia.jpg', title: 'Varanda, vista para o mar', alt: 'Vista do mar e da praia a partir da varanda, durante o dia' },
  { id: 'torre-poente', src: '/gallery/torre-poente.jpg', title: 'A torre, pôr do sol', alt: 'Fachada da torre com os blocos de varanda ao pôr do sol' },
  { id: 'apartamento-t3-3d', src: '/gallery/apartamento-t3-3d.jpg', title: 'Apartamento T3 mobiliado (3D)', alt: 'Recorte isométrico em 3D do apartamento T3 mobiliado, com varanda para o mar, sala, cozinha, suíte e dois quartos' },
]
