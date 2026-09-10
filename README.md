# Catalogo de materiais

App real (frontend + backend + banco de dados), feito pra substituir o
prototipo de arquivo unico. Guarda os 8.062 itens da planilha, as fotos
reais que a equipe tirar, e as referencias sugeridas que ainda precisam
de confirmacao.

## Arquitetura

- **Frontend + backend**: um projeto Next.js so. As paginas ficam em
  `app/`, e as rotas de API (o "backend") ficam em `app/api/*`. Isso
  roda tudo na Vercel sem precisar de um servidor separado.
- **Banco de dados**: Postgres (Vercel Postgres), com 4 tabelas:
  - `items` - os 8.062 itens (codigo, id do sistema, descricao)
  - `photos` - foto real confirmada pela equipe (a fonte confiavel)
  - `reference_notes` - referencia sugerida por busca na web (foto,
    nota, nivel de confianca), ainda sem confirmacao
  - `reviews` - decisao "sim"/"nao" de quem confirmou uma referencia
- **Fotos**: guardadas no Vercel Blob (storage de arquivos), nao no
  banco - o banco so guarda o endereco (URL) de cada foto.

## Passo a passo pra colocar no ar

### 1. Criar o repositorio no GitHub

Suba esta pasta inteira para um repositorio novo no GitHub (pelo site
do GitHub, "Create repository" e depois "uploading an existing file",
ou via `git init` / `git push` se preferir linha de comando).

### 2. Criar o projeto na Vercel

1. Entre em vercel.com, "Add New" > "Project" e importe o repositorio
   do GitHub que voce acabou de criar.
2. Deixe as configuracoes padrao (a Vercel reconhece Next.js
   automaticamente) e clique em "Deploy". O primeiro deploy vai
   funcionar parcialmente (sem banco ainda) - normal.

### 3. Conectar o banco de dados

1. No projeto na Vercel, va em "Storage" > "Create Database" >
   escolha "Postgres".
2. Depois de criado, a Vercel conecta as variaveis de ambiente
   automaticamente no seu projeto (`POSTGRES_URL` etc).

### 4. Conectar o armazenamento de fotos

1. Ainda em "Storage" > "Create Store" > escolha "Blob".
2. Conecte ao mesmo projeto - a variavel `BLOB_READ_WRITE_TOKEN` e
   adicionada automaticamente.

### 5. Importar a planilha (rodar uma vez)

Isso cria as tabelas e carrega os 8.062 itens + as referencias ja
pesquisadas.

No seu computador, dentro da pasta do projeto:

```
npm install
vercel env pull .env
npm run seed
```

(`vercel env pull` baixa as variaveis de ambiente do projeto da
Vercel para rodar o seed localmente, apontando para o banco de
producao.)

### 6. Pronto

A cada novo lote de referencias que eu (Claude) buscar, basta
atualizar `data/reference_notes.json` e rodar `npm run seed` de novo -
ele atualiza sem duplicar.

## Rodando localmente pra testar

```
npm install
vercel env pull .env
npm run dev
```

Abre em `http://localhost:3000`.
