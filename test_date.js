const client = {
  name: 'Janaina SP',
  email: 'jgomesandrade06@gmail.com',
  dateOfBirth: '1990-05-10T00:00:00.000Z'
};

if (client.dateOfBirth) {
  console.log('Aniversário:', new Date(client.dateOfBirth).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }));
}
