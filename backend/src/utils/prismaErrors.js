export const isDatabaseUnavailableError = (error) =>
  error?.code === 'P1001'
  || /Can't reach database server/i.test(error?.message || '');

export const logDatabaseUnavailableWarning = (context, error) => {
  const host = error?.meta?.database_host;
  const port = error?.meta?.database_port;
  const target = host && port ? `${host}:${port}` : 'banco configurado';

  console.warn(`${context}: banco indisponivel em ${target}. A rotina sera tentada novamente no proximo ciclo.`);
};
