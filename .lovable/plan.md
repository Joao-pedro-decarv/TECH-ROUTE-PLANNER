# Expansão do Sistema — Permissões, OS avançada e Relatórios

## 1. Permissões granulares por módulo

- Novo papel **`admin`** (gestor total) além de `gestor` e `tecnico`. O primeiro usuário do sistema vira `admin`.
- Nova tabela `user_module_permissions (user_id, module, can_view, can_edit)` cobrindo: `clientes`, `equipamentos`, `modelos`, `pecas`, `problemas`, `os`, `rota`, `preventivas`, `reducao`, `rendimento`, `tecnicos`, `dashboard`, `conferencia`, `permissoes`.
- Tela **Usuários & Permissões** (só `admin`): matriz de checkboxes por usuário × módulo. `admin` sempre vê tudo; demais respeitam a matriz.
- Sidebar e guards de rota filtram pelos módulos permitidos.

## 2. Novos tipos de OS

Adiciono `REINCIDENTE` e `MAU_USO` aos tipos existentes (PREVENTIVA, START, ESTOQUE, NORMAL).

## 3. Fluxo de peças com aprovação (na criação da OS)

Ao selecionar **modelo/equipamento + problema** no formulário da OS, o sistema busca as peças vinculadas ao problema e abre um **questionário/modal**: cada peça aparece com checkbox marcado por padrão + quantidade editável, e uma pergunta "Adicionar esta peça à OS?". O gestor confirma quais entram. Só as confirmadas viram itens em `os_pecas` (status `aprovada`). Depois, na rota do dia, o técnico ajusta as quantidades efetivamente usadas.

## 4. Finalização de OS (bloco separado)

Ao clicar **Finalizar OS**, abre painel de finalização com:
- Data/hora de finalização
- Resultado: **OK c/peça | OK s/peça | Necessário retorno**
- Custo (opcional)
- Tempo de deslocamento (min)
- Tempo de execução (min)
- Observações finais
- **Se o tipo da OS for `MAU_USO`**, o painel de finalização exibe o bloco extra obrigatório:
  - Peça danificada foi trocada? (sim/não/parcial)
  - Qual defeito?
  - Como ocorreu?
  - Responsável pelo mau uso
  - Contato (opcional)

OS com resultado **Necessário retorno** vai para a nova aba **Conferência / Fechamento** (status `em_conferencia`); as demais viram `finalizada`.

## 5. Valor da hora técnica

Novo campo `valor_hora` em `profiles`, editável pelo gestor na aba **Técnicos**. Fica disponível para estatísticas futuras (custo × hora × deslocamento).

## 6. Histórico por equipamento

Nova tela **Equipamento → Histórico**: lista cronológica de todas as OS/preventivas do patrimônio, com peças usadas, técnico, resultado, tempos e custo. Botão **Baixar PDF/Excel** do histórico completo.

## 7. Relatório técnico da OS

Botão **Relatório Técnico (PDF)** em cada OS finalizada: documento formatado com cabeçalho, cliente, equipamento, problema, peças trocadas, serviço realizado, tempos, resultado e assinatura — pronto para entregar ao cliente.

## Detalhes técnicos

- Migrações Postgres: papel `admin`; nova tabela `user_module_permissions` + função `can_access_module`; colunas em `ordens_servico` (`resultado`, `custo`, `tempo_deslocamento_min`, `tempo_execucao_min`, `finalizada_em`, `mau_uso_troca`, `mau_uso_defeito`, `mau_uso_como_ocorreu`, `mau_uso_responsavel`, `mau_uso_contato`); `status` ganha `em_conferencia` e `finalizada`; `os_pecas.status` (`aprovada`/`usada`/`descartada`); `profiles.valor_hora`. RLS via `has_role` + `can_access_module`.
- Frontend: rota `/permissoes`, rota `/equipamentos/$id/historico`, modal de aprovação de peças na tela de OS, painel de Finalização com bloco condicional Mau Uso, aba Conferência.
- PDFs usando `jspdf`/`autotable` já instalados; layout do relatório técnico em `src/lib/export.ts`.

## Ordem de entrega

1. Migração do banco.
2. Permissões por módulo + tela admin.
3. Novos tipos de OS + modal de aprovação de peças.
4. Painel de Finalização (incluindo bloco Mau Uso) + aba Conferência + valor/hora.
5. Histórico do equipamento + Relatório Técnico PDF.

Confirma que sigo nessa ordem?
