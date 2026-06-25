export const serviceGroups = [
  {
    id: 'unhas',
    label: 'Unhas',
    services: [
      { id: 'gel', name: 'Alongamento em gel', price: 'R$ 150,00', duration: '2h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/alongamento-em-gel', image: '/img/unha1.jpeg' },
      { id: 'manutencao', name: 'Manutenção', price: 'R$ 130,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/unha2.jpeg' },
      { id: 'banho-gel', name: 'Banho em gel', price: 'R$ 100,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/unha3.jpeg' },
      { id: 'blindagem', name: 'Blindagem + esmaltação em gel', price: 'R$ 70,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/unha4.jpeg' },
      { id: 'postica', name: 'Postiça realista', price: 'R$ 70,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/unha5.jpeg' },
      { id: 'remocao', name: 'Remoção', price: 'R$ 40,00', duration: '1h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/remocao', image: '/img/unha6.jpeg' },
      { id: 'pedicure', name: 'Pedicure em gel', price: 'R$ 60,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/unha7.jpeg' },
    ],
  },
  {
    id: 'cabelo',
    label: 'Cabelo',
    services: [
      {
        id: 'alisamento',
        name: 'Alisamento',
        image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80',
        variants: [
          { size: 'P', label: 'Pequeno (P)', price: 'R$ 200,00', priceValue: 200, duration: '3h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/alisamento-p-e-m' },
          { size: 'M', label: 'Médio (M)', price: 'R$ 250,00', priceValue: 250, duration: '3h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/alisamento-p-e-m' },
          { size: 'G', label: 'Grande (G)', price: 'R$ 300,00', priceValue: 300, duration: '7h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/alisamento-g-gg-avaliacao' },
          { size: 'GG', label: 'Extra Grande (GG)', price: 'R$ 400,00', priceValue: 400, duration: '7h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/alisamento-g-gg-avaliacao' },
        ],
      },
      {
        id: 'botox',
        name: 'Botox Capilar',
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80',
        variants: [
          { size: 'P', label: 'Pequeno (P)', price: 'R$ 170,00', priceValue: 170, duration: '3h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/botox-capilar-p-e-m' },
          { size: 'M', label: 'Médio (M)', price: 'R$ 200,00', priceValue: 200, duration: '3h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/botox-capilar-p-e-m' },
          { size: 'G', label: 'Grande (G)', price: 'R$ 250,00', priceValue: 250, duration: '4h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/botox-capilar-g' },
        ],
      },
      {
        id: 'reducao',
        name: 'Redução de Cachos',
        image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80',
        variants: [
          { size: 'P', label: 'Pequeno (P)', price: 'R$ 200,00', priceValue: 200, duration: '3h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/reducao-de-cachos-p-ou-m' },
          { size: 'M', label: 'Médio (M)', price: 'R$ 250,00', priceValue: 250, duration: '3h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/reducao-de-cachos-p-ou-m' },
          { size: 'G', label: 'Grande (G)', price: 'R$ 280,00', priceValue: 280, duration: '4h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/reducao-de-cachos-g' },
        ],
      },
    ],
  },
  {
    id: 'rapidos',
    label: 'Serviços Rápidos',
    services: [
      { id: 'lavar-escovar', name: 'Lavar e escovar', price: 'R$ 50,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/custom-hair-wash.png' },
      { id: 'tratamento', name: 'Tratamento + escova', price: 'R$ 70,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=600&q=80' },
      { id: 'condicionar', name: 'Lavar e condicionar', price: 'R$ 30,00', duration: '30min', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/lavar-e-condicionar', image: '/img/hair_conditioning.png' },
      { id: 'pranchar', name: 'Só pranchar', price: 'R$ 30,00', duration: '1h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/so-pranchar', image: '/img/flat_iron.png' },
      { id: 'lavar-pranchar', name: 'Lavar + pranchar', price: 'R$ 50,00', duration: '1h30', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/servicos-gerais', image: '/img/wash_and_flat_iron.png' },
      { id: 'corte', name: 'Corte (Incluso lavagem)', price: 'R$ 50,00', duration: '1h', calUrl: 'https://cal.com/thallyta-silveira-hxfjrf/corte', image: '/img/custom-hair-wash.png' },
    ],
  },
]

// Para a seção de agendamento (checkboxes): expande serviços com variantes em múltiplas entradas
export const allServices = serviceGroups.flatMap((group) =>
  group.services.flatMap((service) => {
    if (service.variants) {
      return service.variants.map((v) => ({
        id: `${service.id}-${v.size.toLowerCase()}`,
        name: `${service.name} (${v.size})`,
        price: v.price,
        duration: v.duration,
        calUrl: v.calUrl,
        group: group.label,
        image: service.image,
      }))
    }
    return [{ ...service, group: group.label }]
  }),
)
