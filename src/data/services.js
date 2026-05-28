export const serviceGroups = [
  {
    id: 'unhas',
    label: 'Unhas',
    services: [
      { id: 'gel', name: 'Alongamento em gel', price: 'R$ 150,00' },
      { id: 'manutencao', name: 'Manutenção', price: 'R$ 130,00' },
      { id: 'banho-gel', name: 'Banho em gel', price: 'R$ 100,00' },
      { id: 'blindagem', name: 'Blindagem + esmaltação em gel', price: 'R$ 70,00' },
      { id: 'postica', name: 'Postiça realista', price: 'R$ 70,00' },
      { id: 'reposicao', name: 'Reposição de unha', price: 'R$ 10,00' },
      { id: 'remocao', name: 'Remoção', price: 'R$ 40,00' },
      { id: 'pedicure', name: 'Pedicure em gel', price: 'R$ 60,00' },
    ],
  },
  {
    id: 'cabelo',
    label: 'Cabelo',
    services: [
      { id: 'alisamento', name: 'Alisamento', price: 'P R$ 200 · M R$ 250 · G R$ 300 · GG R$ 400' },
      { id: 'botox', name: 'Botox Capilar', price: 'P R$ 170 · M R$ 200 · G R$ 250' },
      { id: 'reducao', name: 'Redução de Cachos', price: 'P R$ 200 · M R$ 250 · G R$ 280' },
    ],
  },
  {
    id: 'rapidos',
    label: 'Serviços Rápidos',
    services: [
      { id: 'lavar-escovar', name: 'Lavar e escovar', price: 'R$ 50,00' },
      { id: 'tratamento', name: 'Tratamento + escova', price: 'R$ 70,00' },
      { id: 'condicionar', name: 'Lavar e condicionar', price: 'R$ 30,00' },
      { id: 'pranchar', name: 'Só pranchar', price: 'R$ 30,00' },
      { id: 'lavar-pranchar', name: 'Lavar + pranchar', price: 'R$ 50,00' },
    ],
  },
]

export const allServices = serviceGroups.flatMap((group) =>
  group.services.map((service) => ({ ...service, group: group.label })),
)
