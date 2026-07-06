import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
  FiBarChart2,
  FiAlertTriangle,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiBriefcase,
  FiDollarSign,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiHome,
  FiImage,
  FiGift,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
  FiStar,
  FiClock,
  FiPlus,
  FiSlash,
  FiTrash2,
  FiTrendingUp,
  FiUploadCloud,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { allServices } from '../../data/services.js';
import { formatBrazilWhatsappInput, normalizeBrazilWhatsapp, onlyDigits } from '../../utils/phone.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ADMIN_SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente como administradora para continuar.';
const BLOCK_QUICK_SLOTS = ['08:00', '10:30', '14:30', '16:30', '18:30'];
const BLOCK_SLOT_END_TIMES = {
  '08:00': '10:30',
  '10:30': '13:00',
  '14:30': '16:30',
  '16:30': '18:30',
  '18:30': '19:00',
};

const parseJwtPayload = (token) => {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
};

const isExpiredToken = (token) => {
  const payload = parseJwtPayload(token);
  return !payload?.exp || payload.exp * 1000 <= Date.now();
};

const emptyTestimonial = {
  id: null,
  name: '',
  text: '',
  rating: 5,
  published: true,
};

const emptyExpenseForm = {
  id: null,
  description: '',
  category: 'Salao',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function AdminPanel() {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('bookings');
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);
  const [managementMenuOpen, setManagementMenuOpen] = useState(false);
  const [clientsMenuOpen, setClientsMenuOpen] = useState(false);
  const [bookingView, setBookingView] = useState('calendar');
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [birthdayMonthCursor, setBirthdayMonthCursor] = useState(() => new Date());

  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [fetchingBookings, setFetchingBookings] = useState(true);
  const [approvedPaymentsWithoutBooking, setApprovedPaymentsWithoutBooking] = useState([]);
  const [fetchingPaymentAlerts, setFetchingPaymentAlerts] = useState(true);
  const [showPaymentIssueModal, setShowPaymentIssueModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [crmClients, setCrmClients] = useState([]);
  const [crmStats, setCrmStats] = useState({
    total: 0,
    completed: 0,
    missing: 0,
    withWhatsappMissing: 0,
    invited: 0,
    noSource: 0,
    noPreferences: 0,
    noBirthday: 0,
    doNotInvite: 0,
  });
  const [crmInviteLink, setCrmInviteLink] = useState('');
  const [fetchingCrm, setFetchingCrm] = useState(true);
  const [sendingCrmInviteIds, setSendingCrmInviteIds] = useState({});
  const [sendingCrmBulkInvite, setSendingCrmBulkInvite] = useState(false);
  const [sendingCrmCampaign, setSendingCrmCampaign] = useState(false);
  const [monthlyBirthdays, setMonthlyBirthdays] = useState({ year: null, month: null, monthName: '', celebrants: [] });
  const [fetchingBirthdays, setFetchingBirthdays] = useState(true);
  const [clientBirthdays, setClientBirthdays] = useState([]);
  const [fetchingClientBirthdays, setFetchingClientBirthdays] = useState(true);
  const [birthdayFilter, setBirthdayFilter] = useState('pending');
  const [sendingBirthdayIds, setSendingBirthdayIds] = useState({});
  const [savingBirthdayClientIds, setSavingBirthdayClientIds] = useState({});

  // ── Schedule Blocks ──────────────────────────────────────────────
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [fetchingBlocks, setFetchingBlocks] = useState(false);
  const blocksLoadedRef = useRef(false);

  const [testimonials, setTestimonials] = useState([]);
  const [fetchingTestimonials, setFetchingTestimonials] = useState(true);
  const [testimonialSaving, setTestimonialSaving] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonial);
  const [financeExpenses, setFinanceExpenses] = useState([]);
  const [fetchingFinanceExpenses, setFetchingFinanceExpenses] = useState(true);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  // ── Admin Booking Modal ────────────────────────────────────────
  const [showAdminBookingModal, setShowAdminBookingModal] = useState(false);
  const [adminBookingSaving, setAdminBookingSaving] = useState(false);
  const [adminBookingAgendaDays, setAdminBookingAgendaDays] = useState([]);
  const [adminBookingAgendaLoading, setAdminBookingAgendaLoading] = useState(false);
  const [adminBookingAgendaError, setAdminBookingAgendaError] = useState('');
  const [adminBookingForm, setAdminBookingForm] = useState({
    attendeeName: '',
    attendeePhone: '',
    attendeeEmail: '',
    serviceId: '',
    date: '',
    time: '',
    notes: '',
    amountPaid: '',
    paymentId: '',
  });

  const categories = ['Unhas', 'Cabelo', 'Estudio'];
  const adminBookingAvailableTimes = useMemo(() => {
    if (!adminBookingForm.date) return [];
    const day = adminBookingAgendaDays.find((item) => item.date === adminBookingForm.date);
    return (day?.availableSlots || []).map((slot) => slot.time);
  }, [adminBookingAgendaDays, adminBookingForm.date]);

  const requireAdminToken = useCallback(() => {
    const token = getToken();
    if (!token || isExpiredToken(token)) {
      logout();
      navigate('/login');
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    return token;
  }, [getToken, logout, navigate]);

  const handleAuthFailure = useCallback((errorMessage) => {
    if (/token/i.test(errorMessage || '')) {
      logout();
      navigate('/login');
      return ADMIN_SESSION_EXPIRED_MESSAGE;
    }
    return errorMessage;
  }, [logout, navigate]);

  useEffect(() => {
    if (activeTab !== 'bookings' || bookingView !== 'calendar') return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, bookingView]);

  useEffect(() => {
    if (!showAdminBookingModal || !adminBookingForm.serviceId) {
      setAdminBookingAgendaDays([]);
      setAdminBookingAgendaError('');
      return;
    }

    let cancelled = false;
    const fetchAdminBookingAgenda = async () => {
      try {
        setAdminBookingAgendaLoading(true);
        setAdminBookingAgendaError('');
        const params = new URLSearchParams({ days: '90', serviceId: adminBookingForm.serviceId });
        const res = await fetch(`${API}/bookings/public-agenda?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar horarios disponiveis.');
        if (!cancelled) setAdminBookingAgendaDays(Array.isArray(data.agendaDays) ? data.agendaDays : []);
      } catch (error) {
        if (!cancelled) {
          setAdminBookingAgendaDays([]);
          setAdminBookingAgendaError(error.message || 'Erro ao carregar horarios disponiveis.');
        }
      } finally {
        if (!cancelled) setAdminBookingAgendaLoading(false);
      }
    };

    fetchAdminBookingAgenda();
    return () => {
      cancelled = true;
    };
  }, [adminBookingForm.serviceId, showAdminBookingModal]);

  useEffect(() => {
    if (!adminBookingForm.time) return;
    if (!adminBookingAvailableTimes.length || adminBookingAvailableTimes.includes(adminBookingForm.time)) return;
    setAdminBookingForm((f) => ({ ...f, time: '' }));
  }, [adminBookingAvailableTimes, adminBookingForm.time]);

  const fetchImages = useCallback(async () => {
    try {
      setFetching(true);
      const res = await fetch(`${API}/gallery`);
      if (!res.ok) throw new Error('Falha ao buscar imagens');
      setImages(await res.json());
    } catch (error) {
      toast.error('Erro ao carregar galeria');
      console.error(error);
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setFetchingBookings(true);
      const res = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Falha ao buscar agendamentos');
      setBookings(await res.json());
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
      console.error(error);
    } finally {
      setFetchingBookings(false);
    }
  }, [getToken]);

  const fetchApprovedPaymentsWithoutBooking = useCallback(async () => {
    try {
      setFetchingPaymentAlerts(true);
      const res = await fetch(`${API}/payments/admin/approved-without-booking`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || 'Falha ao buscar pagamentos sem agendamento');
      setApprovedPaymentsWithoutBooking(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erro ao carregar alertas de pagamento');
      console.error(error);
    } finally {
      setFetchingPaymentAlerts(false);
    }
  }, [getToken]);

  const fetchTestimonials = useCallback(async () => {
    try {
      setFetchingTestimonials(true);
      const res = await fetch(`${API}/testimonials/admin`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Falha ao buscar depoimentos');
      setTestimonials(await res.json());
    } catch (error) {
      toast.error('Erro ao carregar depoimentos');
      console.error(error);
    } finally {
      setFetchingTestimonials(false);
    }
  }, [getToken]);

  const fetchFinanceExpenses = useCallback(async () => {
    try {
      setFetchingFinanceExpenses(true);
      const res = await fetch(`${API}/finance/expenses`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || 'Falha ao buscar despesas');
      setFinanceExpenses(data);
    } catch (error) {
      toast.error('Erro ao carregar financeiro');
      console.error(error);
    } finally {
      setFetchingFinanceExpenses(false);
    }
  }, [getToken]);

  const fetchMonthlyBirthdays = useCallback(async () => {
    try {
      setFetchingBirthdays(true);
      const token = requireAdminToken();
      const params = new URLSearchParams({
        year: String(birthdayMonthCursor.getFullYear()),
        month: String(birthdayMonthCursor.getMonth() + 1),
      });
      const res = await fetch(`${API}/birthday-rewards/admin/monthly?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Falha ao buscar aniversariantes');
      setMonthlyBirthdays({
        year: data.year,
        month: data.month,
        monthName: data.monthName || '',
        celebrants: Array.isArray(data.celebrants) ? data.celebrants : [],
      });
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar aniversariantes');
      console.error(error);
    } finally {
      setFetchingBirthdays(false);
    }
  }, [birthdayMonthCursor, handleAuthFailure, requireAdminToken]);

  const fetchClientBirthdays = useCallback(async () => {
    try {
      setFetchingClientBirthdays(true);
      const token = requireAdminToken();
      const res = await fetch(`${API}/birthday-rewards/admin/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Falha ao buscar datas de nascimento');
      setClientBirthdays(Array.isArray(data.clients) ? data.clients : []);
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar datas de nascimento');
      console.error(error);
    } finally {
      setFetchingClientBirthdays(false);
    }
  }, [handleAuthFailure, requireAdminToken]);

  const fetchCrmClients = useCallback(async () => {
    try {
      setFetchingCrm(true);
      const token = requireAdminToken();
      const res = await fetch(`${API}/crm/admin/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Falha ao buscar CRM');
      setCrmClients(Array.isArray(data.clients) ? data.clients : []);
      setCrmStats(data.stats || { total: 0, completed: 0, missing: 0, withWhatsappMissing: 0, invited: 0 });
      setCrmInviteLink(data.inviteLink || '');
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar CRM');
      console.error(error);
    } finally {
      setFetchingCrm(false);
    }
  }, [handleAuthFailure, requireAdminToken]);

  const fetchScheduleBlocks = useCallback(async () => {
    try {
      setFetchingBlocks(true);
      const token = requireAdminToken();
      const res = await fetch(`${API}/schedule-blocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Falha ao buscar bloqueios');
      setScheduleBlocks(data);
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar bloqueios de agenda');
      console.error(error);
    } finally {
      blocksLoadedRef.current = true;
      setFetchingBlocks(false);
    }
  }, [handleAuthFailure, requireAdminToken]);

  const handleCreateBlock = async (payload) => {
    const token = requireAdminToken();
    const res = await fetch(`${API}/schedule-blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(handleAuthFailure(data.error) || 'Erro ao criar bloqueio');
      error.bookingWarnings = Array.isArray(data.bookingWarnings) ? data.bookingWarnings : [];
      throw error;
    }
    setScheduleBlocks((prev) => [data, ...prev]);
    return data;
  };

  const handleDeleteBlock = async (uid) => {
    const token = requireAdminToken();
    const res = await fetch(`${API}/schedule-blocks/${uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao remover bloqueio');
    setScheduleBlocks((prev) => prev.filter((b) => b.uid !== uid));
  };

  useEffect(() => {
    fetchImages();
    fetchBookings();
    fetchApprovedPaymentsWithoutBooking();
    fetchTestimonials();
    fetchFinanceExpenses();
    fetchClientBirthdays();
    fetchCrmClients();
  }, [fetchApprovedPaymentsWithoutBooking, fetchBookings, fetchClientBirthdays, fetchCrmClients, fetchFinanceExpenses, fetchImages, fetchTestimonials]);

  useEffect(() => {
    fetchMonthlyBirthdays();
  }, [fetchMonthlyBirthdays]);

  // Carrega bloqueios quando a aba é aberta pela primeira vez
  useEffect(() => {
    if (activeTab === 'blocks' && !blocksLoadedRef.current && !fetchingBlocks) {
      fetchScheduleBlocks();
    }
  }, [activeTab, fetchScheduleBlocks, fetchingBlocks]);

  const refreshAll = () => {
    fetchBookings();
    fetchApprovedPaymentsWithoutBooking();
    fetchImages();
    fetchTestimonials();
    fetchFinanceExpenses();
    fetchMonthlyBirthdays();
    fetchClientBirthdays();
    fetchCrmClients();
    if (activeTab === 'blocks') fetchScheduleBlocks();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.warning('Selecione pelo menos uma imagem');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    formData.append('category', category);

    try {
      setLoading(true);
      const res = await fetch(`${API}/gallery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Falha no upload');
      toast.success(`${files.length} imagem(ns) enviada(s) com sucesso!`);
      setFiles([]);
      fetchImages();
    } catch (error) {
      toast.error('Erro ao enviar imagem');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    showConfirmToast({
      message: 'Tem certeza que deseja deletar esta imagem?',
      confirmLabel: 'Deletar',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/gallery?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });

          if (!res.ok) throw new Error('Falha ao deletar');
          toast.success('Imagem deletada!');
          fetchImages();
        } catch (error) {
          toast.error('Erro ao deletar imagem');
          console.error(error);
        }
      },
    });
  };

  const updateBookingInList = (updatedBooking) => {
    setBookings((current) => current.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking)));
  };

  const resetAdminBookingForm = () => {
    setAdminBookingForm({
      attendeeName: '',
      attendeePhone: '',
      attendeeEmail: '',
      serviceId: '',
      date: '',
      time: '',
      notes: '',
      amountPaid: '',
      paymentId: '',
    });
  };

  const openAdminBookingFromPayment = (payment) => {
    const scheduledAt = payment?.scheduledAt ? new Date(payment.scheduledAt) : null;
    setAdminBookingForm({
      attendeeName: payment?.user?.name || '',
      attendeePhone: payment?.user?.whatsappPhone || '',
      attendeeEmail: payment?.user?.email || '',
      serviceId: payment?.serviceId || '',
      date: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? dateKey(scheduledAt) : '',
      time: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? formatTime(scheduledAt) : '',
      notes: 'Agendamento criado a partir de pagamento aprovado sem agendamento.',
      amountPaid: Number.isFinite(Number(payment?.amount)) ? String(payment.amount).replace('.', ',') : '',
      paymentId: payment?.id || '',
    });
    setShowPaymentIssueModal(false);
    setShowAdminBookingModal(true);
  };

  // ── Admin Booking Submit ───────────────────────────────────────
  const handleAdminBookingSubmit = async (e) => {
    e.preventDefault();
    if (adminBookingSaving) return;

    const { attendeeName, attendeePhone, serviceId, date, time } = adminBookingForm;
    if (!attendeeName.trim() || !attendeePhone.trim() || !serviceId || !date || !time) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setAdminBookingSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/bookings/admin-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...adminBookingForm,
          amountPaid: adminBookingForm.amountPaid ? parseFloat(adminBookingForm.amountPaid.replace(',', '.')) : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar agendamento.');
      }

      toast.success('Agendamento criado com sucesso!');
      setShowAdminBookingModal(false);
      resetAdminBookingForm();
      fetchBookings();
      fetchApprovedPaymentsWithoutBooking();
    } catch (error) {
      toast.error(error.message || 'Erro ao criar agendamento.');
    } finally {
      setAdminBookingSaving(false);
    }
  };

  const handleCompleteService = async (booking) => {
    try {
      const res = await fetch(`${API}/bookings/${booking.id}/complete-service`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar servico realizado');
      updateBookingInList(data);
      toast.success('Serviço confirmado e fidelidade liberada!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUndoCompleteService = async (booking) => {
    showConfirmToast({
      message: 'Desfazer a confirmacao deste servico e remover os selos liberados?',
      confirmLabel: 'Desfazer',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/bookings/${booking.id}/undo-complete-service`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao desfazer confirmacao');
          updateBookingInList(data);
          toast.info('Confirmacao desfeita. Fidelidade voltou para pendente.');
        } catch (error) {
          toast.error(error.message);
        }
      },
    });
  };

  const handleMarkNoShow = async (booking) => {
    showConfirmToast({
      message: 'Marcar este cliente como faltou ao agendamento?',
      confirmLabel: 'Marcar falta',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/bookings/${booking.id}/no-show`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao marcar falta');
          updateBookingInList(data);
          toast.info('Agendamento marcado como falta.');
        } catch (error) {
          toast.error(error.message);
        }
      },
    });
  };

  const handleCancelBooking = async (booking) => {
    showConfirmToast({
      message: 'Cancelar este agendamento?',
      confirmLabel: 'Cancelar agend.',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/bookings/${booking.id}/cancel`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao cancelar agendamento');
          updateBookingInList(data);
          toast.info('Agendamento cancelado.');
        } catch (error) {
          toast.error(error.message);
        }
      },
    });
  };

  const handleMarkRemainingPaid = async (booking) => {
    showConfirmToast({
      message: 'Confirmar que o restante deste servico foi pago no atendimento?',
      confirmLabel: 'Dar baixa',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/bookings/${booking.id}/mark-remaining-paid`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao dar baixa no restante');
          updateBookingInList(data);
          toast.success('Restante marcado como pago.');
        } catch (error) {
          toast.error(error.message);
        }
      },
    });
  };

  const handleResendBookingWhatsapp = async (booking) => {
    showConfirmToast({
      message: `Reenviar confirmacao por WhatsApp para "${booking.attendeeName || booking.user?.name || 'cliente'}"?`,
      confirmLabel: 'Reenviar',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/bookings/${booking.id}/resend-whatsapp`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao reenviar WhatsApp');
          if (data.booking) updateBookingInList(data.booking);
          toast.success(data.message || 'WhatsApp reenviado para a cliente.');
        } catch (error) {
          toast.error(error.message || 'Erro ao reenviar WhatsApp.');
        }
      },
    });
  };

  const handleSendBirthdayWhatsapp = async (celebrant) => {
    showConfirmToast({
      message: `Enviar mensagem de aniversario para "${celebrant.name}"?`,
      confirmLabel: 'Enviar',
      onConfirm: async () => {
        setSendingBirthdayIds((current) => ({ ...current, [celebrant.id]: true }));
        try {
          const token = requireAdminToken();
          const res = await fetch(`${API}/birthday-rewards/admin/${celebrant.id}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ year: monthlyBirthdays.year || new Date().getFullYear() }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao enviar aniversario');
          toast.success(data.message || 'Mensagem de aniversario enviada.');
          await fetchMonthlyBirthdays();
        } catch (error) {
          toast.error(error.message || 'Erro ao enviar aniversario.');
        } finally {
          setSendingBirthdayIds((current) => {
            const next = { ...current };
            delete next[celebrant.id];
            return next;
          });
        }
      },
    });
  };

  const handleSaveClientBirthday = async (client, dateOfBirth) => {
    setSavingBirthdayClientIds((current) => ({ ...current, [client.id]: true }));
    try {
      const token = requireAdminToken();
      const res = await fetch(`${API}/birthday-rewards/admin/${client.id}/date-of-birth`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dateOfBirth: dateOfBirth || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao salvar data de nascimento');
      if (data.user) {
        setClientBirthdays((current) => current.map((item) => (item.id === data.user.id ? data.user : item)));
      }
      toast.success(data.message || 'Data de nascimento salva.');
      await fetchMonthlyBirthdays();
      return true;
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar data de nascimento.');
      return false;
    } finally {
      setSavingBirthdayClientIds((current) => {
        const next = { ...current };
        delete next[client.id];
        return next;
      });
    }
  };

  const handleSendCrmInvite = async (client) => {
    setSendingCrmInviteIds((current) => ({ ...current, [client.id]: true }));
    try {
      const token = requireAdminToken();
      const res = await fetch(`${API}/crm/admin/clients/${client.id}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao enviar convite CRM');
      toast.success(data.message || 'Convite CRM enviado.');
      await fetchCrmClients();
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar convite CRM.');
    } finally {
      setSendingCrmInviteIds((current) => {
        const next = { ...current };
        delete next[client.id];
        return next;
      });
    }
  };

  const handleSendCrmInviteToMissing = async () => {
    showConfirmToast({
      message: `Enviar convite pelo WhatsApp para ${crmStats.withWhatsappMissing || 0} cliente(s) sem perfil CRM preenchido?`,
      confirmLabel: 'Enviar',
      onConfirm: async () => {
        setSendingCrmBulkInvite(true);
        try {
          const token = requireAdminToken();
          const res = await fetch(`${API}/crm/admin/invite-missing`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao enviar convites CRM');
          toast.success(`${data.sent || 0} convite(s) enviado(s).`);
          if (data.failed) toast.info(`${data.failed} convite(s) nao foram enviados.`);
          await fetchCrmClients();
        } catch (error) {
          toast.error(error.message || 'Erro ao enviar convites CRM.');
        } finally {
          setSendingCrmBulkInvite(false);
        }
      },
    });
  };

  const handleToggleCrmDoNotInvite = async (client) => {
    if (!client.userId) {
      toast.info('Esta cliente ainda nao tem conta vinculada. Use o WhatsApp manual para evitar novos convites.');
      return;
    }

    const shouldBlock = !client.inviteBlocked;
    try {
      const token = requireAdminToken();
      const res = await fetch(`${API}/crm/admin/clients/${client.userId}/do-not-invite`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ doNotInvite: shouldBlock }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao atualizar controle de convite');
      toast.success(shouldBlock ? 'Cliente marcada para nao insistir.' : 'Convites liberados para esta cliente.');
      await fetchCrmClients();
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar controle de convite.');
    }
  };

  const handleCopyCrmInviteText = async () => {
    const text = [
      'Oi! Para deixar seu atendimento no Studio Thallyta Silveira ainda mais personalizado, voce pode preencher rapidinho suas preferências.',
      '',
      `Acesse: ${crmInviteLink || `${window.location.origin}/preferências`}`,
      '',
      'É opcional e leva menos de 1 minuto.',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Texto do convite copiado.');
    } catch {
      toast.info(text);
    }
  };

  const handleSendCrmCampaign = async ({ clientIds, message, promotional }) => {
    if (!clientIds.length) {
      toast.error('Selecione pelo menos uma cliente.');
      return;
    }

    if (!message.trim()) {
      toast.error('Escreva a mensagem da campanha.');
      return;
    }

    showConfirmToast({
      message: `Enviar campanha por WhatsApp para ${clientIds.length} cliente(s) selecionada(s)?`,
      confirmLabel: 'Enviar',
      onConfirm: async () => {
        setSendingCrmCampaign(true);
        try {
          const token = requireAdminToken();
          const res = await fetch(`${API}/crm/admin/campaigns/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ clientIds, message, promotional }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao enviar campanha');
          toast.success(`${data.sent || 0} mensagem(ns) enviada(s).`);
          if (data.skipped) toast.info(`${data.skipped} cliente(s) ignorada(s) por regras de contato.`);
          if (data.failed) toast.warn(`${data.failed} envio(s) falharam.`);
          await fetchCrmClients();
        } catch (error) {
          toast.error(error.message || 'Erro ao enviar campanha.');
        } finally {
          setSendingCrmCampaign(false);
        }
      },
    });
  };

  const handleDeleteClient = async (clientEmail, clientName) => {
    showConfirmToast({
      message: `Excluir "${clientName}" e todos os dados (agendamentos, pagamentos, selos)? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/bookings/clients/${encodeURIComponent(clientEmail)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao excluir cliente');
          toast.success(data.message || 'Cliente excluído com sucesso.');
          await fetchBookings();
          await fetchCrmClients();
        } catch (error) {
          toast.error(error.message);
        }
      },
    });
  };

  const handleUpdateClientBirthday = async (client, dateOfBirth) => {
    if (!client.userId) {
      toast.error('Este cliente nao tem cadastro vinculado para salvar aniversario.');
      return false;
    }

    const saved = await handleSaveClientBirthday({ id: client.userId }, dateOfBirth);
    if (saved) {
      await fetchBookings();
      await fetchClientBirthdays();
      await fetchCrmClients();
    }
    return saved;
  };

  const handleUpdateClientWhatsapp = async (client, whatsappPhone) => {
    const digits = onlyDigits(whatsappPhone);
    if (digits.length < 10) {
      toast.error('Informe um WhatsApp valido com DDD.');
      return false;
    }

    try {
      const token = requireAdminToken();
      const res = await fetch(`${API}/bookings/clients/whatsapp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: client.userId || null,
          bookingIds: client.bookings.map((booking) => booking.id),
          whatsappPhone: normalizeBrazilWhatsapp(whatsappPhone),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(handleAuthFailure(data.error) || 'Erro ao atualizar WhatsApp');
      toast.success(data.message || 'WhatsApp atualizado.');
      await fetchBookings();
      await fetchCrmClients();
      return true;
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar WhatsApp.');
      return false;
    }
  };

  const handleSyncBookingToCal = async (booking) => {
    try {
      const res = await fetch(`${API}/bookings/${booking.id}/sync-cal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar para o Cal.com');
      updateBookingInList(data);
      toast.success('Agendamento enviado para o Cal.com.');
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar para o Cal.com.');
    }
  };

  const handleResolvePaymentWithoutBooking = async (payment) => {
    showConfirmToast({
      message: `Marcar o pagamento de "${payment.user?.name || payment.serviceName || 'cliente'}" como resolvido sem criar agendamento?`,
      confirmLabel: 'Resolver',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/payments/admin/approved-without-booking/${payment.id}/resolve`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ note: 'Resolvido manualmente pela administradora.' }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Erro ao marcar pagamento como resolvido');
          setApprovedPaymentsWithoutBooking((current) => current.map((item) => (item.id === payment.id ? data : item)));
          toast.success('Pagamento marcado como resolvido.');
        } catch (error) {
          toast.error(error.message || 'Erro ao marcar pagamento como resolvido.');
        }
      },
    });
  };

  const handleSaveTestimonial = async (e) => {
    e.preventDefault();
    const name = testimonialForm.name.trim();
    const text = testimonialForm.text.trim();

    if (!name || !text) {
      toast.warning('Informe nome e depoimento');
      return;
    }

    const isEditing = Boolean(testimonialForm.id);
    const url = isEditing
      ? `${API}/testimonials/${testimonialForm.id}`
      : `${API}/testimonials`;

    try {
      setTestimonialSaving(true);
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name,
          text,
          rating: Number(testimonialForm.rating),
          published: Boolean(testimonialForm.published),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar depoimento');

      toast.success(isEditing ? 'Depoimento atualizado!' : 'Depoimento publicado!');
      setTestimonialForm(emptyTestimonial);
      fetchTestimonials();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTestimonialSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id) => {
    showConfirmToast({
      message: 'Tem certeza que deseja deletar este depoimento?',
      confirmLabel: 'Deletar',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/testimonials/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (!res.ok) throw new Error('Falha ao deletar depoimento');
          toast.success('Depoimento deletado!');
          fetchTestimonials();
        } catch (error) {
          toast.error(error.message);
        }
      },
    });
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    const description = expenseForm.description.trim();
    const amount = Number(String(expenseForm.amount).replace(',', '.'));

    if (!description) {
      toast.warning('Informe a descricao da despesa');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.warning('Informe um valor valido para a despesa');
      return;
    }

    try {
      setExpenseSaving(true);
      const isEditing = Boolean(expenseForm.id);
      const res = await fetch(`${API}/finance/expenses${isEditing ? `/${expenseForm.id}` : ''}`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          description,
          category: expenseForm.category || 'Salao',
          amount,
          date: expenseForm.date || new Date().toISOString().slice(0, 10),
          notes: expenseForm.notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (isEditing ? 'Erro ao atualizar despesa' : 'Erro ao registrar despesa'));

      setFinanceExpenses((current) => (
        isEditing
          ? current.map((expense) => (expense.id === data.id ? data : expense))
          : [data, ...current]
      ));
      setExpenseForm(emptyExpenseForm);
      toast.success(isEditing ? 'Despesa atualizada.' : 'Despesa registrada no financeiro.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExpenseSaving(false);
    }
  };

  const deleteExpense = async (id) => {
    try {
      const res = await fetch(`${API}/finance/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao remover despesa');

      setFinanceExpenses((current) => current.filter((expense) => expense.id !== id));
      toast.info('Despesa removida.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteExpense = (id) => {
    toast(
      ({ closeToast }) => (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-cream">Remover esta despesa do financeiro?</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeToast}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-cream/70 hover:border-white/20 hover:text-cream"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                closeToast();
                deleteExpense(id);
              }}
              className="rounded-full border border-red-400/25 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-100 hover:bg-red-500/25"
            >
              Remover
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };

  const handleEditExpense = (expense) => {
    setExpenseForm({
      id: expense.id,
      description: expense.description || '',
      category: expense.category || 'Salao',
      amount: Number(expense.amount || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      date: toFinanceInputDate(expense.date),
      notes: expense.notes || '',
    });
    setActiveTab('finance');
    toast.info('Despesa carregada para edicao.');
  };

  const toggleTestimonial = async (testimonial) => {
    try {
      const res = await fetch(`${API}/testimonials/${testimonial.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ published: !testimonial.published }),
      });
      if (!res.ok) throw new Error('Falha ao alterar visibilidade');
      fetchTestimonials();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter((booking) => booking.status === statusFilter);
  const pendingCompletionBookings = useMemo(
    () => bookings.filter((booking) => !['cancelled', 'no_show'].includes(booking.status) && !booking.serviceCompletedAt),
    [bookings],
  );
  const unresolvedApprovedPayments = useMemo(
    () => approvedPaymentsWithoutBooking.filter((payment) => !payment.resolved),
    [approvedPaymentsWithoutBooking],
  );
  const loyaltyClients = useMemo(() => buildLoyaltyClients(bookings), [bookings]);
  const clientProfiles = useMemo(() => buildClientProfiles(bookings), [bookings]);
  const birthdayCelebrants = monthlyBirthdays.celebrants || [];
  const filteredBirthdayCelebrants = useMemo(() => (
    birthdayCelebrants.filter((celebrant) => {
      if (birthdayFilter === 'clients') return false;
      if (birthdayFilter === 'today') return celebrant.isToday;
      if (birthdayFilter === 'pending') return celebrant.rewardStatus !== 'sent' && Boolean(celebrant.whatsappPhone);
      if (birthdayFilter === 'sent') return celebrant.rewardStatus === 'sent';
      if (birthdayFilter === 'no_whatsapp') return !celebrant.whatsappPhone;
      return true;
    })
  ), [birthdayCelebrants, birthdayFilter]);
  const pendingBirthdayCount = useMemo(
    () => birthdayCelebrants.filter((celebrant) => celebrant.rewardStatus !== 'sent' && Boolean(celebrant.whatsappPhone)).length,
    [birthdayCelebrants],
  );

  const analytics = useMemo(() => buildAnalytics(bookings), [bookings]);
  const financeSummary = useMemo(() => buildFinanceSummary(bookings, financeExpenses), [bookings, financeExpenses]);
  const erpSummary = useMemo(() => buildErpSummary({
    analytics,
    bookings,
    crmStats,
    financeSummary,
    pendingCompletionBookings,
    unresolvedApprovedPayments,
  }), [analytics, bookings, crmStats, financeSummary, pendingCompletionBookings, unresolvedApprovedPayments]);
  const calendarDays = useMemo(() => buildCalendarDays(monthCursor, filteredBookings), [monthCursor, filteredBookings]);
  const monthLabel = monthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const moveMonth = (amount) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const moveBirthdayMonth = (amount) => {
    setBirthdayMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };
  const managementActive = ['erp', 'analytics', 'finance'].includes(activeTab);
  const relationshipActive = ['clients', 'loyalty', 'crm', 'crmInsights', 'campaigns'].includes(activeTab);
  const managementCount = erpSummary.priorityCount || financeExpenses.length || 0;
  const relationshipCount = clientProfiles.length + (crmStats.missing || 0);
  const adminTabs = [
    { value: 'bookings', icon: <FiCalendar />, label: 'Agenda', count: bookings.length + unresolvedApprovedPayments.length },
    { value: 'management', icon: <FiBriefcase />, label: 'Administração', count: managementCount || undefined },
    { value: 'relationship', icon: <FiUsers />, label: 'Relacionamento', count: relationshipCount || undefined },
    { value: 'gallery', icon: <FiImage />, label: 'Galeria', count: images.length },
    { value: 'testimonials', icon: <FiMessageSquare />, label: 'Depoimentos', count: testimonials.length },
    { value: 'blocks', icon: <FiSlash />, label: 'Bloqueios', count: scheduleBlocks.length || undefined },
  ];
  const activeAdminTab = managementActive
    ? { value: 'management', icon: <FiBriefcase />, label: 'Administração', count: managementCount || undefined }
    : relationshipActive
    ? { value: 'relationship', icon: <FiUsers />, label: 'Relacionamento', count: relationshipCount || undefined }
    : adminTabs.find((tab) => tab.value === activeTab) || adminTabs[0];
  const selectAdminTab = (tab) => {
    setActiveTab(tab.value);
    setMobileAdminMenuOpen(false);
    setManagementMenuOpen(false);
    setClientsMenuOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-dark p-4 text-cream md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold">Painel Administrativo</h1>
            <p className="mt-1 text-sm text-cream/40">
              Logado como <span className="text-gold-light">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-cream/60 hover:border-gold/30 hover:text-gold"
            >
              <FiRefreshCw /> Atualizar
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/10"
            >
              <FiHome /> Site
            </Link>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              <FiLogOut /> Sair
            </button>
          </div>
        </div>

        <div className="admin-tablet-portrait-block relative mb-6 md:hidden">
          <button
            type="button"
            onClick={() => setMobileAdminMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-black/45 px-4 py-3 text-left text-sm font-semibold text-gold-light backdrop-blur-md"
            aria-expanded={mobileAdminMenuOpen}
            aria-label="Abrir menu do painel"
          >
            <span className="flex min-w-0 items-center gap-3">
              <FiMenu className="shrink-0" />
              <span className="flex min-w-0 items-center gap-2">
                {activeAdminTab.icon}
                <span className="truncate">{activeAdminTab.label}</span>
              </span>
            </span>
            {typeof activeAdminTab.count === 'number' && activeAdminTab.count > 0 && (
              <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
                {activeAdminTab.count}
              </span>
            )}
          </button>

          {mobileAdminMenuOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 grid gap-1 rounded-2xl border border-white/10 bg-[#090706]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-md">
              {adminTabs.map((tab) => (
                <div key={tab.value}>
                  <button
                    type="button"
                    onClick={() => {
                      if (tab.value === 'management') {
                        setManagementMenuOpen((open) => !open);
                        setClientsMenuOpen(false);
                        return;
                      }
                      if (tab.value === 'relationship') {
                        setClientsMenuOpen((open) => !open);
                        setManagementMenuOpen(false);
                        return;
                      }
                      selectAdminTab(tab);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      (tab.value === 'management' ? managementActive : tab.value === 'relationship' ? relationshipActive : activeTab === tab.value)
                        ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                        : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                    </span>
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${(tab.value === 'management' ? managementActive : tab.value === 'relationship' ? relationshipActive : activeTab === tab.value) ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                  {tab.value === 'management' && managementMenuOpen && (
                    <div className="mt-1 space-y-1">
                      <MobileSubTabButton
                        active={activeTab === 'erp'}
                        icon={<FiBriefcase />}
                        label="Gestão"
                        count={erpSummary.priorityCount || undefined}
                        onClick={() => selectAdminTab({ value: 'erp' })}
                      />
                      <MobileSubTabButton
                        active={activeTab === 'analytics'}
                        icon={<FiBarChart2 />}
                        label="Análises"
                        onClick={() => selectAdminTab({ value: 'analytics' })}
                      />
                      <MobileSubTabButton
                        active={activeTab === 'finance'}
                        icon={<FiDollarSign />}
                        label="Financeiro"
                        count={financeExpenses.length || undefined}
                        onClick={() => selectAdminTab({ value: 'finance' })}
                      />
                    </div>
                  )}
                  {tab.value === 'relationship' && clientsMenuOpen && (
                    <div className="mt-1 space-y-1">
                      <MobileSubTabButton
                        active={activeTab === 'clients'}
                        icon={<FiUsers />}
                        label="Clientes"
                        count={clientProfiles.length}
                        onClick={() => selectAdminTab({ value: 'clients' })}
                      />
                      <MobileSubTabButton
                        active={activeTab === 'loyalty'}
                        icon={<FiAward />}
                        label="Fidelidade"
                        count={pendingCompletionBookings.length}
                        onClick={() => selectAdminTab({ value: 'loyalty' })}
                      />
                      <MobileSubTabButton
                        active={activeTab === 'crm'}
                        icon={<FiSend />}
                        label="CRM"
                        count={crmStats.missing || undefined}
                        onClick={() => selectAdminTab({ value: 'crm' })}
                      />
                      <MobileSubTabButton
                        active={activeTab === 'crmInsights'}
                        icon={<FiBarChart2 />}
                        label="Insights"
                        onClick={() => selectAdminTab({ value: 'crmInsights' })}
                      />
                      <MobileSubTabButton
                        active={activeTab === 'campaigns'}
                        icon={<FiMessageSquare />}
                        label="Campanhas"
                        onClick={() => selectAdminTab({ value: 'campaigns' })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-tablet-portrait-hidden relative z-50 mb-6 hidden flex-wrap gap-2 overflow-visible rounded-2xl border border-white/10 bg-black/30 p-1 backdrop-blur-md md:flex">
          <TabButton active={activeTab === 'bookings'} icon={<FiCalendar />} label="Agenda" count={bookings.length + unresolvedApprovedPayments.length} onClick={() => setActiveTab('bookings')} />
          <div
            className="group relative"
            onMouseEnter={() => {
              setManagementMenuOpen(true);
              setClientsMenuOpen(false);
            }}
            onMouseLeave={() => setManagementMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => {
                setManagementMenuOpen((open) => !open);
              }}
              onFocus={() => setManagementMenuOpen(true)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                managementActive
                  ? 'bg-gradient-to-r from-gold to-gold-light text-dark shadow-lg shadow-gold/20'
                  : 'text-cream/55 hover:bg-white/5 hover:text-cream'
              }`}
            >
              <FiBriefcase />
              Administração
              {managementCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${managementActive ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                  {managementCount}
                </span>
              )}
              <FiChevronDown className="text-xs" />
            </button>
            {managementMenuOpen && (
              <div className="absolute left-0 top-full z-[100] min-w-48 pt-2">
                <div className="rounded-2xl border border-white/10 bg-[#090706] p-2 shadow-2xl shadow-black/70">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('erp');
                    setManagementMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'erp'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiBriefcase /> Gestão
                  </span>
                  {erpSummary.priorityCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'erp' ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                      {erpSummary.priorityCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('analytics');
                    setManagementMenuOpen(false);
                  }}
                  className={`mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'analytics'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiBarChart2 /> Análises
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('finance');
                    setManagementMenuOpen(false);
                  }}
                  className={`mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'finance'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiDollarSign /> Financeiro
                  </span>
                  {financeExpenses.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'finance' ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                      {financeExpenses.length}
                    </span>
                  )}
                </button>
                </div>
              </div>
            )}
          </div>
          <div
            className="group relative"
            onMouseEnter={() => {
              setClientsMenuOpen(true);
              setManagementMenuOpen(false);
            }}
            onMouseLeave={() => setClientsMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => {
                setClientsMenuOpen((open) => !open);
              }}
              onFocus={() => setClientsMenuOpen(true)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                relationshipActive
                  ? 'bg-gradient-to-r from-gold to-gold-light text-dark shadow-lg shadow-gold/20'
                  : 'text-cream/55 hover:bg-white/5 hover:text-cream'
              }`}
            >
              <FiUsers />
              Relacionamento
              {relationshipCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${relationshipActive ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                  {relationshipCount}
                </span>
              )}
              <FiChevronDown className="text-xs" />
            </button>
            {clientsMenuOpen && (
              <div className="absolute left-0 top-full z-[100] min-w-48 pt-2">
                <div className="rounded-2xl border border-white/10 bg-[#090706] p-2 shadow-2xl shadow-black/70">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('clients');
                    setClientsMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'clients'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiUsers /> Clientes
                  </span>
                  {clientProfiles.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'clients' ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                      {clientProfiles.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('loyalty');
                    setClientsMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'loyalty'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiAward /> Fidelidade
                  </span>
                  {pendingCompletionBookings.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'loyalty' ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                      {pendingCompletionBookings.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('crm');
                    setClientsMenuOpen(false);
                  }}
                  className={`mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'crm'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiSend /> CRM
                  </span>
                  {crmStats.missing > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'crm' ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
                      {crmStats.missing}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('crmInsights');
                    setClientsMenuOpen(false);
                  }}
                  className={`mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'crmInsights'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiBarChart2 /> Insights
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('campaigns');
                    setClientsMenuOpen(false);
                  }}
                  className={`mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeTab === 'campaigns'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
                      : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FiMessageSquare /> Campanhas
                  </span>
                </button>
                </div>
              </div>
            )}
          </div>
          <TabButton active={activeTab === 'gallery'} icon={<FiImage />} label="Galeria" count={images.length} onClick={() => setActiveTab('gallery')} />
          <TabButton active={activeTab === 'testimonials'} icon={<FiMessageSquare />} label="Depoimentos" count={testimonials.length} onClick={() => setActiveTab('testimonials')} />
          <TabButton active={activeTab === 'blocks'} icon={<FiSlash />} label="Bloqueios" count={scheduleBlocks.length || undefined} onClick={() => setActiveTab('blocks')} />
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <ApprovedPaymentsWithoutBookingAlert
              unresolvedCount={unresolvedApprovedPayments.length}
              fetching={fetchingPaymentAlerts}
              onOpen={() => setShowPaymentIssueModal(true)}
            />

            {pendingCompletionBookings.length > 0 && (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-100/75">Fidelidade pendente</p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {pendingCompletionBookings.length} {pendingCompletionBookings.length === 1 ? 'agendamento precisa' : 'agendamentos precisam'} de confirmação de presença.
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('loyalty')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold hover:bg-amber-100/10"
                  >
                    <FiAward /> Ver pendências
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Agenda</h2>
              <button
                onClick={() => setShowAdminBookingModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30 hover:brightness-110"
              >
                <FiPlus /> Novo Agendamento
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentedButton active={bookingView === 'table'} onClick={() => setBookingView('table')}>Lista</SegmentedButton>
              <SegmentedButton active={bookingView === 'calendar'} onClick={() => setBookingView('calendar')}>Calendário</SegmentedButton>
              <div className="ml-auto flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'confirmed', label: 'Confirmados' },
                  { value: 'rescheduled', label: 'Reagendados' },
                  { value: 'cancelled', label: 'Cancelados' },
                  { value: 'no_show', label: 'Faltou' },
                ].map((filter) => (
                  <SegmentedButton
                    key={filter.value}
                    active={statusFilter === filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </SegmentedButton>
                ))}
              </div>
            </div>

            {bookingView === 'calendar' ? (
              <CalendarView
                days={calendarDays}
                monthLabel={monthLabel}
                onPrev={() => moveMonth(-1)}
                onNext={() => moveMonth(1)}
                statusBadge={statusBadge}
                formatTime={formatTime}
                onFilterClick={(status) => {
                  setStatusFilter(status);
                  setBookingView('table');
                }}
              />
            ) : (
              <BookingsTable
                bookings={filteredBookings}
                fetching={fetchingBookings}
                statusFilter={statusFilter}
                statusBadge={statusBadge}
                onCompleteService={handleCompleteService}
                onUndoCompleteService={handleUndoCompleteService}
                onMarkNoShow={handleMarkNoShow}
                onCancelBooking={handleCancelBooking}
                onMarkRemainingPaid={handleMarkRemainingPaid}
                onResendWhatsapp={handleResendBookingWhatsapp}
                onSyncBookingToCal={handleSyncBookingToCal}
              />
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView analytics={analytics} />
        )}

        {activeTab === 'erp' && (
          <ErpView summary={erpSummary} onOpenTab={setActiveTab} />
        )}

        {activeTab === 'finance' && (
          <FinanceView
            summary={financeSummary}
            expenses={financeExpenses}
            fetching={fetchingFinanceExpenses}
            saving={expenseSaving}
            form={expenseForm}
            setForm={setExpenseForm}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
            onMarkRemainingPaid={handleMarkRemainingPaid}
          />
        )}

        {activeTab === 'loyalty' && (
          <LoyaltyAdminView
            clients={loyaltyClients}
            pendingBookings={pendingCompletionBookings}
            onCompleteService={handleCompleteService}
            onUndoCompleteService={handleUndoCompleteService}
            onMarkNoShow={handleMarkNoShow}
            onCancelBooking={handleCancelBooking}
            onMarkRemainingPaid={handleMarkRemainingPaid}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsView
            clients={clientProfiles}
            search={clientSearch}
            setSearch={setClientSearch}
            statusBadge={statusBadge}
            onCompleteService={handleCompleteService}
            onUndoCompleteService={handleUndoCompleteService}
            onMarkNoShow={handleMarkNoShow}
            onCancelBooking={handleCancelBooking}
            onMarkRemainingPaid={handleMarkRemainingPaid}
            onDeleteClient={handleDeleteClient}
            onUpdateClientWhatsapp={handleUpdateClientWhatsapp}
            onUpdateClientBirthday={handleUpdateClientBirthday}
            birthdayCount={pendingBirthdayCount}
            onOpenBirthdays={() => setActiveTab('birthdays')}
          />
        )}

        {activeTab === 'crm' && (
          <CrmAdminView
            clients={crmClients}
            stats={crmStats}
            inviteLink={crmInviteLink}
            fetching={fetchingCrm}
            sendingIds={sendingCrmInviteIds}
            sendingBulk={sendingCrmBulkInvite}
            onRefresh={fetchCrmClients}
            onSendInvite={handleSendCrmInvite}
            onSendBulkInvite={handleSendCrmInviteToMissing}
            onToggleDoNotInvite={handleToggleCrmDoNotInvite}
            onCopyInviteText={handleCopyCrmInviteText}
          />
        )}

        {activeTab === 'crmInsights' && (
          <CrmInsightsView clients={crmClients} stats={crmStats} fetching={fetchingCrm} onOpenCampaigns={() => setActiveTab('campaigns')} />
        )}

        {activeTab === 'campaigns' && (
          <CrmCampaignsView
            clients={crmClients}
            fetching={fetchingCrm}
            sending={sendingCrmCampaign}
            onSend={handleSendCrmCampaign}
          />
        )}

        {activeTab === 'birthdays' && (
          <BirthdaysAdminView
            monthLabel={monthlyBirthdays.monthName ? `${monthlyBirthdays.monthName} de ${monthlyBirthdays.year}` : birthdayMonthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            celebrants={filteredBirthdayCelebrants}
            allCelebrants={birthdayCelebrants}
            clients={clientBirthdays}
            fetching={fetchingBirthdays}
            fetchingClients={fetchingClientBirthdays}
            filter={birthdayFilter}
            setFilter={setBirthdayFilter}
            sendingIds={sendingBirthdayIds}
            savingClientIds={savingBirthdayClientIds}
            onSend={handleSendBirthdayWhatsapp}
            onSaveClientBirthday={handleSaveClientBirthday}
            onRefresh={() => {
              fetchMonthlyBirthdays();
              fetchClientBirthdays();
            }}
            onPrev={() => moveBirthdayMonth(-1)}
            onNext={() => moveBirthdayMonth(1)}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            categories={categories}
            category={category}
            setCategory={setCategory}
            files={files}
            setFiles={setFiles}
            loading={loading}
            handleUpload={handleUpload}
            fetching={fetching}
            images={images}
            handleDeleteImage={handleDeleteImage}
          />
        )}

        {activeTab === 'testimonials' && (
          <TestimonialsAdmin
            form={testimonialForm}
            setForm={setTestimonialForm}
            saving={testimonialSaving}
            onSave={handleSaveTestimonial}
            testimonials={testimonials}
            fetching={fetchingTestimonials}
            onEdit={setTestimonialForm}
            onDelete={handleDeleteTestimonial}
            onToggle={toggleTestimonial}
          />
        )}

        {activeTab === 'blocks' && (
          <ScheduleBlocksTab
            blocks={scheduleBlocks}
            fetching={fetchingBlocks}
            onRefresh={fetchScheduleBlocks}
            onCreate={handleCreateBlock}
            onDelete={handleDeleteBlock}
          />
        )}

        {showPaymentIssueModal && createPortal(
          <PaymentIssuesModal
            payments={approvedPaymentsWithoutBooking}
            fetching={fetchingPaymentAlerts}
            onClose={() => setShowPaymentIssueModal(false)}
            onRefresh={fetchApprovedPaymentsWithoutBooking}
            onCreateBooking={openAdminBookingFromPayment}
            onResolve={handleResolvePaymentWithoutBooking}
          />,
          document.body,
        )}

        {showAdminBookingModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
              <button
                onClick={() => {
                  setShowAdminBookingModal(false);
                  resetAdminBookingForm();
                }}
                className="absolute right-4 top-4 text-white/50 hover:text-white"
              >
                <FiX size={20} />
              </button>
              <h2 className="mb-6 text-xl font-bold text-white">
                {adminBookingForm.paymentId ? 'Agendar pagamento aprovado' : 'Novo Agendamento'}
              </h2>
              {adminBookingForm.paymentId && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Este agendamento sera vinculado ao pagamento ja aprovado e marcado como resolvido automaticamente.
                </div>
              )}
              <form onSubmit={handleAdminBookingSubmit} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">Nome da cliente *</label>
                  <input
                    type="text" required placeholder="Nome completo"
                    value={adminBookingForm.attendeeName}
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, attendeeName: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>
                {/* WhatsApp */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">WhatsApp *</label>
                  <input
                    type="tel" required placeholder="(85) 99999-9999"
                    value={adminBookingForm.attendeePhone}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                      if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
                      else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                      setAdminBookingForm((f) => ({ ...f, attendeePhone: v }));
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">Email <span className="text-white/30">(opcional)</span></label>
                  <input
                    type="email" placeholder="email@exemplo.com"
                    value={adminBookingForm.attendeeEmail}
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, attendeeEmail: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>
                {/* Serviço */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">Serviço *</label>
                  <select
                    required
                    value={adminBookingForm.serviceId}
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, serviceId: e.target.value, time: '' }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 [&>option]:bg-[#1a1a2e]"
                  >
                    <option value="">Selecione o serviço</option>
                    {allServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.price}</option>
                    ))}
                  </select>
                </div>
                {/* Valor do serviço (read-only info) */}
                {adminBookingForm.serviceId && (() => {
                  const svc = allServices.find((s) => s.id === adminBookingForm.serviceId);
                  return svc ? (
                    <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Valor do serviço</span>
                        <span className="font-semibold text-emerald-400">{svc.price}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-white/50">Duração</span>
                        <span className="text-white/70">{svc.duration}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
                {/* Data e Horário */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/70">Data *</label>
                    <input
                      type="date" required
                      min={new Date().toISOString().slice(0, 10)}
                      value={adminBookingForm.date}
                      onChange={(e) => setAdminBookingForm((f) => ({ ...f, date: e.target.value, time: '' }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/70">Horário *</label>
                    <select
                      required
                      value={adminBookingForm.time}
                      onChange={(e) => setAdminBookingForm((f) => ({ ...f, time: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 [&>option]:bg-[#1a1a2e]"
                    >
                      <option value="">
                        {adminBookingAgendaLoading
                          ? 'Carregando...'
                          : !adminBookingForm.serviceId
                            ? 'Escolha o servico'
                            : !adminBookingForm.date
                              ? 'Escolha a data'
                              : adminBookingAvailableTimes.length
                                ? 'Horario'
                                : 'Sem horarios livres'}
                      </option>
                      {adminBookingAvailableTimes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {adminBookingAgendaError && (
                      <p className="mt-1 text-xs text-red-300">{adminBookingAgendaError}</p>
                    )}
                  </div>
                </div>
                {/* Sinal pago */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">Valor do sinal pago <span className="text-white/30">(R$)</span></label>
                  <input
                    type="text" inputMode="decimal" placeholder="0,00"
                    value={adminBookingForm.amountPaid}
                    disabled={Boolean(adminBookingForm.paymentId)}
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, amountPaid: e.target.value.replace(/[^0-9,.]/g, '') }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                {/* Observações */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">Observações <span className="text-white/30">(opcional)</span></label>
                  <textarea
                    rows={2} placeholder="Alguma observação..."
                    value={adminBookingForm.notes}
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>
                {/* Submit */}
                <button
                  type="submit"
                  disabled={adminBookingSaving}
                  className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30 hover:brightness-110 disabled:opacity-50"
                >
                  {adminBookingSaving ? 'Criando agendamento...' : 'Agendar'}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}

function TabButton({ active, icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-gold to-gold-light text-dark shadow-lg'
          : 'text-cream/60 hover:bg-white/5 hover:text-cream'
      }`}
    >
      {icon} {label}
      {typeof count === 'number' && count > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function MobileSubTabButton({ active, icon, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 pl-9 text-sm font-semibold transition ${
        active
          ? 'bg-gradient-to-r from-gold to-gold-light text-dark'
          : 'text-cream/55 hover:bg-white/5 hover:text-cream'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {typeof count === 'number' && count > 0 && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function SegmentedButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
        active
          ? 'border-gold bg-gold/10 text-gold'
          : 'border-white/10 text-cream/50 hover:border-gold/30 hover:text-cream'
      }`}
    >
      {children}
    </button>
  );
}

function showConfirmToast({ message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'default', onConfirm }) {
  toast(({ closeToast }) => (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-cream">{message}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={closeToast}
          className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-cream/60 hover:border-gold/30 hover:text-gold"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            closeToast?.();
            void onConfirm();
          }}
          className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider ${
            tone === 'danger'
              ? 'border border-red-500/30 bg-red-500/15 text-red-100 hover:bg-red-500/25'
              : 'bg-gradient-to-r from-gold to-gold-light text-dark'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  ), {
    autoClose: false,
    closeOnClick: false,
    draggable: false,
    position: 'top-center',
  });
}

function ApprovedPaymentsWithoutBookingAlert({ unresolvedCount, fetching, onOpen }) {
  if (fetching && unresolvedCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-cream/45">
        Verificando pagamentos aprovados sem agendamento...
      </div>
    );
  }

  if (!unresolvedCount) return null;

  return (
    <section className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-100/70">
            <FiAlertTriangle /> Pagamento aprovado sem agendamento
          </p>
          <h2 className="mt-1 text-lg font-semibold">{unresolvedCount} {unresolvedCount === 1 ? 'caso precisa' : 'casos precisam'} de revisao.</h2>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100/30 px-4 py-2 text-sm font-semibold text-red-50 hover:bg-red-100/10"
        >
          <FiEye /> Visualizar
        </button>
      </div>
    </section>
  );
}

function PaymentIssuesModal({ payments, fetching, onClose, onRefresh, onCreateBooking, onResolve }) {
  const unresolved = payments.filter((payment) => !payment.resolved);
  const resolved = payments.filter((payment) => payment.resolved);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#15131d] p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/50 hover:text-white">
          <FiX />
        </button>

        <div className="pr-12">
          <p className="text-xs font-bold uppercase tracking-wider text-red-200/70">Pagamentos sem agenda</p>
          <h2 className="mt-1 text-2xl font-bold text-cream">Revisao de pagamentos aprovados</h2>
          <p className="mt-2 text-sm text-cream/50">Use esta area para criar o agendamento manual ou marcar o caso como resolvido.</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
            <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-red-200">{unresolved.length} pendente(s)</span>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">{resolved.length} resolvido(s)</span>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-cream/70 hover:border-gold/30 hover:text-gold">
            <FiRefreshCw /> Atualizar
          </button>
        </div>

        {fetching ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-cream/45">Carregando pagamentos...</p>
        ) : payments.length === 0 ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-cream/45">Nenhum pagamento aprovado sem agendamento encontrado.</p>
        ) : (
          <div className="mt-6 space-y-6">
            <PaymentIssueSection
              title="Pendentes"
              emptyText="Nenhum caso pendente."
              payments={unresolved}
              onCreateBooking={onCreateBooking}
              onResolve={onResolve}
            />
            <PaymentIssueSection
              title="Resolvidos"
              emptyText="Nenhum caso resolvido por aqui ainda."
              payments={resolved}
              resolved
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentIssueSection({ title, emptyText, payments, resolved = false, onCreateBooking, onResolve }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold text-gold-light">{title}</h3>
      {payments.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/45">{emptyText}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {payments.map((payment) => (
            <PaymentIssueCard
              key={payment.id}
              payment={payment}
              resolved={resolved}
              onCreateBooking={onCreateBooking}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PaymentIssueCard({ payment, resolved, onCreateBooking, onResolve }) {
  const resolutionLabel = payment.resolution?.type === 'booking_created'
    ? 'Resolvido com agendamento'
    : payment.booking
      ? 'Resolvido com agendamento'
      : 'Resolvido manualmente';

  return (
    <article className={`rounded-xl border p-4 ${resolved ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-100/15 bg-black/25'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-cream">{payment.user?.name || 'Cliente sem nome'}</h3>
          <p className="mt-1 break-words text-xs text-cream/45">
            {payment.user?.whatsappPhone || payment.user?.email || 'Contato nao informado'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="w-max rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
            {formatPaymentMethod(payment)}
          </span>
          {resolved && (
            <span className="w-max rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-light">
              Resolvido
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <PaymentInfoLine label="Servico" value={payment.serviceName || '-'} />
        <PaymentInfoLine label="Valor pago" value={formatCurrency(payment.amount)} />
        <PaymentInfoLine label="Horario escolhido" value={payment.scheduledAt ? `${formatDate(payment.scheduledAt)} - ${formatTime(payment.scheduledAt)}` : 'Nao informado'} />
        <PaymentInfoLine label="Aprovado em" value={payment.approvedAt ? `${formatDate(payment.approvedAt)} - ${formatTime(payment.approvedAt)}` : '-'} />
      </div>

      {resolved && (
        <div className="mt-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100/75">
          {resolutionLabel}
          {payment.booking?.scheduledAt && ` em ${formatDate(payment.booking.scheduledAt)} - ${formatTime(payment.booking.scheduledAt)}`}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-cream/45">
        ID Mercado Pago: <span className="font-mono text-cream/65">{payment.mercadoPagoPaymentId || '-'}</span>
      </div>

      {!resolved && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onCreateBooking(payment)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-sm font-bold text-dark">
            <FiCalendar /> Agendar
          </button>
          <button type="button" onClick={() => onResolve(payment)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-cream/70 hover:border-emerald-400/30 hover:text-emerald-200">
            <FiCheckCircle /> Marcar resolvido
          </button>
        </div>
      )}
    </article>
  );
}

function PaymentInfoLine({ label, value }) {
  return (
    <div>
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/35">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-cream/85">{value}</p>
    </div>
  );
}

function BookingsTable({ bookings, fetching, statusFilter, statusBadge, onCompleteService, onUndoCompleteService, onMarkNoShow, onCancelBooking, onMarkRemainingPaid, onResendWhatsapp, onSyncBookingToCal }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black/40 backdrop-blur-md">
      {fetching ? (
        <div className="p-8 text-center text-cream/50">Carregando agendamentos...</div>
      ) : bookings.length === 0 ? (
        <div className="p-8 text-center text-cream/50">
          {statusFilter === 'all' ? 'Nenhum agendamento encontrado ainda.' : `Nenhum agendamento com este status.`}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gold-light/80 whitespace-nowrap">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço(s)</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => {
                const phone = booking.attendeePhone || booking.user?.whatsappPhone || '';
                const email = booking.attendeeEmail || booking.user?.email || '';
                const payment = getBookingPaymentSummary(booking);
                const calendarFallback = Boolean(booking.calPayload?.calendarFallback);
                return (
                  <tr key={booking.id} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-cream">{booking.attendeeName || booking.user?.name || '-'}</div>
                      <div className="text-[0.7rem] text-cream/50 mt-0.5">
                        {phone}
                        {phone && email ? <span className="mx-1.5 opacity-30">•</span> : ''}
                        {email}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="block truncate text-sm text-cream/80" title={booking.service}>{booking.service}</span>
                      {calendarFallback && (
                        <button
                          type="button"
                          onClick={() => onSyncBookingToCal?.(booking)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-400/20"
                          title={booking.calPayload?.calBookingError || 'O sistema tenta enviar automaticamente. Clique apenas se quiser tentar novamente agora.'}
                        >
                          <FiAlertTriangle className="size-3" /> Tentar Cal.com
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream/70 whitespace-nowrap">
                      <div className="font-semibold text-cream/80">{formatCurrency(payment.total)}</div>
                      <div className="mt-1 text-xs text-emerald-300">Pago: {formatCurrency(payment.paid)}</div>
                      <div className={`text-xs ${payment.remaining > 0 ? 'text-amber-300' : 'text-cream/40'}`}>
                        Restante: {formatCurrency(payment.remaining)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-sm text-cream/90">{formatDate(booking.scheduledAt)}</div>
                      <div className="text-xs text-cream/50 mt-0.5">
                        {formatTime(booking.scheduledAt)}
                        {booking.endTime && ` - ${formatTime(booking.endTime)}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                    <td className="px-4 py-3 align-middle">
                      <CompletionAction
                        booking={booking}
                        onCompleteService={onCompleteService}
                        onUndoCompleteService={onUndoCompleteService}
                        onMarkNoShow={onMarkNoShow}
                        onCancelBooking={onCancelBooking}
                        onMarkRemainingPaid={onMarkRemainingPaid}
                        onResendWhatsapp={onResendWhatsapp}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompletionAction({ booking, onCompleteService, onUndoCompleteService, onMarkNoShow, onCancelBooking, onMarkRemainingPaid, onResendWhatsapp }) {
  const payment = getBookingPaymentSummary(booking);
  const hasRemaining = payment.remaining > 0;
  const canMarkRemainingPaid = hasRemaining && typeof onMarkRemainingPaid === 'function';
  const clientWhatsappNotification = booking.whatsappNotifications?.booking_created_client;
  const hasClientWhatsappFailure = clientWhatsappNotification?.status === 'failed';
  const canResendWhatsapp = hasClientWhatsappFailure
    && typeof onResendWhatsapp === 'function'
    && !['cancelled', 'no_show'].includes(booking.status)
    && Boolean(booking.attendeePhone || booking.user?.whatsappPhone);

  if (booking.status === 'cancelled') {
    return <span className="text-xs font-semibold uppercase tracking-wider text-cream/35">Sem fidelidade</span>;
  }

  if (booking.status === 'no_show') {
    return <span className="text-xs font-semibold uppercase tracking-wider text-red-300/70">Faltou ao agendamento</span>;
  }

  if (booking.serviceCompletedAt) {
    return (
      <div className="flex w-max flex-col gap-2">
        {canMarkRemainingPaid && (
          <button
            onClick={() => onMarkRemainingPaid(booking)}
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-gold-light transition-all hover:bg-gold/20"
          >
            <FiDollarSign className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">Dar baixa</span>
          </button>
        )}
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <FiCheckCircle /> Liberada
        </span>
        <button
          onClick={() => onUndoCompleteService(booking)}
          className="text-left text-xs font-semibold text-cream/45 hover:text-gold"
        >
          Desfazer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-max">
      {canMarkRemainingPaid && (
        <button
          onClick={() => onMarkRemainingPaid(booking)}
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-gold-light transition-all hover:bg-gold/20"
        >
          <FiDollarSign className="size-3.5 shrink-0" />
          <span className="whitespace-nowrap">Dar baixa</span>
        </button>
      )}
      <button
        onClick={() => onCompleteService(booking)}
        className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold tracking-wider text-emerald-400 transition-all hover:bg-emerald-500/20 hover:text-emerald-300"
      >
        <FiCheckCircle className="size-4 shrink-0" />
        <span className="whitespace-nowrap">Confirmar ida</span>
      </button>
      {canResendWhatsapp && (
        <button
          onClick={() => onResendWhatsapp(booking)}
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-amber-200 transition-all hover:bg-amber-400/20"
          title={clientWhatsappNotification?.error || 'Falha no WhatsApp da cliente. Clique para reenviar.'}
        >
          <FiMessageSquare className="size-3.5 shrink-0" />
          <span className="whitespace-nowrap">Reenviar WhatsApp</span>
        </button>
      )}
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onMarkNoShow?.(booking)}
          className="group relative flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-2 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-red-400/80 transition-all hover:bg-red-500/15 hover:text-red-300"
          title="Faltou ao agendamento"
        >
          <FiX className="size-3.5 shrink-0" />
          <span className="whitespace-nowrap">Faltou</span>
        </button>
        <button
          onClick={() => onCancelBooking?.(booking)}
          className="group relative flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-2 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-cream/70 transition-all hover:bg-white/10 hover:text-cream"
          title="Cancelar agendamento"
        >
          <span className="whitespace-nowrap">Cancelar</span>
        </button>
      </div>
    </div>
  );
}

function CalendarView({ days, monthLabel, onPrev, onNext, statusBadge, formatTime, onFilterClick }) {
  const todayKey = dateKey(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const now = new Date();

  const openDayAgenda = (day) => {
    if (!day.bookings.length) return;
    setSelectedDay(day);
  };

  return (
    <div className="rounded-2xl border border-gold/20 bg-black/40 p-4 backdrop-blur-md md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <button onClick={onPrev} className="rounded-full border border-white/10 p-2 text-cream/60 transition hover:border-gold/30 hover:bg-gold/10 hover:text-gold">
          <FiChevronLeft />
        </button>
        <h2 className="text-center font-display text-2xl font-semibold capitalize text-gold-light">{monthLabel}</h2>
        <button onClick={onNext} className="rounded-full border border-white/10 p-2 text-cream/60 transition hover:border-gold/30 hover:bg-gold/10 hover:text-gold">
          <FiChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-gold-light/70">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 md:gap-2">
        {days.map((day) => {
          const visibleBookings = day.bookings.slice(0, 3);
          const hiddenCount = Math.max(day.bookings.length - visibleBookings.length, 0);
          const dayState = getCalendarDayState(day, now);
          const canOpenDay = day.bookings.length > 0;

          return (
            <div
              key={day.key}
              role={canOpenDay ? 'button' : undefined}
              tabIndex={canOpenDay ? 0 : undefined}
              onClick={() => openDayAgenda(day)}
              onKeyDown={(event) => {
                if (!canOpenDay || !['Enter', ' '].includes(event.key)) return;
                event.preventDefault();
                openDayAgenda(day);
              }}
              className={`relative flex aspect-square min-h-12 flex-col rounded-xl border p-1.5 text-left transition duration-200 md:aspect-auto md:min-h-36 md:p-3 ${
                day.inMonth ? dayState.classes : 'border-white/5 bg-black/20 opacity-35'
              } ${day.key === todayKey ? 'ring-1 ring-gold/70' : ''}`}
            >
              <div className="flex items-center justify-between gap-1 md:mb-2">
                <span className={`text-sm font-bold md:text-sm ${day.inMonth ? 'text-cream' : 'text-cream/45'}`}>{day.date.getDate()}</span>
                {day.bookings.length > 0 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedDay(day);
                    }}
                    className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[0.6rem] font-bold leading-none text-gold transition hover:bg-gold hover:text-dark md:px-2 md:text-[0.65rem]"
                    title="Ver agenda do dia"
                  >
                    {day.bookings.length}
                  </button>
                )}
              </div>
              {day.bookings.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1 md:hidden">
                  {dayState.dots.map((dot) => (
                    <span key={dot} className={`size-1.5 rounded-full ${dot}`} />
                  ))}
                </div>
              )}
              <div className="hidden space-y-2 md:block">
                {visibleBookings.map((booking) => (
                  <CalendarBookingCard
                    key={booking.id}
                    booking={booking}
                    formatTime={formatTime}
                    onBookingClick={(bookingItem) => {
                      setSelectedBooking(bookingItem);
                    }}
                  />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedDay(day);
                    }}
                    className="mt-1 inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-gold/25 bg-gold/10 px-2 py-2 text-xs font-bold text-gold-light transition hover:border-gold/50 hover:bg-gold/20 hover:text-gold"
                  >
                    +{hiddenCount} {hiddenCount === 1 ? 'outro' : 'outros'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => onFilterClick && onFilterClick('all')} className="cursor-pointer transition hover:scale-105 active:scale-95">
          <span className="inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider border-white/20 bg-white/5 text-cream/60">Todos</span>
        </button>
        {['confirmed', 'rescheduled', 'cancelled', 'no_show'].map((status) => (
          <button key={status} type="button" onClick={() => onFilterClick && onFilterClick(status)} className="cursor-pointer transition hover:scale-105 active:scale-95">
            {statusBadge(status)}
          </button>
        ))}
      </div>

      <DayAgendaModal
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        statusBadge={statusBadge}
        formatTime={formatTime}
        onBookingClick={setSelectedBooking}
      />

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        statusBadge={statusBadge}
        formatTime={formatTime}
      />
    </div>
  );
}

function getCalendarDayState(day, now) {
  const bookings = day.bookings || [];
  const activeBookings = bookings.filter((booking) => !['cancelled', 'no_show'].includes(booking.status));
  const hasCancelled = bookings.some((booking) => ['cancelled', 'no_show'].includes(booking.status));
  const hasPastActive = activeBookings.some((booking) => new Date(booking.scheduledAt) < now);
  const hasFutureActive = activeBookings.some((booking) => new Date(booking.scheduledAt) >= now);

  if (!bookings.length) {
    return {
      classes: 'border-white/10 bg-white/[0.03] hover:border-gold/25 hover:bg-gold/[0.035]',
      dots: [],
    };
  }

  const dots = [];
  if (hasFutureActive) dots.push('bg-emerald-400');
  if (hasPastActive) dots.push('bg-amber-300');
  if (hasCancelled) dots.push('bg-red-400');

  if (hasFutureActive) {
    return {
      classes: 'cursor-pointer border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-300/45 hover:bg-emerald-500/15',
      dots,
    };
  }

  if (hasPastActive) {
    return {
      classes: 'cursor-pointer border-amber-400/35 bg-amber-400/10 hover:border-amber-200/45 hover:bg-amber-400/15',
      dots,
    };
  }

  return {
    classes: 'cursor-pointer border-red-500/30 bg-red-500/10 hover:border-red-300/45 hover:bg-red-500/15',
    dots,
  };
}

function CalendarBookingCard({ booking, formatTime, onBookingClick }) {
  const client = booking.attendeeName || booking.user?.name || 'Cliente';
  const contact = booking.attendeeEmail || booking.user?.email || booking.attendeePhone || booking.user?.whatsappPhone || 'Contato nao informado';
  const isCompleted = Boolean(booking.serviceCompletedAt);
  const isCancelled = booking.status === 'cancelled';
  const isNoShow = booking.status === 'no_show';

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBookingClick && onBookingClick(booking);
        }}
        className={`w-full cursor-pointer rounded-lg border p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)] ${
          isCancelled || isNoShow
            ? 'border-red-500/20 bg-red-500/[0.06]'
            : isCompleted
              ? 'border-emerald-500/20 bg-emerald-500/[0.06] hover:border-emerald-400/35'
              : 'border-white/10 bg-black/35 hover:border-gold/35 hover:bg-black/55'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-gold-light">{formatTime(booking.scheduledAt)}</span>
          <span className={`size-2 rounded-full ${isCancelled ? 'bg-red-400' : isCompleted ? 'bg-emerald-400' : 'bg-amber-300'}`} />
        </div>
        <div className="truncate text-xs font-semibold text-cream">{client}</div>
        <div className="truncate text-[0.68rem] text-cream/50">{booking.service}</div>
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-72 -translate-x-1/2 rounded-2xl border border-gold/25 bg-[#100d0a]/95 p-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl group-hover:block">
        <div className="absolute left-1/2 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-gold/25 bg-[#100d0a]" />
        <div className="relative">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-cream">{client}</p>
              <p className="truncate text-xs text-cream/45">{contact}</p>
            </div>
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[0.65rem] font-bold text-gold">
              {formatTime(booking.scheduledAt)}
            </span>
          </div>
          <div className="space-y-2 text-xs text-cream/65">
            <p><span className="font-bold text-gold-light">Serviço:</span> {booking.service || 'Nao informado'}</p>
            <p><span className="font-bold text-gold-light">Valor:</span> {formatCurrency(booking.estimatedValue)}</p>
            <p><span className="font-bold text-gold-light">Fidelidade:</span> {isCancelled || isNoShow ? 'sem selo' : isCompleted ? 'liberada' : 'pendente'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayAgendaModal({ day, onClose, statusBadge, formatTime, onBookingClick }) {
  if (!day) return null;

  const title = day.date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-gold/25 bg-[#100d0a] shadow-[0_28px_90px_rgba(0,0,0,0.75)]">
        <div className="border-b border-gold/15 bg-gradient-to-r from-gold/15 via-white/[0.03] to-transparent p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Agenda do dia</p>
              <h2 className="mt-1 font-display text-3xl font-semibold capitalize text-gold-light">{title}</h2>
              <p className="mt-2 text-sm text-cream/55">
                {day.bookings.length} {day.bookings.length === 1 ? 'agendamento registrado' : 'agendamentos registrados'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full border border-white/10 text-cream/60 transition hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
              aria-label="Fechar agenda do dia"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-3">
            {day.bookings.map((booking) => {
              const client = booking.attendeeName || booking.user?.name || 'Cliente';
              const contact = booking.attendeeEmail || booking.user?.email || booking.attendeePhone || booking.user?.whatsappPhone || 'Contato nao informado';
              const value = formatCurrency(booking.estimatedValue);
              const loyalty = ['cancelled', 'no_show'].includes(booking.status) ? 'Sem fidelidade' : booking.serviceCompletedAt ? 'Fidelidade liberada' : 'Fidelidade pendente';

              return (
                <article
                  key={booking.id}
                  onClick={() => onBookingClick && onBookingClick(booking)}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-gold/25 hover:bg-gold/[0.045] hover:shadow-lg"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-bold text-gold-light">
                          {formatTime(booking.scheduledAt)}
                          {booking.endTime && ` - ${formatTime(booking.endTime)}`}
                        </span>
                        {statusBadge(booking.status)}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-cream">{client}</h3>
                      <p className="mt-1 text-sm text-cream/45">{contact}</p>
                      <p className="mt-3 text-sm text-cream/80">{booking.service || 'Servico nao informado'}</p>
                    </div>
                    <div className="grid gap-2 text-sm md:min-w-48">
                      <span className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-cream/70">Valor: <strong className="text-gold-light">{value}</strong></span>
                      <span className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-cream/70">{loyalty}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function BookingDetailModal({ booking, onClose, statusBadge, formatTime, onMarkRemainingPaid }) {
  if (!booking) return null;

  const client = booking.attendeeName || booking.user?.name || 'Cliente';
  const contact = booking.attendeeEmail || booking.user?.email || booking.attendeePhone || booking.user?.whatsappPhone || 'Contato não informado';
  const payment = getBookingPaymentSummary(booking);
  const value = formatCurrency(payment.total);
  const loyalty = ['cancelled', 'no_show'].includes(booking.status) ? 'Sem fidelidade' : booking.serviceCompletedAt ? 'Fidelidade liberada' : 'Fidelidade pendente';
  const canMarkRemainingPaid = payment.remaining > 0 && typeof onMarkRemainingPaid === 'function';

  const dateStr = new Date(booking.scheduledAt).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gold/25 bg-[#100d0a] shadow-[0_28px_90px_rgba(0,0,0,0.75)]">
        <div className="border-b border-gold/15 bg-gradient-to-r from-gold/15 via-white/[0.03] to-transparent p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Detalhes do Agendamento</p>
              <h2 className="mt-1 font-display text-2xl font-semibold capitalize text-gold-light">
                {dateStr}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full border border-white/10 text-cream/60 transition hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
              aria-label="Fechar detalhes do agendamento"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-sm font-bold text-gold-light">
              {formatTime(booking.scheduledAt)}
              {booking.endTime && ` - ${formatTime(booking.endTime)}`}
            </span>
            {statusBadge(booking.status)}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Cliente</p>
              <p className="text-base font-semibold text-cream">{client}</p>
              <p className="text-sm text-cream/60">{contact}</p>
            </div>

            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Serviço</p>
              <p className="text-base font-medium text-cream">{booking.service || 'Serviço não informado'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Valor Estimado</p>
                <p className="text-base font-bold text-gold-light">{value}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Pago</p>
                <p className="text-base font-bold text-emerald-300">{formatCurrency(payment.paid)}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Restante</p>
                <p className="text-base font-bold text-amber-300">{formatCurrency(payment.remaining)}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Status Fidelidade</p>
                <p className="text-sm font-medium text-cream/80">{loyalty}</p>
              </div>
            </div>

            {booking.notes && (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">Observações do Cliente</p>
                <p className="mt-1 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-cream/80">
                  {booking.notes}
                </p>
              </div>
            )}
            {canMarkRemainingPaid && (
              <button
                type="button"
                onClick={() => onMarkRemainingPaid(booking)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-bold uppercase tracking-wider text-gold-light transition hover:bg-gold/20"
              >
                <FiDollarSign /> Dar baixa no pagamento
              </button>
            )}
            {booking.adminNotes && (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-gold/60">Anotações Internas</p>
                <p className="mt-1 rounded-xl border border-gold/10 bg-gold/5 p-3 text-sm text-gold-light">
                  {booking.adminNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


function ErpView({ summary, onOpenTab }) {
  const scoreTone = summary.healthScore >= 80
    ? 'text-emerald-300'
    : summary.healthScore >= 55
      ? 'text-amber-200'
      : 'text-red-200';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FiBriefcase />} label="Saúde da gestão" value={`${summary.healthScore}%`} hint={summary.healthLabel} />
        <MetricCard icon={<FiDollarSign />} label="Caixa projetado" value={formatCurrency(summary.projectedCash)} hint={`${formatCurrency(summary.cashIn)} recebido, ${formatCurrency(summary.cashOut)} em despesas`} />
        <MetricCard icon={<FiTrendingUp />} label="Margem do mês" value={`${summary.margin.toFixed(0)}%`} hint={`Lucro atual: ${formatCurrency(summary.netProfit)}`} />
        <MetricCard icon={<FiAlertTriangle />} label="Prioridades" value={summary.priorityCount} hint={`${summary.overdueReceivables.length} vencida(s), ${summary.unresolvedPaymentCount} alerta(s)`} />
      </div>

      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Visao gerencial</p>
              <h2 className="mt-1 text-2xl font-semibold text-gold-light">Gestão do studio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream/50">
              Painel para decidir o que cobrar, confirmar, vender e organizar no mês atual.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FinanceInlineStat
              label="Score"
              value={`${summary.healthScore}%`}
              valueClassName={scoreTone}
              tooltip={(
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Nota da gestão</p>
                      <p className="mt-1 text-lg font-bold text-cream">{summary.healthScore}% - {summary.healthLabel}</p>
                    </div>
                    <span className={`rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold ${scoreTone}`}>
                      {summary.healthScore}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-cream/60">
                    Resume a saúde do mês em uma nota de 0 a 100. A nota cai quando existem pendências operacionais ou financeiras.
                  </p>
                  <div className="mt-4 grid gap-2 text-xs text-cream/55">
                    <span className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span>Valores vencidos</span>
                      <b className="text-red-200">{summary.overdueReceivables.length}</b>
                    </span>
                    <span className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span>Pagamentos em alerta</span>
                      <b className="text-amber-200">{summary.unresolvedPaymentCount}</b>
                    </span>
                    <span className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span>Fidelidade pendente</span>
                      <b className="text-amber-200">{summary.pendingStamps}</b>
                    </span>
                    <span className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span>CRM incompleto</span>
                      <b className="text-amber-200">{summary.crmMissing}</b>
                    </span>
                  </div>
                </div>
              )}
            />
            <FinanceInlineStat label="À receber" value={formatCurrency(summary.receivables)} valueClassName="text-amber-200" />
            <FinanceInlineStat label="7 dias" value={formatCurrency(summary.nextSevenDaysRevenue)} valueClassName="text-gold-light" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Prioridades operacionais</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-cream/55">{summary.actions.length}</span>
            </div>
            <div className="space-y-3">
              {summary.actions.map((action) => (
                <ErpActionCard key={action.label} action={action} onOpenTab={onOpenTab} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Fluxo do mês</p>
            <div className="mt-4 space-y-4">
              <BarRow label="Recebido" value={formatCurrency(summary.cashIn)} width={summary.cashScale ? (summary.cashIn / summary.cashScale) * 100 : 0} />
              <BarRow label="À receber" value={formatCurrency(summary.receivables)} width={summary.cashScale ? (summary.receivables / summary.cashScale) * 100 : 0} />
              <BarRow label="Despesas" value={formatCurrency(summary.cashOut)} width={summary.cashScale ? (summary.cashOut / summary.cashScale) * 100 : 0} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <SmallStat label="Agend. ativos" value={summary.activeBookings} />
              <SmallStat label="Clientes únicos" value={summary.uniqueClients} />
              <SmallStat label="Selos pendentes" value={summary.pendingStamps} tone={summary.pendingStamps ? 'warning' : 'success'} />
              <SmallStat label="CRM incompleto" value={summary.crmMissing} tone={summary.crmMissing ? 'warning' : 'success'} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Contas a receber">
          <div className="space-y-3">
            {summary.overdueReceivables.length === 0 && summary.upcomingReceivables.length === 0 ? (
              <p className="text-sm text-cream/50">Nenhuma cobranca pendente para destacar.</p>
            ) : [...summary.overdueReceivables, ...summary.upcomingReceivables].slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenTab('finance')}
                className={`w-full rounded-xl border p-3 text-left transition hover:border-gold/30 ${item.overdue ? 'border-red-500/20 bg-red-500/[0.06]' : 'border-amber-300/15 bg-amber-300/10'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-cream">{item.client}</p>
                    <p className="mt-1 truncate text-xs text-cream/45">{item.service}</p>
                  </div>
                  <span className={item.overdue ? 'text-sm font-bold text-red-200' : 'text-sm font-bold text-amber-200'}>{formatCurrency(item.remaining)}</span>
                </div>
                <p className="mt-2 text-xs text-cream/40">{item.overdue ? 'Vencido em' : 'Previsto para'} {formatDate(item.scheduledAt)}</p>
              </button>
            ))}
          </div>
        </ChartPanel>

        <ChartPanel title="Produção próxima">
          <div className="space-y-3">
            {summary.nextBookings.length === 0 ? (
              <p className="text-sm text-cream/50">Nenhum atendimento futuro na agenda.</p>
            ) : summary.nextBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => onOpenTab('bookings')}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-gold/25"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold text-cream">{booking.attendeeName || booking.user?.name || 'Cliente'}</span>
                  <span className="shrink-0 text-xs text-gold">{formatDate(booking.scheduledAt)}</span>
                </div>
                <p className="mt-1 truncate text-sm text-cream/55">{formatTime(booking.scheduledAt)} - {booking.service}</p>
              </button>
            ))}
          </div>
        </ChartPanel>

        <ChartPanel title="Próximos módulos de gestão">
          <div className="space-y-3">
            {summary.nextModules.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cream">{item.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-cream/45">{item.text}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-gold-light">{item.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}

function ErpActionCard({ action, onOpenTab }) {
  const toneClasses = {
    danger: 'border-red-500/20 bg-red-500/[0.06] text-red-200',
    warning: 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100',
    success: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200',
    default: 'border-white/10 bg-white/[0.03] text-cream',
  };

  return (
    <article className={`rounded-xl border p-4 ${toneClasses[action.tone] || toneClasses.default}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cream">{action.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-cream/55">{action.text}</p>
        </div>
        {action.tab && (
          <button
            type="button"
            onClick={() => onOpenTab(action.tab)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-cream transition hover:border-gold/40 hover:text-gold-light"
          >
            Abrir
          </button>
        )}
      </div>
    </article>
  );
}

function AnalyticsView({ analytics }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FiDollarSign />} label="Valor em serviços" value={formatCurrency(analytics.totalRevenue)} hint={`${analytics.paidBookings} agendamentos com valor`} />
        <MetricCard icon={<FiTrendingUp />} label="Ticket médio" value={formatCurrency(analytics.averageTicket)} hint="considerando valores informados" />
        <MetricCard icon={<FiCalendar />} label="Serviços agendados" value={analytics.totalServices} hint={`${analytics.activeBookings} agendamentos ativos`} />
        <MetricCard icon={<FiUsers />} label="Clientes atendidos" value={analytics.uniqueClients} hint="por email, WhatsApp ou nome" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Serviço mais agendado" value={analytics.topService?.name || 'Sem dados'} hint={analytics.topService ? `${analytics.topService.count} agendamento(s)` : 'Aguardando agendamentos'} />
        <InsightCard label="Serviço mais cancelado" value={analytics.topCancelledService?.name || 'Sem cancelamentos'} hint={analytics.topCancelledService ? `${analytics.topCancelledService.count} cancelamento(s)` : 'Nenhum serviço cancelado'} tone="danger" />
        <InsightCard label="Melhor dia" value={analytics.busiestDay?.label || 'Sem dados'} hint={analytics.busiestDay ? `${analytics.busiestDay.count} serviço(s) ativo(s)` : 'Aguardando volume'} />
        <InsightCard label="Taxa de cancelamento" value={`${analytics.cancellationRate.toFixed(0)}%`} hint={`${analytics.cancelledCount} cancelado(s) e ${analytics.noShowCount} falta(s)`} tone={analytics.cancellationRate > 25 ? 'danger' : 'default'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Valor por mês" className="xl:col-span-2">
          <ColumnChart
            items={analytics.monthStats}
            valueKey="value"
            valueFormatter={formatCurrency}
            emptyText="Ainda nao ha valores suficientes para analisar."
          />
        </ChartPanel>

        <ChartPanel title="Agenda próxima">
          <div className="space-y-3">
            {analytics.nextBookings.length === 0 ? (
              <p className="text-sm text-cream/50">Nenhum próximo agendamento.</p>
            ) : analytics.nextBookings.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-cream">{booking.attendeeName || booking.user?.name || 'Cliente'}</span>
                  <span className="text-xs text-gold">{formatDate(booking.scheduledAt)}</span>
                </div>
                <p className="mt-1 truncate text-sm text-cream/55">{formatTime(booking.scheduledAt)} - {booking.service}</p>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Serviços mais agendados">
          <HorizontalBarChart
            items={analytics.serviceStats}
            valueKey="count"
            valueFormatter={(value) => `${value}x`}
            emptyText="Ainda não há serviços suficientes para analisar."
          />
        </ChartPanel>

        <ChartPanel title="Serviços mais cancelados">
          <HorizontalBarChart
            items={analytics.cancelledServiceStats}
            valueKey="count"
            valueFormatter={(value) => `${value}x`}
            emptyText="Nenhum cancelamento por serviço registrado."
            tone="danger"
          />
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Status dos agendamentos">
          <DonutChart items={analytics.statusStats} />
        </ChartPanel>

        <ChartPanel title="Horários com mais agenda">
          <ColumnChart
            items={analytics.hourStats}
            valueKey="count"
            valueFormatter={(value) => `${value}x`}
            emptyText="Ainda não há horários suficientes para analisar."
          />
        </ChartPanel>

        <ChartPanel title="Resumo operacional">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SmallStat label="Confirmados" value={analytics.statusCounts.confirmed || 0} />
            <SmallStat label="Reagendados" value={analytics.statusCounts.rescheduled || 0} />
            <SmallStat label="Cancelados" value={analytics.cancelledCount} />
            <SmallStat label="Faltou" value={analytics.noShowCount} />
            <SmallStat label="Sem valor informado" value={analytics.missingValueCount} />
            <SmallStat label="Selos liberados" value={analytics.completedStamps} />
            <SmallStat label="Selos pendentes" value={analytics.pendingStamps} />
          </div>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Serviços que mais geram valor">
          <HorizontalBarChart
            items={analytics.serviceRevenueStats}
            valueKey="value"
            valueFormatter={formatCurrency}
            emptyText="Ainda nao ha valores por serviço para analisar."
          />
        </ChartPanel>

        <ChartPanel title="Pontos de atenção">
          <div className="space-y-3">
            {analytics.attentionPoints.map((point) => (
              <div key={point.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-cream/40">{point.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-cream/75">{point.text}</p>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}

function FinanceView({ summary, expenses, fetching, saving, form, setForm, onAddExpense, onDeleteExpense, onEditExpense, onMarkRemainingPaid }) {
  const [selectedPendingPayment, setSelectedPendingPayment] = useState(null);
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState(null);
  const [selectedExpenseMonthKey, setSelectedExpenseMonthKey] = useState(summary.currentMonthKey);
  const currentExpenseYear = String(new Date().getFullYear());
  const expenseMonthOptions = summary.yearlyHistory.find((year) => year.year === currentExpenseYear)?.months || [];
  const selectedExpenseMonth = expenseMonthOptions.find((month) => month.key === selectedExpenseMonthKey)
    || expenseMonthOptions.find((month) => month.key === summary.currentMonthKey)
    || createFinanceMonthBucket(new Date());
  const selectedExpenses = expenses.filter((expense) => financeMonthKey(parseFinanceDate(expense.date)) === selectedExpenseMonth.key);
  const profitTone = summary.netProfit >= 0 ? 'text-emerald-300' : 'text-red-300';

  useEffect(() => {
    setSelectedExpenseMonthKey(summary.currentMonthKey);
  }, [summary.currentMonthKey]);

  useEffect(() => {
    if (!form.id) return;
    setSelectedExpenseMonthKey(financeMonthKey(parseFinanceDate(form.date)));
  }, [form.id, form.date]);

  useEffect(() => {
    if (!selectedFinanceMonth) return;
    const updatedMonth = summary.yearlyHistory
      .flatMap((year) => year.months)
      .find((month) => month.key === selectedFinanceMonth.key);
    if (updatedMonth && updatedMonth !== selectedFinanceMonth) {
      setSelectedFinanceMonth(updatedMonth);
    }
  }, [summary.yearlyHistory, selectedFinanceMonth?.key]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FiDollarSign />} label="Recebido" value={formatCurrency(summary.totalPaid)} hint={`${summary.paidBookings} pagamento(s) no mês`} />
        <MetricCard icon={<FiTrendingUp />} label="À receber" value={formatCurrency(summary.totalRemaining)} hint={`${summary.pendingPayments.length} atendimento(s) no mes`} />
        <MetricCard icon={<FiTrash2 />} label="Despesas" value={formatCurrency(summary.totalExpenses)} hint={`${summary.expenseCount} lançamento(s) no mês`} />
        <MetricCard icon={<FiBarChart2 />} label="Lucro atual" value={formatCurrency(summary.netProfit)} hint={`Projetado: ${formatCurrency(summary.projectedProfit)}`} />
      </div>

      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Contabilidade dos serviços</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-gold-light">Financeiro</h2>
              <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-light">
                Referente a <span className="capitalize">{summary.currentMonthLabel}</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-cream/45">Caixa mensal iniciado no primeiro dia e fechado no último dia do mes.</p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <FinanceInlineStat label="Valor em serviços" value={formatCurrency(summary.totalRevenue)} />
            <FinanceInlineStat label="Ticket médio" value={formatCurrency(summary.averageTicket)} />
            <FinanceInlineStat label="Lucro atual" value={formatCurrency(summary.netProfit)} valueClassName={profitTone} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Receita por mes</p>
            <div className="mt-4 space-y-3">
              {summary.monthStats.every((item) => item.value === 0) ? (
                <p className="text-sm text-cream/45">Ainda nao ha valores suficientes para analisar.</p>
              ) : (
                <ColumnChart
                  items={summary.monthStats}
                  valueKey="value"
                  valueFormatter={formatCurrency}
                  emptyText="Ainda não há valores suficientes para analisar."
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Despesas por categoria</p>
            <div className="mt-4 space-y-3">
              {fetching ? (
                <p className="text-sm text-cream/45">Carregando despesas...</p>
              ) : summary.expenseCategories.length === 0 ? (
                <p className="text-sm text-cream/45">Nenhuma despesa registrada.</p>
              ) : (
                summary.expenseCategories.map((item) => (
                  <BarRow
                    key={item.label}
                    label={item.label}
                    value={formatCurrency(item.value)}
                    width={summary.totalExpenses ? (item.value / summary.totalExpenses) * 100 : 0}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Pagamentos pendentes</p>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {summary.pendingPayments.length === 0 ? (
                <p className="text-sm text-cream/45">Nenhum valor pendente no momento.</p>
              ) : (
                summary.pendingPayments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPendingPayment(item)}
                    className="w-full rounded-lg border border-amber-300/15 bg-amber-300/10 p-3 text-left transition hover:border-gold/40 hover:bg-amber-300/15 focus:outline-none focus:ring-1 focus:ring-gold/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cream">{item.client}</p>
                        <p className="truncate text-xs text-cream/45">{item.service}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-amber-200">{formatCurrency(item.remaining)}</span>
                    </div>
                    <p className="mt-1 text-xs text-cream/40">{formatDate(item.scheduledAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

      </section>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gold-light">{form.id ? 'Editar despesa' : 'Nova despesa'}</h2>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyExpenseForm)}
                className="grid size-9 place-items-center rounded-full border border-white/10 text-cream/55 transition hover:border-gold/30 hover:text-gold"
                aria-label="Cancelar edicao da despesa"
                title="Cancelar edicao"
              >
                <FiX />
              </button>
            )}
          </div>
          <form onSubmit={onAddExpense} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-cream/70">Descrição</label>
              <input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Aluguel, produto, manutencao..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-gold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-cream/70">Valor</label>
                <input
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-cream/70">Data</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-cream outline-none focus:border-gold"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-cream/70">Categoria</label>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              >
                {['Salao', 'Produtos', 'Aluguel', 'Marketing', 'Equipamentos', 'Impostos', 'Outros'].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-cream/70">Observações</label>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-gold"
              />
            </div>
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light py-3 font-bold text-dark transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60">
              {form.id ? <FiSave /> : <FiPlus />} {saving ? (form.id ? 'Salvando...' : 'Registrando...') : (form.id ? 'Salvar despesa' : 'Registrar despesa')}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-gold-light">Despesas do salão</h2>
                <div className="flex flex-wrap gap-1.5">
                  {expenseMonthOptions.map((month) => {
                    const isSelected = month.key === selectedExpenseMonth.key;
                    const isCurrent = month.key === summary.currentMonthKey;

                    return (
                      <button
                        key={month.key}
                        type="button"
                        onClick={() => setSelectedExpenseMonthKey(month.key)}
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition ${
                          isSelected
                            ? 'border-gold bg-gold text-dark'
                            : isCurrent
                              ? 'border-gold/45 bg-gold/10 text-gold-light hover:bg-gold/20'
                              : 'border-white/10 bg-white/[0.03] text-cream/45 hover:border-gold/25 hover:text-gold-light'
                        }`}
                        title={`Ver despesas de ${month.label}`}
                      >
                        {month.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-1 text-sm text-cream/45">
                Lancamentos de <span className="capitalize">{selectedExpenseMonth.label}</span>.
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-cream/65">
              {formatCurrency(selectedExpenseMonth.expenses)}
            </span>
          </div>

          {fetching ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Carregando despesas...</p>
          ) : selectedExpenses.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Nenhuma despesa cadastrada neste mes.</p>
          ) : (
            <div className="space-y-3">
              {selectedExpenses.map((expense) => (
                <article key={expense.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-cream">{expense.description}</h3>
                        <span className="rounded-full border border-gold/15 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gold-light">{expense.category}</span>
                      </div>
                      <p className="mt-1 text-sm text-cream/45">{formatFinanceDate(expense.date)}</p>
                      {expense.notes && <p className="mt-2 text-sm text-cream/60">{expense.notes}</p>}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span className="text-lg font-bold text-red-200">{formatCurrency(expense.amount)}</span>
                      <button
                        type="button"
                        onClick={() => onEditExpense(expense)}
                        className="rounded-full border border-gold/20 p-2 text-gold-light hover:bg-gold/10"
                        aria-label="Editar despesa"
                        title="Editar despesa"
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(expense.id)}
                        className="rounded-full border border-red-500/20 p-2 text-red-300 hover:bg-red-500/10"
                        aria-label="Remover despesa"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <MonthlyFinanceHistory
        years={summary.yearlyHistory}
        onSelectMonth={setSelectedFinanceMonth}
      />

      <BookingDetailModal
        booking={selectedPendingPayment?.booking || null}
        onClose={() => setSelectedPendingPayment(null)}
        statusBadge={statusBadge}
        formatTime={formatTime}
        onMarkRemainingPaid={(booking) => {
          onMarkRemainingPaid?.(booking);
          setSelectedPendingPayment(null);
        }}
      />
      <MonthlyFinanceModal
        month={selectedFinanceMonth}
        onClose={() => setSelectedFinanceMonth(null)}
        onDeleteExpense={onDeleteExpense}
        onEditExpense={onEditExpense}
      />
    </div>
  );
}

function MonthlyFinanceHistory({ years, onSelectMonth }) {
  const currentYear = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const activeYear = years.find((year) => year.year === selectedYear) || years[0];
  const months = activeYear?.months || [];
  const hasValues = months.some((month) => month.hasMovement);
  const balanceTone = (activeYear?.totals.balance || 0) >= 0 ? 'text-emerald-300' : 'text-red-300';

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Historico mensal</p>
          <h3 className="mt-1 text-xl font-semibold text-cream">Consulta por ano e mes</h3>
          <p className="mt-2 max-w-2xl text-sm text-cream/45">
            Escolha o ano e passe o mouse sobre um mes para ver uma prévia; clique para abrir os lançamentos detalhados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map((year) => (
            <button
              key={year.year}
              type="button"
              onClick={() => setSelectedYear(year.year)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                activeYear?.year === year.year
                  ? 'border-gold/40 bg-gold text-dark'
                  : 'border-white/10 bg-white/[0.03] text-cream/60 hover:border-gold/30 hover:text-gold-light'
              }`}
            >
              {year.year}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Ano selecionado</p>
              <h4 className="mt-1 text-2xl font-bold text-gold-light">{activeYear?.year}</h4>
            </div>
            <span className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-bold ${balanceTone}`}>
              {formatCurrency(activeYear?.totals.balance || 0)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FinanceMiniStat label="Faturamento" value={formatCurrency(activeYear?.totals.income || 0)} tone="success" />
            <FinanceMiniStat label="Despesas" value={formatCurrency(activeYear?.totals.expenses || 0)} tone="danger" />
            <FinanceMiniStat label="À receber" value={formatCurrency(activeYear?.totals.pending || 0)} tone="warning" />
            <FinanceMiniStat label="Margem" value={`${(activeYear?.margin || 0).toFixed(0)}%`} tone={activeYear?.margin >= 0 ? 'success' : 'danger'} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {months.map((month) => (
              <MonthPickerButton key={month.key} month={month} onSelectMonth={onSelectMonth} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Análise financeira</p>
              <h4 className="mt-1 text-lg font-semibold text-cream">Comparativo mensal de {activeYear?.year}</h4>
            </div>
            {hasValues && (
              <p className="text-sm text-cream/45">
                Melhor mês: <span className="capitalize text-gold-light">{activeYear.bestIncomeMonth?.monthLabel}</span>
              </p>
            )}
          </div>

          {!hasValues ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/45">
              Ainda não há movimentação suficiente neste ano para montar os gráficos.
            </p>
          ) : (
            <div className="grid gap-4 2xl:grid-cols-2">
              <FinanceTrendChart
                title="Faturamento por mes"
                items={months}
                valueKey="income"
                valueFormatter={formatCurrency}
                tone="success"
              />
              <FinanceTrendChart
                title="Despesas por mes"
                items={months}
                valueKey="expenses"
                valueFormatter={formatCurrency}
                tone="danger"
              />
              <FinanceTrendChart
                title="Lucro realizado"
                items={months}
                valueKey="balance"
                valueFormatter={formatCurrency}
                tone="balance"
              />
              <FinanceTrendChart
                title="Margem mensal"
                items={months}
                valueKey="margin"
                valueFormatter={(value) => `${value.toFixed(0)}%`}
                tone="gold"
              />
            </div>
          )}
        </div>
      </div>

      {hasValues && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FinanceAnalysisNote
            label="Media de faturamento"
            value={formatCurrency(activeYear.averageIncome)}
            text="Media considerando os 12 meses do ano selecionado."
          />
          <FinanceAnalysisNote
            label="Media de despesas"
            value={formatCurrency(activeYear.averageExpenses)}
            text="Ajuda a perceber se os custos estao crescendo fora do ritmo."
            tone="danger"
          />
          <FinanceAnalysisNote
            label="Maior despesa"
            value={formatCurrency(activeYear.highestExpenseMonth?.expenses || 0)}
            text={activeYear.highestExpenseMonth?.expenses ? `Registrada em ${activeYear.highestExpenseMonth.monthLabel}.` : 'Sem despesas no ano.'}
            tone="danger"
          />
          <FinanceAnalysisNote
            label="Saldo projetado"
            value={formatCurrency(activeYear.totals.projectedBalance)}
            text="Inclui valores pendentes que ainda podem entrar no caixa."
            tone={activeYear.totals.projectedBalance >= 0 ? 'success' : 'danger'}
          />
        </div>
      )}
    </section>
  );
}

function MonthPickerButton({ month, onSelectMonth }) {
  const isCurrentMonth = month.key === financeMonthKey(new Date());
  const balanceTone = month.balance >= 0 ? 'text-emerald-300' : 'text-red-300';
  const preview = [
    `Entradas: ${formatCurrency(month.income)}`,
    `Despesas: ${formatCurrency(month.expenses)}`,
    `À receber: ${formatCurrency(month.pending)}`,
    `Saldo: ${formatCurrency(month.balance)}`,
  ].join(' | ');

  return (
    <button
      type="button"
      onClick={() => onSelectMonth(month)}
      className={`group relative min-h-20 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-gold/50 ${
        isCurrentMonth
          ? 'border-gold/60 bg-gold/[0.14] shadow-[0_0_0_1px_rgba(232,194,106,0.18)] hover:border-gold'
          : month.hasMovement
          ? 'border-gold/20 bg-gold/[0.07] hover:border-gold/45'
          : 'border-white/10 bg-white/[0.025] hover:border-white/20'
      }`}
      title={preview}
    >
      <span className="flex items-center justify-between gap-2 text-[0.65rem] font-bold uppercase tracking-wider text-cream/35">
        <span>{month.shortLabel}</span>
        {isCurrentMonth && <span className="rounded-full bg-gold px-2 py-0.5 text-[0.55rem] text-dark">Atual</span>}
      </span>
      <span className={`mt-2 block truncate text-sm font-bold ${balanceTone}`}>{formatCurrency(month.balance)}</span>
      <span className="mt-1 block text-[0.68rem] text-cream/35">{month.incomeItems.length + month.expenseItems.length} lanc.</span>

      <span className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] left-0 z-20 hidden w-64 rounded-xl border border-gold/25 bg-[#100d0a] p-3 text-xs shadow-2xl group-hover:block group-focus:block">
        <strong className="block capitalize text-gold-light">{month.label}</strong>
        <span className="mt-2 grid gap-1 text-cream/55">
          <span>Entradas: <b className="text-emerald-300">{formatCurrency(month.income)}</b></span>
          <span>Despesas: <b className="text-red-200">{formatCurrency(month.expenses)}</b></span>
          <span>À receber: <b className="text-amber-200">{formatCurrency(month.pending)}</b></span>
          <span>Saldo: <b className={balanceTone}>{formatCurrency(month.balance)}</b></span>
        </span>
      </span>
    </button>
  );
}

function FinanceTrendChart({ title, items, valueKey, valueFormatter, tone = 'gold' }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const values = items.map((item) => Number(item[valueKey]) || 0);
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  const hasValues = values.some((value) => value !== 0);
  const toneClass = {
    success: 'from-emerald-500 to-emerald-200',
    danger: 'from-red-400 to-rose-200',
    gold: 'from-gold to-gold-light',
    balance: 'from-gold to-gold-light',
  }[tone] || 'from-gold to-gold-light';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-cream/40">{title}</p>
      {!hasValues ? (
        <p className="mt-4 text-sm text-cream/45">Sem valores para este indicador.</p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-1.5 rounded-xl border border-white/10 bg-black/20 px-2 pb-8 pt-4">
          {items.map((month, index) => {
            const value = values[index] || 0;
            const height = Math.abs(value) ? (Math.abs(value) / max) * 100 : 0;
            const isActive = activeIndex === index;
            const isNegative = value < 0;
            const barClass = tone === 'balance' && isNegative ? 'from-red-400 to-red-200' : toneClass;

            return (
              <button
                key={month.key}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onBlur={() => setActiveIndex(null)}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
                title={`${month.monthLabel}: ${valueFormatter(value)}`}
              >
                <span
                  className={`w-full max-w-8 rounded-t-md bg-gradient-to-t ${barClass} transition ${isActive ? 'brightness-125' : 'opacity-85 group-hover:opacity-100'}`}
                  style={{ height: `${Math.max(6, height)}%` }}
                />
                <span className="absolute -bottom-6 max-w-full truncate text-[0.62rem] font-semibold text-cream/45">{month.shortLabel}</span>
                {isActive && (
                  <span className="absolute bottom-[calc(100%+0.45rem)] z-10 whitespace-nowrap rounded-lg border border-gold/20 bg-[#110d09] px-3 py-2 text-xs font-bold text-gold-light shadow-xl">
                    {valueFormatter(value)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FinanceAnalysisNote({ label, value, text, tone = 'success' }) {
  const valueTone = tone === 'danger' ? 'text-red-200' : tone === 'success' ? 'text-emerald-300' : 'text-gold-light';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-cream/40">{label}</p>
      <p className={`mt-2 text-lg font-bold ${valueTone}`}>{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-cream/45">{text}</p>
    </div>
  );
}

function FinanceMiniStat({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-cream',
    success: 'text-emerald-300',
    warning: 'text-amber-200',
    danger: 'text-red-200',
  };

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="truncate text-[0.6rem] font-bold uppercase tracking-wider text-cream/35">{label}</p>
      <p className={`mt-1 truncate text-xs font-bold sm:text-sm ${tones[tone] || tones.default}`}>{value}</p>
    </div>
  );
}

function MonthlyFinanceModal({ month, onClose, onDeleteExpense, onEditExpense }) {
  if (!month) return null;

  const balanceTone = month.balance >= 0 ? 'text-emerald-300' : 'text-red-300';
  const projectedBalance = month.income + month.pending - month.expenses;
  const projectedTone = projectedBalance >= 0 ? 'text-emerald-300' : 'text-red-300';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-gold/25 bg-[#100d0a] shadow-[0_28px_90px_rgba(0,0,0,0.75)]">
        <div className="border-b border-gold/15 bg-gradient-to-r from-gold/15 via-white/[0.03] to-transparent p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Resumo financeiro mensal</p>
              <h2 className="mt-1 text-2xl font-semibold capitalize text-gold-light sm:text-3xl">{month.label}</h2>
              <p className="mt-2 text-sm text-cream/50">Detalhamento de entradas confirmadas, despesas registradas e valores à receber.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-cream/60 transition hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
              aria-label="Fechar resumo financeiro mensal"
            >
              <FiX />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceInlineStat label="Entradas" value={formatCurrency(month.income)} valueClassName="text-emerald-300" />
            <FinanceInlineStat label="Despesas" value={formatCurrency(month.expenses)} valueClassName="text-red-200" />
            <FinanceInlineStat label="Saldo realizado" value={formatCurrency(month.balance)} valueClassName={balanceTone} />
            <FinanceInlineStat label="Saldo projetado" value={formatCurrency(projectedBalance)} valueClassName={projectedTone} />
          </div>
        </div>

        <div className="max-h-[calc(90vh-230px)] overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <MonthlyFinanceList
              title="Entradas confirmadas"
              emptyText="Nenhuma entrada confirmada neste mes."
              items={month.incomeItems}
              renderItem={(item) => (
                <FinanceMovementRow
                  title={item.client}
                  subtitle={item.service}
                  meta={`${formatDate(item.date)} - ${item.method}`}
                  value={formatCurrency(item.amount)}
                  tone="success"
                />
              )}
            />

            <MonthlyFinanceList
              title="Despesas"
              emptyText="Nenhuma despesa registrada neste mes."
              items={month.expenseItems}
              renderItem={(item) => (
                <FinanceMovementRow
                  title={item.description}
                  subtitle={item.category}
                  meta={[formatFinanceDate(item.date), item.notes].filter(Boolean).join(' - ')}
                  value={formatCurrency(item.amount)}
                  tone="danger"
                  editLabel="Editar despesa"
                  onEdit={onEditExpense ? () => {
                    onEditExpense(item.original || item);
                    onClose();
                  } : null}
                  actionLabel="Remover despesa"
                  onAction={onDeleteExpense ? () => onDeleteExpense(item.expenseId || item.id.replace('expense-', '')) : null}
                />
              )}
            />

            <MonthlyFinanceList
              title="À receber"
              emptyText="Nenhum pagamento pendente neste mês."
              items={month.pendingItems}
              renderItem={(item) => (
                <FinanceMovementRow
                  title={item.client}
                  subtitle={item.service}
                  meta={formatDate(item.date)}
                  value={formatCurrency(item.amount)}
                  tone="warning"
                />
              )}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cream/40">Despesas por categoria no mes</p>
            <div className="mt-4 space-y-3">
              {month.expenseCategories.length === 0 ? (
                <p className="text-sm text-cream/45">Sem categorias para analisar neste periodo.</p>
              ) : (
                month.expenseCategories.map((item) => (
                  <BarRow
                    key={item.label}
                    label={item.label}
                    value={formatCurrency(item.value)}
                    width={month.expenses ? (item.value / month.expenses) * 100 : 0}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MonthlyFinanceList({ title, emptyText, items, renderItem }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gold-light">{title}</h3>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-cream/55">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-cream/45">{emptyText}</p>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </section>
  );
}

function FinanceMovementRow({ title, subtitle, meta, value, tone, editLabel, onEdit, actionLabel, onAction }) {
  const toneClasses = {
    success: 'text-emerald-300',
    warning: 'text-amber-200',
    danger: 'text-red-200',
  };

  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cream">{title}</p>
          <p className="mt-1 truncate text-xs text-cream/45">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-sm font-bold ${toneClasses[tone] || 'text-cream'}`}>{value}</span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="grid size-8 place-items-center rounded-full border border-gold/20 text-gold-light transition hover:bg-gold/10"
              aria-label={editLabel}
              title={editLabel}
            >
              <FiEdit3 />
            </button>
          )}
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="grid size-8 place-items-center rounded-full border border-red-500/20 text-red-300 transition hover:bg-red-500/10"
              aria-label={actionLabel}
              title={actionLabel}
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>
      {meta && <p className="mt-2 text-xs text-cream/40">{meta}</p>}
    </article>
  );
}

function FinanceInlineStat({ label, value, valueClassName = 'text-cream', tooltip = null }) {
  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3" tabIndex={tooltip ? 0 : undefined}>
      <div className="flex items-center gap-2">
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">{label}</p>
        {tooltip && (
          <span className="grid size-4 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[0.62rem] font-bold text-gold-light">
            ?
          </span>
        )}
      </div>
      <p className={`mt-1 text-base font-bold ${valueClassName}`}>{value}</p>
      {tooltip && (
        <div className="pointer-events-none absolute right-0 top-[calc(100%+0.75rem)] z-50 w-80 translate-y-1 rounded-2xl border border-gold/25 bg-[#090706]/95 p-4 text-left opacity-0 shadow-2xl shadow-black/60 backdrop-blur-xl transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus:pointer-events-auto group-focus:translate-y-0 group-focus:opacity-100">
          <span className="absolute -top-2 right-8 size-4 rotate-45 border-l border-t border-gold/25 bg-[#090706]" />
          {tooltip}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-black/40 p-5">
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gold/10 text-gold">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-wider text-cream/45">{label}</p>
      <p className="mt-2 text-2xl font-bold text-cream">{value}</p>
      <p className="mt-1 text-xs text-cream/40">{hint}</p>
    </div>
  );
}

function InsightCard({ label, value, hint, tone = 'default' }) {
  const toneClasses = tone === 'danger'
    ? 'border-red-500/20 bg-red-500/[0.06] text-red-200'
    : 'border-gold/20 bg-gold/[0.06] text-gold-light';

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 truncate text-xl font-bold text-cream" title={value}>{value}</p>
      <p className="mt-1 text-xs text-cream/45">{hint}</p>
    </div>
  );
}

function ChartPanel({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-gold/20 bg-black/40 p-5 ${className}`}>
      <h2 className="mb-5 text-xl font-semibold text-gold-light">{title}</h2>
      {children}
    </section>
  );
}

function HorizontalBarChart({ items, valueKey, valueFormatter, emptyText, tone = 'gold' }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const max = Math.max(0, ...items.map((item) => Number(item[valueKey]) || 0));
  const gradient = tone === 'danger' ? 'from-red-400 to-amber-200' : 'from-gold to-gold-light';

  if (!items.length || max === 0) {
    return <p className="text-sm text-cream/50">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const width = max ? (value / max) * 100 : 0;
        const isActive = activeIndex === index;

        return (
          <button
            type="button"
            key={item.name}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onBlur={() => setActiveIndex(null)}
            className="block w-full rounded-xl p-2 text-left transition hover:bg-white/[0.03] focus:bg-white/[0.03]"
            title={`${item.name}: ${valueFormatter(value)}`}
          >
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-cream/75">{item.name}</span>
              <span className={`font-semibold ${tone === 'danger' ? 'text-red-200' : 'text-gold'}`}>{valueFormatter(value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-300 ${isActive ? 'brightness-125' : ''}`}
                style={{ width: `${Math.max(5, width)}%` }}
              />
            </div>
            {isActive && item.detail && <p className="mt-2 text-xs text-cream/45">{item.detail}</p>}
          </button>
        );
      })}
    </div>
  );
}

function ColumnChart({ items, valueKey, valueFormatter, emptyText }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const max = Math.max(0, ...items.map((item) => Number(item[valueKey]) || 0));

  if (!items.length || max === 0) {
    return <p className="text-sm text-cream/50">{emptyText}</p>;
  }

  return (
    <div className="relative">
      <div className="flex h-64 items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.025] px-3 pb-10 pt-4 sm:gap-3">
        {items.map((item, index) => {
          const value = Number(item[valueKey]) || 0;
          const height = max ? (value / max) * 100 : 0;
          const isActive = activeIndex === index;

          return (
            <button
              type="button"
              key={item.key || item.label}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onBlur={() => setActiveIndex(null)}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
              title={`${item.label}: ${valueFormatter(value)}`}
            >
              <span
                className={`w-full max-w-14 rounded-t-lg bg-gradient-to-t from-gold to-gold-light transition-all duration-300 ${isActive ? 'brightness-125' : 'opacity-85 group-hover:opacity-100'}`}
                style={{ height: `${Math.max(7, height)}%` }}
              />
              <span className="absolute -bottom-7 max-w-full truncate text-[0.68rem] font-semibold text-cream/55">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-[calc(100%+0.5rem)] z-10 whitespace-nowrap rounded-lg border border-gold/20 bg-[#110d09] px-3 py-2 text-xs font-bold text-gold-light shadow-xl">
                  {valueFormatter(value)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ items }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (!total) {
    return <p className="text-sm text-cream/50">Ainda nao ha agendamentos para analisar.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center xl:grid-cols-1">
      <div className="relative mx-auto size-44">
        <svg viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
          {items.map((item, index) => {
            const dash = (item.value / total) * circumference;
            const circle = (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={activeIndex === index ? 18 : 14}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-300"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-bold text-cream">{total}</p>
            <p className="text-xs uppercase tracking-wider text-cream/40">total</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.label}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onBlur={() => setActiveIndex(null)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm transition hover:border-gold/20"
          >
            <span className="flex items-center gap-2 text-cream/70">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="font-bold text-cream">{item.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, value, width }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="truncate text-cream/75">{label}</span>
        <span className="font-semibold text-gold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light" style={{ width: `${Math.max(4, width)}%` }} />
      </div>
    </div>
  );
}

function SmallStat({ label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'text-cream',
    gold: 'text-gold-light',
    success: 'text-emerald-300',
    warning: 'text-amber-200',
    danger: 'text-red-200',
  };

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="truncate text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">{label}</p>
      <p title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined} className={`mt-2 truncate tracking-tight text-sm sm:text-base font-bold leading-tight ${toneClasses[tone] || toneClasses.default}`}>
        {value}
      </p>
    </div>
  );
}

function LoyaltyAdminView({ clients, pendingBookings, onCompleteService, onUndoCompleteService, onMarkNoShow, onCancelBooking, onMarkRemainingPaid }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-100/70">Aguardando confirmação</p>
            <h2 className="mt-1 text-2xl font-semibold text-amber-50">
              {pendingBookings.length} {pendingBookings.length === 1 ? 'serviço pendente' : 'serviços pendentes'}
            </h2>
          </div>
          <span className="text-sm text-amber-100/70">Confirme apenas quando a cliente realmente realizou o atendimento.</span>
        </div>

        {pendingBookings.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-cream/60">
            Nenhuma fidelidade pendente no momento.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-cream">{booking.attendeeName || booking.user?.name || 'Cliente'}</h3>
                    <p className="truncate text-sm text-cream/50">{booking.attendeeEmail || booking.user?.email || booking.attendeePhone || booking.user?.whatsappPhone || 'Sem contato'}</p>
                    <p className="mt-2 text-sm text-gold-light">{booking.service}</p>
                    <p className="mt-1 text-xs text-cream/45">{formatDate(booking.scheduledAt)} - {formatTime(booking.scheduledAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2">
                    <button
                      onClick={() => onCompleteService(booking)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-bold uppercase tracking-wider text-dark"
                    >
                      <FiCheckCircle /> Confirmar
                    </button>
                    <div>
                      <p className="mb-1 text-center text-[0.68rem] font-semibold uppercase tracking-wider text-cream/35">Faltou ao agendamento</p>
                      <button
                        onClick={() => onMarkNoShow(booking)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-200 hover:bg-red-500/20"
                      >
                        <FiX /> Não confirmar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <h2 className="mb-5 text-xl font-semibold text-gold-light">Cartões fidelidade por cliente</h2>
        {clients.length === 0 ? (
          <p className="text-sm text-cream/50">Nenhum cliente com agendamento encontrado.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {clients.map((client) => (
              <article key={client.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-cream">{client.name}</h3>
                    <p className="truncate text-sm text-cream/45">{client.contact}</p>
                  </div>
                  <div className="flex gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">{client.completedStamps}/10 liberados</span>
                    {client.pendingStamps > 0 && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-amber-100">{client.pendingStamps} pend.</span>}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-10 gap-1.5">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={index}
                      className={`grid aspect-square place-items-center rounded-full text-[0.62rem] font-bold ${
                        index < Math.min(client.completedStamps, 10)
                          ? 'bg-gradient-to-br from-gold to-gold-light text-dark'
                          : 'border border-white/10 bg-black/40 text-cream/20'
                      }`}
                    >
                      TS
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  {client.bookings.slice(0, 4).map((booking) => (
                    <div key={booking.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cream/80">{booking.service}</p>
                        <p className="text-xs text-cream/40">{formatDate(booking.scheduledAt)} - {formatTime(booking.scheduledAt)}</p>
                      </div>
                      <CompletionAction
                        booking={booking}
                        onCompleteService={onCompleteService}
                        onUndoCompleteService={onUndoCompleteService}
                        onMarkNoShow={onMarkNoShow}
                        onMarkRemainingPaid={onMarkRemainingPaid}
                      />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CrmAdminView({ clients, stats, inviteLink, fetching, sendingIds, sendingBulk, onRefresh, onSendInvite, onSendBulkInvite, onToggleDoNotInvite, onCopyInviteText }) {
  const [filter, setFilter] = useState('missing');
  const [search, setSearch] = useState('');

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter((client) => {
        if (filter === 'completed') return client.hasCompletedProfile;
        if (filter === 'invited') return Boolean(client.profile?.inviteSentAt);
        if (filter === 'with_whatsapp') return client.hasWhatsapp && !client.hasCompletedProfile;
        if (filter === 'no_whatsapp') return !client.hasWhatsapp;
        if (filter === 'no_source') return !client.profile?.source;
        if (filter === 'no_preferences') return !(client.profile?.interests || []).length && !(client.profile?.preferredPeriods || []).length;
        if (filter === 'no_birthday') return !client.dateOfBirth;
        if (filter === 'do_not_invite') return client.inviteBlocked;
        if (filter === 'all') return true;
        return !client.hasCompletedProfile;
      })
      .filter((client) => {
        if (!term) return true;
        return [
          client.name,
          client.email,
          client.whatsappPhone,
          client.profile?.source,
          client.profile?.contactPreference,
          ...(client.profile?.interests || []),
          ...(client.profile?.preferredPeriods || []),
        ].filter(Boolean).join(' ').toLowerCase().includes(term);
      });
  }, [clients, filter, search]);

  const filters = [
    { value: 'missing', label: 'Pendentes', count: stats.missing },
    { value: 'completed', label: 'Preenchidos', count: stats.completed },
    { value: 'invited', label: 'Convidados', count: stats.invited },
    { value: 'with_whatsapp', label: 'Com WhatsApp', count: stats.withWhatsappMissing },
    { value: 'no_whatsapp', label: 'Sem WhatsApp', count: clients.filter((client) => !client.hasWhatsapp).length },
    { value: 'no_source', label: 'Sem origem', count: stats.noSource },
    { value: 'no_preferences', label: 'Sem preferências', count: stats.noPreferences },
    { value: 'no_birthday', label: 'Sem aniversário', count: stats.noBirthday },
    { value: 'do_not_invite', label: 'Nao insistir', count: stats.doNotInvite },
    { value: 'all', label: 'Todos', count: stats.total },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">CRM</p>
            <h2 className="mt-1 text-2xl font-semibold text-cream">Perfil e relacionamento dos clientes</h2>
            <p className="mt-2 max-w-2xl text-sm text-cream/50">
              Camada separada do agendamento rápido. Use para coletar preferências e convidar clientes pelo WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-cream/60 hover:border-gold/30 hover:text-gold-light"
            >
              <FiRefreshCw /> Atualizar
            </button>
            <button
              type="button"
              onClick={onCopyInviteText}
              className="inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10"
            >
              <FiMessageSquare /> Copiar texto
            </button>
            <button
              type="button"
              onClick={onSendBulkInvite}
              disabled={sendingBulk || !stats.withWhatsappMissing}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-sm font-bold text-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSend /> {sendingBulk ? 'Enviando...' : 'Enviar pendentes'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SmallStat label="Clientes" value={stats.total || 0} tone="gold" />
          <SmallStat label="Preenchidos" value={stats.completed || 0} tone="success" />
          <SmallStat label="Pendentes" value={stats.missing || 0} tone={stats.missing ? 'warning' : 'default'} />
          <SmallStat label="Com WhatsApp" value={stats.withWhatsappMissing || 0} tone="gold" />
          <SmallStat label="Convidados" value={stats.invited || 0} tone="default" />
          <SmallStat label="Sem origem" value={stats.noSource || 0} tone={stats.noSource ? 'warning' : 'default'} />
          <SmallStat label="Sem preferências" value={stats.noPreferences || 0} tone={stats.noPreferences ? 'warning' : 'default'} />
          <SmallStat label="Sem aniversário" value={stats.noBirthday || 0} tone={stats.noBirthday ? 'warning' : 'default'} />
          <SmallStat label="Nao insistir" value={stats.doNotInvite || 0} tone={stats.doNotInvite ? 'danger' : 'default'} />
          <SmallStat label="Sem WhatsApp" value={clients.filter((client) => !client.hasWhatsapp).length} tone="default" />
        </div>

        {inviteLink && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-cream/45">
            Link do formulario: <span className="break-all text-gold-light">{inviteLink}</span>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <SegmentedButton key={item.value} active={filter === item.value} onClick={() => setFilter(item.value)}>
                {item.label} {typeof item.count === 'number' ? `(${item.count})` : ''}
              </SegmentedButton>
            ))}
          </div>

          <div className="relative w-full lg:max-w-sm">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente ou preferencia"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-cream outline-none transition placeholder:text-cream/30 focus:border-gold/50"
            />
          </div>
        </div>

        {fetching ? (
          <div className="rounded-2xl border border-white/10 bg-black/35 p-6 text-sm text-cream/50">Carregando CRM...</div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/35 p-6 text-sm text-cream/50">Nenhuma cliente encontrada neste filtro.</div>
        ) : (
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <CrmClientCard
                key={client.id}
                client={client}
                sending={Boolean(sendingIds[client.id])}
                onSendInvite={() => onSendInvite(client)}
                onToggleDoNotInvite={() => onToggleDoNotInvite(client)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CrmInsightsView({ clients, stats, fetching, onOpenCampaigns }) {
  const insights = useMemo(() => buildCrmInsights(clients, stats), [clients, stats]);

  if (fetching) {
    return <div className="rounded-2xl border border-white/10 bg-black/35 p-6 text-sm text-cream/50">Carregando insights...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Relacionamento</p>
            <h2 className="mt-1 text-2xl font-semibold text-cream">Insights das respostas</h2>
            <p className="mt-2 max-w-2xl text-sm text-cream/50">
              Leitura do CRM para orientar campanhas, agenda e relacionamento com clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCampaigns}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-sm font-bold text-dark"
          >
            <FiMessageSquare /> Criar campanha
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<FiUsers />} label="Clientes no CRM" value={stats.total || 0} hint={`${stats.completed || 0} perfil(is) preenchido(s)`} />
          <MetricCard icon={<FiAlertTriangle />} label="Dados pendentes" value={stats.missing || 0} hint={`${stats.noPreferences || 0} sem preferências`} />
          <MetricCard icon={<FiMessageSquare />} label="Base acionável" value={insights.reachableClients.length} hint="com WhatsApp e liberadas" />
          <MetricCard icon={<FiGift />} label="Aniversários ausentes" value={stats.noBirthday || 0} hint="impacta campanhas de mimo" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Origem das clientes">
          <HorizontalBarChart items={insights.sourceStats} valueKey="count" valueFormatter={(value) => `${value}x`} emptyText="Ainda nao ha origem preenchida." />
        </ChartPanel>
        <ChartPanel title="Interesses declarados">
          <HorizontalBarChart items={insights.interestStats} valueKey="count" valueFormatter={(value) => `${value}x`} emptyText="Ainda nao ha interesses suficientes." />
        </ChartPanel>
        <ChartPanel title="Períodos preferidos">
          <HorizontalBarChart items={insights.periodStats} valueKey="count" valueFormatter={(value) => `${value}x`} emptyText="Ainda nao ha periodos informados." />
        </ChartPanel>
      </div>

      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <h2 className="text-xl font-semibold text-gold-light">Oportunidades de decisão</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {insights.recommendations.map((item) => (
            <article key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-cream">{item.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-cream/55">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CrmCampaignsView({ clients, fetching, sending, onSend }) {
  const [audience, setAudience] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [promotional, setPromotional] = useState(true);
  const [message, setMessage] = useState('Oi, {primeiro_nome}! Tudo bem?\n\nPassando para avisar uma novidade do Studio Thallyta Silveira.\n\nSe quiser, responda esta mensagem que eu te ajudo por aqui.');
  const eligibleClients = useMemo(() => clients.filter((client) => client.userId && client.hasWhatsapp && !client.inviteBlocked), [clients]);
  const audienceClients = useMemo(() => {
    const now = Date.now();
    return eligibleClients.filter((client) => {
      if (promotional && client.profile?.allowPromotions === false) return false;
      if (audience === 'completed') return client.hasCompletedProfile;
      if (audience === 'missing') return !client.hasCompletedProfile;
      if (audience === 'birthday_missing') return !client.dateOfBirth;
      if (audience === 'inactive') return (client.summary?.daysSinceLastBooking || 0) >= 45;
      if (audience === 'recent') {
        const last = client.summary?.lastBookingAt ? new Date(client.summary.lastBookingAt).getTime() : 0;
        return last && now - last <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [audience, eligibleClients, promotional]);

  useEffect(() => {
    setSelectedIds(audienceClients.map((client) => client.userId));
  }, [audienceClients]);

  const selectedClients = audienceClients.filter((client) => selectedIds.includes(client.userId));
  const toggleClient = (client) => {
    setSelectedIds((current) => (
      current.includes(client.userId)
        ? current.filter((id) => id !== client.userId)
        : [...current, client.userId]
    ));
  };
  const previewClient = selectedClients[0] || audienceClients[0];
  const firstName = String(previewClient?.name || '').trim().split(/\s+/)[0] || 'cliente';
  const previewText = message
    .replace(/\{nome\}/gi, previewClient?.name || firstName)
    .replace(/\{primeiro_nome\}/gi, firstName);

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <section className="min-w-0 rounded-2xl border border-gold/20 bg-black/40 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Relacionamento</p>
        <h2 className="mt-1 text-xl font-semibold text-cream sm:text-2xl">Campanhas por WhatsApp</h2>
        <p className="mt-2 max-w-2xl text-sm text-cream/50">
          Selecione um publico, revise a lista e envie mensagens para clientes com WhatsApp liberado.
        </p>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 rounded-2xl border border-gold/20 bg-black/40 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm text-cream/70">Publico</label>
              <select
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              >
                <option value="all">Todas elegíveis</option>
                <option value="completed">CRM preenchido</option>
                <option value="missing">CRM pendente</option>
                <option value="birthday_missing">Sem aniversário</option>
                <option value="inactive">Sem retorno ha 45 dias</option>
                <option value="recent">Atendidas nos ultimos 30 dias</option>
              </select>
            </div>
            <label className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-cream/70">
              <input
                type="checkbox"
                checked={promotional}
                onChange={(event) => setPromotional(event.target.checked)}
                className="size-4 shrink-0 accent-gold"
              />
              <span className="min-w-0">Respeitar aceite de promoções</span>
            </label>
          </div>

          <div className="mt-4 min-w-0">
            <label className="mb-1 block text-sm text-cream/70">Mensagem</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              maxLength={1200}
              className="w-full min-w-0 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-gold"
            />
            <p className="mt-2 text-xs text-cream/40">Use {'{primeiro_nome}'} ou {'{nome}'} para personalizar.</p>
          </div>

          <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="text-sm text-cream/50">
              {selectedClients.length} selecionada(s) de {audienceClients.length} elegível(is)
            </span>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button type="button" onClick={() => setSelectedIds(audienceClients.map((client) => client.userId))} className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-cream/60 hover:text-gold-light sm:px-4">Selecionar todas</button>
              <button type="button" onClick={() => setSelectedIds([])} className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-cream/60 hover:text-gold-light sm:px-4">Limpar</button>
              <button
                type="button"
                disabled={sending || fetching || !selectedClients.length}
                onClick={() => onSend({ clientIds: selectedClients.map((client) => client.userId), message, promotional })}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-sm font-bold text-dark disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
              >
                <FiSend /> {sending ? 'Enviando...' : 'Enviar campanha'}
              </button>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-3">
            {fetching ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Carregando clientes...</p>
            ) : audienceClients.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Nenhuma cliente elegivel neste publico.</p>
            ) : audienceClients.map((client) => (
              <button
                key={client.userId}
                type="button"
                onClick={() => toggleClient(client)}
                className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                  selectedIds.includes(client.userId)
                    ? 'border-gold/45 bg-gold/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-gold/25'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-cream">{client.name}</span>
                  <span className="block truncate text-xs text-cream/40">{formatWhatsappDisplay(client.whatsappPhone)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${selectedIds.includes(client.userId) ? 'bg-gold text-dark' : 'bg-white/10 text-cream/45'}`}>
                  {selectedIds.includes(client.userId) ? 'Selecionada' : 'Selecionar'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="min-w-0 rounded-2xl border border-gold/20 bg-black/40 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Previa</p>
          <h3 className="mt-1 text-xl font-semibold text-cream">Mensagem personalizada</h3>
          <div className="mt-4 whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-cream/70">
            {previewText || 'Escreva uma mensagem para visualizar aqui.'}
          </div>
          <div className="mt-4 break-words rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50/80">
            O envio ignora clientes marcadas como "nao insistir", sem WhatsApp ou sem aceite de promoções quando a campanha for promocional.
          </div>
        </aside>
      </div>
    </div>
  );
}

function CrmClientCard({ client, sending, onSendInvite, onToggleDoNotInvite }) {
  const profile = client.profile || {};
  const sourceLabel = crmSourceLabel(profile.source);
  const completed = client.hasCompletedProfile;
  const phoneDigits = onlyDigits(client.whatsappPhone || '');
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : '';

  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              completed
                ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-300/25 bg-amber-300/10 text-amber-100'
            }`}>
              {completed ? 'Perfil preenchido' : 'Pendente'}
            </span>
            {profile.inviteSentAt && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-cream/45">
                Convite: {formatDate(profile.inviteSentAt)}
              </span>
            )}
            {client.inviteBlocked && (
              <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-200">
                Nao insistir
              </span>
            )}
            {!client.userId && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-cream/45">
                Sem conta vinculada
              </span>
            )}
          </div>
          <h3 className="truncate text-lg font-semibold text-cream">{client.name}</h3>
          <p className="mt-1 text-sm text-cream/45">{client.email || 'Email nao informado'} {client.whatsappPhone ? `- ${formatWhatsappDisplay(client.whatsappPhone)}` : ''}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15"
            >
              <FiMessageSquare /> WhatsApp
            </a>
          )}
          {!completed && client.hasWhatsapp && client.canSendSystemInvite && (
            <button
              type="button"
              onClick={onSendInvite}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/15 disabled:opacity-60"
            >
              <FiSend /> {sending ? 'Enviando...' : 'Enviar convite'}
            </button>
          )}
          {!completed && client.userId && (
            <button
              type="button"
              onClick={onToggleDoNotInvite}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                client.inviteBlocked
                  ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                  : 'border-red-400/25 bg-red-500/10 text-red-200 hover:bg-red-500/15'
              }`}
            >
              <FiSlash /> {client.inviteBlocked ? 'Permitir convite' : 'Nao insistir'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SmallStat label="Serviços" value={client.summary?.activeBookings || 0} tone="gold" />
        <SmallStat label="Ticket médio" value={formatCurrency(client.summary?.averageTicket || 0)} tone="gold" />
        <SmallStat label="Faltas" value={client.summary?.noShowCount || 0} tone={client.summary?.noShowCount ? 'danger' : 'default'} />
        <SmallStat label="Dias sem voltar" value={client.summary?.daysSinceLastBooking ?? '-'} tone={(client.summary?.daysSinceLastBooking || 0) > 60 ? 'warning' : 'default'} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream/40">Perfil CRM</p>
          <div className="space-y-2 text-sm text-cream/65">
            <p>Origem: <strong className="text-cream">{sourceLabel || 'Nao informada'}</strong></p>
            <p>Contato: <strong className="text-cream">{profile.contactPreference || 'Nao informado'}</strong></p>
            <p>Promoções: <strong className="text-cream">{profile.allowPromotions === false ? 'Nao' : 'Sim'}</strong></p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream/40">Preferências</p>
          <ChipList items={[...(profile.interests || []), ...(profile.preferredPeriods || [])]} empty="Nenhuma preferência registrada." />
          {profile.notes && <p className="mt-3 text-sm leading-relaxed text-cream/60">{profile.notes}</p>}
        </div>
      </div>
    </article>
  );
}

function ChipList({ items, empty }) {
  if (!items.length) return <p className="text-sm text-cream/45">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light">
          {item}
        </span>
      ))}
    </div>
  );
}

function crmSourceLabel(value) {
  const labels = {
    instagram: 'Instagram',
    indicacao: 'Indicação',
    google: 'Google',
    whatsapp: 'WhatsApp',
    cliente_antiga: 'Ja era cliente',
    outro: 'Outro',
  };
  return labels[value] || value || '';
}

function buildCrmInsights(clients, stats) {
  const countMap = (items) => Array.from(items.reduce((map, item) => {
    const label = String(item || '').trim();
    if (!label) return map;
    map.set(label, (map.get(label) || 0) + 1);
    return map;
  }, new Map()).entries())
    .map(([name, count]) => ({ name: crmSourceLabel(name) || name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);

  const sourceStats = countMap(clients.map((client) => client.profile?.source));
  const interestStats = countMap(clients.flatMap((client) => client.profile?.interests || []));
  const periodStats = countMap(clients.flatMap((client) => client.profile?.preferredPeriods || []));
  const reachableClients = clients.filter((client) => (
    client.userId
    && client.hasWhatsapp
    && !client.inviteBlocked
    && client.profile?.allowPromotions !== false
  ));
  const inactiveClients = reachableClients.filter((client) => (client.summary?.daysSinceLastBooking || 0) >= 45);
  const topInterest = interestStats[0];
  const topPeriod = periodStats[0];
  const topSource = sourceStats[0];
  const recommendations = [
    {
      label: 'Completar base do CRM',
      text: stats.noPreferences
        ? `${stats.noPreferences} cliente(s) ainda estao sem prefêrencias. Envie convite para aumentar a qualidade dos insights.`
        : 'As preferências principais estao bem preenchidas. Ja da para segmentar campanhas com mais segurança.',
    },
    {
      label: 'Campanha por interesse',
      text: topInterest
        ? `${topInterest.name} aparece como interesse mais citado. Vale criar uma campanha ou oferta voltada para esse serviço.`
        : 'Ainda faltam interesses declarados para identificar uma campanha por serviço.',
    },
    {
      label: 'Melhor horário para comunicar',
      text: topPeriod
        ? `${topPeriod.name} e o período preferido mais citado. Use isso para pensar em agenda, lembretes e ofertas.`
        : 'Ainda nao ha períodos preferidos suficientes para orientar agenda ou campanhas.',
    },
    {
      label: 'Origem que merece atenção',
      text: topSource
        ? `${topSource.name} e a origem mais frequente. Reforce esse canal e pergunte origem para quem ainda nao respondeu.`
        : 'A origem das clientes ainda está pouco preenchida. Esse dado ajuda a saber onde investir divulgação.',
    },
    {
      label: 'Reativação',
      text: inactiveClients.length
        ? `${inactiveClients.length} cliente(s) com WhatsApp liberado estão sem retorno ha 45 dias ou mais. Boa oportunidade para campanha de reativação.`
        : 'Nao há grande grupo parado para reativação neste momento.',
    },
  ];

  return {
    sourceStats,
    interestStats,
    periodStats,
    reachableClients,
    recommendations,
  };
}

function ClientsView({ clients, search, setSearch, statusBadge, onCompleteService, onUndoCompleteService, onMarkNoShow, onMarkRemainingPaid, onDeleteClient, onUpdateClientWhatsapp, onUpdateClientBirthday, birthdayCount, onOpenBirthdays }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [editingWhatsappKey, setEditingWhatsappKey] = useState(null);
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [editingBirthdayKey, setEditingBirthdayKey] = useState(null);
  const [birthdayDraft, setBirthdayDraft] = useState('');
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [mobileDetailsKey, setMobileDetailsKey] = useState(null);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredClients = useMemo(() => (
    normalizedSearch
      ? clients.filter((client) => client.searchText.includes(normalizedSearch))
      : clients
  ), [clients, normalizedSearch]);
  const selectedClient = filteredClients.find((client) => client.key === selectedKey) || filteredClients[0] || null;
  const mobileDetailsClient = filteredClients.find((client) => client.key === mobileDetailsKey) || null;
  const isEditingWhatsapp = Boolean(selectedClient && editingWhatsappKey === selectedClient.key);
  const isEditingBirthday = Boolean(selectedClient && editingBirthdayKey === selectedClient.key);

  useEffect(() => {
    if (selectedClient && selectedClient.key !== selectedKey) setSelectedKey(selectedClient.key);
    if (!selectedClient && selectedKey) setSelectedKey(null);
  }, [selectedClient, selectedKey]);

  useEffect(() => {
    if (!selectedClient || editingWhatsappKey === selectedClient.key) return;
    setEditingWhatsappKey(null);
    setWhatsappDraft('');
  }, [editingWhatsappKey, selectedClient]);

  useEffect(() => {
    if (!selectedClient || editingBirthdayKey === selectedClient.key) return;
    setEditingBirthdayKey(null);
    setBirthdayDraft('');
  }, [editingBirthdayKey, selectedClient]);

  useEffect(() => {
    if (mobileDetailsKey && !mobileDetailsClient) setMobileDetailsKey(null);
  }, [mobileDetailsClient, mobileDetailsKey]);

  const handleClientSelect = (client) => {
    setSelectedKey(client.key);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setMobileDetailsKey(client.key);
    }
  };

  const startWhatsappEdit = () => {
    if (!selectedClient) return;
    setEditingWhatsappKey(selectedClient.key);
    setWhatsappDraft(formatBrazilWhatsappInput(selectedClient.phone));
  };

  const cancelWhatsappEdit = () => {
    setEditingWhatsappKey(null);
    setWhatsappDraft('');
  };

  const saveWhatsappEdit = async () => {
    if (!selectedClient || !onUpdateClientWhatsapp) return;
    setSavingWhatsapp(true);
    const saved = await onUpdateClientWhatsapp(selectedClient, whatsappDraft);
    setSavingWhatsapp(false);
    if (saved) cancelWhatsappEdit();
  };

  const startBirthdayEdit = () => {
    if (!selectedClient) return;
    setEditingBirthdayKey(selectedClient.key);
    setBirthdayDraft(toDateInputValue(selectedClient.dateOfBirth));
  };

  const cancelBirthdayEdit = () => {
    setEditingBirthdayKey(null);
    setBirthdayDraft('');
  };

  const saveBirthdayEdit = async () => {
    if (!selectedClient || !onUpdateClientBirthday) return;
    setSavingBirthday(true);
    const saved = await onUpdateClientBirthday(selectedClient, birthdayDraft);
    setSavingBirthday(false);
    if (saved) cancelBirthdayEdit();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(300px,420px)_1fr]">
      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gold-light">Clientes</h2>
          <p className="mt-1 text-sm text-cream/45">{clients.length} cliente(s) encontrados no histórico</p>
        </div>

        <button
          type="button"
          onClick={onOpenBirthdays}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-left text-sm font-semibold text-gold-light transition hover:border-gold/45 hover:bg-gold/15"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FiGift className="shrink-0" />
            <span>Aniversariantes</span>
          </span>
          {birthdayCount > 0 && (
            <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
              {birthdayCount}
            </span>
          )}
        </button>

        <label className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-cream/70 focus-within:border-gold/40">
          <FiSearch className="text-gold" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por nome, email, WhatsApp ou serviço"
            className="w-full bg-transparent text-cream placeholder:text-cream/35 outline-none"
          />
        </label>

        {filteredClients.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Nenhum cliente encontrado para esta busca.</p>
        ) : (
          <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {filteredClients.map((client) => (
              <button
                key={client.key}
                type="button"
                onClick={() => handleClientSelect(client)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedClient?.key === client.key
                    ? 'border-gold/40 bg-gold/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-gold/25 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-cream">{client.name}</h3>
                    <p className="truncate text-sm text-cream/45">{client.contact}</p>
                  </div>
                  <span className="rounded-full bg-gold/15 px-2 py-1 text-xs font-bold text-gold">{client.totalBookings}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] font-bold uppercase tracking-wider">
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-emerald-300">{client.completedCount} feitos</span>
                  {client.pendingCount > 0 && <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-amber-100">{client.pendingCount} pend.</span>}
                  {client.noShowCount > 0 && <span className="rounded-full border border-red-400/25 bg-red-500/10 px-2 py-1 text-red-200">{client.noShowCount} faltou</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="hidden rounded-2xl border border-gold/20 bg-black/40 p-5 xl:block">
        {!selectedClient ? (
          <p className="text-sm text-cream/50">Selecione um cliente para ver detalhes.</p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Detalhes do cliente</p>
                  <h2 className="mt-1 truncate text-2xl font-bold text-cream">{selectedClient.name}</h2>
                  {selectedClient.email && <p className="mt-1 text-sm text-cream/50">{selectedClient.email}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isEditingWhatsapp ? (
                      <>
                        <input
                          value={whatsappDraft}
                          onChange={(event) => setWhatsappDraft(formatBrazilWhatsappInput(event.target.value))}
                          placeholder="WhatsApp com DDD"
                          className="min-h-[36px] w-full max-w-[220px] rounded-lg border border-gold/25 bg-black/35 px-3 text-sm text-cream outline-none transition placeholder:text-cream/30 focus:border-gold/60 sm:w-auto"
                        />
                        <button
                          type="button"
                          onClick={saveWhatsappEdit}
                          disabled={savingWhatsapp}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 transition hover:border-emerald-400/45 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Salvar WhatsApp"
                          aria-label="Salvar WhatsApp"
                        >
                          <FiSave size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelWhatsappEdit}
                          disabled={savingWhatsapp}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-cream/60 transition hover:border-white/20 hover:text-cream disabled:cursor-not-allowed disabled:opacity-60"
                          title="Cancelar edicao"
                          aria-label="Cancelar edicao do WhatsApp"
                        >
                          <FiX size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-cream/40">{selectedClient.phone || 'WhatsApp nao informado'}</p>
                        {onUpdateClientWhatsapp && (
                          <button
                            type="button"
                            onClick={startWhatsappEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold-light transition hover:border-gold/45 hover:bg-gold/15"
                            title="Editar WhatsApp"
                            aria-label="Editar WhatsApp"
                          >
                            <FiEdit3 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isEditingBirthday ? (
                      <>
                        <input
                          type="date"
                          value={birthdayDraft}
                          onChange={(event) => setBirthdayDraft(event.target.value)}
                          className="min-h-[36px] w-full max-w-[170px] rounded-lg border border-gold/25 bg-black/35 px-3 text-sm text-cream outline-none transition focus:border-gold/60 sm:w-auto"
                        />
                        <button
                          type="button"
                          onClick={saveBirthdayEdit}
                          disabled={savingBirthday}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 transition hover:border-emerald-400/45 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Salvar aniversario"
                          aria-label="Salvar aniversario"
                        >
                          <FiSave size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelBirthdayEdit}
                          disabled={savingBirthday}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-cream/60 transition hover:border-white/20 hover:text-cream disabled:cursor-not-allowed disabled:opacity-60"
                          title="Cancelar edicao"
                          aria-label="Cancelar edicao do aniversario"
                        >
                          <FiX size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-cream/40">
                          Aniversário: {selectedClient.dateOfBirth ? new Date(selectedClient.dateOfBirth).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) : 'Não informado'}
                        </p>
                        {onUpdateClientBirthday && selectedClient.userId && (
                          <button
                            type="button"
                            onClick={startBirthdayEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold-light transition hover:border-gold/45 hover:bg-gold/15"
                            title="Editar aniversario"
                            aria-label="Editar aniversario"
                          >
                            <FiCalendar size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {onDeleteClient && selectedClient.email && (
                  <button
                    type="button"
                    onClick={() => onDeleteClient(selectedClient.email, selectedClient.name)}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-300 transition hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-200"
                    title="Excluir este cliente e todos os seus dados"
                  >
                    <FiTrash2 size={14} />
                    Excluir
                  </button>
                )}
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                <SmallStat label="Serviços" value={selectedClient.totalServices} tone="gold" />
                <SmallStat label="Valor" value={formatCurrency(selectedClient.totalRevenue)} tone="gold" />
                <SmallStat label="Pago" value={formatCurrency(selectedClient.totalPaid)} tone="success" />
                <SmallStat label="À receber" value={formatCurrency(selectedClient.totalRemaining)} tone="warning" />
                <SmallStat label="Faltas" value={selectedClient.noShowCount} tone={selectedClient.noShowCount ? 'danger' : 'default'} />
                <SmallStat label="Cancelados" value={selectedClient.cancelledCount} tone={selectedClient.cancelledCount ? 'danger' : 'default'} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream/40">Serviços mais feitos</p>
                {selectedClient.serviceStats.length === 0 ? (
                  <p className="text-sm text-cream/45">Nenhum serviço registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedClient.serviceStats.map((service) => (
                      <div key={service.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-cream/75">{service.name}</span>
                        <span className="font-bold text-gold">{service.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream/40">Resumo</p>
                <div className="space-y-2 text-sm text-cream/65">
                  <p>Primeiro agendamento: <strong className="text-cream">{selectedClient.firstBooking ? formatDate(selectedClient.firstBooking.scheduledAt) : '-'}</strong></p>
                  <p>Último agendamento: <strong className="text-cream">{selectedClient.lastBooking ? formatDate(selectedClient.lastBooking.scheduledAt) : '-'}</strong></p>
                  <p>Ticket médio: <strong className="text-cream">{formatCurrency(selectedClient.averageTicket)}</strong></p>
                  <p>Selos liberados: <strong className="text-cream">{selectedClient.completedStamps}</strong></p>
                  
                  <div className="mt-4 grid grid-cols-5 gap-1.5 pt-3 border-t border-white/5 sm:grid-cols-10 lg:grid-cols-5 xl:grid-cols-10">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <span
                        key={index}
                        className={`grid aspect-square place-items-center rounded-full text-[0.6rem] font-bold ${
                          index < Math.min(selectedClient.completedStamps, 10)
                            ? 'bg-gradient-to-br from-gold to-gold-light text-dark'
                            : 'border border-white/10 bg-black/40 text-cream/20'
                        }`}
                      >
                        TS
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-gold-light">Histórico de serviços</h3>
              <div className="space-y-3">
                {selectedClient.bookings.map((booking) => (
                  <article key={booking.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {statusBadge(booking.status)}
                          {booking.serviceCompletedAt && <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">Fidelidade liberada</span>}
                          {booking.calPayload?.adminCreated && <span className="rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-purple-300" title="Agendamento feito pela administradora">Admin</span>}
                        </div>
                        <h4 className="text-base font-semibold text-cream">{booking.service || 'Servico nao informado'}</h4>
                        <p className="mt-1 text-sm text-cream/45">{formatDate(booking.scheduledAt)} - {formatTime(booking.scheduledAt)}{booking.endTime && ` ate ${formatTime(booking.endTime)}`}</p>
                        <p className="mt-1 text-sm text-cream/45">Valor: <strong className="text-gold-light">{formatCurrency(booking.estimatedValue)}</strong></p>
                        {(() => {
                          const payment = getBookingPaymentSummary(booking);
                          return (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">Pago: {formatCurrency(payment.paid)}</span>
                              <span className={`rounded-full border px-3 py-1 ${payment.remaining > 0 ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/5 text-cream/45'}`}>
                                À receber: {formatCurrency(payment.remaining)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <CompletionAction
                        booking={booking}
                        onCompleteService={onCompleteService}
                        onUndoCompleteService={onUndoCompleteService}
                        onMarkNoShow={onMarkNoShow}
                        onMarkRemainingPaid={onMarkRemainingPaid}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {mobileDetailsClient && createPortal(
        <MobileClientDetailsModal
          client={mobileDetailsClient}
          statusBadge={statusBadge}
          isEditingWhatsapp={isEditingWhatsapp}
          whatsappDraft={whatsappDraft}
          setWhatsappDraft={setWhatsappDraft}
          savingWhatsapp={savingWhatsapp}
          startWhatsappEdit={startWhatsappEdit}
          cancelWhatsappEdit={cancelWhatsappEdit}
          saveWhatsappEdit={saveWhatsappEdit}
          canUpdateWhatsapp={Boolean(onUpdateClientWhatsapp)}
          isEditingBirthday={isEditingBirthday}
          birthdayDraft={birthdayDraft}
          setBirthdayDraft={setBirthdayDraft}
          savingBirthday={savingBirthday}
          startBirthdayEdit={startBirthdayEdit}
          cancelBirthdayEdit={cancelBirthdayEdit}
          saveBirthdayEdit={saveBirthdayEdit}
          canUpdateBirthday={Boolean(onUpdateClientBirthday && mobileDetailsClient.userId)}
          onCompleteService={onCompleteService}
          onUndoCompleteService={onUndoCompleteService}
          onMarkNoShow={onMarkNoShow}
          onMarkRemainingPaid={onMarkRemainingPaid}
          onClose={() => setMobileDetailsKey(null)}
        />,
        document.body,
      )}
    </div>
  );
}

function MobileClientDetailsModal({
  client,
  statusBadge,
  isEditingWhatsapp,
  whatsappDraft,
  setWhatsappDraft,
  savingWhatsapp,
  startWhatsappEdit,
  cancelWhatsappEdit,
  saveWhatsappEdit,
  canUpdateWhatsapp,
  isEditingBirthday,
  birthdayDraft,
  setBirthdayDraft,
  savingBirthday,
  startBirthdayEdit,
  cancelBirthdayEdit,
  saveBirthdayEdit,
  canUpdateBirthday,
  onCompleteService,
  onUndoCompleteService,
  onMarkNoShow,
  onMarkRemainingPaid,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 p-3 backdrop-blur-sm xl:hidden" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gold/25 bg-[#090706] shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Detalhes do cliente</p>
            <h2 className="mt-1 truncate text-2xl font-bold text-cream">{client.name}</h2>
            {client.email && <p className="mt-1 truncate text-sm text-cream/50">{client.email}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-cream/60 transition hover:border-gold/30 hover:text-gold-light"
            aria-label="Fechar detalhes do cliente"
          >
            <FiX />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {isEditingWhatsapp ? (
                  <>
                    <input
                      value={whatsappDraft}
                      onChange={(event) => setWhatsappDraft(formatBrazilWhatsappInput(event.target.value))}
                      placeholder="WhatsApp com DDD"
                      className="min-h-[36px] min-w-0 flex-1 rounded-lg border border-gold/25 bg-black/35 px-3 text-sm text-cream outline-none transition placeholder:text-cream/30 focus:border-gold/60"
                    />
                    <IconActionButton onClick={saveWhatsappEdit} disabled={savingWhatsapp} label="Salvar WhatsApp" tone="success" icon={<FiSave size={15} />} />
                    <IconActionButton onClick={cancelWhatsappEdit} disabled={savingWhatsapp} label="Cancelar edicao do WhatsApp" icon={<FiX size={16} />} />
                  </>
                ) : (
                  <>
                    <p className="text-sm text-cream/45">{client.phone || 'WhatsApp nao informado'}</p>
                    {canUpdateWhatsapp && (
                      <IconActionButton onClick={startWhatsappEdit} label="Editar WhatsApp" tone="gold" icon={<FiEdit3 size={14} />} />
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isEditingBirthday ? (
                  <>
                    <input
                      type="date"
                      value={birthdayDraft}
                      onChange={(event) => setBirthdayDraft(event.target.value)}
                      className="min-h-[36px] min-w-0 flex-1 rounded-lg border border-gold/25 bg-black/35 px-3 text-sm text-cream outline-none transition focus:border-gold/60"
                    />
                    <IconActionButton onClick={saveBirthdayEdit} disabled={savingBirthday} label="Salvar aniversario" tone="success" icon={<FiSave size={15} />} />
                    <IconActionButton onClick={cancelBirthdayEdit} disabled={savingBirthday} label="Cancelar edicao do aniversario" icon={<FiX size={16} />} />
                  </>
                ) : (
                  <>
                    <p className="text-sm text-cream/45">
                      Aniversário: {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) : 'Não informado'}
                    </p>
                    {canUpdateBirthday && (
                      <IconActionButton onClick={startBirthdayEdit} label="Editar aniversario" tone="gold" icon={<FiCalendar size={14} />} />
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SmallStat label="Serviços" value={client.totalServices} tone="gold" />
              <SmallStat label="Valor" value={formatCurrency(client.totalRevenue)} tone="gold" />
              <SmallStat label="Pago" value={formatCurrency(client.totalPaid)} tone="success" />
              <SmallStat label="À receber" value={formatCurrency(client.totalRemaining)} tone="warning" />
              <SmallStat label="Faltas" value={client.noShowCount} tone={client.noShowCount ? 'danger' : 'default'} />
              <SmallStat label="Cancelados" value={client.cancelledCount} tone={client.cancelledCount ? 'danger' : 'default'} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream/40">Resumo</p>
              <div className="space-y-2 text-sm text-cream/65">
                <p>Primeiro agendamento: <strong className="text-cream">{client.firstBooking ? formatDate(client.firstBooking.scheduledAt) : '-'}</strong></p>
                <p>Último agendamento: <strong className="text-cream">{client.lastBooking ? formatDate(client.lastBooking.scheduledAt) : '-'}</strong></p>
                <p>Ticket médio: <strong className="text-cream">{formatCurrency(client.averageTicket)}</strong></p>
                <p>Selos liberados: <strong className="text-cream">{client.completedStamps}</strong></p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream/40">Serviços mais feitos</p>
              {client.serviceStats.length === 0 ? (
                <p className="text-sm text-cream/45">Nenhum serviço registrado.</p>
              ) : (
                <div className="space-y-2">
                  {client.serviceStats.map((service) => (
                    <div key={service.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-cream/75">{service.name}</span>
                      <span className="font-bold text-gold">{service.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-gold-light">Histórico de serviços</h3>
              <div className="space-y-3">
                {client.bookings.map((booking) => {
                  const payment = getBookingPaymentSummary(booking);
                  return (
                    <article key={booking.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {statusBadge(booking.status)}
                        {booking.serviceCompletedAt && <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">Fidelidade liberada</span>}
                      </div>
                      <h4 className="text-base font-semibold text-cream">{booking.service || 'Servico nao informado'}</h4>
                      <p className="mt-1 text-sm text-cream/45">{formatDate(booking.scheduledAt)} - {formatTime(booking.scheduledAt)}{booking.endTime && ` ate ${formatTime(booking.endTime)}`}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">Pago: {formatCurrency(payment.paid)}</span>
                        <span className={`rounded-full border px-3 py-1 ${payment.remaining > 0 ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/5 text-cream/45'}`}>
                          À receber: {formatCurrency(payment.remaining)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <CompletionAction
                          booking={booking}
                          onCompleteService={onCompleteService}
                          onUndoCompleteService={onUndoCompleteService}
                          onMarkNoShow={onMarkNoShow}
                          onMarkRemainingPaid={onMarkRemainingPaid}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconActionButton({ icon, label, tone = 'default', disabled, onClick }) {
  const tones = {
    default: 'border-white/10 bg-white/[0.04] text-cream/60 hover:border-white/20 hover:text-cream',
    gold: 'border-gold/20 bg-gold/10 text-gold-light hover:border-gold/45 hover:bg-gold/15',
    success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/45 hover:bg-emerald-500/20',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function BirthdaysAdminView({ monthLabel, celebrants, allCelebrants, clients, fetching, fetchingClients, filter, setFilter, sendingIds, savingClientIds, onSend, onSaveClientBirthday, onRefresh, onPrev, onNext }) {
  const stats = useMemo(() => ({
    total: allCelebrants.length,
    today: allCelebrants.filter((item) => item.isToday).length,
    pending: allCelebrants.filter((item) => item.rewardStatus !== 'sent' && item.whatsappPhone).length,
    sent: allCelebrants.filter((item) => item.rewardStatus === 'sent').length,
    noWhatsapp: allCelebrants.filter((item) => !item.whatsappPhone).length,
  }), [allCelebrants]);

  const filters = [
    { value: 'pending', label: 'Pendentes', count: stats.pending },
    { value: 'today', label: 'Hoje', count: stats.today },
    { value: 'all', label: 'Todos', count: stats.total },
    { value: 'sent', label: 'Enviados', count: stats.sent },
    { value: 'no_whatsapp', label: 'Sem WhatsApp', count: stats.noWhatsapp },
    { value: 'clients', label: 'Ver todos os clientes', count: clients.length },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Aniversariantes do mês</p>
            <h2 className="mt-1 text-2xl font-semibold capitalize text-cream">{monthLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm text-cream/50">
              O sistema apenas lista os clientes. A mensagem de parabens so e enviada quando a administradora clicar em enviar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="grid size-10 place-items-center rounded-full border border-white/10 text-cream/60 hover:border-gold/30 hover:text-gold-light"
              aria-label="Mes anterior"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="grid size-10 place-items-center rounded-full border border-white/10 text-cream/60 hover:border-gold/30 hover:text-gold-light"
              aria-label="Proximo mes"
            >
              <FiChevronRight />
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10"
            >
              <FiRefreshCw /> Atualizar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SmallStat label="No mês" value={stats.total} tone="gold" />
          <SmallStat label="Hoje" value={stats.today} tone={stats.today ? 'success' : 'default'} />
          <SmallStat label="Pendentes" value={stats.pending} tone={stats.pending ? 'warning' : 'default'} />
          <SmallStat label="Enviados" value={stats.sent} tone="success" />
          <SmallStat label="Sem WhatsApp" value={stats.noWhatsapp} tone={stats.noWhatsapp ? 'danger' : 'default'} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <SegmentedButton key={item.value} active={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}{item.count ? ` (${item.count})` : ''}
          </SegmentedButton>
        ))}
      </div>

      {filter === 'clients' ? (
        <ClientBirthdayDirectory
          clients={clients}
          fetching={fetchingClients}
          savingIds={savingClientIds}
          onSave={onSaveClientBirthday}
        />
      ) : fetching ? (
        <div className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-cream/50">Carregando aniversariantes...</div>
      ) : celebrants.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-cream/50">
          Nenhum aniversariante encontrado para este filtro.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {celebrants.map((celebrant) => (
            <BirthdayCelebrantCard
              key={celebrant.id}
              celebrant={celebrant}
              sending={Boolean(sendingIds[celebrant.id])}
              onSend={() => onSend(celebrant)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientBirthdayDirectory({ clients, fetching, savingIds, onSave }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Datas de nascimento</p>
        <h2 className="mt-1 text-xl font-semibold text-cream">Clientes cadastrados</h2>
      </div>

      {fetching ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-cream/45">
          Carregando clientes...
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-cream/45">
          Nenhum cliente cadastrado.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(120px,170px)_minmax(210px,260px)] gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-wider text-cream/45 md:grid">
            <span>Cliente</span>
            <span>Data atual</span>
            <span>Editar</span>
          </div>
          <div className="divide-y divide-white/10">
            {clients.map((client) => (
              <ClientBirthdayRow
                key={client.id}
                client={client}
                saving={Boolean(savingIds[client.id])}
                onSave={onSave}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ClientBirthdayRow({ client, saving, onSave }) {
  const currentValue = toDateInputValue(client.dateOfBirth);
  const [dateValue, setDateValue] = useState(currentValue);

  useEffect(() => {
    setDateValue(currentValue);
  }, [currentValue]);

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(120px,170px)_minmax(210px,260px)] md:items-center md:gap-4">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-cream">{client.name || 'Cliente'}</h3>
        <p className="truncate text-sm text-cream/45">{client.email || formatWhatsappDisplay(client.whatsappPhone) || 'Contato não informado'}</p>
      </div>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/35 md:hidden">Data atual</p>
        <p className={client.dateOfBirth ? 'text-sm font-semibold text-gold-light' : 'text-sm text-cream/45'}>
          {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informada'}
        </p>
      </div>

      <form
        className="flex min-w-0 flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(client, dateValue);
        }}
      >
        <input
          type="date"
          value={dateValue}
          onChange={(event) => setDateValue(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-cream outline-none [color-scheme:dark] focus:border-gold/40"
        />
        <button
          type="submit"
          disabled={saving || dateValue === currentValue}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-4 py-2 text-sm font-bold text-gold-light transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-cream/35"
        >
          <FiSave />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

function BirthdayCelebrantCard({ celebrant, sending, onSend }) {
  const status = getBirthdayStatusMeta(celebrant);
  const birthdayLabel = celebrant.dateOfBirth
    ? new Date(celebrant.dateOfBirth).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })
    : `Dia ${String(celebrant.birthdayDay || '').padStart(2, '0')}`;
  const sentAt = celebrant.reward?.sentAt ? formatDate(celebrant.reward.sentAt) : null;

  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {celebrant.isToday && (
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200">
                Hoje
              </span>
            )}
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${status.classes}`}>
              {status.label}
            </span>
          </div>
          <h3 className="truncate text-xl font-semibold text-cream">{celebrant.name}</h3>
          <p className="mt-1 text-sm text-cream/45">{celebrant.email || 'Email nao informado'}</p>
          <p className="mt-1 text-sm text-cream/45">{formatWhatsappDisplay(celebrant.whatsappPhone) || 'WhatsApp nao informado'}</p>
          <p className="mt-3 text-sm text-cream/65">
            Aniversario: <strong className="capitalize text-gold-light">{birthdayLabel}</strong>
          </p>
          {sentAt && <p className="mt-1 text-xs text-emerald-200/75">Enviado em {sentAt}</p>}
          {celebrant.reward?.error && <p className="mt-2 text-xs text-red-200/80">Erro anterior: {celebrant.reward.error}</p>}
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={!celebrant.canSend || sending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-bold text-gold-light transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-cream/35"
        >
          <FiMessageSquare />
          {sending ? 'Enviando...' : celebrant.rewardStatus === 'sent' ? 'Enviado' : 'Enviar parabens'}
        </button>
      </div>
    </article>
  );
}

function GalleryView({ categories, category, setCategory, files, setFiles, loading, handleUpload, fetching, images, handleDeleteImage }) {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="rounded-2xl border border-gold/20 bg-black/40 p-6">
        <h2 className="mb-4 text-xl font-semibold">Nova Imagem</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-cream/70">Arquivo(s) da imagem</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream file:mr-4 file:rounded-full file:border-0 file:bg-gold/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gold hover:file:bg-gold/30"
            />
            {files.length > 0 && <p className="mt-2 text-xs text-gold">{files.length} arquivo(s) selecionado(s)</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-cream/70">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-cream outline-none focus:border-gold">
              <option value="Todas">Todas</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <button type="submit" disabled={loading} className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light py-3 font-bold text-dark transition-all hover:scale-[1.02] disabled:opacity-50">
            {loading ? 'Enviando...' : <><FiUploadCloud className="text-xl" /> Fazer Upload</>}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-gold/20 bg-black/40 p-6 md:col-span-2">
        <h2 className="mb-4 text-xl font-semibold">Imagens Publicadas</h2>
        {fetching ? (
          <p className="text-cream/50">Carregando imagens...</p>
        ) : images.length === 0 ? (
          <p className="text-cream/50">Nenhuma imagem na galeria ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((image) => (
              <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
                <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button onClick={() => handleDeleteImage(image.id)} className="flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">
                    <FiTrash2 /> Deletar
                  </button>
                </div>
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs font-bold text-gold">{image.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TestimonialsAdmin({ form, setForm, saving, onSave, testimonials, fetching, onEdit, onDelete, onToggle }) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="rounded-2xl border border-gold/20 bg-black/40 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{form.id ? 'Editar Depoimento' : 'Novo Depoimento'}</h2>
          {form.id && (
            <button onClick={() => setForm(emptyTestimonial)} className="rounded-full border border-white/10 p-2 text-cream/50 hover:border-gold/30 hover:text-gold">
              <FiX />
            </button>
          )}
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-cream/70">Nome da cliente</label>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              placeholder="Ex: Marina L."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-cream/70">Depoimento</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((current) => ({ ...current, text: e.target.value }))}
              rows={6}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              placeholder="Escreva o depoimento que aparecera no site."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-cream/70">Estrelas</label>
              <select
                value={form.rating}
                onChange={(e) => setForm((current) => ({ ...current, rating: Number(e.target.value) }))}
                className="w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              >
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </div>
            <label className="flex items-end gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream/75">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((current) => ({ ...current, published: e.target.checked }))}
              />
              Publicar
            </label>
          </div>
          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light py-3 font-bold text-dark transition-all hover:scale-[1.02] disabled:opacity-50">
            <FiSave /> {saving ? 'Salvando...' : 'Salvar Depoimento'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-gold/20 bg-black/40 p-6 lg:col-span-2">
        <h2 className="mb-4 text-xl font-semibold">Depoimentos do Site</h2>
        {fetching ? (
          <p className="text-cream/50">Carregando depoimentos...</p>
        ) : testimonials.length === 0 ? (
          <p className="text-cream/50">Nenhum depoimento cadastrado ainda.</p>
        ) : (
          <div className="space-y-4">
            {testimonials.map((testimonial) => (
              <article key={testimonial.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-cream">{testimonial.name}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase ${testimonial.published ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-cream/45'}`}>
                        {testimonial.published ? 'Publicado' : 'Oculto'}
                      </span>
                    </div>
                    <div className="mt-1 flex text-gold">
                      {Array.from({ length: testimonial.rating || 5 }).map((_, index) => <FiStar key={index} fill="currentColor" />)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onToggle(testimonial)} className="rounded-full border border-white/10 p-2 text-cream/50 hover:border-gold/30 hover:text-gold">
                      {testimonial.published ? <FiEyeOff /> : <FiEye />}
                    </button>
                    <button onClick={() => onEdit(testimonial)} className="rounded-full border border-white/10 p-2 text-cream/50 hover:border-gold/30 hover:text-gold">
                      <FiEdit3 />
                    </button>
                    <button onClick={() => onDelete(testimonial.id)} className="rounded-full border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-cream/70">{testimonial.text}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function financeMonthKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'sem-data';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseFinanceDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatFinanceDate(value) {
  return parseFinanceDate(value).toLocaleDateString('pt-BR');
}

function toFinanceInputDate(value) {
  const date = parseFinanceDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createFinanceMonthBucket(date) {
  const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const key = financeMonthKey(validDate);
  return {
    key,
    label: validDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    yearLabel: String(validDate.getFullYear()),
    revenue: 0,
    income: 0,
    expenses: 0,
    pending: 0,
    balance: 0,
    paidBookings: 0,
    chargeableBookings: 0,
    incomeItems: [],
    expenseItems: [],
    pendingItems: [],
    expenseCategoryMap: new Map(),
    expenseCategories: [],
  };
}

function ensureFinanceMonthBucket(monthMap, date) {
  const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const key = financeMonthKey(validDate);
  if (!monthMap.has(key)) monthMap.set(key, createFinanceMonthBucket(validDate));
  return monthMap.get(key);
}

function buildFinanceYearlyHistory(monthMap) {
  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear]);
  monthMap.forEach((month) => {
    const year = Number(String(month.key).slice(0, 4));
    if (Number.isFinite(year)) years.add(year);
  });

  return Array.from(years)
    .sort((a, b) => b - a)
    .map((year) => {
      const months = Array.from({ length: 12 }).map((_, index) => {
        const date = new Date(year, index, 1);
        const key = financeMonthKey(date);
        const month = monthMap.get(key) || createFinanceMonthBucket(date);
        const balance = month.income - month.expenses;
        const projectedBalance = month.income + month.pending - month.expenses;
        const margin = month.income > 0 ? (balance / month.income) * 100 : 0;

        return {
          ...month,
          shortLabel: date.toLocaleDateString('pt-BR', { month: 'short' }),
          monthLabel: date.toLocaleDateString('pt-BR', { month: 'long' }),
          balance,
          projectedBalance,
          margin,
          hasMovement: month.income > 0 || month.expenses > 0 || month.pending > 0,
        };
      });

      const totals = months.reduce((acc, month) => ({
        income: acc.income + month.income,
        expenses: acc.expenses + month.expenses,
        pending: acc.pending + month.pending,
        balance: acc.balance + month.balance,
        projectedBalance: acc.projectedBalance + month.projectedBalance,
      }), {
        income: 0,
        expenses: 0,
        pending: 0,
        balance: 0,
        projectedBalance: 0,
      });

      return {
        year: String(year),
        months,
        totals,
        averageIncome: totals.income / 12,
        averageExpenses: totals.expenses / 12,
        margin: totals.income > 0 ? (totals.balance / totals.income) * 100 : 0,
        bestIncomeMonth: [...months].sort((a, b) => b.income - a.income)[0],
        highestExpenseMonth: [...months].sort((a, b) => b.expenses - a.expenses)[0],
      };
    });
}

function buildFinanceSummary(bookings, expenses) {
  const monthMap = new Map();
  const monthlyHistoryMap = new Map();
  const currentMonthKey = financeMonthKey(new Date());
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let paidBookings = 0;
  let chargeableBookings = 0;

  const monthSeeds = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index), 1);
    const key = financeMonthKey(date);
    const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    monthMap.set(key, { key, label, value: 0 });
    monthlyHistoryMap.set(key, createFinanceMonthBucket(date));
    return key;
  });

  const pendingPayments = [];

  bookings.forEach((booking) => {
    if (['cancelled', 'no_show'].includes(booking.status)) return;

    chargeableBookings += 1;
    const payment = getBookingPaymentSummary(booking);
    totalRevenue += payment.total;
    totalPaid += payment.paid;
    totalRemaining += payment.remaining;
    if (payment.paid > 0) paidBookings += 1;

    const date = new Date(booking.scheduledAt);
    const key = financeMonthKey(date);
    if (monthMap.has(key)) monthMap.get(key).value += payment.paid;
    const monthBucket = ensureFinanceMonthBucket(monthlyHistoryMap, date);
    monthBucket.revenue += payment.total;
    monthBucket.chargeableBookings += 1;
    if (payment.paid > 0) monthBucket.paidBookings += 1;

    if (payment.paid > 0) {
      monthBucket.income += payment.paid;
      monthBucket.incomeItems.push({
        id: `income-${booking.id}`,
        client: booking.attendeeName || booking.user?.name || 'Cliente',
        service: booking.service || booking.payment?.serviceName || 'Servico nao informado',
        date: booking.scheduledAt,
        method: booking.payment?.paymentType ? booking.payment.paymentType.toUpperCase() : 'Pagamento',
        amount: payment.paid,
      });
    }

    if (payment.remaining > 0) {
      const pendingPayment = {
        id: booking.id,
        client: booking.attendeeName || booking.user?.name || 'Cliente',
        service: booking.service || 'Servico nao informado',
        scheduledAt: booking.scheduledAt,
        remaining: payment.remaining,
        booking,
      };
      pendingPayments.push(pendingPayment);
      monthBucket.pending += payment.remaining;
      monthBucket.pendingItems.push({
        id: `pending-${booking.id}`,
        client: pendingPayment.client,
        service: pendingPayment.service,
        date: booking.scheduledAt,
        amount: payment.remaining,
      });
    }
  });

  const totalExpenses = expenses.reduce((sum, expense) => {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    const category = expense.category || 'Outros';
    const date = parseFinanceDate(expense.date);
    const monthBucket = ensureFinanceMonthBucket(monthlyHistoryMap, date);
    monthBucket.expenses += amount;
    monthBucket.expenseItems.push({
      id: `expense-${expense.id}`,
      expenseId: expense.id,
      original: expense,
      description: expense.description || 'Despesa',
      category,
      date: expense.date,
      notes: expense.notes || '',
      amount,
    });
    monthBucket.expenseCategoryMap.set(category, (monthBucket.expenseCategoryMap.get(category) || 0) + amount);
    return sum + amount;
  }, 0);

  const monthlyHistory = Array.from(monthlyHistoryMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((month) => ({
      ...month,
      balance: month.income - month.expenses,
      incomeItems: month.incomeItems.sort((a, b) => new Date(b.date) - new Date(a.date)),
      expenseItems: month.expenseItems.sort((a, b) => new Date(b.date) - new Date(a.date)),
      pendingItems: month.pendingItems.sort((a, b) => new Date(b.date) - new Date(a.date)),
      expenseCategories: Array.from(month.expenseCategoryMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    }))
    .slice(-12);
  const yearlyHistory = buildFinanceYearlyHistory(monthlyHistoryMap);
  const currentMonth = monthlyHistoryMap.get(currentMonthKey) || createFinanceMonthBucket(new Date());
  const currentExpenseCategories = Array.from(currentMonth.expenseCategoryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const currentPendingPayments = pendingPayments
    .filter((payment) => financeMonthKey(new Date(payment.scheduledAt)) === currentMonthKey)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 8);

  return {
    totalRevenue: currentMonth.revenue,
    totalPaid: currentMonth.income,
    totalRemaining: currentMonth.pending,
    totalExpenses: currentMonth.expenses,
    netProfit: currentMonth.income - currentMonth.expenses,
    projectedProfit: currentMonth.revenue - currentMonth.expenses,
    averageTicket: currentMonth.chargeableBookings ? currentMonth.revenue / currentMonth.chargeableBookings : 0,
    paidBookings: currentMonth.paidBookings,
    expenseCount: currentMonth.expenseItems.length,
    currentMonthKey,
    currentMonthLabel: currentMonth.label,
    monthStats: monthSeeds.slice(-6).map((key) => monthMap.get(key)),
    monthlyHistory,
    yearlyHistory,
    pendingPayments: currentPendingPayments,
    expenseCategories: currentExpenseCategories,
    totals: {
      totalRevenue,
      totalPaid,
      totalRemaining,
      totalExpenses,
      paidBookings,
      chargeableBookings,
    },
  };
}

function buildErpSummary({
  analytics,
  bookings,
  crmStats,
  financeSummary,
  pendingCompletionBookings,
  unresolvedApprovedPayments,
}) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAhead = new Date(todayStart);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

  const activeBookings = bookings.filter((booking) => !['cancelled', 'no_show'].includes(booking.status));
  const receivables = [];
  let nextSevenDaysRevenue = 0;

  activeBookings.forEach((booking) => {
    const payment = getBookingPaymentSummary(booking);
    const scheduledAt = new Date(booking.scheduledAt);

    if (scheduledAt >= todayStart && scheduledAt < sevenDaysAhead) {
      nextSevenDaysRevenue += payment.total || Number(booking.estimatedValue) || 0;
    }

    if (payment.remaining > 0) {
      receivables.push({
        id: booking.id,
        client: booking.attendeeName || booking.user?.name || 'Cliente',
        service: booking.service || booking.payment?.serviceName || 'Servico nao informado',
        scheduledAt: booking.scheduledAt,
        remaining: payment.remaining,
        overdue: scheduledAt < todayStart,
      });
    }
  });

  const overdueReceivables = receivables
    .filter((item) => item.overdue)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const upcomingReceivables = receivables
    .filter((item) => !item.overdue)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const unresolvedPaymentCount = unresolvedApprovedPayments.length;
  const crmMissing = crmStats?.missing || 0;
  const pendingStamps = pendingCompletionBookings.length;
  const cashIn = financeSummary.totalPaid;
  const cashOut = financeSummary.totalExpenses;
  const receivablesTotal = financeSummary.totalRemaining;
  const projectedCash = cashIn + receivablesTotal - cashOut;
  const netProfit = financeSummary.netProfit;
  const margin = cashIn > 0 ? (netProfit / cashIn) * 100 : 0;
  const cancellationPenalty = analytics.cancellationRate > 25 ? 12 : analytics.cancellationRate > 15 ? 6 : 0;
  const score = Math.max(0, Math.min(100,
    100
    - Math.min(24, overdueReceivables.length * 8)
    - Math.min(24, unresolvedPaymentCount * 12)
    - Math.min(16, pendingStamps * 3)
    - Math.min(14, crmMissing * 1.5)
    - (netProfit < 0 ? 12 : 0)
    - cancellationPenalty,
  ));

  const actions = [];

  if (unresolvedPaymentCount > 0) {
    actions.push({
      label: 'Resolver pagamentos aprovados',
      text: `${unresolvedPaymentCount} pagamento(s) aprovado(s) ainda precisam virar agendamento ou ser marcados como resolvidos.`,
      tab: 'bookings',
      tone: 'danger',
    });
  }

  if (overdueReceivables.length > 0) {
    actions.push({
      label: 'Cobrar valores vencidos',
      text: `${overdueReceivables.length} atendimento(s) já passaram da data e ainda tem valor restante em aberto.`,
      tab: 'finance',
      tone: 'danger',
    });
  }

  if (pendingStamps > 0) {
    actions.push({
      label: 'Confirmar presença',
      text: `${pendingStamps} atendimento(s) precisam de baixa para liberar fidelidade e manter o histórico correto.`,
      tab: 'loyalty',
      tone: 'warning',
    });
  }

  if (crmMissing > 0) {
    actions.push({
      label: 'Completar CRM',
      text: `${crmMissing} cliente(s) ainda precisam preencher origem, preferências ou dados de relacionamento.`,
      tab: 'crm',
      tone: 'warning',
    });
  }

  if (netProfit < 0) {
    actions.push({
      label: 'Revisar despesas do mês',
      text: `O lucro atual está negativo em ${formatCurrency(Math.abs(netProfit))}. Priorize despesas variáveis e recebimentos pendentes.`,
      tab: 'finance',
      tone: 'danger',
    });
  }

  if (analytics.missingValueCount > 0) {
    actions.push({
      label: 'Corrigir valores ausentes',
      text: `${analytics.missingValueCount} agendamento(s) ativo(s) estao sem valor, reduzindo a confiabilidade dos indicadores.`,
      tab: 'analytics',
      tone: 'warning',
    });
  }

  if (actions.length === 0) {
    actions.push({
      label: 'Operação em ordem',
      text: 'Sem pendências críticas no momento. Bom momento para revisar metas, fotos de serviços e campanhas para clientes recorrentes.',
      tab: 'analytics',
      tone: 'success',
    });
  }

  const nextModules = [
    {
      label: 'Estoque de produtos',
      text: 'Controle de esmaltes, gel, descartaveis e alertas de reposição por consumo estimado em cada serviço.',
      impact: 'alto',
    },
    {
      label: 'Compras e fornecedores',
      text: 'Cadastro de fornecedores, custos por compra e comparativo de preço para proteger margem.',
      impact: 'medio',
    },
    {
      label: 'Metas mensais',
      text: 'Meta de faturamento, agenda ocupada, ticket médio e recorrência por cliente.',
      impact: 'alto',
    },
    {
      label: 'Comissões e retiradas',
      text: 'Separar dinheiro do negócio, retiradas pessoais e lucro reinvestido sem misturar caixa.',
      impact: 'médio',
    },
  ];

  return {
    activeBookings: activeBookings.length,
    actions,
    cashIn,
    cashOut,
    cashScale: Math.max(cashIn, cashOut, receivablesTotal, 1),
    crmMissing,
    healthLabel: score >= 80 ? 'Operação saudável' : score >= 55 ? 'Exige acompanhamento' : 'Atenção imediata',
    healthScore: Math.round(score),
    margin,
    netProfit,
    nextBookings: analytics.nextBookings,
    nextModules,
    nextSevenDaysRevenue,
    overdueReceivables,
    pendingStamps,
    priorityCount: actions.filter((action) => action.tone !== 'success').length,
    projectedCash,
    receivables: receivablesTotal,
    uniqueClients: analytics.uniqueClients,
    unresolvedPaymentCount,
    upcomingReceivables,
  };
}

function buildAnalytics(bookings) {
  const serviceCounts = new Map();
  const cancelledServiceCounts = new Map();
  const serviceRevenue = new Map();
  const dayCounts = new Map();
  const hourCounts = new Map();
  const monthMap = new Map();
  const clientKeys = new Set();
  const statusCounts = {};
  let totalBookings = 0;
  let totalRevenue = 0;
  let paidBookings = 0;
  let totalServices = 0;
  let missingValueCount = 0;
  let activeBookings = 0;
  let completedStamps = 0;
  let pendingStamps = 0;

  const monthSeeds = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    monthMap.set(key, { key, label, value: 0 });
    return key;
  });

  bookings.forEach((booking) => {
    totalBookings += 1;
    statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    const services = splitServices(booking.service);

    if (['cancelled', 'no_show'].includes(booking.status)) {
      (services.length ? services : ['Servico nao informado']).forEach((service) => {
        cancelledServiceCounts.set(service, (cancelledServiceCounts.get(service) || 0) + 1);
      });
      return;
    }

    activeBookings += 1;

    const value = Number(booking.estimatedValue);
    if (Number.isFinite(value) && value > 0) {
      totalRevenue += value;
      paidBookings += 1;
      const date = new Date(booking.scheduledAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap.has(key)) monthMap.get(key).value += value;
    } else {
      missingValueCount += 1;
    }

    const clientKey = booking.attendeeEmail || booking.user?.email || booking.attendeePhone || booking.user?.whatsappPhone || booking.attendeeName || booking.user?.name;
    if (clientKey) clientKeys.add(String(clientKey).toLowerCase());

    const stampCount = Math.max(1, services.length);
    if (booking.serviceCompletedAt) completedStamps += stampCount;
    else pendingStamps += stampCount;

    const date = new Date(booking.scheduledAt);
    const dayIndex = date.getDay();
    const hour = date.getHours();
    dayCounts.set(dayIndex, (dayCounts.get(dayIndex) || 0) + stampCount);
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    (services.length ? services : ['Servico nao informado']).forEach((service) => {
      totalServices += 1;
      serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
      if (Number.isFinite(value) && value > 0) {
        serviceRevenue.set(service, (serviceRevenue.get(service) || 0) + value / Math.max(1, services.length));
      }
    });
  });

  const serviceStats = Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const cancelledServiceStats = Array.from(cancelledServiceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);

  const serviceRevenueStats = Array.from(serviceRevenue.entries())
    .map(([name, value]) => ({
      name,
      value,
      detail: `${serviceCounts.get(name) || 0} agendamento(s) ativo(s)`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const monthStats = monthSeeds.map((key) => monthMap.get(key));
  const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dayStats = dayLabels.map((label, index) => ({
    key: String(index),
    label,
    count: dayCounts.get(index) || 0,
  }));
  const busiestDay = [...dayStats].sort((a, b) => b.count - a.count)[0];
  const hourStats = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({
      key: String(hour),
      label: `${String(hour).padStart(2, '0')}h`,
      count,
    }))
    .sort((a, b) => a.key - b.key);
  const statusStats = [
    { label: 'Confirmados', value: statusCounts.confirmed || 0, color: '#34d399' },
    { label: 'Reagendados', value: statusCounts.rescheduled || 0, color: '#fbbf24' },
    { label: 'Cancelados', value: statusCounts.cancelled || 0, color: '#f87171' },
    { label: 'Faltou', value: statusCounts.no_show || 0, color: '#fb7185' },
  ].filter((item) => item.value > 0);
  const now = new Date();
  const nextBookings = bookings
    .filter((booking) => booking.status !== 'cancelled' && new Date(booking.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5);
  const topService = serviceStats[0] || null;
  const topCancelledService = cancelledServiceStats[0] || null;
  const cancellationRate = totalBookings ? ((statusCounts.cancelled || 0) / totalBookings) * 100 : 0;
  const completionRate = activeBookings ? (completedStamps / Math.max(1, completedStamps + pendingStamps)) * 100 : 0;
  const attentionPoints = [
    {
      label: 'Demanda principal',
      text: topService
        ? `${topService.name} lidera os agendamentos. Vale manter destaque desse serviço nas ofertas e nas fotos da galeria.`
        : 'Ainda nao ha volume suficiente para identificar o serviço com maior procura.',
    },
    {
      label: 'Cancelamentos',
      text: topCancelledService
        ? `${topCancelledService.name} aparece como o serviço mais cancelado. Pode valer revisar confirmação, duração, preço ou explicação antes do agendamento.`
        : 'Nenhum serviço cancelado até agora. Excelente sinal para acompanhar conforme a agenda crescer.',
    },
    {
      label: 'Fidelidade',
      text: pendingStamps > completedStamps
        ? `Existem ${pendingStamps} selo(s) pendente(s). Confirmar presença mantém a fidelidade correta e evita cliente sem recompensa.`
        : `A liberação de selos está em bom ritmo: ${completedStamps} liberado(s) e ${pendingStamps} pendente(s).`,
    },
    {
      label: 'Valores',
      text: missingValueCount
        ? `${missingValueCount} agendamento(s) estao sem valor informado, entao receita e ticket médio podem estar abaixo do real.`
        : 'Todos os agendamentos ativos têm valor informado, deixando receita e ticket médio mais confiáveis.',
    },
  ];

  return {
    totalBookings,
    totalRevenue,
    paidBookings,
    averageTicket: paidBookings ? totalRevenue / paidBookings : 0,
    activeBookings,
    totalServices,
    uniqueClients: clientKeys.size,
    serviceStats,
    cancelledServiceStats,
    serviceRevenueStats,
    maxServiceCount: Math.max(0, ...serviceStats.map((item) => item.count)),
    monthStats,
    maxMonthValue: Math.max(0, ...monthStats.map((item) => item.value)),
    dayStats,
    busiestDay: busiestDay?.count ? busiestDay : null,
    hourStats,
    statusStats,
    nextBookings,
    statusCounts,
    cancelledCount: statusCounts.cancelled || 0,
    noShowCount: statusCounts.no_show || 0,
    cancellationRate,
    completionRate,
    topService,
    topCancelledService,
    attentionPoints,
    missingValueCount,
    completedStamps,
    pendingStamps,
  };
}

function buildLoyaltyClients(bookings) {
  const clients = new Map();

  bookings
    .filter((booking) => !['cancelled', 'no_show'].includes(booking.status))
    .forEach((booking) => {
      const key = String(
        booking.attendeeEmail
          || booking.user?.email
          || booking.attendeePhone
          || booking.user?.whatsappPhone
          || booking.attendeeName
          || booking.user?.name
          || booking.id,
      ).toLowerCase();

      if (!clients.has(key)) {
        clients.set(key, {
          key,
          name: booking.attendeeName || booking.user?.name || 'Cliente',
          contact: booking.attendeeEmail || booking.user?.email || booking.attendeePhone || booking.user?.whatsappPhone || 'Sem contato',
          completedStamps: 0,
          pendingStamps: 0,
          bookings: [],
        });
      }

      const client = clients.get(key);
      const stampCount = Math.max(1, splitServices(booking.service).length);
      if (booking.serviceCompletedAt) {
        client.completedStamps += stampCount;
      } else {
        client.pendingStamps += stampCount;
      }
      client.bookings.push(booking);
    });

  return Array.from(clients.values())
    .map((client) => ({
      ...client,
      bookings: client.bookings.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)),
    }))
    .sort((a, b) => b.pendingStamps - a.pendingStamps || b.completedStamps - a.completedStamps || a.name.localeCompare(b.name));
}

function buildClientProfiles(bookings) {
  const clients = new Map();

  bookings.forEach((booking) => {
    const key = String(
      booking.attendeeEmail
        || booking.user?.email
        || booking.attendeePhone
        || booking.user?.whatsappPhone
        || booking.attendeeName
        || booking.user?.name
        || booking.id,
    ).toLowerCase();

    if (!clients.has(key)) {
      clients.set(key, {
        key,
        name: booking.attendeeName || booking.user?.name || 'Cliente',
        email: booking.attendeeEmail || booking.user?.email || '',
        userId: booking.user?.id || null,
        phone: booking.user?.whatsappPhone || booking.attendeePhone || '',
        dateOfBirth: booking.user?.dateOfBirth || null,
        bookings: [],
        serviceCounts: new Map(),
        totalRevenue: 0,
        totalPaid: 0,
        totalRemaining: 0,
        paidBookings: 0,
        totalServices: 0,
        completedCount: 0,
        pendingCount: 0,
        noShowCount: 0,
        cancelledCount: 0,
        completedStamps: 0,
      });
    }

    const client = clients.get(key);
    if (!client.dateOfBirth && booking.user?.dateOfBirth) {
      client.dateOfBirth = booking.user.dateOfBirth;
    }
    if (!client.userId && booking.user?.id) {
      client.userId = booking.user.id;
    }
    if (booking.user?.whatsappPhone) {
      client.phone = booking.user.whatsappPhone;
    }
    const services = splitServices(booking.service);
    const serviceList = services.length ? services : ['Servico nao informado'];
    const stampCount = Math.max(1, serviceList.length);
    const value = Number(booking.estimatedValue);
    const isChargeable = !['cancelled', 'no_show'].includes(booking.status);

    client.bookings.push(booking);
    client.totalServices += stampCount;

    serviceList.forEach((service) => {
      client.serviceCounts.set(service, (client.serviceCounts.get(service) || 0) + 1);
    });

    if (Number.isFinite(value) && value > 0 && isChargeable) {
      client.totalRevenue += value;
      client.paidBookings += 1;
    }

    if (isChargeable) {
      const payment = getBookingPaymentSummary(booking);
      client.totalPaid += payment.paid;
      client.totalRemaining += payment.remaining;
    }

    if (booking.status === 'cancelled') {
      client.cancelledCount += 1;
    } else if (booking.status === 'no_show') {
      client.noShowCount += 1;
    } else if (booking.serviceCompletedAt) {
      client.completedCount += 1;
      client.completedStamps += stampCount;
    } else {
      client.pendingCount += 1;
    }
  });

  return Array.from(clients.values())
    .map((client) => {
      const bookingsSorted = client.bookings.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
      const serviceStats = Array.from(client.serviceCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 6);
      const contactPhone = formatWhatsappDisplay(client.phone);
      const contact = client.email || contactPhone || 'Sem contato';

      return {
        ...client,
        phone: contactPhone,
        contact,
        bookings: bookingsSorted,
        firstBooking: bookingsSorted[bookingsSorted.length - 1] || null,
        lastBooking: bookingsSorted[0] || null,
        totalBookings: bookingsSorted.length,
        averageTicket: client.paidBookings ? client.totalRevenue / client.paidBookings : 0,
        serviceStats,
        searchText: [
          client.name,
          client.email,
          client.phone,
          ...serviceStats.map((service) => service.name),
        ].join(' ').toLowerCase(),
      };
    })
    .sort((a, b) => new Date(b.lastBooking?.scheduledAt || 0) - new Date(a.lastBooking?.scheduledAt || 0));
}

function buildCalendarDays(monthCursor, bookings) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const start = new Date(year, month, 1);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      date,
      inMonth: date.getMonth() === month,
      bookings: bookings
        .filter((booking) => dateKey(new Date(booking.scheduledAt)) === key)
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    };
  });
}

function splitServices(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatWhatsappDisplay(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return digits;
}

function getBirthdayStatusMeta(celebrant) {
  if (!celebrant.whatsappPhone) {
    return { label: 'Sem WhatsApp', classes: 'border-red-400/25 bg-red-500/10 text-red-200' };
  }
  if (celebrant.rewardStatus === 'sent') {
    return { label: 'Enviado este ano', classes: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' };
  }
  if (celebrant.rewardStatus === 'failed') {
    return { label: 'Falhou', classes: 'border-red-400/25 bg-red-500/10 text-red-200' };
  }
  if (celebrant.rewardStatus === 'skipped') {
    return { label: 'Ignorado', classes: 'border-amber-300/25 bg-amber-300/10 text-amber-100' };
  }
  return { label: 'Ainda nao enviado', classes: 'border-amber-300/25 bg-amber-300/10 text-amber-100' };
}

function formatCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPaymentMethod(payment) {
  const method = String(payment?.paymentMethodId || '').toLowerCase();
  const type = String(payment?.paymentTypeId || '').toLowerCase();
  if (method === 'pix') return 'Pix';
  if (type === 'credit_card') return 'Cartao credito';
  if (type === 'debit_card') return 'Cartao debito';
  if (type === 'bank_transfer') return method ? method.toUpperCase() : 'Transferencia';
  return method || type || 'Pagamento';
}

function getBookingPaymentSummary(booking) {
  const total = Number(booking.payment?.servicePrice ?? booking.estimatedValue);
  const initialPaid = Number(booking.payment?.amount);
  const paid = Number.isFinite(initialPaid) && initialPaid > 0 ? initialPaid : 0;
  const remainingBeforeBaixa = Number.isFinite(total) ? Math.max(0, total - paid) : 0;
  const isRemainingPaid = Boolean(booking.payment?.remainingPaidAt || booking.remainingPaidAt);
  const remaining = isRemainingPaid ? 0 : remainingBeforeBaixa;

  return {
    total: Number.isFinite(total) ? total : 0,
    paid: isRemainingPaid ? (Number.isFinite(total) ? total : paid) : paid,
    remaining,
  };
}

function statusBadge(status) {
  const map = {
    confirmed: { label: 'Confirmado', classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    rescheduled: { label: 'Reagendado', classes: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    cancelled: { label: 'Cancelado', classes: 'border-red-500/30 bg-red-500/10 text-red-400' },
    no_show: { label: 'Faltou', classes: 'border-red-400/30 bg-red-500/10 text-red-200' },
  };
  const item = map[status] || { label: status || 'Status', classes: 'border-white/20 bg-white/5 text-cream/60' };
  return <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${item.classes}`}>{item.label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleBlocksTab — Aba de Bloqueios de Agenda
// ─────────────────────────────────────────────────────────────────────────────

function BookingBlockWarningToast({ bookings }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-cream">Há reserva no horário bloqueado:</p>
      <div className="space-y-1">
        {bookings.map((booking) => (
          <p key={booking.id} className="text-xs text-cream/75">
            <strong className="text-gold-light">{formatTime(booking.scheduledAt)}</strong>
            {' '}com <strong className="text-cream">{booking.clientName}</strong>
            {booking.service ? ` - ${booking.service}` : ''}
          </p>
        ))}
      </div>
      <p className="text-xs text-cream/55">
        O bloqueio não foi criado. Ajuste o horário ou resolva a reserva antes de bloquear.
      </p>
    </div>
  );
}

const emptyBlockForm = {
  date: '',
  allDay: true,
  startTime: '08:00',
  endTime: '10:30',
  reason: '',
};

function ScheduleBlocksTab({ blocks, fetching, onRefresh, onCreate, onDelete }) {
  const [form, setForm] = useState(emptyBlockForm);
  const [saving, setSaving] = useState(false);

  // Data mínima = hoje no fuso local
  const todayLocal = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"

  const applyQuickSlot = (slot) => {
    setForm((f) => ({
      ...f,
      allDay: false,
      startTime: slot,
      endTime: BLOCK_SLOT_END_TIMES[slot] || f.endTime,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) {
      toast.warning('Selecione uma data para o bloqueio.');
      return;
    }
    if (!form.allDay && form.startTime >= form.endTime) {
      toast.warning('O horário de início deve ser anterior ao horário de fim.');
      return;
    }
    try {
      setSaving(true);
      await onCreate({
        date: form.date,
        allDay: form.allDay,
        startTime: form.allDay ? undefined : form.startTime,
        endTime: form.allDay ? undefined : form.endTime,
        reason: form.reason.trim() || undefined,
      });
      toast.success('Bloqueio criado! A agenda do site já impedirá novos agendamentos nesse período.');
      setForm(emptyBlockForm);
    } catch (error) {
      if (error.bookingWarnings?.length) {
        toast.warning(
          <BookingBlockWarningToast bookings={error.bookingWarnings} />,
          { autoClose: 12000 },
        );
      } else {
        toast.error(error.message || 'Erro ao criar bloqueio.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (uid) => {
    showConfirmToast({
      message: 'Remover este bloqueio? Os clientes poderão voltar a agendar nesse horário.',
      confirmLabel: 'Remover',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await onDelete(uid);
          toast.success('Bloqueio removido.');
        } catch (error) {
          toast.error(error.message || 'Erro ao remover bloqueio.');
        }
      },
    });
  };

  const formatBlockPeriod = (block) => {
    const start = new Date(block.start);
    const end = new Date(block.end);
    const dateStr = start.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Fortaleza',
    });
    const startTime = start.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza',
    });
    const endTime = end.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza',
    });

    return {
      date: dateStr,
      time: block.allDay ? 'Dia inteiro' : `${startTime} – ${endTime}`,
      isAllDay: Boolean(block.allDay),
    };
  };

  return (
    <div className="space-y-8">
      {/* Informativo */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-amber-100">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
        <div>
          <p className="text-sm font-semibold">Como funciona o bloqueio</p>
          <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
            Ao criar um bloqueio aqui, a agenda do site marca automaticamente esse período como{' '}
            <strong>indisponível</strong>. Nenhum cliente conseguirá agendar nesses dias ou
            horários. Os agendamentos já existentes <strong>não</strong> são cancelados
            automaticamente.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário de criação */}
        <div className="rounded-2xl border border-gold/20 bg-black/40 p-6 backdrop-blur-md">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gold">
            <FiSlash className="text-gold" /> Novo Bloqueio
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data */}
            <div>
              <label htmlFor="block-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-cream/60">
                Data
              </label>
              <input
                type="date"
                id="block-date"
                min={todayLocal}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                onClick={(e) => e.target.showPicker()}
                required
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cream outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              />
            </div>

            {/* Tipo de bloqueio */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cream/60">
                Tipo
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, allDay: true }))}
                  className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all ${
                    form.allDay
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 text-cream/50 hover:border-gold/30 hover:text-cream'
                  }`}
                >
                  Dia inteiro
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, allDay: false }))}
                  className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all ${
                    !form.allDay
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 text-cream/50 hover:border-gold/30 hover:text-cream'
                  }`}
                >
                  Horário específico
                </button>
              </div>
            </div>

            {/* Horários (apenas se parcial) */}
            {!form.allDay && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cream/60">
                  Bloquear horário da agenda
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {BLOCK_QUICK_SLOTS.map((slot) => {
                    const active = form.startTime === slot && form.endTime === BLOCK_SLOT_END_TIMES[slot];
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => applyQuickSlot(slot)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                          active
                            ? 'border-gold bg-gold text-dark'
                            : 'border-white/10 bg-black/20 text-cream/70 hover:border-gold/40 hover:text-gold'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!form.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="block-start-time" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-cream/60">
                    Das
                  </label>
                  <input
                    type="time"
                    id="block-start-time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cream outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label htmlFor="block-end-time" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-cream/60">
                    Até
                  </label>
                  <input
                    type="time"
                    id="block-end-time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cream outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
                  />
                </div>
              </div>
            )}

            {/* Motivo */}
            <div>
              <label htmlFor="block-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-cream/60">
                Motivo <span className="font-normal normal-case text-cream/30">(opcional)</span>
              </label>
              <input
                type="text"
                id="block-reason"
                placeholder="Ex: Compromisso pessoal, Férias, Evento..."
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                maxLength={200}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cream placeholder-cream/20 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              />
            </div>

            <button
              type="submit"
              id="block-submit"
              disabled={saving}
              className="gold-button w-full rounded-xl px-4 py-3.5 text-sm font-bold disabled:opacity-50"
            >
              {saving ? 'Criando bloqueio...' : 'Bloquear agenda'}
            </button>
          </form>
        </div>

        {/* Lista de bloqueios ativos */}
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-cream">
              Bloqueios Ativos{' '}
              {blocks.length > 0 && (
                <span className="ml-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300">
                  {blocks.length}
                </span>
              )}
            </h2>
            <button
              onClick={onRefresh}
              disabled={fetching}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-cream/50 hover:border-gold/30 hover:text-gold disabled:opacity-50"
            >
              <FiRefreshCw className={fetching ? 'animate-spin' : ''} size={12} />
              Atualizar
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {fetching ? (
              <div className="flex flex-col items-center gap-3 py-12 text-cream/30">
                <FiRefreshCw className="animate-spin" size={24} />
                <span className="text-sm">Buscando bloqueios da agenda...</span>
              </div>
            ) : blocks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-cream/30">
                <FiCalendar size={32} className="opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Nenhum bloqueio ativo</p>
                  <p className="mt-1 text-xs">A agenda está completamente aberta.</p>
                </div>
              </div>
            ) : (
              blocks.map((block) => {
                const { date, time, isAllDay } = formatBlockPeriod(block);
                return (
                  <div
                    key={block.uid}
                    className="flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold capitalize text-cream">{date}</span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
                            isAllDay
                              ? 'border-red-400/30 bg-red-400/10 text-red-300'
                              : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                          }`}
                        >
                          {isAllDay ? 'Dia inteiro' : time}
                        </span>
                      </div>
                      {block.reason && (
                        <p className="mt-1 truncate text-xs text-cream/50">{block.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(block.uid)}
                      className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/15"
                      title="Remover bloqueio"
                      aria-label="Remover bloqueio"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
