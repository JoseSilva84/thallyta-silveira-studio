import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const faqs = [
  {
    title: 'Como agendar um serviço:',
    videoId: 'xjNpbfRoxRQ'
  },
  {
    title: 'Como ver seus agendamentos:',
    videoId: 'sKMbY62FhEE'
  },
  {
    title: 'Como instalar o site como programa em meu computador:',
    videoId: 'Kn641a9gM7Y'
  },
  {
    title: 'Como instalar o site como aplicativo em smartphone:',
    videoId: 't7OB02Rw5qQ'
  }
]

export default function Duvidas() {
  return (
    <section id="duvidas" className="py-20 bg-dark/20">
      <div className="section-shell">
        <SectionTitle eyebrow="Dúvidas" title="Perguntas Frequentes" text="Separamos alguns vídeos para ajudar você a utilizar as principais funcionalidades do nosso site." />
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {faqs.map((faq, index) => (
            <Reveal key={index} delay={index * 0.1}>
              <div className="gold-border overflow-hidden rounded-2xl bg-dark-card shadow-lg flex flex-col h-full">
                <div className="p-5 border-b border-white/5 flex-grow">
                  <h3 className="font-display text-lg font-semibold text-gold-light">{faq.title}</h3>
                </div>
                <div className="relative aspect-video w-full bg-black/50">
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${faq.videoId}`}
                    title={faq.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
