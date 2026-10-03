# BLASCKI — Netlify

Este ZIP contém o site completo e uma função de servidor para o chat com OpenAI.
A chave não fica no HTML. O projeto ainda precisa ser publicado e configurado.

## Publicar pelo GitHub

1. Extraia o ZIP.
2. Crie um repositório no GitHub e envie os arquivos e pastas extraídos. O arquivo netlify.toml deve ficar na raiz do repositório.
3. No Netlify, importe um projeto existente do GitHub e selecione o repositório.
4. Diretório de publicação: public. Não é necessário comando de build. O netlify.toml configura a pasta das funções.
5. Nas variáveis de ambiente do projeto Netlify, crie OPENAI_API_KEY com sua chave OpenAI. Ela deve estar disponível para Functions no ambiente de produção (ou em todos os escopos/ambientes). Não coloque a chave nos arquivos nem no GitHub.
6. Faça um novo deploy depois de configurar a variável.
7. Abra o endereço publicado e teste o chat.

ATENÇÃO: enviar o ZIP ou a pasta apenas por arrastar e soltar (Netlify Drop) publica arquivos estáticos, mas não publica esta função de servidor. Use a importação GitHub acima ou a CLI abaixo.

## Alternativa por computador: CLI

Instale Node.js 22 ou superior. Abra o terminal na pasta extraída e execute:

    npx netlify-cli login
    npx netlify-cli deploy --prod --dir=public --functions=netlify/functions

Siga as perguntas para criar ou vincular um projeto. Configure OPENAI_API_KEY no painel e repita o deploy. Para testar localmente, use npx netlify-cli dev após vincular o projeto.

## Custos e limites

O plano gratuito do Netlify está sujeito às cotas do provedor. A API OpenAI tem cobrança separada; hospedagem gratuita não torna as respostas de IA gratuitas.

Este projeto inclui um limitador simples em memória (6 pedidos por minuto por IP, por instância). Ele pode reiniciar e não é compartilhado entre instâncias. Para divulgação ampla, configure proteção contra abuso e acompanhe o consumo. O endpoint é público e não exige login.

O navegador mantém apenas o histórico recente da sessão, sem persistência local. A chamada à OpenAI usa store:false; isso não constitui garantia de retenção zero pelo provedor.

## Arquivos

- public/index.html: site completo.
- netlify/functions/chat.mjs: servidor, com chave lida da variável de ambiente.
- netlify.toml: publicação e rota /api/chat.

O código foi verificado localmente com respostas simuladas. Não foi realizado teste real com sua chave ou implantação na sua conta.
