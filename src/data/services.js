export const serviceGroups = [
  {
    id: 'unhas',
    label: 'Unhas',
    services: [
      { id: 'gel', name: 'Alongamento em gel', price: 'R$ 150,00', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
      { id: 'manutencao', name: 'Manutenção', price: 'R$ 130,00', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80' },
      { id: 'banho-gel', name: 'Banho em gel', price: 'R$ 100,00', image: '/img/custom-gel-nails.png' },
      { id: 'blindagem', name: 'Blindagem + esmaltação em gel', price: 'R$ 70,00', image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=600&q=80' },
      { id: 'postica', name: 'Postiça realista', price: 'R$ 70,00', image: '/img/realistic_press_on_nails.png' },
      { id: 'reposicao', name: 'Reposição de unha', price: 'R$ 10,00', image: '/img/nail_repair.png' },
      { id: 'remocao', name: 'Remoção', price: 'R$ 40,00', image: '/img/nail_removal.png' },
      { id: 'pedicure', name: 'Pedicure em gel', price: 'R$ 60,00', image: '/img/custom-pedicure.png' },
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
          { size: 'P', label: 'Pequeno (P)', price: 'R$ 200,00', priceValue: 200 },
          { size: 'M', label: 'Médio (M)', price: 'R$ 250,00', priceValue: 250 },
          { size: 'G', label: 'Grande (G)', price: 'R$ 300,00', priceValue: 300 },
          { size: 'GG', label: 'Extra Grande (GG)', price: 'R$ 400,00', priceValue: 400 },
        ],
      },
      {
        id: 'botox',
        name: 'Botox Capilar',
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80',
        variants: [
          { size: 'P', label: 'Pequeno (P)', price: 'R$ 170,00', priceValue: 170 },
          { size: 'M', label: 'Médio (M)', price: 'R$ 200,00', priceValue: 200 },
          { size: 'G', label: 'Grande (G)', price: 'R$ 250,00', priceValue: 250 },
        ],
      },
      {
        id: 'reducao',
        name: 'Redução de Cachos',
        image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80',
        variants: [
          { size: 'P', label: 'Pequeno (P)', price: 'R$ 200,00', priceValue: 200 },
          { size: 'M', label: 'Médio (M)', price: 'R$ 250,00', priceValue: 250 },
          { size: 'G', label: 'Grande (G)', price: 'R$ 280,00', priceValue: 280 },
        ],
      },
    ],
  },
  {
    id: 'rapidos',
    label: 'Serviços Rápidos',
    services: [
      { id: 'lavar-escovar', name: 'Lavar e escovar', price: 'R$ 50,00', image: '/img/custom-hair-wash.png' },
      { id: 'tratamento', name: 'Tratamento + escova', price: 'R$ 70,00', image: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=600&q=80' },
      { id: 'condicionar', name: 'Lavar e condicionar', price: 'R$ 30,00', image: '/img/hair_conditioning.png' },
      { id: 'pranchar', name: 'Só pranchar', price: 'R$ 30,00', image: '/img/flat_iron.png' },
      { id: 'lavar-pranchar', name: 'Lavar + pranchar', price: 'R$ 50,00', image: '/img/wash_and_flat_iron.png' },
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
        group: group.label,
        image: service.image,
      }))
    }
    return [{ ...service, group: group.label }]
  }),
)
