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

### Passo 4: Publicar o Web App

1. No canto superior direito do Apps Script, clique no botão azul **Implantar** > **Nova implantação**.
2. Clique no ícone de engrenagem ao lado de "Selecione o tipo" e escolha **App da Web**.
3. Preencha os campos da seguinte forma:
   - **Descrição**: `API de Inscrições Retiro 2027 v1`
   - **Executar como**: `Eu (seu-email@gmail.com)`
   - **Quem tem acesso**: `Qualquer pessoa` *(essencial para que os visitantes possam enviar o formulário público)*
4. Clique em **Implantar**.
5. Copie a **URL do app da Web** gerada (algo parecido com `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Passo 5: Vincular a URL ao Site

1. Abra o arquivo [`js/config.js`](../js/config.js) no projeto do site.
2. Localize a propriedade `googleAppsScriptUrl` e cole a URL copiada:
   ```javascript
   googleAppsScriptUrl: "https://script.google.com/macros/s/SUA_URL_AQUI/exec",
   ```
3. Pronto! Todas as inscrições enviadas pelo formulário serão salvas de forma real, automática e imediata nas abas da sua planilha.

---

### Passo 6: Configuração da Chave Pix Oficial

Quando a tesouraria da igreja definir a chave Pix oficial (CPF, CNPJ, E-mail ou Telefone):
1. Abra o arquivo [`js/config.js`](../js/config.js).
2. Atualize o bloco `pix`:
   ```javascript
   pix: {
     key: "suachavepix@igreja.com.br", // insira a chave oficial real
     keyType: "EMAIL",
     receiverName: "Igreja Adventista da Promessa",
     receiverCity: "Boa Vista",
   }
   ```
3. O site gerará automaticamente o QR Code Pix estático oficial e o código Pix Copia e Cola para todos os pagamentos.
