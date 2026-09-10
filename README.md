# Catalogo de materiais

App real (frontend + backend + banco de dados), feito pra substituir o
prototipo de arquivo unico. Guarda os 8.062 itens da planilha, as fotos
reais que a equipe tirar, e as referencias sugeridas que ainda precisam
de confirmacao.

## Arquitetura

- **Frontend + backend**: um projeto Next.js so. As paginas ficam em
  `app/`, e as rotas de API (o "backend") ficam em `app/api/*`. Roda
  tudo na Netlify, sem precisar de servidor separado.
- **Banco de dados**: Postgres, via Neon (neon.tech - free tier).
  4 tabelas:
  - `items` - os 8.062 itens (codigo, id do sistema, descricao)
  - `photos` - foto real confirmada pela equipe (a fonte confiavel)
  - `reference_notes` - referencia sugerida por busca na web (foto,
    nota, nivel de confianca), ainda sem confirmacao
  - `reviews` - decisao "sim"/"nao" de quem confirmou uma referencia
- **Fotos**: guardadas no Netlify Blobs (armazenamento de arquivos
  embutido na propria Netlify, sem precisar de conta em outro lugar).
  O banco so guarda o caminho de cada foto, nao o arquivo.

## Passo a passo pra colocar no ar

### 1. Criar o banco de dados (Neon)

1. Entre em neon.tech e crie uma conta gratuita (ou faca login com
   GitHub).
2. Crie um projeto novo - ele ja vem com um banco Postgres pronto.
3. Na tela do projeto, copie a "Connection string" (algo como
   `postgresql://usuario:senha@ep-xxxx.neon.tech/neondb`). Guarde esse
   endereco, voce vai precisar dele duas vezes: no passo 3 e no passo 4.

### 2. Subir o projeto no GitHub

Suba esta pasta inteira para um repositorio (voce ja fez isso, se
estiver seguindo a partir do repositorio catalogo-materiais).

### 3. Criar o site na Netlify

1. Entre em app.netlify.com (mesma conta do SIRS) e clique em
   "Add new site" > "Import an existing project".
2. Escolha "GitHub" e selecione o repositorio catalogo-materiais.
3. Nas configuracoes de build, deixe como esta (a Netlify detecta o
   plugin do Next.js pelo arquivo netlify.toml automaticamente).
4. Antes de clicar em "Deploy", va em "Add environment variables" e
   adicione:
   - Nome: `DATABASE_URL`
   - Valor: a connection string que voce copiou do Neon no passo 1
5. Clique em "Deploy site".

### 4. Importar a planilha (rodar uma vez, no seu computador)

Isso cria as tabelas e carrega os 8.062 itens + as referencias ja
pesquisadas, direto no banco do Neon.

No seu computador, dentro da pasta do projeto:

```
npm install
```

Crie um arquivo chamado `.env` (copie de `.env.example`) e cole a
mesma connection string do Neon na linha `DATABASE_URL=`.

Depois rode:

```
npm run seed
```

### 5. Pronto

A cada novo lote de referencias que eu (Claude) buscar, basta
atualizar `data/reference_notes.json` e rodar `npm run seed` de novo -
ele atualiza sem duplicar.

## Rodando localmente pra testar

```
npm install
npm run dev
```

Abre em `http://localhost:3000`. As fotos enviadas localmente ficam
salvas no Netlify Blobs "de teste" do seu computador - quando o site
estiver no ar de verdade, as fotos da equipe ficam no Blobs de
producao, separado.
