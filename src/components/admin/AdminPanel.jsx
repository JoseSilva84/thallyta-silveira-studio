import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiTrash2, FiUploadCloud, FiHome, FiLogOut } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AdminPanel() {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const categories = ['Unhas', 'Cabelo', 'Estúdio'];

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

  useEffect(() => {
    fetchImages();
  }, []);

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
      fetchImages(); // Recarrega a lista
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

  return (
    <div className="min-h-screen bg-dark p-8 text-cream">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gold">Painel Administrativo</h1>
            <p className="text-cream/40 text-sm mt-1">Logado como <span className="text-gold-light">{user?.name}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/10">
              <FiHome /> Site
            </Link>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
              <FiLogOut /> Sair
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}
