# KAOT – servidor multiplayer

Este servidor entrega o jogo e conecta os jogadores da mesma sala.
Qualquer pessoa abre o endereço no navegador, sem precisar de conta no Claude.

## Publicar no Render (grátis)

1. Crie uma conta em https://github.com e um repositório novo (ex.: `kaot`).
2. No repositório, clique em **Add file → Upload files** e envie TUDO desta pasta
   (`server.js`, `package.json`, `render.yaml`, `LEIA-ME.md` e a pasta `public` com o `index.html`).
3. Crie uma conta em https://render.com entrando com o GitHub.
4. Clique em **New → Web Service**, escolha o repositório `kaot` e preencha:
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: **Free**
5. Clique em **Deploy**. Em 1 a 3 minutos aparece o endereço, algo como `https://kaot.onrender.com`.
6. Mande esse endereço para os amigos. Um cria a sala, os outros entram com o código.

## Bom saber

- No plano grátis o servidor "dorme" depois de 15 minutos sem ninguém jogando.
  O primeiro acesso depois disso demora uns 50 segundos para abrir. Enquanto há gente jogando, ele fica acordado.
- Máximo de 8 jogadores por sala.
- Para atualizar o jogo, troque o `public/index.html` no GitHub. O Render publica sozinho.

## Testar no seu computador (opcional)

Com o Node.js instalado: `npm install` e depois `npm start`. Abra http://localhost:3000
