export const serviceGroups = [
  {
    id: 'unhas',
    label: 'Unhas',
    services: [
      { id: 'gel', name: 'Alongamento em gel', price: 'R$ 150,00', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
      { id: 'manutencao', name: 'Manutenção', price: 'R$ 130,00', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80' },
      { id: 'banho-gel', name: 'Banho em gel', price: 'R$ 100,00', image: '/img/custom-gel-nails.png' },
      { id: 'blindagem', name: 'Blindagem + esmaltação em gel', price: 'R$ 70,00', image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=600&q=80' },
      { id: 'postica', name: 'Postiça realista', price: 'R$ 70,00', image: '/img/custom-gel-nails.png' },
      { id: 'reposicao', name: 'Reposição de unha', price: 'R$ 10,00', image: '/img/custom-gel-nails.png' },
      { id: 'remocao', name: 'Remoção', price: 'R$ 40,00', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
      { id: 'pedicure', name: 'Pedicure em gel', price: 'R$ 60,00', image: '/img/custom-pedicure.png' },
    ],
  },
  {
    id: 'cabelo',
    label: 'Cabelo',
    services: [
      { id: 'alisamento', name: 'Alisamento', price: 'P R$ 200 · M R$ 250 · G R$ 300 · GG R$ 400', image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80' },
      { id: 'botox', name: 'Botox Capilar', price: 'P R$ 170 · M R$ 200 · G R$ 250', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80' },
      { id: 'reducao', name: 'Redução de Cachos', price: 'P R$ 200 · M R$ 250 · G R$ 280', image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  {
    id: 'rapidos',
    label: 'Serviços Rápidos',
    services: [
      { id: 'lavar-escovar', name: 'Lavar e escovar', price: 'R$ 50,00', image: '/img/custom-hair-wash.png' },
      { id: 'tratamento', name: 'Tratamento + escova', price: 'R$ 70,00', image: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=600&q=80' },
      { id: 'condicionar', name: 'Lavar e condicionar', price: 'R$ 30,00', image: '/img/custom-hair-wash.png' },
      { id: 'pranchar', name: 'Só pranchar', price: 'R$ 30,00', image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80' },
      { id: 'lavar-pranchar', name: 'Lavar + pranchar', price: 'R$ 50,00', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80' },
    ],
  },
]

export const allServices = serviceGroups.flatMap((group) =>
  group.services.map((service) => ({ ...service, group: group.label })),
)
