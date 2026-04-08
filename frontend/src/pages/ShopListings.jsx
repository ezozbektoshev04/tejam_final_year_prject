import { useEffect, useState } from 'react'
import api from '../api/axios'
import ImageUpload from '../components/ImageUpload'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

const EMPTY_FORM = {
  name: '', description: '', contents_hint: '', original_price: '', discounted_price: '',
  quantity: 1, pickup_start: '17:00', pickup_end: '20:00',
  image_url: '', is_available: true,
}

export default function ShopListings() {
  const [shops, setShops] = useState([])
  const [selectedShopId, setSelectedShopId] = useState(null)
  const [items, setItems] = useState([])
  const [archivedItems, setArchivedItems] = useState([])
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'archived'
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [restoreModal, setRestoreModal] = useState(null) // item to restore
  const [restoreForm, setRestoreForm] = useState({ quantity: 5, pickup_start: '17:00', pickup_end: '20:00' })
  const [restoring, setRestoring] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPriceLoading, setAiPriceLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchShopsAndItems = async () => {
    try {
      const res = await api.get('/shops/my')
      const shopList = res.data
      setShops(shopList)
      if (!selectedShopId) setSelectedShopId(shopList[0]?.id || null)
      const allItems = shopList.flatMap(s => s.food_items || [])
      const allArchived = shopList.flatMap(s => s.archived_items || [])
      setItems(allItems)
      setArchivedItems(allArchived)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShopsAndItems() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setSelectedShopId(item.shop_id)
    setForm({
      name: item.name,
      description: item.description || '',
      contents_hint: item.contents_hint || '',
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

  const openRestore = (item) => {
    setRestoreModal(item)
    setRestoreForm({
      quantity: 5,
      pickup_start: item.pickup_start || '17:00',
      pickup_end: item.pickup_end || '20:00',
    })
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAIDescribe = async () => {
    if (!form.name) { setError('Enter a bag name first'); return }
    setAiLoading(true)
    try {
      const res = await api.post('/ai/describe', { name: form.name, category: 'Uzbek food' })
      setForm(f => ({
        ...f,
        description: res.data.description || f.description,
        contents_hint: res.data.contents_hint || f.contents_hint,
      }))
    } catch {
      setError('AI service unavailable.')
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
      setError('AI service unavailable.')
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
        shop_id: selectedShopId,
      }
      if (editItem) {
        await api.put(`/food-items/${editItem.id}`, payload)
      } else {
        await api.post('/food-items/', payload)
      }
      setModalOpen(false)
      fetchShopsAndItems()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this listing? It will be hidden from customers but you can restore it anytime.')) return
    setArchiving(id)
    try {
      await api.put(`/food-items/${id}/archive`)
      fetchShopsAndItems()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to archive')
    } finally {
      setArchiving(null)
    }
  }

  const handleRestore = async (e) => {
    e.preventDefault()
    setRestoring(true)
    try {
      await api.put(`/food-items/${restoreModal.id}/restore`, restoreForm)
      setRestoreModal(null)
      fetchShopsAndItems()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore')
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return
    setDeleting(id)
    try {
      await api.delete(`/food-items/${id}`)
      fetchShopsAndItems()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const toggleAvailable = async (item) => {
    if (!item.is_available && item.quantity <= 0) {
      alert('Cannot activate a listing with 0 quantity. Edit the listing and set a quantity first.')
      return
    }
    try {
      const res = await api.put(`/food-items/${item.id}`, { is_available: !item.is_available })
      setItems(items.map(i => i.id === item.id ? { ...i, is_available: res.data.is_available } : i))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update listing')
    }
  }

  const visibleItems = items.filter(i => i.shop_id === selectedShopId)
  const visibleArchived = archivedItems.filter(i => i.shop_id === selectedShopId)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {visibleItems.length} active · {visibleArchived.length} archived
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Add surprise bag</button>
      </div>

      {/* Branch selector */}
      {shops.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {shops.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedShopId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedShopId === s.id
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              {s.address?.split(',')[0] || `Branch ${s.id}`}
            </button>
          ))}
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active ({visibleItems.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Archived ({visibleArchived.length})
          {visibleArchived.length > 0 && activeTab !== 'archived' && (
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          )}
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
      ) : activeTab === 'active' ? (
        visibleItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-xl font-semibold text-gray-700">No active surprise bags</h2>
            <p className="text-gray-400 mt-2 mb-5">Create your first surprise bag to start saving food and earning</p>
            <button onClick={openCreate} className="btn-primary">Create surprise bag</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map(item => {
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
                        disabled={!item.is_available && item.quantity <= 0}
                        title={!item.is_available && item.quantity <= 0 ? 'Set quantity > 0 to activate' : ''}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          item.is_available
                            ? 'bg-primary-600 text-white'
                            : item.quantity <= 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-600 text-white'
                        }`}
                      >
                        {item.is_available ? 'Active' : item.quantity <= 0 ? 'No stock' : 'Hidden'}
                      </button>
                    </div>
                    {item.quantity <= 2 && item.quantity > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className="badge bg-red-500 text-white text-xs">Only {item.quantity} left!</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🎁 Surprise Bag</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                    {item.contents_hint ? (
                      <p className="text-xs text-amber-700 mt-0.5 line-clamp-1">{item.contents_hint}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
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
                      <button onClick={() => openEdit(item)} className="flex-1 text-xs btn-secondary py-1.5">
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(item.id)}
                        disabled={archiving === item.id}
                        className="flex-1 text-xs text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {archiving === item.id ? '…' : 'Archive'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Archived tab */
        visibleArchived.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-700">No archived listings</h2>
            <p className="text-gray-400 mt-2">Items that sell out or get archived will appear here</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleArchived.map(item => {
              const discount = Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100)
              return (
                <div key={item.id} className="card opacity-75 border-dashed">
                  <div className="relative h-40 bg-gray-100 overflow-hidden grayscale">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
                           onError={e => { e.target.style.display='none' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                    )}
                    <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                      <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">Archived</span>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="badge bg-gray-600 text-white text-xs font-bold">-{discount}%</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-700 line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-500 font-bold text-sm">{formatPrice(item.discounted_price)}</span>
                      <span className="text-xs text-gray-400 line-through">{formatPrice(item.original_price)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Last pickup: {item.pickup_start} – {item.pickup_end}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openRestore(item)}
                        className="flex-1 text-xs text-primary-700 border border-primary-200 bg-primary-50 hover:bg-primary-100 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        ↩ Restore
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
        )
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editItem ? 'Edit surprise bag' : 'New surprise bag'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Customers see what might be inside — exact contents vary daily</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {shops.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                  <select
                    value={selectedShopId || ''}
                    onChange={e => setSelectedShopId(Number(e.target.value))}
                    className="input-field" required
                  >
                    {shops.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.address?.split(',')[0] || `Branch ${s.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bag name *</label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  className="input-field" placeholder="e.g. Morning Pastry Surprise Bag" required />
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
                  className="input-field resize-none" rows={2} placeholder="Tell customers about this bag — what type of food, when it's made, why it's a good deal…" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">What's inside? (contents hint)</label>
                  <span className="text-xs text-gray-400">filled by AI generate above</span>
                </div>
                <input type="text" name="contents_hint" value={form.contents_hint} onChange={handleChange}
                  className="input-field" placeholder="May include: bread, pastries, sweets, or savory bites" />
                <p className="text-xs text-gray-400 mt-1">Shown to customers as a hint — not a guarantee. Exact contents vary daily.</p>
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
                <ImageUpload value={form.image_url} onChange={(url) => setForm(f => ({ ...f, image_url: url }))} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_available" id="is_available"
                  checked={form.is_available} onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                <label htmlFor="is_available" className="text-sm text-gray-700">Available for ordering</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Restore listing</h2>
            <p className="text-sm text-gray-500 mb-4">{restoreModal.name}</p>

            <form onSubmit={handleRestore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New quantity *</label>
                <input
                  type="number"
                  min={1}
                  value={restoreForm.quantity}
                  onChange={e => setRestoreForm(f => ({ ...f, quantity: parseInt(e.target.value) }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup start</label>
                  <input type="time" value={restoreForm.pickup_start}
                    onChange={e => setRestoreForm(f => ({ ...f, pickup_start: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup end</label>
                  <input type="time" value={restoreForm.pickup_end}
                    onChange={e => setRestoreForm(f => ({ ...f, pickup_end: e.target.value }))}
                    className="input-field" />
                </div>
              </div>

              <div className="bg-primary-50 rounded-lg p-3 text-xs text-primary-700">
                The listing will be restored as active with the same name, description, prices, and photo. Just set the new quantity and pickup window.
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setRestoreModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={restoring} className="btn-primary flex-1">
                  {restoring ? 'Restoring…' : '↩ Restore listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
