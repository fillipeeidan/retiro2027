# Guia de Configuração e Integração com o Google Sheets
## Retiro 2027 — Conectados | Igreja Adventista da Promessa — Boa Vista

Este guia explica como ativar a integração oficial entre o site do retiro e a sua planilha do Google Sheets em menos de 3 minutos.

---

### Passo 1: Criar a Planilha no Google Drive

1. Acesse o seu Google Drive com a conta de e-mail da igreja.
2. Crie uma nova planilha e dê a ela o nome:
   **`Inscrições — Retiro 2027`**

---

### Passo 2: Adicionar o Código no Apps Script

1. No menu superior da planilha, clique em **Extensões** > **Apps Script**.
2. No editor que será aberto, apague qualquer código existente no arquivo `Código.gs`.
3. Copie todo o código do arquivo local [`google-apps-script/Code.gs`](Code.gs) e cole dentro do editor do Google.
4. Clique no ícone de salvar (💾 ou `Ctrl + S`).

---

### Passo 3: Executar a Configuração Inicial das Abas

1. Na barra superior do Apps Script, selecione no menu suspenso a função **`setupSpreadsheet`**.
2. Clique no botão **Executar**.
3. O Google solicitará permissões para gerenciar a planilha na sua conta. Clique em **Revisar permissões**, escolha sua conta, clique em **Avançado** e depois em **Acessar Inscrições (não seguro)** e conceda a permissão.
4. Volte à planilha e observe que duas abas foram criadas e estilizadas automaticamente:
   - **`PEDIDOS`**: armazena o resumo de cada pedido (código, responsável, contagem de participantes, valor a pagar, status).
   - **`PARTICIPANTES`**: armazena cada pessoa vinculada ao código do pedido, com data de nascimento, idade calculada, categoria e status de isenção.

---

### Passo 4: Publicar ou Atualizar o Web App

#### Se for a primeira vez que você está implantando:
1. No canto superior direito do Apps Script, clique no botão azul **Implantar** > **Nova implantação**.
2. Clique no ícone de engrenagem ao lado de "Selecione o tipo" e escolha **App da Web**.
3. Preencha os campos da seguinte forma:
   - **Descrição**: `API de Inscrições Retiro 2027 v2`
   - **Executar como**: `Eu (seu-email@gmail.com)`
   - **Quem tem acesso**: `Qualquer pessoa` *(essencial para que os visitantes possam enviar o formulário e o comprovante público)*
4. Clique em **Implantar**.
5. Conceda as permissões solicitadas (incluindo acesso ao Google Drive para a pasta de comprovantes).
6. Copie a **URL do app da Web** gerada (algo parecido com `https://script.google.com/macros/s/AKfycb.../exec`).

#### Se você já tem o Web App implantado e está atualizando o código:
1. Cole o novo código de [`google-apps-script/Code.gs`](Code.gs) no editor e salve (`Ctrl + S`).
2. Execute a função **`setupSpreadsheet`** uma vez no menu de depuração para criar a coluna de comprovante e os menus suspensos. Conceda a permissão do Google Drive se solicitada.
3. Clique em **Implantar** > **Gerenciar implantações**.
4. Clique no ícone de **lápis (Editar)** no canto superior direito da janela de implantação.
5. No campo **Versão**, clique no menu e selecione **"Nova versão"**.
6. Clique no botão azul **Implantar**. *(IMPORTANTE: sem criar uma 'Nova versão', o Google continuará executando o código antigo).*

---

### Passo 5: Recursos Automatizados da Planilha

1. **Menus Suspensos (Validação de Dados)**:
   - Na aba **`PEDIDOS`**, a coluna **Status da inscrição** possui um menu suspenso com opções:
     - `Aguardando pagamento` (padrão inicial)
     - `Comprovante enviado` (definido automaticamente quando a pessoa anexa o arquivo)
     - `Pagamento confirmado` (selecionado pelo tesoureiro após conferir o extrato)
     - `Pendente de validação PcD`
     - `Cancelado`
2. **Carimbo Automático de Data e Hora de Confirmação**:
   - Assim que o tesoureiro mudar o status para `Pagamento confirmado`, a coluna **Data e hora da confirmação do pagamento** é preenchida automaticamente com o dia e hora exatos de Boa Vista!
3. **Comprovante Anexado com Link Direto no Google Drive**:
   - Quando o inscrito anexa a foto ou PDF do comprovante no site, o arquivo é salvo automaticamente na pasta **`Comprovantes — Retiro 2027`** do seu Google Drive.
   - Na coluna **Comprovante (Link)** da planilha, é gerado um link clicável `Visualizar Comprovante`. Clicando nele, o tesoureiro abre o comprovante imediatamente em tela cheia para conferência!

---

### Passo 6: Vincular a URL ao Site

1. Abra o arquivo [`js/config.js`](../js/config.js) no projeto do site.
2. Localize a propriedade `googleAppsScriptUrl` e cole a URL copiada:
   ```javascript
   googleAppsScriptUrl: "https://script.google.com/macros/s/SUA_URL_AQUI/exec",
   ```
3. Pronto! Todas as inscrições e comprovantes enviados pelo site cairão automaticamente na sua planilha e no seu Google Drive.
