## Visão geral

Construir um aplicativo web para uma fintech que financia próteses ortopédicas. O fluxo principal permite que pacientes simulem parcelas, solicitem crédito e acompanhem a proposta; clínicas parceiras gerenciam propostas enviadas e status de aprovação.

## Decisões de design

- **Identidade visual**: tecnológica e premium
- **Paleta**: fundo `#0a1628`, superfícies `#1e3a5f`, primário/accento `#3b82f6`, textos claros `#e8f0fe`
- **Tipografia**: headings em `Space Grotesk` ou `Outfit`, body em `Inter` ou `DM Sans`
- **Tom**: confiança, segurança financeira, clareza médica

## Escopo inicial (MVP)

### 1. Backend e infraestrutura
- Habilitar **Lovable Cloud** para autenticação, banco de dados PostgreSQL e storage.
- Configurar autenticação com Supabase Auth (login por email/senha e Google).
- Criar tabelas:
  - `profiles` (dados de pacientes e clínicas)
  - `clinics` (dados de clínicas parceiras)
  - `loan_applications` (propostas de financiamento)
  - `user_roles` (papéis: patient, clinic, admin)
- Aplicar RLS, GRANTs e políticas de acesso por papel.

### 2. Design system
- Atualizar `src/styles.css` com tokens semânticos da marca.
- Instalar fontes via `@fontsource`.
- Criar componentes customizados: `Header`, `Footer`, `Hero`, `SimulatorCard`, `FeatureSection`, `TestimonialSection`.

### 3. Rotas e páginas

| Rota | Público | Conteúdo |
|------|---------|----------|
| `/` | Sim | Landing page com hero, simulador de crédito, diferenciais, depoimentos, CTA |
| `/auth` | Sim | Tela de login/cadastro dual (paciente ou clínica) |
| `/simular` | Sim | Simulador completo de parcelas (valor, entrada, parcelas) |
| `/paciente/dashboard` | Autenticado (patient) | Acompanhar propostas, status, documentos |
| `/clinica/dashboard` | Autenticado (clinic) | Criar proposta, listar propostas, acompanhar status |
| `/admin/dashboard` | Autenticado (admin) | Aprovar/reprovar propostas, gestão de clínicas |
| `/como-funciona` | Sim | Explicação do fluxo |
| `/clinicas-parceiras` | Sim | Página para clínicas entrarem na plataforma |

### 4. Fluxo principal

1. **Paciente visita landing** e usa simulador.
2. Clica em "Solicitar crédito" e faz cadastro/login.
3. Preenche dados pessoais, valor do tratamento, entrada e número de parcelas.
4. Sistema calcula CET, parcela mensal e prazo.
5. Proposta é enviada para análise.
6. Paciente acompanha status no dashboard.
7. Clínica parceira pode criar proposta em nome do paciente.
8. Admin analisa e aprova/reprova.

### 5. Componentes principais
- **CreditSimulator**: slider de valor, entrada e parcelas; cálculo em tempo real.
- **ProposalForm**: formulário de proposta com validação Zod.
- **DashboardCards**: resumo de propostas e status.
- **StatusBadge**: badges coloridos por status (em análise, aprovada, reprovada, paga).
- **ClinicSelector**: clínica parceira vinculada à proposta.

### 6. SEO e metadados
- Atualizar `src/routes/__root.tsx` com título/descrição específicos.
- Criar `sitemap.xml` e `robots.txt`.
- Adicionar metadados route-specific em cada página.

### 7. Segurança
- Validação de inputs com Zod no cliente e servidor.
- Server functions protegidas por `requireSupabaseAuth` + role check.
- RLS no banco.
- Nunca expor dados sensíveis em logs.

## Tecnologias

- TanStack Start + React 19
- Tailwind CSS v4 + shadcn/ui
- TanStack Query
- Lovable Cloud (Supabase)
- Zod para validação
- React Hook Form para formulários

## Próximos passos

1. Aprovar plano.
2. Habilitar Lovable Cloud.
3. Configurar design system.
4. Criar schema e autenticação.
5. Implementar landing page e simulador.
6. Implementar fluxo de proposta e dashboards.
7. Revisar, testar e publicar.