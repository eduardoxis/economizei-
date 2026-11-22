# Economizei+ (web)

Versão web inicial. Front-end em React + Vite + TypeScript, dados no Supabase (PostgreSQL).

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com a URL e a chave anon do seu projeto Supabase
npm run dev
```

## Banco

Execute `supabase/schema.sql` no SQL Editor do Supabase. Ele cria as tabelas `fuel_prices` e `import_runs` com RLS: leitura pública, escrita apenas com `service_role`.

## Testes e build

```bash
npm test
npm run build
```

## Deploy (Cloudflare Pages)

- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

## Limitações conhecidas

- Não há importador da ANP ainda. Sem dados em `fuel_prices`, o app mostra estados vazios.
- Não há mapa nem geolocalização; a busca é por UF e município.
- Não há autenticação, favoritos, histórico de abastecimentos nem eletropostos.
- Não há tela de termos de uso, política de privacidade nem aceite de LGPD. Isso é obrigatório antes de publicar preços colaborativos.
- Os cálculos são estimativas e não substituem a confirmação do preço no posto.
