import { NavLink } from 'react-router-dom';

const fonteAnp = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas';
const direitosAnpd = 'https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares';
const responsavel = (import.meta.env.VITE_RESPONSAVEL_PRIVACIDADE as string | undefined)?.trim();
const contato = (import.meta.env.VITE_CONTATO_PRIVACIDADE as string | undefined)?.trim();

function Politica() {
  return (
    <>
      <section>
        <h2>Localização e consultas</h2>
        <p>Você pode escolher uma cidade manualmente. Ao usar “Usar minha localização”, o navegador pede sua permissão. A posição fornecida pelo navegador é usada na página para mostrar onde você está e calcular distâncias em linha reta.</p>
        <p>Para buscar cidades próximas, o site envia ao Supabase os limites de uma área calculada a partir de coordenadas arredondadas, além dos filtros necessários à consulta. O Economizei+ não cadastra essa posição em uma tabela de usuários nem mantém um histórico de deslocamentos.</p>
        <p>Ao clicar em “Traçar rota”, a origem e o destino são enviados ao serviço de rotas. A configuração atual usa o OSRM da FOSSGIS, que pode registrar a consulta. Ao abrir o Google Maps, a navegação passa a seguir as regras desse serviço.</p>
        <p>Você pode limpar sua localização na tela do mapa, fechar a página ou revogar a permissão nas configurações do navegador. Limpar a localização na página não altera a permissão do navegador.</p>
      </section>

      <section>
        <h2>Dados técnicos e serviços externos</h2>
        <p>A versão atual não exige conta e o código do site não instala cookies de publicidade nem ferramentas próprias de análise de audiência. Os valores preenchidos na calculadora são processados no navegador. O navegador pode guardar, na aba atual, um indicador de que a animação de abertura já foi exibida.</p>
        <p>A Vercel hospeda o site. O Supabase responde às consultas de postos, preços e municípios. O mapa carrega a biblioteca Leaflet pelo unpkg e imagens cartográficas do OpenStreetMap. A página inicial carrega uma foto do Unsplash.</p>
        <p>Esses serviços podem receber dados técnicos como endereço IP, horário, informações do navegador e recursos solicitados. As imagens solicitadas pelo mapa podem indicar a região exibida. Os serviços podem registrar essas requisições conforme suas regras de operação e retenção, inclusive em infraestrutura fora do Brasil.</p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>Nos casos previstos na LGPD, você pode pedir confirmação e acesso ao tratamento, correção de dados, informações sobre compartilhamento e, quando aplicável, eliminação, oposição ou revogação do consentimento. Consulte a <a href={direitosAnpd}>orientação oficial da ANPD</a>.</p>
        {responsavel && <p>Responsável pelo tratamento: {responsavel}.</p>}
        {contato
          ? <p>Para exercer seus direitos ou tirar dúvidas, escreva para <a href={`mailto:${contato}`}>{contato}</a>.</p>
          : <p>O canal direto para solicitações de privacidade ainda não está divulgado nesta página.</p>}
      </section>
    </>
  );
}

function Termos() {
  return (
    <>
      <section>
        <h2>Como funciona o Economizei+</h2>
        <p>O Economizei+ ajuda a comparar informações de postos e estimar despesas de abastecimento. O site não representa os estabelecimentos, não vende combustível e não intermedeia pagamentos ou reservas.</p>
      </section>

      <section>
        <h2>Preços e cobertura</h2>
        <p>Os preços vêm do <a href={fonteAnp}>Levantamento de Preços de Combustíveis da ANP</a> e correspondem à data de coleta exibida. Eles não são atualizados em tempo real. O valor pode mudar e variar conforme condições como forma de pagamento ou promoção. Confira o valor e as condições no posto antes de abastecer.</p>
        <p>A pesquisa abrange uma amostra de postos e municípios. A ausência de um resultado não significa que o combustível ou o posto não exista. Os resultados refletem os registros disponíveis na base do Economizei+.</p>
      </section>

      <section>
        <h2>Mapa, distâncias e cálculos</h2>
        <p>As coordenadas dos postos vêm do cadastro da ANP quando disponíveis. O raio e as distâncias da lista são aproximados e medidos em linha reta. Ao traçar uma rota, a distância e o tempo exibidos são estimativas para o trajeto pelas ruas. Verifique o endereço e as condições de acesso antes de ir ao local.</p>
        <p>Os resultados da calculadora são estimativas baseadas nos valores informados. O gasto real pode variar com o veículo, o trânsito, o percurso e os hábitos de condução.</p>
      </section>

      <section>
        <h2>Correções e atualizações</h2>
        <p>Ao comunicar uma divergência, indique o posto, o município, o combustível e a data da coleta. Evite incluir dados pessoais ou informações de pagamento.</p>
        {contato && <p>Use <a href={`mailto:${contato}`}>{contato}</a> para comunicar uma divergência.</p>}
        <p>As funcionalidades, as fontes de dados e estes termos podem ser atualizados. A versão em vigor fica disponível nesta página. Os direitos assegurados pela legislação aplicável continuam valendo.</p>
      </section>
    </>
  );
}

export default function Privacidade({ termos = false }: { termos?: boolean }) {
  return (
    <article className="pagina-legal">
      <header className="pagina-titulo">
        <h1>{termos ? 'Termos de Uso' : 'Política de Privacidade'}</h1>
        <p>Atualizado em <time dateTime="2026-11-22">22 de novembro de 2026</time></p>
      </header>
      <nav className="nav-legal" aria-label="Documentos do Economizei+">
        <NavLink to="/privacidade" end>Política de Privacidade</NavLink>
        <NavLink to="/privacidade/termos">Termos de Uso</NavLink>
      </nav>
      <div className="texto-legal">{termos ? <Termos /> : <Politica />}</div>
    </article>
  );
}
