import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FiBarChart2,
  FiCalendar,
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
  FiStar,
  FiTrash2,
  FiTrendingUp,
  FiUploadCloud,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const emptyTestimonial = {
  id: null,
  name: '',
  text: '',
  rating: 5,
  published: true,
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

  const [testimonials, setTestimonials] = useState([]);
  const [fetchingTestimonials, setFetchingTestimonials] = useState(true);
  const [testimonialSaving, setTestimonialSaving] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonial);

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

  useEffect(() => {
    fetchImages();
    fetchBookings();
    fetchTestimonials();
  }, [fetchBookings, fetchImages, fetchTestimonials]);

  const refreshAll = () => {
    fetchBookings();
    fetchImages();
    fetchTestimonials();
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
    if (!window.confirm('Tem certeza que deseja deletar esta imagem?')) return;

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
    if (!window.confirm('Tem certeza que deseja deletar este depoimento?')) return;

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

  const analytics = useMemo(() => buildAnalytics(bookings), [bookings]);
  const calendarDays = useMemo(() => buildCalendarDays(monthCursor, bookings), [monthCursor, bookings]);
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
          <TabButton active={activeTab === 'analytics'} icon={<FiBarChart2 />} label="Analises" onClick={() => setActiveTab('analytics')} />
          <TabButton active={activeTab === 'gallery'} icon={<FiImage />} label="Galeria" count={images.length} onClick={() => setActiveTab('gallery')} />
          <TabButton active={activeTab === 'testimonials'} icon={<FiMessageSquare />} label="Depoimentos" count={testimonials.length} onClick={() => setActiveTab('testimonials')} />
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedButton active={bookingView === 'table'} onClick={() => setBookingView('table')}>Lista</SegmentedButton>
              <SegmentedButton active={bookingView === 'calendar'} onClick={() => setBookingView('calendar')}>Calendario</SegmentedButton>
              <div className="ml-auto flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'confirmed', label: 'Confirmados' },
                  { value: 'rescheduled', label: 'Reagendados' },
                  { value: 'cancelled', label: 'Cancelados' },
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
              />
            ) : (
              <BookingsTable
                bookings={filteredBookings}
                fetching={fetchingBookings}
                statusFilter={statusFilter}
                statusBadge={statusBadge}
              />
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView analytics={analytics} />
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

function BookingsTable({ bookings, fetching, statusFilter, statusBadge }) {
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
              <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gold-light/80">
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">WhatsApp</th>
                <th className="px-5 py-4">Servico(s)</th>
                <th className="px-5 py-4">Valor</th>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Horario</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <tr key={booking.id} className="transition-colors hover:bg-white/5">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-cream">{booking.attendeeName || booking.user?.name || '-'}</div>
                    <div className="text-xs text-cream/40">{booking.attendeeEmail || booking.user?.email || ''}</div>
                  </td>
                  <td className="px-5 py-4 text-cream/70">{booking.attendeePhone || booking.user?.whatsappPhone || '-'}</td>
                  <td className="max-w-[240px] px-5 py-4">
                    <span className="block truncate text-cream/80" title={booking.service}>{booking.service}</span>
                  </td>
                  <td className="px-5 py-4 text-cream/70">{formatCurrency(booking.estimatedValue)}</td>
                  <td className="px-5 py-4 text-cream/70">{formatDate(booking.scheduledAt)}</td>
                  <td className="px-5 py-4 text-cream/70">
                    {formatTime(booking.scheduledAt)}
                    {booking.endTime && ` - ${formatTime(booking.endTime)}`}
                  </td>
                  <td className="px-5 py-4">{statusBadge(booking.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CalendarView({ days, monthLabel, onPrev, onNext, statusBadge, formatTime }) {
  const todayKey = dateKey(new Date());

  return (
    <div className="rounded-2xl border border-gold/20 bg-black/40 p-4 backdrop-blur-md md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <button onClick={onPrev} className="rounded-full border border-white/10 p-2 text-cream/60 hover:border-gold/30 hover:text-gold">
          <FiChevronLeft />
        </button>
        <h2 className="text-center font-display text-2xl font-semibold capitalize text-gold-light">{monthLabel}</h2>
        <button onClick={onNext} className="rounded-full border border-white/10 p-2 text-cream/60 hover:border-gold/30 hover:text-gold">
          <FiChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-gold-light/70">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-7 md:gap-2">
        {days.map((day) => (
          <div
            key={day.key}
            className={`min-h-32 rounded-xl border p-3 ${
              day.inMonth ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-black/20 opacity-40'
            } ${day.key === todayKey ? 'ring-1 ring-gold/70' : ''}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-cream">{day.date.getDate()}</span>
              {day.bookings.length > 0 && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-bold text-gold">{day.bookings.length}</span>}
            </div>
            <div className="space-y-2">
              {day.bookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="rounded-lg border border-white/10 bg-black/35 p-2 text-left">
                  <div className="text-xs font-bold text-gold-light">{formatTime(booking.scheduledAt)}</div>
                  <div className="truncate text-xs text-cream">{booking.attendeeName || booking.user?.name || 'Cliente'}</div>
                  <div className="truncate text-[0.68rem] text-cream/50">{booking.service}</div>
                </div>
              ))}
              {day.bookings.length > 3 && <div className="text-xs text-gold">+{day.bookings.length - 3} outros</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {['confirmed', 'rescheduled', 'cancelled'].map((status) => <span key={status}>{statusBadge(status)}</span>)}
      </div>
    </div>
  );
}

function AnalyticsView({ analytics }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FiDollarSign />} label="Valor em servicos" value={formatCurrency(analytics.totalRevenue)} hint={`${analytics.paidBookings} agendamentos com valor`} />
        <MetricCard icon={<FiTrendingUp />} label="Ticket medio" value={formatCurrency(analytics.averageTicket)} hint="considerando valores informados" />
        <MetricCard icon={<FiCalendar />} label="Servicos agendados" value={analytics.totalServices} hint={`${analytics.activeBookings} agendamentos ativos`} />
        <MetricCard icon={<FiUsers />} label="Clientes atendidos" value={analytics.uniqueClients} hint="por email, WhatsApp ou nome" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Valor por mes" className="xl:col-span-2">
          <div className="space-y-4">
            {analytics.monthStats.map((item) => (
              <BarRow key={item.key} label={item.label} value={formatCurrency(item.value)} width={analytics.maxMonthValue ? (item.value / analytics.maxMonthValue) * 100 : 0} />
            ))}
          </div>
        </ChartPanel>

        <ChartPanel title="Agenda proxima">
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
        <ChartPanel title="Quantidade por servico">
          <div className="space-y-4">
            {analytics.serviceStats.length === 0 ? (
              <p className="text-sm text-cream/50">Ainda nao ha servicos suficientes para analisar.</p>
            ) : analytics.serviceStats.map((item) => (
              <BarRow key={item.name} label={item.name} value={`${item.count}x`} width={analytics.maxServiceCount ? (item.count / analytics.maxServiceCount) * 100 : 0} />
            ))}
          </div>
        </ChartPanel>

        <ChartPanel title="Resumo operacional">
          <div className="grid gap-3 sm:grid-cols-2">
            <SmallStat label="Confirmados" value={analytics.statusCounts.confirmed || 0} />
            <SmallStat label="Reagendados" value={analytics.statusCounts.rescheduled || 0} />
            <SmallStat label="Cancelados" value={analytics.cancelledCount} />
            <SmallStat label="Sem valor informado" value={analytics.missingValueCount} />
          </div>
        </ChartPanel>
      </div>
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

function ChartPanel({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-gold/20 bg-black/40 p-5 ${className}`}>
      <h2 className="mb-5 text-xl font-semibold text-gold-light">{title}</h2>
      {children}
    </section>
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

function SmallStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-cream/40">{label}</p>
      <p className="mt-2 text-2xl font-bold text-cream">{value}</p>
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

function buildAnalytics(bookings) {
  const serviceCounts = new Map();
  const monthMap = new Map();
  const clientKeys = new Set();
  const statusCounts = {};
  let totalRevenue = 0;
  let paidBookings = 0;
  let totalServices = 0;
  let missingValueCount = 0;
  let activeBookings = 0;

  const monthSeeds = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    monthMap.set(key, { key, label, value: 0 });
    return key;
  });

  bookings.forEach((booking) => {
    statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    if (booking.status === 'cancelled') return;
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

    splitServices(booking.service).forEach((service) => {
      totalServices += 1;
      serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
    });
  });

  const serviceStats = Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const monthStats = monthSeeds.map((key) => monthMap.get(key));
  const now = new Date();
  const nextBookings = bookings
    .filter((booking) => booking.status !== 'cancelled' && new Date(booking.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5);

  return {
    totalRevenue,
    paidBookings,
    averageTicket: paidBookings ? totalRevenue / paidBookings : 0,
    activeBookings,
    totalServices,
    uniqueClients: clientKeys.size,
    serviceStats,
    maxServiceCount: Math.max(0, ...serviceStats.map((item) => item.count)),
    monthStats,
    maxMonthValue: Math.max(0, ...monthStats.map((item) => item.value)),
    nextBookings,
    statusCounts,
    cancelledCount: statusCounts.cancelled || 0,
    missingValueCount,
  };
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

function statusBadge(status) {
  const map = {
    confirmed: { label: 'Confirmado', classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    rescheduled: { label: 'Reagendado', classes: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    cancelled: { label: 'Cancelado', classes: 'border-red-500/30 bg-red-500/10 text-red-400' },
  };
  const item = map[status] || { label: status || 'Status', classes: 'border-white/20 bg-white/5 text-cream/60' };
  return <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${item.classes}`}>{item.label}</span>;
}
