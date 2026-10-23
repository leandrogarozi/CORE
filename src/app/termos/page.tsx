import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de uso · FARO" };

export default function TermosPage() {
  return (
    <LegalPage titulo="Termos de uso" atualizado="23/10/2026">
      <h2>1. O que é o FARO</h2>
      <p>
        O FARO é um aplicativo pessoal de produtividade, rotina e aprendizados: tarefas, lembretes, agenda, hábitos, registro do
        dia (humor, sono, água, dieta), estudos, livros, manutenções e anotações, com um assistente de inteligência artificial
        opcional. Ao criar uma conta você aceita estes termos.
      </p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e informar um e-mail que seja seu.</li>
        <li>Guarde sua senha. O que acontecer na sua conta com a sua senha é responsabilidade sua.</li>
        <li>Cada conta é de uma pessoa. Seus dados ficam separados dos de qualquer outra conta.</li>
      </ul>

      <h2>3. O que você pode e não pode fazer</h2>
      <ul>
        <li>Pode usar o FARO para organizar a sua vida e o seu trabalho.</li>
        <li>Não pode tentar acessar dados de outras pessoas, sobrecarregar o serviço, copiar o app para revenda ou usá-lo para algo ilegal.</li>
        <li>Não use o FARO para enviar mensagens indesejadas (spam) por WhatsApp.</li>
      </ul>

      <h2>4. O que o FARO não é</h2>
      <p>
        O FARO não é serviço médico, nutricional, financeiro ou jurídico. Os campos de saúde (humor, sono, água, dieta,
        medicamentos) servem para você se acompanhar. Lembretes e avisos são um apoio, não uma garantia: não dependa
        exclusivamente deles para algo crítico (como horário de remédio).
      </p>

      <h2>5. Assistente de IA</h2>
      <p>
        As respostas do assistente podem conter erros. Ele só grava algo no FARO depois que você confirma na tela. A IA recebe um
        resumo do seu dia para responder; veja a Política de privacidade para saber exatamente o quê. O uso da IA tem um teto
        mensal de gasto, que você pode ajustar nas Configurações.
      </p>

      <h2>6. WhatsApp e notificações</h2>
      <p>
        Lembretes por WhatsApp só são enviados para o número que você cadastrar e depois de você aceitar receber. Cada mensagem tem
        um custo; o FARO mostra o gasto e tem um teto que você controla. Você pode desligar o WhatsApp a qualquer momento.
      </p>

      <h2>7. Seus dados</h2>
      <p>
        Os dados que você coloca no FARO são seus. Você pode exportar e pedir a exclusão da sua conta e de tudo que está nela (ver
        Política de privacidade). Fazemos cópias de segurança, mas recomendamos que você também exporte o que for importante.
      </p>

      <h2>8. Disponibilidade e mudanças</h2>
      <p>
        O FARO é oferecido como está, sem garantia de funcionamento ininterrupto. Pode haver falhas, manutenção e mudanças de
        funcionalidades. Se algo relevante mudar nestes termos, avisaremos dentro do app. Se você não concordar, é só deixar de usar
        e pedir a exclusão da conta.
      </p>

      <h2>9. Responsabilidade</h2>
      <p>
        Dentro do que a lei permite, não respondemos por perdas indiretas, nem por prejuízos de dependência exclusiva de lembretes,
        avisos ou respostas da IA. Isso não afasta direitos que a lei garante a você, como consumidor ou como titular de dados.
      </p>

      <h2>10. Contato e lei aplicável</h2>
      <p>
        Dúvidas, pedidos e reclamações para Leandro Garozi (CNPJ 22.605.063/0001-04): <strong>[e-mail de contato a definir]</strong>. Estes termos seguem as leis do Brasil; o foro
        é o do seu domicílio, quando a lei assim determinar.
      </p>
    </LegalPage>
  );
}
