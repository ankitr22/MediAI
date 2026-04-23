import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { ArrowLeft, Plus, Trash2, FileText, Calendar, Loader2, User } from 'lucide-react'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ diagnosis: '', symptoms: '', treatment: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/records`)
      ])
      setPatient(pRes.data)
      setRecords(rRes.data)
    } catch (e) {
      navigate('/patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const addRecord = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/patients/${id}/records`, form)
      setForm({ diagnosis: '', symptoms: '', treatment: '', notes: '' })
      setShowForm(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add record')
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (recordId) => {
    if (!confirm('Delete this record?')) return
    await api.delete(`/patients/${id}/records/${recordId}`)
    fetchData()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back + Header */}
      <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <div className="card mb-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
          <User size={24} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
          <p className="text-gray-500">
            {[patient.age && `Age ${patient.age}`, patient.gender, patient.contact].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="ml-auto">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Record
          </button>
        </div>
      </div>

      {/* Add Record Form */}
      {showForm && (
        <div className="card mb-6 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-gray-800 mb-4">New Medical Record</h3>
          <form onSubmit={addRecord} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
              <input className="input" placeholder="Primary diagnosis" value={form.diagnosis}
                onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
              <textarea className="input resize-none" rows={2} placeholder="Describe symptoms..."
                value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
              <textarea className="input resize-none" rows={2} placeholder="Treatment plan..."
                value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="input resize-none" rows={2} placeholder="Additional notes..."
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save Record
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Records */}
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <FileText size={18} className="text-blue-600" />
        Medical History ({records.length} records)
      </h3>

      {records.length === 0 ? (
        <div className="text-center py-12 text-gray-400 card">
          <FileText size={40} className="mx-auto mb-3 text-gray-200" />
          <p>No medical records yet. Add the first record.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.slice().reverse().map(r => (
            <div key={r.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={14} />
                  {new Date(r.visit_date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </div>
                <button onClick={() => deleteRecord(r.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
              {r.diagnosis && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Diagnosis</span>
                  <p className="text-gray-800 font-medium">{r.diagnosis}</p>
                </div>
              )}
              {r.symptoms && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Symptoms</span>
                  <p className="text-gray-700 text-sm">{r.symptoms}</p>
                </div>
              )}
              {r.treatment && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Treatment</span>
                  <p className="text-gray-700 text-sm">{r.treatment}</p>
                </div>
              )}
              {r.notes && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</span>
                  <p className="text-gray-700 text-sm">{r.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
