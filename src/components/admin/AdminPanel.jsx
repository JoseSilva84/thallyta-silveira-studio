import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
  FiBarChart2,
  FiAlertTriangle,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiHome,
  FiImage,
  FiLogOut,
  FiMessageSquare,
  FiRefreshCw,
  FiSave,
  FiSearch,
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
import { timeSlots } from '../../data/timeSlots.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const emptyTestimonial = {
  id: null,
  name: '',
  text: '',
  rating: 5,
  published: true,
};

const emptyExpenseForm = {
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
  const [bookingView, setBookingView] = useState('table');
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [fetchingBookings, setFetchingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientSearch, setClientSearch] = useState('');

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
  const [adminBookingForm, setAdminBookingForm] = useState({
    attendeeName: '',
    attendeePhone: '',
    attendeeEmail: '',
    serviceId: '',
    date: '',
    time: '',
    notes: '',
    amountPaid: '',
  });

  const categories = ['Unhas', 'Cabelo', 'Estudio'];

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

  const fetchScheduleBlocks = useCallback(async () => {
    try {
      setFetchingBlocks(true);
      const res = await fetch(`${API}/schedule-blocks`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Falha ao buscar bloqueios');
      setScheduleBlocks(await res.json());
    } catch (error) {
      toast.error('Erro ao carregar bloqueios de agenda');
      console.error(error);
    } finally {
      blocksLoadedRef.current = true;
      setFetchingBlocks(false);
    }
  }, [getToken]);

  const handleCreateBlock = async (payload) => {
    const res = await fetch(`${API}/schedule-blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar bloqueio');
    setScheduleBlocks((prev) => [data, ...prev]);
    return data;
  };

  const handleDeleteBlock = async (uid) => {
    const res = await fetch(`${API}/schedule-blocks/${uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro ao remover bloqueio');
    setScheduleBlocks((prev) => prev.filter((b) => b.uid !== uid));
  };

  useEffect(() => {
    fetchImages();
    fetchBookings();
    fetchTestimonials();
    fetchFinanceExpenses();
  }, [fetchBookings, fetchFinanceExpenses, fetchImages, fetchTestimonials]);

  // Carrega bloqueios quando a aba é aberta pela primeira vez
  useEffect(() => {
    if (activeTab === 'blocks' && !blocksLoadedRef.current && !fetchingBlocks) {
      fetchScheduleBlocks();
    }
  }, [activeTab, fetchScheduleBlocks, fetchingBlocks]);

  const refreshAll = () => {
    fetchBookings();
    fetchImages();
    fetchTestimonials();
    fetchFinanceExpenses();
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
      setAdminBookingForm({
        attendeeName: '',
        attendeePhone: '',
        attendeeEmail: '',
        serviceId: '',
        date: '',
        time: '',
        notes: '',
        amountPaid: '',
      });
      fetchBookings();
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
      const res = await fetch(`${API}/finance/expenses`, {
        method: 'POST',
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
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar despesa');

      setFinanceExpenses((current) => [data, ...current]);
      setExpenseForm(emptyExpenseForm);
      toast.success('Despesa registrada no financeiro.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
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
  const loyaltyClients = useMemo(() => buildLoyaltyClients(bookings), [bookings]);
  const clientProfiles = useMemo(() => buildClientProfiles(bookings), [bookings]);

  const analytics = useMemo(() => buildAnalytics(bookings), [bookings]);
  const financeSummary = useMemo(() => buildFinanceSummary(bookings, financeExpenses), [bookings, financeExpenses]);
  const calendarDays = useMemo(() => buildCalendarDays(monthCursor, filteredBookings), [monthCursor, filteredBookings]);
  const monthLabel = monthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const moveMonth = (amount) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <div className="min-h-screen bg-dark p-4 text-cream md:p-8">
      <div className="mx-auto max-w-7xl">
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

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/30 p-1 backdrop-blur-md">
          <TabButton active={activeTab === 'bookings'} icon={<FiCalendar />} label="Agenda" count={bookings.length} onClick={() => setActiveTab('bookings')} />
          <TabButton active={activeTab === 'analytics'} icon={<FiBarChart2 />} label="Análises" onClick={() => setActiveTab('analytics')} />
          <TabButton active={activeTab === 'finance'} icon={<FiDollarSign />} label="Financeiro" count={financeExpenses.length || undefined} onClick={() => setActiveTab('finance')} />
          <TabButton active={activeTab === 'loyalty'} icon={<FiAward />} label="Fidelidade" count={pendingCompletionBookings.length} onClick={() => setActiveTab('loyalty')} />
          <TabButton active={activeTab === 'clients'} icon={<FiUsers />} label="Clientes" count={clientProfiles.length} onClick={() => setActiveTab('clients')} />
          <TabButton active={activeTab === 'gallery'} icon={<FiImage />} label="Galeria" count={images.length} onClick={() => setActiveTab('gallery')} />
          <TabButton active={activeTab === 'testimonials'} icon={<FiMessageSquare />} label="Depoimentos" count={testimonials.length} onClick={() => setActiveTab('testimonials')} />
          <TabButton active={activeTab === 'blocks'} icon={<FiSlash />} label="Bloqueios" count={scheduleBlocks.length || undefined} onClick={() => setActiveTab('blocks')} />
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-6">
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
                onMarkRemainingPaid={handleMarkRemainingPaid}
              />
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView analytics={analytics} />
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
            onMarkRemainingPaid={handleMarkRemainingPaid}
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

        {showAdminBookingModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
              <button onClick={() => setShowAdminBookingModal(false)} className="absolute right-4 top-4 text-white/50 hover:text-white"><FiX size={20} /></button>
              <h2 className="mb-6 text-xl font-bold text-white">Novo Agendamento</h2>
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
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, serviceId: e.target.value }))}
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
                      onChange={(e) => setAdminBookingForm((f) => ({ ...f, date: e.target.value }))}
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
                      <option value="">Horário</option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Sinal pago */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/70">Valor do sinal pago <span className="text-white/30">(R$)</span></label>
                  <input
                    type="text" inputMode="decimal" placeholder="0,00"
                    value={adminBookingForm.amountPaid}
                    onChange={(e) => setAdminBookingForm((f) => ({ ...f, amountPaid: e.target.value.replace(/[^0-9,.]/g, '') }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
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

function BookingsTable({ bookings, fetching, statusFilter, statusBadge, onCompleteService, onUndoCompleteService, onMarkNoShow, onMarkRemainingPaid }) {
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
                        onMarkRemainingPaid={onMarkRemainingPaid}
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

function CompletionAction({ booking, onCompleteService, onUndoCompleteService, onMarkNoShow, onMarkRemainingPaid }) {
  const payment = getBookingPaymentSummary(booking);
  const hasRemaining = payment.remaining > 0;
  const canMarkRemainingPaid = hasRemaining && typeof onMarkRemainingPaid === 'function';

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
      
      <button
        onClick={() => onMarkNoShow?.(booking)}
        className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-red-400/80 transition-all hover:bg-red-500/15 hover:text-red-300"
      >
        <FiX className="size-3.5 shrink-0" />
        <span className="whitespace-nowrap">Não compareceu</span>
      </button>
    </div>
  );
}

function CalendarView({ days, monthLabel, onPrev, onNext, statusBadge, formatTime, onFilterClick }) {
  const todayKey = dateKey(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-7 md:gap-2">
        {days.map((day) => {
          const visibleBookings = day.bookings.slice(0, 3);
          const hiddenCount = Math.max(day.bookings.length - visibleBookings.length, 0);

          return (
            <div
              key={day.key}
              className={`relative min-h-36 rounded-xl border p-3 transition duration-200 ${
                day.inMonth ? 'border-white/10 bg-white/[0.03] hover:border-gold/25 hover:bg-gold/[0.035]' : 'border-white/5 bg-black/20 opacity-40'
              } ${day.key === todayKey ? 'ring-1 ring-gold/70' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-cream">{day.date.getDate()}</span>
                {day.bookings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-bold text-gold transition hover:bg-gold hover:text-dark"
                    title="Ver agenda do dia"
                  >
                    {day.bookings.length}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {visibleBookings.map((booking) => (
                  <CalendarBookingCard key={booking.id} booking={booking} formatTime={formatTime} onBookingClick={setSelectedBooking} />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
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
        onClick={() => onBookingClick && onBookingClick(booking)}
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
              <p className="text-sm text-cream/50">Nenhum proximo agendamento.</p>
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
            emptyText="Ainda nao ha servicos suficientes para analisar."
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
            emptyText="Ainda nao ha horarios suficientes para analisar."
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

function FinanceView({ summary, expenses, fetching, saving, form, setForm, onAddExpense, onDeleteExpense, onMarkRemainingPaid }) {
  const [selectedPendingPayment, setSelectedPendingPayment] = useState(null);
  const profitTone = summary.netProfit >= 0 ? 'text-emerald-300' : 'text-red-300';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FiDollarSign />} label="Recebido" value={formatCurrency(summary.totalPaid)} hint={`${summary.paidBookings} pagamento(s) com entrada`} />
        <MetricCard icon={<FiTrendingUp />} label="A receber" value={formatCurrency(summary.totalRemaining)} hint={`${summary.pendingPayments.length} atendimento(s) pendente(s)`} />
        <MetricCard icon={<FiTrash2 />} label="Despesas" value={formatCurrency(summary.totalExpenses)} hint={`${expenses.length} lancamento(s) no salao`} />
        <MetricCard icon={<FiBarChart2 />} label="Lucro atual" value={formatCurrency(summary.netProfit)} hint={`Projetado: ${formatCurrency(summary.projectedProfit)}`} />
      </div>

      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Contabilidade dos serviços</p>
            <h2 className="mt-1 text-2xl font-semibold text-gold-light">Financeiro</h2>
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
                  emptyText="Ainda nao ha valores suficientes para analisar."
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
          <h2 className="text-xl font-semibold text-gold-light">Nova despesa</h2>
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
              <FiPlus /> {saving ? 'Registrando...' : 'Registrar despesa'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gold-light">Despesas do salão</h2>
              <p className="mt-1 text-sm text-cream/45">Lancamentos salvos neste painel administrativo.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-cream/65">
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>

          {fetching ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Carregando despesas...</p>
          ) : expenses.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/50">Nenhuma despesa cadastrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <article key={expense.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-cream">{expense.description}</h3>
                        <span className="rounded-full border border-gold/15 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gold-light">{expense.category}</span>
                      </div>
                      <p className="mt-1 text-sm text-cream/45">{formatDate(expense.date)}</p>
                      {expense.notes && <p className="mt-2 text-sm text-cream/60">{expense.notes}</p>}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span className="text-lg font-bold text-red-200">{formatCurrency(expense.amount)}</span>
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
    </div>
  );
}

function FinanceInlineStat({ label, value, valueClassName = 'text-cream' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-cream/40">{label}</p>
      <p className={`mt-1 text-base font-bold ${valueClassName}`}>{value}</p>
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
      <p className="truncate text-[0.68rem] font-bold uppercase tracking-wider text-cream/40">{label}</p>
      <p className={`mt-2 max-w-full break-words text-[clamp(1.15rem,2vw,1.6rem)] font-bold leading-tight ${toneClasses[tone] || toneClasses.default}`}>
        {value}
      </p>
    </div>
  );
}

function LoyaltyAdminView({ clients, pendingBookings, onCompleteService, onUndoCompleteService, onMarkNoShow, onMarkRemainingPaid }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-100/70">Aguardando confirmacao</p>
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

function ClientsView({ clients, search, setSearch, statusBadge, onCompleteService, onUndoCompleteService, onMarkNoShow, onMarkRemainingPaid }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredClients = useMemo(() => (
    normalizedSearch
      ? clients.filter((client) => client.searchText.includes(normalizedSearch))
      : clients
  ), [clients, normalizedSearch]);
  const selectedClient = filteredClients.find((client) => client.key === selectedKey) || filteredClients[0] || null;

  useEffect(() => {
    if (selectedClient && selectedClient.key !== selectedKey) setSelectedKey(selectedClient.key);
    if (!selectedClient && selectedKey) setSelectedKey(null);
  }, [selectedClient, selectedKey]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(300px,420px)_1fr]">
      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gold-light">Clientes</h2>
          <p className="mt-1 text-sm text-cream/45">{clients.length} cliente(s) encontrados no histórico</p>
        </div>

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
                onClick={() => setSelectedKey(client.key)}
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

      <section className="rounded-2xl border border-gold/20 bg-black/40 p-5">
        {!selectedClient ? (
          <p className="text-sm text-cream/50">Selecione um cliente para ver detalhes.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-gold-light/60">Detalhes do cliente</p>
                <h2 className="mt-1 truncate text-2xl font-bold text-cream">{selectedClient.name}</h2>
                <p className="mt-1 text-sm text-cream/50">{selectedClient.email || selectedClient.phone || 'Contato nao informado'}</p>
                {selectedClient.email && selectedClient.phone && <p className="text-sm text-cream/40">{selectedClient.phone}</p>}
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                <SmallStat label="Serviços" value={selectedClient.totalServices} tone="gold" />
                <SmallStat label="Valor" value={formatCurrency(selectedClient.totalRevenue)} tone="gold" />
                <SmallStat label="Pago" value={formatCurrency(selectedClient.totalPaid)} tone="success" />
                <SmallStat label="A receber" value={formatCurrency(selectedClient.totalRemaining)} tone="warning" />
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
                                A receber: {formatCurrency(payment.remaining)}
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
    </div>
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

function buildFinanceSummary(bookings, expenses) {
  const monthMap = new Map();
  const categoryMap = new Map();
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let paidBookings = 0;
  let chargeableBookings = 0;

  const monthSeeds = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    monthMap.set(key, { key, label, value: 0 });
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
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap.has(key)) monthMap.get(key).value += payment.paid;

    if (payment.remaining > 0) {
      pendingPayments.push({
        id: booking.id,
        client: booking.attendeeName || booking.user?.name || 'Cliente',
        service: booking.service || 'Servico nao informado',
        scheduledAt: booking.scheduledAt,
        remaining: payment.remaining,
        booking,
      });
    }
  });

  const totalExpenses = expenses.reduce((sum, expense) => {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    categoryMap.set(expense.category || 'Outros', (categoryMap.get(expense.category || 'Outros') || 0) + amount);
    return sum + amount;
  }, 0);

  return {
    totalRevenue,
    totalPaid,
    totalRemaining,
    totalExpenses,
    netProfit: totalPaid - totalExpenses,
    projectedProfit: totalRevenue - totalExpenses,
    averageTicket: chargeableBookings ? totalRevenue / chargeableBookings : 0,
    paidBookings,
    monthStats: monthSeeds.map((key) => monthMap.get(key)),
    pendingPayments: pendingPayments
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 8),
    expenseCategories: Array.from(categoryMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
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
        ? `${missingValueCount} agendamento(s) estao sem valor informado, entao receita e ticket medio podem estar abaixo do real.`
        : 'Todos os agendamentos ativos têm valor informado, deixando receita e ticket medio mais confiáveis.',
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
        phone: booking.attendeePhone || booking.user?.whatsappPhone || '',
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
      const contact = client.email || client.phone || 'Sem contato';

      return {
        ...client,
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

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
// ScheduleBlocksTab — Aba de Bloqueios de Agenda (integração Cal.com Out of Office)
// ─────────────────────────────────────────────────────────────────────────────

const emptyBlockForm = {
  date: '',
  allDay: true,
  startTime: '09:30',
  endTime: '18:00',
  reason: '',
};

function ScheduleBlocksTab({ blocks, fetching, onRefresh, onCreate, onDelete }) {
  const [form, setForm] = useState(emptyBlockForm);
  const [saving, setSaving] = useState(false);

  // Data mínima = hoje no fuso local
  const todayLocal = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"

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
      toast.success('Bloqueio criado! O Cal.com já impedirá novos agendamentos nesse período.');
      setForm(emptyBlockForm);
    } catch (error) {
      toast.error(error.message || 'Erro ao criar bloqueio.');
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
    const utcStartTime = start.toISOString().slice(11, 16);
    const utcEndTime = end.toISOString().slice(11, 16);
    const isUtcCalendarDay = utcStartTime === '00:00' && (utcEndTime === '23:59' || utcEndTime === '00:00');
    const displayTimeZone = isUtcCalendarDay ? 'UTC' : 'America/Fortaleza';
    const dateStr = start.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: displayTimeZone,
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

    const isAllDay =
      isUtcCalendarDay || (startTime === '00:00' && (endTime === '23:59' || endTime === '00:00'));

    return {
      date: dateStr,
      time: isAllDay ? 'Dia inteiro' : `${startTime} – ${endTime}`,
      isAllDay,
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
            Ao criar um bloqueio aqui, o Cal.com marca automaticamente esse período como{' '}
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
              {saving ? 'Criando bloqueio...' : 'Bloquear agenda no Cal.com'}
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
                <span className="text-sm">Buscando bloqueios no Cal.com...</span>
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
