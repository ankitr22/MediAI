import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Users, Plus, Search, ChevronRight, Trash2, User, Loader2 } from 'lucide-react'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', age: '', gender: '', contact: '' })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients/')
      setPatients(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const createPatient = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/patients/', { ...form, age: form.age ? parseInt(form.age) : null })
      setForm({ name: '', age: '', gender: '', contact: '' })
      setShowForm(false)
      fetchPatients()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create patient')
    } finally {
      setSaving(false)
    }
  }

  const deletePatient = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this patient and all their records?')) return
    await api.delete(`/patients/${id}`)
    fetchPatients()
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.contact || '').includes(search)
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Records</h2>
          <p className="text-gray-500 mt-1">{patients.length} patient{patients.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Patient
        </button>
      </div>

      {/* Add Patient Form */}
      {showForm && (
        <div className="card mb-6 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-gray-800 mb-4">New Patient</h3>
          <form onSubmit={createPatient} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input className="input" placeholder="Patient name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input className="input" type="number" placeholder="Age" value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input className="input" placeholder="Phone or email" value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save Patient
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search patients by name or contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Patient List */}
      {loading ? (
        <div className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-3 text-gray-200" />
          <p>{search ? 'No patients match your search' : 'No patients yet. Add your first patient.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="card cursor-pointer hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4 py-4"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {[p.age && `Age ${p.age}`, p.gender, p.contact].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => deletePatient(p.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
