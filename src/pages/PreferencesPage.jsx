import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiCheck, FiHeart, FiSave } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const sourceOptions = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicação', label: 'Indicação' },
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'cliente_antiga', label: 'Já era cliente' },
  { value: 'outro', label: 'Outro' },
]

const interestOptions = [
  'Unhas em gel',
  'Pedicure',
  'Manicure',
  'Cabelo',
  'Escova',
  'Hidratacao',
]

const periodOptions = ['Manha', 'Tarde', 'Fim da tarde']
const contactOptions = ['WhatsApp', 'Ligacao', 'Somente avisos importantes']

const emptyForm = {
  source: '',
  interests: [],
  preferredPeriods: [],
  contactPreference: 'WhatsApp',
  dateOfBirth: '',
  notes: '',
  allowPromotions: true,
}

export default function PreferencesPage() {
  const { user, getToken } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const firstName = useMemo(() => String(user?.name || '').trim().split(/\s+/)[0] || 'cliente', [user])

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/crm/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar preferências.')
      const profile = data.profile || {}
      setForm({
        source: profile.source || '',
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        preferredPeriods: Array.isArray(profile.preferredPeriods) ? profile.preferredPeriods : [],
        contactPreference: profile.contactPreference || 'WhatsApp',
        dateOfBirth: data.user?.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '',
        notes: profile.notes || '',
        allowPromotions: profile.allowPromotions !== false,
      })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const toggleListValue = (field, value) => {
    setForm((current) => {
      const values = Array.isArray(current[field]) ? current[field] : []
      return {
        ...current,
        [field]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API}/crm/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar preferências.')
      toast.success('Preferências salvas com sucesso!')
      navigate('/meus-agendamentos')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark px-4 py-6 text-cream md:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-cream/50 transition hover:text-gold"
        >
          <FiArrowLeft /> Voltar
        </button>

        <section className="gold-border rounded-3xl bg-black/55 p-5 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-light">
              <FiHeart size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold/70">Preferências do Studio</p>
              <h1 className="mt-2 font-display text-4xl text-gold-light">Seu atendimento, {firstName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/60">
                Responda quando quiser. Isso nao muda o agendamento rápido; apenas ajuda o Studio a lembrar suas preferências.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-cream/50">
              Carregando preferências...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-7">
              <div>
                <label className="mb-3 block text-sm font-semibold text-cream">Como voce conheceu o Studio?</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sourceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, source: option.value }))}
                      className={`flex min-h-11 items-center justify-between rounded-xl border px-4 text-left text-sm font-semibold transition ${
                        form.source === option.value
                          ? 'border-gold/50 bg-gold/15 text-gold-light'
                          : 'border-white/10 bg-white/[0.04] text-cream/65 hover:border-gold/25 hover:text-cream'
                      }`}
                    >
                      {option.label}
                      {form.source === option.value && <FiCheck />}
                    </button>
                  ))}
                </div>
              </div>

              <OptionGroup
                title="Quais serviços mais te interessam?"
                options={interestOptions}
                values={form.interests}
                onToggle={(value) => toggleListValue('interests', value)}
              />

              <OptionGroup
                title="Qual período costuma ser melhor?"
                options={periodOptions}
                values={form.preferredPeriods}
                onToggle={(value) => toggleListValue('preferredPeriods', value)}
              />

              <div>
                <label className="mb-3 block text-sm font-semibold text-cream">Preferencia de contato</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {contactOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, contactPreference: option }))}
                      className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${
                        form.contactPreference === option
                          ? 'border-gold/50 bg-gold/15 text-gold-light'
                          : 'border-white/10 bg-white/[0.04] text-cream/65 hover:border-gold/25 hover:text-cream'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-cream">Data de aniversario</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-cream outline-none transition focus:border-gold/50"
                />
                <p className="mt-2 text-xs text-cream/40">
                  Opcional. Ajuda o Studio a lembrar mimos e benefícios de aniversário.
                </p>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-cream">Alguma preferencia importante?</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ex.: prefiro tons claros, costumo ir no fim da tarde, gosto de avisos pelo WhatsApp..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-cream outline-none transition placeholder:text-cream/30 focus:border-gold/50"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/65">
                <input
                  type="checkbox"
                  checked={form.allowPromotions}
                  onChange={(event) => setForm((current) => ({ ...current, allowPromotions: event.target.checked }))}
                  className="mt-1 size-4 accent-gold"
                />
                <span>Permito receber avisos e novidades úteis pelo WhatsApp.</span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/meus-agendamentos" className="text-center text-sm font-semibold text-cream/45 hover:text-cream">
                  Deixar para depois
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="gold-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60"
                >
                  <FiSave /> {saving ? 'Salvando...' : 'Salvar preferências'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

function OptionGroup({ title, options, values, onToggle }) {
  return (
    <div>
      <label className="mb-3 block text-sm font-semibold text-cream">{title}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = values.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${
                active
                  ? 'border-gold/50 bg-gold/15 text-gold-light'
                  : 'border-white/10 bg-white/[0.04] text-cream/60 hover:border-gold/25 hover:text-cream'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
