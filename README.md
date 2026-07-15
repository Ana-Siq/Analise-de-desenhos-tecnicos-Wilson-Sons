# Conciliação de Planilhas e Desenhos via IA
### Projeto Final | Power Developers — Kodie Academy

Automação que lê desenhos técnicos de construção naval (PDF ou imagem), extrai a lista de materiais usando Inteligência Artificial e compara com o estoque do almoxarifado, notificando o resultado por e-mail e em tempo real no site do projeto.

---

## 📋 Descrição do Desafio

O desafio consiste em automatizar a transformação de desenhos técnicos em uma lista técnica de materiais.

**Contexto atual:** hoje essa atividade exige a consulta e o preenchimento manual de planilhas — um trabalho repetitivo e sujeito a erro humano.

**Objetivo:** aplicar Inteligência Artificial para extrair automaticamente a lista de materiais contida no desenho e comparar com o *jobbook* (planilha que relaciona todos os materiais que serão enviados pelo projetista), identificando e sinalizando instantaneamente se todos os materiais necessários estão sendo enviados.

**Escopo:** para manter o projeto factível, a solução não abrange um navio inteiro — está restrita à disciplina de estrutura/tubulação, usando uma amostra reduzida dos desenhos do setor escolhido e uma versão de teste do jobbook (dados fictícios, sem violar a confidencialidade dos projetos reais).

---

## 🏗️ Arquitetura da Solução

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Site       │─────▶│  Google      │      │  Make.com        │
│  (Lovable)   │      │  Drive       │      │  (Webhook)        │
│  upload do   │      │  (armazena   │      │  dispara na hora  │
│  desenho     │      │  o arquivo)  │      │  do upload        │
└─────────────┘      └──────────────┘      └────────┬──────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │  Google Drive          │
                                          │  Get a File             │
                                          │  (baixa o binário)     │
                                          └───────────┬───────────┘
                                                      ▼
                                          ┌───────────────────────┐
                                          │  Gemini API             │
                                          │  (gemini-2.5-flash)     │
                                          │  Extrai lista de        │
                                          │  materiais em JSON      │
                                          └───────────┬───────────┘
                                                      ▼
                                          ┌───────────────────────┐
                                          │  JSON Parse             │
                                          └───────────┬───────────┘
                                                      ▼
                                          ┌───────────────────────┐
                                          │  Iterator               │
                                          │  (1 volta por material) │
                                          └───────────┬───────────┘
                                                      ▼
                                          ┌───────────────────────┐
                                          │  Google Sheets          │
                                          │  Search Rows            │
                                          │  (busca no jobbook/      │
                                          │  almoxarifado)          │
                                          └───────────┬───────────┘
                                                      ▼
                                    ┌─────────────────┴─────────────────┐
                                    ▼                                   ▼
                        ┌───────────────────┐               ┌───────────────────────┐
                        │  Text Aggregator    │               │  Create JSON            │
                        │  (monta tabela HTML)│               │  (monta payload final)  │
                        └─────────┬─────────┘               └───────────┬───────────┘
                                  ▼                                     ▼
                        ┌───────────────────┐               ┌───────────────────────┐
                        │  Gmail              │               │  HTTP → Supabase        │
                        │  Envia e-mail com   │               │  Edge Function          │
                        │  relatório completo │               │  (Realtime Broadcast)   │
                        │  (histórico)        │               └───────────┬───────────┘
                        └───────────────────┘                             ▼
                                                              ┌───────────────────────┐
                                                              │  Site (Lovable)         │
                                                              │  Modal exibe resultado  │
                                                              │  em tempo real          │
                                                              └───────────────────────┘
