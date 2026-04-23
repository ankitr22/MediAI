import { useState, useRef } from 'react'
import api from '../api'
import { Camera, Upload, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react'

const SEVERITY = {
  'Melanoma': 'high',
  'Basal cell carcinoma': 'high',
  'Actinic keratoses': 'medium',
  'Melanocytic nevi': 'low',
  'Benign keratosis-like lesions': 'low',
  'Vascular lesions': 'low',
  'Dermatofibroma': 'low',
}

const SEVERITY_COLORS = {
  high: 'bg-red-100 border-red-300 text-red-800',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  low: 'bg-green-100 border-green-300 text-green-800',
}

export default function SkinClassifier() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const classify = async () => {
    if (!image) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', image)
      const res = await api.post('/skin/classify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Classification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const severity = result ? SEVERITY[result.prediction] || 'low' : null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Skin Disease Classifier</h2>
        <p className="text-gray-500 mt-1">Upload a skin lesion image for AI-powered classification using MobileNetV2</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload size={18} className="text-blue-600" />
            Upload Image
          </h3>

          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
            onClick={() => fileRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="text-gray-400">
                <Camera size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Drop image here or click to upload</p>
                <p className="text-sm mt-1">JPG, PNG, WEBP supported</p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {preview && (
            <div className="mt-4 flex gap-2">
              <button onClick={classify} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : 'Classify Image'}
              </button>
              <button onClick={() => { setImage(null); setPreview(null); setResult(null) }} className="btn-secondary">
                Clear
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 flex items-start gap-2">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              This tool uses MobileNetV2 trained on dermatology datasets. Results are for screening purposes only. Always consult a dermatologist for diagnosis.
            </p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            Classification Results
          </h3>

          {!result && !loading && (
            <div className="text-center text-gray-400 py-12">
              <Camera size={48} className="mx-auto mb-3 text-gray-200" />
              <p>Upload and classify an image to see results</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 size={40} className="animate-spin mx-auto text-blue-500 mb-3" />
              <p className="text-gray-500">Analyzing image...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Primary Result */}
              <div className={`border rounded-xl p-4 ${SEVERITY_COLORS[severity]}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide opacity-70">Primary Diagnosis</p>
                    <p className="text-xl font-bold mt-1">{result.prediction}</p>
                    <p className="text-sm mt-1 opacity-80">{result.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{result.confidence}%</p>
                    <p className="text-xs opacity-70">confidence</p>
                  </div>
                </div>
              </div>

              {/* All Predictions */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">All Classifications</p>
                <div className="space-y-2">
                  {result.all_predictions.map((p) => (
                    <div key={p.class} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-44 truncate">{p.class}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${p.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{p.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {severity === 'high' && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    <strong>Urgent:</strong> This classification suggests a potentially serious condition. Please consult a dermatologist immediately.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
