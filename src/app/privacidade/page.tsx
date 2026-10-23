import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de privacidade · FARO" };

export default function PrivacidadePage() {
  return (
    <LegalPage titulo="Política de privacidade" atualizado="23/10/2026">
      <p>
        Esta página explica quais dados o FARO guarda, para quê, com quem passam por dentro do serviço e quais são os seus direitos,
        conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        <strong>Leandro Garozi, CNPJ 22.605.063/0001-04</strong>. Contato para assuntos de privacidade:{" "}
        <strong>quem te convidou para o teste (Leandro Garozi)</strong>.
      </p>

      <h2>2. Quais dados guardamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> e-mail e senha (a senha é guardada de forma protegida pelo serviço de login; ninguém consegue lê-la).
        </li>
        <li>
          <strong>Perfil:</strong> como você quer ser chamado, foto, data de nascimento, fuso horário, telefone para WhatsApp (se você informar).
        </li>
        <li>
          <strong>O que você escreve no app:</strong> tarefas, lembretes, reuniões, aniversários e contatos que você cadastrar,
          anotações, hábitos, estudos, livros, manutenções, compras, checklists e anexos.
        </li>
        <li>
          <strong>Dados de saúde (dados pessoais sensíveis):</strong> humor, sono, água, fidelidade à dieta, refeições e, se você usar,
          medicamentos e tratamentos. Esses dados só existem para você se acompanhar; só tratamos com o seu consentimento, dado ao
          criar a conta, e você pode desligar cada um desses painéis nas Configurações.
        </li>
        <li>
          <strong>Uso técnico:</strong> registros de erro e de gasto (mensagens de WhatsApp e uso da IA) para o serviço funcionar e
          para o teto de gasto valer.
        </li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Fazer o app funcionar: guardar o que você cria e mostrar de volta.</li>
        <li>Enviar lembretes e avisos que você pediu (no app, por notificação e, se você ligar, por WhatsApp).</li>
        <li>Responder ao assistente de IA, quando você o usa.</li>
        <li>Segurança, prevenção de abuso e correção de falhas.</li>
      </ul>
      <p>Não vendemos seus dados e não usamos o que você escreve para propaganda.</p>

      <h2>4. Com quem os dados passam</h2>
      <p>Para o FARO funcionar usamos prestadores de serviço. Cada um recebe só o necessário:</p>
      <ul>
        <li>
          <strong>Supabase</strong> (banco de dados e login): guarda todos os seus dados. Cada conta só enxerga os próprios dados.
        </li>
        <li>
          <strong>Vercel</strong> (hospedagem do app): processa as telas e as chamadas do servidor.
        </li>
        <li>
          <strong>Meta (WhatsApp Business)</strong>: recebe o seu número de telefone e o texto do lembrete, <em>apenas</em> quando você
          liga o WhatsApp.
        </li>
        <li>
          <strong>Anthropic (inteligência artificial)</strong>: quando você conversa com o assistente, ele recebe a sua mensagem e um
          resumo do seu dia (tarefas, lembretes, hábitos, números do registro do dia). Medicamentos, tratamentos e anotações de saúde
          não são enviados à IA.
        </li>
        <li>
          <strong>Google</strong> (agenda): só se e quando você conectar a sua agenda, e apenas o que você autorizar.
        </li>
        <li>
          <strong>Conector de IA externa</strong> (opcional): se você gerar o endereço do conector e colar em outra IA (Claude, ChatGPT…),
          essa IA passa a poder ler o que o conector expõe. Quem tem o endereço tem o acesso: trate-o como uma senha e gere outro
          se suspeitar de vazamento. Dados de saúde ficam de fora.
        </li>
      </ul>
      <p>Alguns desses serviços ficam fora do Brasil; neles seus dados são tratados conforme as regras de cada empresa e a LGPD, com as proteções contratuais cabíveis.</p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Enquanto a sua conta existir. Itens que você apaga vão para a Lixeira e são excluídos de vez depois de um tempo ou quando você
        esvaziar. Ao excluir a conta, apagamos seus dados do banco; cópias de segurança podem levar mais algum tempo para expirar.
      </p>
      <p>
        <strong>Cópias de segurança:</strong> o FARO faz, uma vez por dia, uma cópia da sua conta dentro do mesmo banco de dados e guarda as
        últimas 14. Elas servem para recuperar dados apagados por engano ou por falha, só o servidor tem acesso e o responsável pelo FARO
        só as usa para restaurar a sua conta. Você também pode baixar a sua própria cópia a qualquer momento em Configurações, grupo &quot;Dados e backup&quot;, e guardá-la onde quiser.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD você pode, a qualquer momento:</p>
      <ul>
        <li>saber quais dados temos e receber uma cópia (há botões de exportar e de backup nas Configurações);</li>
        <li>corrigir dados (você mesmo edita no app);</li>
        <li>pedir a exclusão da conta e dos dados;</li>
        <li>revogar o consentimento (por exemplo, desligar os painéis de saúde, o WhatsApp ou a IA) e se opor a um tratamento;</li>
        <li>reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>
      <p>
        Para exercer qualquer direito, escreva para <strong>quem te convidou para o teste (Leandro Garozi)</strong>.
      </p>

      <h2>7. Segurança</h2>
      <p>
        A conexão é criptografada, cada tabela do banco só entrega dados à conta dona deles, e as chaves dos serviços ficam apenas no
        servidor. Nenhum sistema é 100% seguro; se houver um incidente que afete você, avisaremos como a lei exige.
      </p>

      <h2>8. Menores de idade</h2>
      <p>O FARO é para maiores de 18 anos.</p>

      <h2>9. Mudanças nesta política</h2>
      <p>Se mudarmos algo importante, avisaremos dentro do app e atualizaremos a data no alto desta página.</p>
    </LegalPage>
  );
}
