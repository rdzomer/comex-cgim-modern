# COMEX CGIM Modern

Projeto reconstruído do zero para análise por cestas CGIM.

## Foco
- interface única por cesta CGIM
- carregamento instantâneo por snapshots offline em `public/static_data`
- leitura do dicionário em `public/dictionaries/cgim_dinte.xlsx`
- arquitetura preparada para atualização incremental via API do Comex Stat

## Como rodar
```bash
npm install
npm run dev
```

## Observação importante
Esta versão já é funcional com a base offline e com o dicionário real. A camada de atualização incremental foi preparada e possui fallback anual para o ano corrente, mas ainda pode ser aprofundada depois para um merge mensal fino caso você queira usar a API com maior granularidade.
