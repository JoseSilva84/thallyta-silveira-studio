import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiTrash2, FiUploadCloud, FiHome, FiLogOut, FiCalendar, FiImage } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AdminPanel() {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();

  // Tab ativa: 'gallery' ou 'bookings'
  const [activeTab, setActiveTab] = useState('bookings');

  // ─── Estado da Galeria ─────────────────────────────────────
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ─── Estado dos Agendamentos ───────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [fetchingBookings, setFetchingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const categories = ['Unhas', 'Cabelo', 'Estúdio'];

  // ─── Galeria ───────────────────────────────────────────────
  const fetchImages = async () => {
    try {
      setFetching(true);
      const res = await fetch(`${API}/gallery`);
      if (!res.ok) throw new Error('Falha ao buscar imagens');
      const data = await res.json();
      setImages(data);
    } catch (error) {
      toast.error('Erro ao carregar galeria');
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  // ─── Agendamentos ──────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    try {
      setFetchingBookings(true);
      const res = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Falha ao buscar agendamentos');
      const data = await res.json();
      setBookings(data);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
      console.error(error);
    } finally {
      setFetchingBookings(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchImages();
    fetchBookings();
  }, [fetchBookings]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.warning('Selecione pelo menos uma imagem');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
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

  const handleDelete = async (id) => {
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

  // ─── Helpers ───────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const statusBadge = (status) => {
    const map = {
      confirmed: { label: 'Confirmado', classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
      rescheduled: { label: 'Reagendado', classes: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
      cancelled: { label: 'Cancelado', classes: 'border-red-500/30 bg-red-500/10 text-red-400' },
    };
    const s = map[status] || { label: status, classes: 'border-white/20 bg-white/5 text-cream/60' };
    return (
      <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${s.classes}`}>
        {s.label}
      </span>
    );
  };

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="min-h-screen bg-dark p-4 text-cream md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold">Painel Administrativo</h1>
            <p className="mt-1 text-sm text-cream/40">
              Logado como <span className="text-gold-light">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'bookings'
                ? 'bg-gradient-to-r from-gold to-gold-light text-dark shadow-lg'
                : 'text-cream/60 hover:text-cream'
            }`}
          >
            <FiCalendar /> Agendamentos
            {bookings.length > 0 && (
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'bookings' ? 'bg-dark/20 text-dark' : 'bg-gold/20 text-gold'
              }`}>
                {bookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'gallery'
                ? 'bg-gradient-to-r from-gold to-gold-light text-dark shadow-lg'
                : 'text-cream/60 hover:text-cream'
            }`}
          >
            <FiImage /> Galeria
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB: AGENDAMENTOS                                          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filtros de status */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'confirmed', label: 'Confirmados' },
                { value: 'rescheduled', label: 'Reagendados' },
                { value: 'cancelled', label: 'Cancelados' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    statusFilter === f.value
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 text-cream/50 hover:border-gold/30 hover:text-cream'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={fetchBookings}
                className="ml-auto rounded-full border border-white/10 px-4 py-2 text-xs text-cream/50 transition-colors hover:border-gold/30 hover:text-gold"
              >
                ↻ Atualizar
              </button>
            </div>

            {/* Tabela de agendamentos */}
            <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black/40 backdrop-blur-md">
              {fetchingBookings ? (
                <div className="p-8 text-center text-cream/50">Carregando agendamentos...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-8 text-center text-cream/50">
                  {statusFilter === 'all'
                    ? 'Nenhum agendamento encontrado ainda.'
                    : `Nenhum agendamento com status "${statusFilter}".`}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gold-light/80">
                        <th className="px-5 py-4">Cliente</th>
                        <th className="px-5 py-4">WhatsApp</th>
                        <th className="px-5 py-4">Serviço(s)</th>
                        <th className="px-5 py-4">Data</th>
                        <th className="px-5 py-4">Horário</th>
                        <th className="px-5 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="transition-colors hover:bg-white/5">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-cream">{b.attendeeName || b.user?.name || '—'}</div>
                            <div className="text-xs text-cream/40">{b.attendeeEmail || b.user?.email || ''}</div>
                          </td>
                          <td className="px-5 py-4 text-cream/70">{b.attendeePhone || b.user?.whatsappPhone || '—'}</td>
                          <td className="max-w-[200px] px-5 py-4">
                            <span className="block truncate text-cream/80" title={b.service}>
                              {b.service}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-cream/70">{formatDate(b.scheduledAt)}</td>
                          <td className="px-5 py-4 text-cream/70">
                            {formatTime(b.scheduledAt)}
                            {b.endTime && ` – ${formatTime(b.endTime)}`}
                          </td>
                          <td className="px-5 py-4">{statusBadge(b.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB: GALERIA                                               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'gallery' && (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Formulário de Upload */}
            <div className="rounded-2xl border border-gold/20 bg-black/40 p-6 md:col-span-1">
              <h2 className="mb-4 text-xl font-semibold">Nova Imagem</h2>
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm text-cream/70">Arquivo(s) da Imagem</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream file:mr-4 file:rounded-full file:border-0 file:bg-gold/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gold hover:file:bg-gold/30"
                  />
                  {files.length > 0 && (
                    <p className="mt-2 text-xs text-gold">{files.length} arquivo(s) selecionado(s)</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-cream/70">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-cream outline-none focus:border-gold"
                  >
                    <option value="Todas">Todas (Geral)</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light py-3 font-bold text-dark transition-all hover:scale-105 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : <><FiUploadCloud className="text-xl" /> Fazer Upload</>}
                </button>
              </form>
            </div>

            {/* Lista de Imagens */}
            <div className="rounded-2xl border border-gold/20 bg-black/40 p-6 md:col-span-2">
              <h2 className="mb-4 text-xl font-semibold">Imagens Publicadas</h2>
              {fetching ? (
                <p className="text-cream/50">Carregando imagens...</p>
              ) : images.length === 0 ? (
                <p className="text-cream/50">Nenhuma imagem na galeria ainda.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {images.map((img) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
                      <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleDelete(img.id)}
                          className="flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
                        >
                          <FiTrash2 /> Deletar
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs font-bold text-gold">
                        {img.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
