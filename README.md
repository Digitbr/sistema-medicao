# Sistema de Medição Pro

Aplicação estática com funções serverless para gerar relatórios fotográficos de manutenção em Excel, Word e PowerPoint.

## O que foi alterado

- Competência e datas das atividades agora são preenchidas automaticamente com o mês e o dia atuais.
- Ao escolher `Preventiva` ou `Corretiva`, o primeiro cartão de atividade é aberto e o foco vai direto para o campo do problema.
- O fluxo da atividade ficou organizado como: problema, responsável/datas, foto de entrada, foto de saída e conclusão.
- O campo `Motivo da espera` aparece somente quando a atividade está em espera.
- A API `/api/generate` gera arquivos `.xlsx`, `.docx` e `.pptx` e envia por SMTP quando as variáveis de e-mail estão configuradas.

## Desenvolvimento local

```bash
npm install
npm run check
npm run dev
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` ou configure as variáveis diretamente na Vercel:

```bash
REPORT_RECIPIENT="comercial1@primecsg.com.br"
EMAIL_HOST="smtp.resend.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="resend"
EMAIL_PASSWORD="..."
EMAIL_FROM="Medição Pro <onboarding@resend.dev>"
```

Sem SMTP configurado, o sistema ainda baixa o relatório normalmente e informa `X-Report-Email: not-configured`.

## Publicação na Vercel

1. Suba estes arquivos para o repositório do GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Faça o deploy.

Os registros continuam sendo salvos no navegador via IndexedDB, como no sistema publicado originalmente.
