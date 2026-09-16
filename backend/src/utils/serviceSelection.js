import { findServiceById } from '../data/services.js';

export const normalizeServiceIds = (value, fallback = null) => {
  const rawIds = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : fallback
        ? [fallback]
        : [];

  return [...new Set(rawIds.map((id) => String(id || '').trim()).filter(Boolean))];
};

export const resolveServices = (value, fallback = null) => {
  const serviceIds = normalizeServiceIds(value, fallback);
  const services = serviceIds.map(findServiceById).filter(Boolean);

  return {
    serviceIds,
    services,
    invalidServiceIds: serviceIds.filter((id) => !services.some((service) => service.id === id)),
  };
};

export const getPaymentServices = (payment) => {
  const storedServices = Array.isArray(payment?.metadata?.services) ? payment.metadata.services : [];
  const resolved = storedServices
    .map((item) => findServiceById(item?.id))
    .filter(Boolean);

  if (resolved.length) return resolved;

  const fallback = findServiceById(payment?.serviceId);
  return fallback ? [fallback] : [];
};

export const getTotalDurationMinutes = (services) => services.reduce(
  (total, service) => total + (Number(service?.durationMin) || 60),
  0,
);

export const getServicesName = (services) => services.map((service) => service.name).join(', ');
