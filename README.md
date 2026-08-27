# Filter

Aplicação web em tempo real que transforma as mãos do usuário em uma "janela
virtual" sobre o vídeo da câmera. O formato da janela e o filtro visual
aplicado dentro dela são controlados por gestos das mãos e por piscadas de
olho, usando [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
(`HandLandmarker` e `FaceLandmarker`) carregado via CDN — sem build, sem
dependências instaladas.

## Como funciona

- **Mão esquerda** controla o formato da janela:
  - 1 dedo: retângulo fixo no centro (tamanho pela distância entre as mãos)
  - 2 dedos: quadrilátero livre, ancorado nas pontas do indicador e do
    polegar de cada mão
  - 3 dedos: tela toda
- **Mão direita** controla o filtro aplicado dentro da janela:
  - 1 dedo: inversão de cores
  - 2 dedos: preto e branco de alto contraste
  - 3 dedos: neon / rotação de matiz
  - 4 dedos: espelhamento / divisão de imagem
- **Piscar os dois olhos** cicla para o próximo filtro quando a mão direita
  não está mostrando um gesto explícito.
- Botão para alternar entre câmera frontal e traseira em celulares.

## Rodando localmente

Como o app importa módulos ES e pede acesso à câmera, precisa ser servido
via HTTP(S), não aberto direto como arquivo:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

## Publicando no GitHub Pages

Em **Settings → Pages**, selecione **Deploy from a branch**, escolha o
branch `main` e a pasta `/ (root)`. O app ficará disponível em
`https://<usuário>.github.io/<repositório>/`. Não é necessário nenhum passo
de build.

## Arquivos

- `index.html` — estrutura da página
- `style.css` — layout responsivo (mobile-first)
- `script.js` — captura de câmera, rastreamento de mãos/rosto, gestos e
  renderização dos filtros no canvas
