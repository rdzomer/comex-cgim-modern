# COMEX CGIM — README DEV

## 📌 Visão Geral

O COMEX CGIM é um dashboard web desenvolvido em React (Vite) para análise de dados de comércio exterior brasileiro por cestas setoriais (agrupamentos de NCMs).

Objetivos:
- Ser extremamente rápido
- Operar majoritariamente offline
- Permitir análise flexível por diferentes níveis de agregação
- Servir como ferramenta institucional (MDIC / CGIM)

---

## 🧠 Conceito Central

O app NÃO depende de API em tempo real.

Ele funciona com base em snapshots locais em JSON, carregados dinamicamente.

Isso permite:
- carregamento instantâneo
- uso offline
- previsibilidade total dos dados

---

## 🏗️ Arquitetura Geral

Stack:
- React (Vite)
- JavaScript
- Recharts
- Dados locais (JSON)

Estrutura:

src/
  components/
  services/
  utils/

public/
  static_data/
    manifest.json
    data_ENTIDADE_ANO.json

---

## 📊 Modelo de Dados

### Manifest

Arquivo:
public/static_data/manifest.json

Responsável por:
- listar entidades disponíveis
- mapear arquivos por entidade e ano

Exemplo:

{
  "entities": ["ABAL", "IBA", "IABR"],
  "snapshots": {
    "IBA": [
      { "year": 2023, "file": "data_IBA_2023.json" }
    ]
  }
}

---

### Snapshots

Formato:
data_ENTIDADE_ANO.json

Contêm:
- dados por NCM
- categorias
- subcategorias
- FOB, KG, preço médio

---

## ⚠️ REGRA CRÍTICA

Entidades devem ser canônicas (SEM ACENTO)

Exemplo:
UI: IBÁ
Sistema: IBA

Nunca usar:
- IBÁ em arquivos
- IB#U00c1

Sempre usar:
- IBA

---

## ⚙️ Serviços

cgimOfflineSnapshotService:
- carrega manifest
- resolve arquivos
- faz fetch dos dados

cgimDictionaryService:
- mapeia NCM → categoria → subcategoria

---

## 📈 Funcionalidades

Filtros:
- entidade
- ano
- fluxo
- categoria
- subcategoria
- agregação

KPIs:
- FOB
- KG
- US$/ton

Gráficos:
- top categorias
- evolução anual
- preço médio
- evolução por subcategoria

Tabela:
- hierárquica
- expansível

---

## 🚧 Problemas Já Enfrentados

1. Manifest inválido
Causa: erro de JSON

2. IBÁ quebrando sistema
Causa: encoding inconsistente

3. Vite retornando HTML
Causa: arquivo não encontrado

4. Erros de import/export
Causa: export incorreto

5. Tela branca
Causa: erro JS não tratado

---

## 🎯 Princípios

- Performance (offline)
- Robustez
- Flexibilidade
- UX moderna

---

## 🚀 Roadmap

Curto prazo:
- melhorar gráficos
- melhorar tabela

Médio prazo:
- cache
- exportação

Longo prazo:
- deploy
- multiusuário

---

## 🧪 Boas Práticas

- validar JSON
- não usar acentos em código
- seguir padrão data_ENTIDADE_ANO
- evoluir incrementalmente

---

## 🧠 Instruções para IA

- não reescrever tudo
- não quebrar funcionalidades
- trabalhar incrementalmente

---

## 👤 Contexto

- usuário não é dev profissional
- prefere código completo
- projeto real (MDIC)

---

## 🏁 Conclusão

Projeto já possui base sólida.
Foco agora é evolução com qualidade e estabilidade.
