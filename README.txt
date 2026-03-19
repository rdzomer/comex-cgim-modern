# COMEX CGIM — README DEV

## 📌 Visão Geral

O **COMEX CGIM** é um dashboard web desenvolvido em React (Vite) para análise de dados de comércio exterior brasileiro por **cestas setoriais** (agrupamentos de NCMs).

O sistema foi projetado para:

- Ser **extremamente rápido**
- Operar **majoritariamente offline**
- Permitir análise flexível por diferentes níveis de agregação
- Servir como ferramenta para análise institucional (MDIC / CGIM)

---

## 🧠 Conceito Central

O app NÃO depende de API em tempo real.

Ele funciona com base em:

👉 **Snapshots locais em JSON**, carregados dinamicamente

Isso permite:
- carregamento instantâneo
- zero dependência de backend
- uso offline
- previsibilidade total dos dados

---

## 🏗️ Arquitetura Geral

### 🔹 Stack

- React (Vite)
- JavaScript (sem TypeScript por enquanto)
- Recharts (gráficos)
- Dados locais (JSON)

---

### 🔹 Estrutura de Pastas
