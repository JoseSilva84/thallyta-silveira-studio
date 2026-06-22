import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const faqs = [
  {
    title: 'Onde fica localizado o studio?',
    content: 'O Studio Thallyta Silveira fica na Rua José Firmino da Costa, 481, Centro - Jaguaribe - CE. Como referência, estamos localizados ao lado do Carmela Dutra.'
  },
  {
    title: 'Qual o horário de funcionamento?',
    content: 'O studio atende de Segunda a Sexta-feira, das 09:30 às 18:00, com pausa das 13:00 às 14:30. Não funcionamos aos Sábados e Domingos.'
  },
  {
    title: 'Como funciona o pagamento para reservar o horário?',
    content: 'Para garantir o seu horário na agenda, é necessário efetuar o pagamento através da nossa integração segura com o Mercado Pago. Você pode optar por pagar uma entrada de 30% do valor do serviço ou já pagar o valor total. O horário será reservado e liberado automaticamente assim que o pagamento for aprovado.'
  },
  {
    title: 'Como funciona o programa de fidelidade?',
    content: 'A cada visita e serviço finalizado no studio, você recebe um selo no seu cartão fidelidade digital (disponível na sua conta aqui no site). Ao completar 10 selos, você desbloqueia uma recompensa especial!'
  },
  {
    title: 'Como agendar um serviço pelo site?',
    content: 'É muito simples! Basta criar uma conta, escolher o serviço desejado na seção "Agendamento", efetuar o pagamento da reserva e, em seguida, escolher a melhor data e horário no calendário. Veja o passo a passo no vídeo abaixo.',
    videoId: 'xjNpbfRoxRQ'
  },
  {
    title: 'Como posso ver os meus agendamentos e os selos fidelidade?',
    content: 'Acesse o menu principal e vá na opção "Perfil" (ou em "Meus Agendamentos"). Lá você verá todo o histórico de suas reservas e quantos selos faltam para a sua recompensa. Confira o vídeo para mais detalhes.',
    videoId: 'sKMbY62FhEE'
  },
  {
    title: 'Posso instalar o site no meu smartphone como um aplicativo?',
    content: 'Sim! Nosso site possui uma tecnologia que permite a instalação dele como um aplicativo (PWA). Veja no vídeo abaixo o passo a passo para instalá-lo no seu celular e acessá-lo mais rapidamente.',
    videoId: 't7OB02Rw5qQ'
  },
  {
    title: 'Posso instalar o site como um programa no meu computador?',
    content: 'Com certeza! Você também pode instalar o sistema diretamente no seu computador para ter um atalho rápido na sua área de trabalho. Confira as instruções no vídeo.',
    videoId: 'Kn641a9gM7Y'
  }
]

export default function Duvidas() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="duvidas" className="py-20 bg-dark/20">
      <div className="section-shell max-w-4xl mx-auto">
        <SectionTitle eyebrow="Dúvidas" title="Perguntas Frequentes" text="Confira as principais dúvidas sobre os nossos serviços e veja vídeos tutoriais." />
        
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <Reveal key={index} delay={index * 0.05}>
                <div 
                  className={`gold-border overflow-hidden rounded-2xl bg-dark-card shadow-lg transition-all duration-300 ${isOpen ? 'border-gold/50 bg-white/5' : 'border-white/5 hover:border-gold/30 hover:bg-white/5'}`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <h3 className={`font-display text-lg font-semibold transition-colors ${isOpen ? 'text-gold-light' : 'text-cream'}`}>
                      {faq.title}
                    </h3>
                    <div className={`ml-4 shrink-0 rounded-full border border-gold/30 bg-gold/10 p-1.5 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-gold text-dark border-gold' : 'text-gold-light'}`}>
                      <FiChevronDown className="text-xl" />
                    </div>
                  </button>
                  
                  <div
                    className={`transition-all duration-500 ease-in-out ${
                      isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >
                    <div className="p-5 pt-0 md:p-6 md:pt-0">
                      <p className="text-cream/80 leading-relaxed mb-6">{faq.content}</p>
                      
                      {faq.videoId && (
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                          <iframe
                            className="absolute inset-0 h-full w-full"
                            src={`https://www.youtube.com/embed/${faq.videoId}`}
                            title={faq.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
