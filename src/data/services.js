export const serviceGroups = [
  {
    id: 'unhas',
    label: 'Unhas',
    services: [
      { id: 'gel', name: 'Alongamento em gel', price: 'R$ 150,00', image: '/img/studio-07.jpeg' },
      { id: 'manutencao', name: 'Manutenção', price: 'R$ 130,00', image: '/img/studio-04.jpeg' },
      { id: 'banho-gel', name: 'Banho em gel', price: 'R$ 100,00', image: '/img/studio-07.jpeg' },
      { id: 'blindagem', name: 'Blindagem + esmaltação em gel', price: 'R$ 70,00', image: '/img/studio-04.jpeg' },
      { id: 'postica', name: 'Postiça realista', price: 'R$ 70,00', image: '/img/studio-07.jpeg' },
      { id: 'reposicao', name: 'Reposição de unha', price: 'R$ 10,00', image: '/img/studio-04.jpeg' },
      { id: 'remocao', name: 'Remoção', price: 'R$ 40,00', image: '/img/studio-06.jpeg' },
      { id: 'pedicure', name: 'Pedicure em gel', price: 'R$ 60,00', image: '/img/studio-07.jpeg' },
    ],
  },
  {
    id: 'cabelo',
    label: 'Cabelo',
    services: [
      { id: 'alisamento', name: 'Alisamento', price: 'P R$ 200 · M R$ 250 · G R$ 300 · GG R$ 400', image: '/img/studio-08.jpeg' },
      { id: 'botox', name: 'Botox Capilar', price: 'P R$ 170 · M R$ 200 · G R$ 250', image: '/img/studio-05.jpeg' },
      { id: 'reducao', name: 'Redução de Cachos', price: 'P R$ 200 · M R$ 250 · G R$ 280', image: '/img/studio-03.jpeg' },
    ],
  },
  {
    id: 'rapidos',
    label: 'Serviços Rápidos',
    services: [
      { id: 'lavar-escovar', name: 'Lavar e escovar', price: 'R$ 50,00', image: '/img/studio-08.jpeg' },
      { id: 'tratamento', name: 'Tratamento + escova', price: 'R$ 70,00', image: '/img/studio-05.jpeg' },
      { id: 'condicionar', name: 'Lavar e condicionar', price: 'R$ 30,00', image: '/img/studio-06.jpeg' },
      { id: 'pranchar', name: 'Só pranchar', price: 'R$ 30,00', image: '/img/studio-03.jpeg' },
      { id: 'lavar-pranchar', name: 'Lavar + pranchar', price: 'R$ 50,00', image: '/img/studio-08.jpeg' },
    ],
  },
]

export const allServices = serviceGroups.flatMap((group) =>
  group.services.map((service) => ({ ...service, group: group.label })),
)
