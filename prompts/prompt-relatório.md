# prompt-principal.md

## importante

**usar sempre 3 ou mais subagents em todas as fases do projeto, nunca menos que isso.**

## transcripts - App de transcriçãos telemáticas (whatsapp etc)

- Cria um app de transcrições de mídia (audio, vídeo, etc., nos mais variados formatos - `.opus`, `.mp3`, `.wav`, `.flac`, `.mp4` e etc) para texto em português do brasil.
- O usuario pode criar, editar e deletar transcrições (apenas os usuarios adninstradores).
- Cada transcrição tem titulo, nome da operação, analise do conteudo, upload da midia (podendo ser varias ao mesmo tempo) e data de criacao. A pagina inicial lista todas as transcriçãos em cards.
- Clicar numa transcrição abre ela pra editar. Tem um botao de criar transcrição nova.
- Visual bonito e dark mode. Com bordar arredondada e sombra. Com backgroud/funto com linhas verticais r horizontais e blur.
- Criar tela de login e registro de usuario do lado direito, dividida com uma área de propaganda.
- O usuario deve se autenticar para acessar as transcrições.

## Detalhes do **visual** :

- usar como base do design e UI o arquivo `docs/DESIGN.md`
- Visual bonito e dark e light mode, com Login e cadastro de usuario modenos, com tela de login dividida e ela no lado direitom lado esrquerdo para o nome do projeto e propagandas com animações, sendo a tela dividia em 2/3 para propaganda e 1/3 para o login.
- Cores suaves e fontes modernas, background/fundo com linhas verticais, horizontais finais e com blur.
- Blur no fundo dos cards e dialogos, e todos os card e dialogos, azul brilante e com bordascom efeitos no hoover (azul brilhante) percorrento a bordas.
- Usar transparencia e blur para criar um efeito de profundidade, especialmente nos cards e diálogos.
- Animações suaves para transições de página, abertura de diálogos e interações com os cards, como hover e clique.

## Tecbologias e Funcionalidades Adicionais

- Usar: **bun, Next.js, zod, Drrzzle ORM, Postgres, Zod 4, ShadCn/UI e Tailwind**. Cria seed com 5 transcriçãos de exemplo.
- Sempre usar componentes reutilizaveis e bem documentados do ShadCn/UI.
- Criar um docker-compose.yaml para rodar o app e o banco de dados.
- Incluir instrucoes para rodar o app usando Docker.
- Usar JWT para autenticação. Incluir validação de formulario no frontend e backend.
- Adicionar funcionalidade de pesquisa para filtrar transcriçãos por titulo ou conteudo.
- Implementar pagina de perfil do usuario onde ele pode atualizar suas informacoes e mudar senha.
- Adicionar funcionalidade de compartilhamento de transcriçãos com outros usuarios.
- O usuario pode escolher compartilhar uma transcrição com outro usuario pelo email. O usuario compartilhado pode visualizar e editar a transcrição compartilhada.
- Implementar sistema de notificações para informar o usuario quando uma transcrição compartilhada for editada por outro usuario
- As transcriçãos podem sermovidas no tela por drag and drop para reordenar. A ordem das transcriçãos deve ser salva no banco de dados.
