import { useEffect, useState } from 'react'
import api from '../api/axios'
import ImageUpload from '../components/ImageUpload'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

const EMPTY_FORM = {
  name: '', description: '', original_price: '', discounted_price: '',
  quantity: 1, pickup_start: '17:00', pickup_end: '20:00',
  image_url: '', is_available: true,
}

export default function ShopListings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPriceLoading, setAiPriceLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchItems = () => {
    api.get('/shops/my')
      .then(res => setItems(res.data.food_items || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      original_price: item.original_price,
      discounted_price: item.discounted_price,
      quantity: item.quantity,
      pickup_start: item.pickup_start || '17:00',
      pickup_end: item.pickup_end || '20:00',
      image_url: item.image_url || '',
      is_available: item.is_available,
    })
    setError('')
    setModalOpen(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAIDescribe = async () => {
    if (!form.name) { setError('Enter a name first'); return }
    setAiLoading(true)
    try {
      const res = await api.post('/ai/describe', {
        name: form.name,
        category: 'Uzbek food',
      })
      setForm(f => ({ ...f, description: res.data.description }))
    } catch {
      setError('AI service unavailable. Please add your Anthropic API key.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIPrice = async () => {
    if (!form.name || !form.original_price) {
      setError('Enter item name and original price first')
      return
    }
    setAiPriceLoading(true)
    try {
      const res = await api.post('/ai/suggest-price', {
        name: form.name,
        original_price: parseFloat(form.original_price),
        category: 'Uzbek food',
        expiry_hours: 8,
      })
      setForm(f => ({ ...f, discounted_price: res.data.suggested_price }))
      if (res.data.reasoning) {
        alert(`AI Suggestion: ${res.data.reasoning}\nDiscount: ${res.data.discount_percent}%`)
      }
    } catch {
      setError('AI service unavailable. Please add your Anthropic API key.')
    } finally {
      setAiPriceLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        original_price: parseFloat(form.original_price),
        discounted_price: parseFloat(form.discounted_price),
        quantity: parseInt(form.quantity),
      }
      if (editItem) {
        await api.put(`/food-items/${editItem.id}`, payload)
      } else {
        await api.post('/food-items/', payload)
      }
      setModalOpen(false)
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return
    setDeleting(id)
    try {
      await api.delete(`/food-items/${id}`)
      setItems(items.filter(i => i.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const toggleAvailable = async (item) => {
    try {
      const res = await api.put(`/food-items/${item.id}`, { is_available: !item.is_available })
      setItems(items.map(i => i.id === item.id ? { ...i, is_available: res.data.is_available } : i))
    } catch {}
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My listings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add listing
        </button>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-semibold text-gray-700">No listings yet</h2>
          <p className="text-gray-400 mt-2 mb-5">Create your first food listing to start selling</p>
          <button onClick={openCreate} className="btn-primary">Create listing</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const discount = Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100)
            return (
              <div key={item.id} className={`card transition-opacity ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="relative h-40 bg-gray-100 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
                         onError={e => { e.target.style.display='none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="badge bg-primary-700 text-white text-xs font-bold">-{discount}%</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleAvailable(item)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.is_available
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {item.is_available ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-primary-600 font-bold text-sm">{formatPrice(item.discounted_price)}</span>
                    <span className="text-xs text-gray-400 line-through">{formatPrice(item.original_price)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {item.pickup_start} – {item.pickup_end} · Qty: {item.quantity}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 text-xs btn-secondary py-1.5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="flex-1 text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === item.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editItem ? 'Edit listing' : 'New listing'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item name *</label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  className="input-field" placeholder="e.g. Freshly baked samsa" required />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <button type="button" onClick={handleAIDescribe} disabled={aiLoading}
                    className="text-xs text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md disabled:opacity-50 flex items-center gap-1">
                    {aiLoading ? '⏳ Generating…' : '✨ AI generate'}
                  </button>
                </div>
                <textarea name="description" value={form.description} onChange={handleChange}
                  className="input-field resize-none" rows={3}
                  placeholder="Describe your food item…" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original price (UZS) *</label>
                  <input type="number" name="original_price" value={form.original_price} onChange={handleChange}
                    className="input-field" placeholder="50000" required min={0} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Discounted price *</label>
                    <button type="button" onClick={handleAIPrice} disabled={aiPriceLoading}
                      className="text-xs text-primary-700 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded disabled:opacity-50">
                      {aiPriceLoading ? '⏳' : '🤖'}
                    </button>
                  </div>
                  <input type="number" name="discounted_price" value={form.discounted_price} onChange={handleChange}
                    className="input-field" placeholder="25000" required min={0} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange}
                    className="input-field" min={1} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup start</label>
                  <input type="time" name="pickup_start" value={form.pickup_start} onChange={handleChange}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup end</label>
                  <input type="time" name="pickup_end" value={form.pickup_end} onChange={handleChange}
                    className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm(f => ({ ...f, image_url: url }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_available" id="is_available"
                  checked={form.is_available} onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                <label htmlFor="is_available" className="text-sm text-gray-700">Available for ordering</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