```
---

## PDF com prints da aplicação 
 [Prints das telas do projeto desafio 1 funcionando.pdf](https://github.com/Ana-Siq/Analise-de-desenhos-tecnicos-Wilson-Sons/blob/main/docs/Prints%20das%20telas%20do%20projeto%20desafio%201%20funcionando.pdf)
---

## PROMPT UTILIZADO PARA CRIAR A INTERFACE DO LOVABLE
[Prompt utilizado para criar a interface do Lovable.PDF](https://github.com/Ana-Siq/Analise-de-desenhos-tecnicos-Wilson-Sons/blob/main/docs/Prompt%20utilizado%20para%20criar%20a%20interface%20do%20Lovable.pdf)
---

---


## ⚙️ Como funciona (passo a passo)

1. **Upload:** o usuário envia o desenho técnico (PDF ou imagem) pelo site, que já sobe o arquivo para uma pasta no Google Drive.
2. **Disparo instantâneo:** assim que o upload termina, o site chama um **Webhook do Make**, informando o ID, nome e tipo do arquivo — sem depender de checagem periódica (polling).
3. **Download:** o Make baixa o arquivo do Drive.
4. **Extração via IA:** o arquivo é enviado (em base64) para a **API do Google Gemini**, com um prompt que instrui o modelo a atuar como engenheiro naval e devolver, em JSON estruturado, a lista de materiais do desenho (tipo, especificação, dimensões, quantidade necessária, unidade e código de referência).
5. **Parse:** a resposta da IA é interpretada e transformada em um array de materiais.
6. **Iteração:** o Make percorre cada material extraído, um por vez.
7. **Comparação com o estoque:** para cada material, o Make busca na planilha do Google Sheets (Almoxarifado/Jobbook) a quantidade disponível pelo código de referência.
8. **Agregação:** os resultados de todos os materiais são reunidos em:
   - uma **tabela HTML** colorida (verde = em estoque, vermelho = comprar), usada no e-mail;
   - um **JSON estruturado**, usado no envio ao site.
9. **Notificação dupla:**
   - **E-mail** (Gmail): relatório completo enviado automaticamente, servindo como **registro histórico** da análise.
   - **Site (Lovable/Supabase Realtime):** o mesmo resultado é transmitido via *Broadcast* para quem estiver com a tela aberta, sem persistir em banco — é apenas uma visualização instantânea do processamento.

---

## 🧩 Tecnologias utilizadas

| Camada | Ferramenta |
|---|---|
| Frontend / upload | [Lovable.dev](https://lovable.dev) |
| Armazenamento de arquivos | Google Drive |
| Orquestração / automação | [Make.com](https://make.com) |
| Arquivo com configurações [Make.com](https://make.com) | [Importe para o Make - Analise de Desenhos Tecnicos.blueprint.json](https://raw.githubusercontent.com/Ana-Siq/Analise-de-desenhos-tecnicos-Wilson-Sons/refs/heads/main/docs/Importe%20para%20o%20Make%20-%20Analise%20de%20Desenhos%20Tecnicos.blueprint.json) |
| Extração de dados (IA/Visão) | Google Gemini API (`gemini-2.5-flash`) |
| Banco de materiais / estoque | Google Sheets |
| Notificação em tempo real | Supabase Edge Functions + Realtime Broadcast |
| Notificação de histórico | Gmail |

---

## 🔐 Segurança e Confidencialidade

- Como as especificações técnicas de construção naval são confidenciais e os desenhos possuem direitos autorais, o projeto utiliza **desenhos de teste fictícios**, sem dados reais de embarcações.
- A chave da API do Gemini é mantida apenas na configuração do módulo HTTP do Make, nunca exposta no frontend.
- A comunicação com o site não expõe nenhuma credencial: a Edge Function do Supabase recebe os dados via endpoint próprio, sem necessidade de chave de API no lado do Make.

---

## 🚀 Como testar

1. Acesse a aplicação publicada: https://cad-checkmate.lovable.app
2. Faça upload de um desenho técnico de teste (PDF ou imagem) contendo uma lista de materiais legível
3. Acompanhe o modal de carregamento na tela — ele exibirá o resultado assim que o Make finalizar o processamento
4. Um e-mail com o relatório completo também será enviado automaticamente para o e-mail configurado no cenário

---

## 📌 Limitações conhecidas

- O processamento depende da qualidade/legibilidade do desenho para que a IA extraia os dados corretamente.
- Como o resultado em tempo real no site usa *Broadcast* (sem persistência), ele só é exibido para quem estiver com a página aberta no momento do processamento — o e-mail é a única fonte de histórico permanente.
- O escopo do projeto é restrito à disciplina de estrutura/tubulação naval, não cobrindo a totalidade de sistemas de uma embarcação.

---

## 👤 Autor

Projeto desenvolvido individualmente como parte do desafio 1 "Conciliação de Planilhas e Desenhos via IA" — Kodie Academy, turma Power Developers.
