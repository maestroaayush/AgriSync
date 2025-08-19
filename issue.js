1) Recharts bar color bug (per‑bar colors weren’t applied)

<Bar fill={(entry) => entry.fill} /> is invalid in Recharts. Use <Cell> children.

Replace your “Delivery Status” chart block with:

{deliveryStatusData.some(d => d.value > 0) ? (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={deliveryStatusData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
        {deliveryStatusData.map((entry, idx) => (
          <Cell key={`bar-cell-${idx}`} fill={entry.fill} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
) : (
  /* ...empty-state... */
)}

2) Status value mismatch (in-transit vs in_transit)

You use both in-transit and in_transit, which breaks filters/badges. Normalize once.

Add this helper near the top (inside the component):

const normalizeStatus = (s) => (s || '').replace('-', '_').toLowerCase();


Update all status checks to use it, e.g.:

const filteredDeliveries = (deliveries || [])
  .filter(Boolean)
  .filter(delivery => {
    const s = normalizeStatus(delivery?.status);
    return delivery && (deliveryFilter === 'all' || s === deliveryFilter);
  });

const deliveryStatusData = [
  { name: 'Pending',    value: (deliveries || []).filter(d => normalizeStatus(d?.status) === 'pending').length,     fill: '#F59E0B' },
  { name: 'In Transit', value: (deliveries || []).filter(d => normalizeStatus(d?.status) === 'in_transit').length, fill: '#60A5FA' },
  { name: 'Delivered',  value: (deliveries || []).filter(d => normalizeStatus(d?.status) === 'delivered').length,  fill: '#34D399' },
];


And in the Deliveries card badge:

<span
  className={`px-3 py-1 rounded-full text-xs font-medium ${
    normalizeStatus(delivery.status) === 'delivered' ? 'bg-green-100 text-green-800'
    : normalizeStatus(delivery.status) === 'in_transit' ? 'bg-blue-100 text-blue-800'
    : 'bg-yellow-100 text-yellow-800'
  }`}
>
  {normalizeStatus(delivery.status).replace('_',' ')}
</span>

3) Export URLs double “?” bug

You’re passing ?format=... into buildUrl which also appends query params. Result: ...?format=csv?from=....

Fix by letting buildUrl compose the query. Replace buildUrl with:

const buildUrl = (base) => {
  const url = new URL(base, window.location.origin);
  if (from) url.searchParams.set('from', formatDate(from));
  if (to)   url.searchParams.set('to',   formatDate(to));
  return url.toString();
};


Then call it like this (note: no ?format= in the base):

<ExportButton
  onExport={(format) => {
    const url = new URL('http://localhost:5000/api/export/inventory', window.location.origin);
    url.searchParams.set('format', format);
    const withRange = new URL(buildUrl(url.toString()));
    window.location.href = withRange.toString();
  }}
  label="Inventory"
  formats={['csv', 'xlsx', 'pdf']}
  theme="green"
/>


Do the same for Deliveries and Summary.

4) Tailwind dynamic color classes may be purged

Classes like bg-gradient-to-r from-${tab.color}-500 get stripped in production unless you safelist them. Either safelist in tailwind.config.js or map to concrete classes.

Quick in-file fix using a map:

const tabStyles = {
  blue:   'from-blue-500 to-blue-600',
  green:  'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
  indigo: 'from-indigo-500 to-indigo-600',
};


Then:

className={`flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 transform ${
  isActive
    ? `bg-gradient-to-r ${tabStyles[tab.color]} text-white shadow-lg scale-105`
    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-105'
}`}

5) Show Accept/Reject for pending requests (you wrote handlers but never used them)

Add buttons when a delivery is pending.

In each delivery card actions area, add:

{normalizeStatus(delivery.status) === 'pending' && (
  <>
    <button
      onClick={() => acceptDeliveryRequest(delivery)}
      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center mr-2"
    >
      <Check className="h-4 w-4 mr-1" /> Accept
    </button>
    <button
      onClick={() => rejectDeliveryRequest(delivery)}
      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center"
    >
      <X className="h-4 w-4 mr-1" /> Reject
    </button>
  </>
)}


(You can keep your “Confirm” as the receipt flow when goods arrive.)

6) Minor robustness tweaks

Guard undefined user/location in API calls to avoid "undefined" in URLs:

if (!user?.location) return; // before fetchInventory
const res = await axios.get(`http://localhost:5000/api/inventory/location/${encodeURIComponent(user.location)}`, ...


Avoid full page reload on profile update. After successful PUT:

localStorage.setItem('user', JSON.stringify(updatedUser));
// trigger a state update instead of reload
setProfileForm({ location: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' });
setProfileImageFile(null);
setProfileImagePreview(null);
setShowEditProfileModal(false);
alert('Profile updated successfully!');


If you keep window.location.reload(), it’s fine but heavier.

Marker icon fix: your Leaflet override is fine; just ensure those CDN URLs are allowed in CSP.

7) Optional quality-of-life

Use Kathmandu (or your actual ops area) as the default map center instead of Mumbai:

const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]); // Kathmandu


Safelist tailwind classes in tailwind.config.js if you keep dynamic colors:

safelist: [
  { pattern: /(from|to)-(blue|green|purple|orange|indigo)-(400|500|600)/ },
  { pattern: /(bg|text)-(red|yellow|green|blue)-(100|600|700|800)/ },
]




This is a classic “invisible overlay eating clicks” issue. Your decorative background (and possibly a closed modal) is sitting above parts of the page in some tabs, so the <select>s and the “Add Item” button don’t receive pointer events. Overview works because some sections there happen to have a higher z-index.

Make these small, surgical fixes:

Put the background behind everything and make it non-interactive

{/* Background decorative elements */}
- <div className="absolute inset-0 overflow-hidden">
+ <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">


Ensure the main content sits above any background or stray overlays

- <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
+ <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">


Give the Inventory/Deliveries filter bars a z-bump (belt-and-suspenders)

{/* Inventory tab toolbar */}
- <div className="mb-6 flex flex-col sm:flex-row ...">
+ <div className="mb-6 flex flex-col sm:flex-row ... relative z-20">

{/* Deliveries tab toolbar */}
- <div className="mb-6 flex flex-col sm:flex-row ...">
+ <div className="mb-6 flex flex-col sm:flex-row ... relative z-20">


(If needed) Make sure your Modal truly unmounts when closed
If your Modal leaves a transparent full-screen layer in the DOM, it will block clicks. Inside ../../components/Modal, ensure it returns null when !isOpen:

// Modal.jsx (simplified)
import ReactDOM from "react-dom";

export default function Modal({ isOpen, onClose, className, children }) {
  if (!isOpen) return null; // <- important
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                       bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-auto ${className || ''}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}


Why this works

pointer-events-none + -z-10 guarantees the decorative layer can’t intercept clicks.

relative z-10/z-20 puts your interactive UI above any default-z siblings.

Unmounting the modal avoids a transparent overlay hanging around between openings.

Apply those and your Inventory “Add Item” button and the <select>s in both Inventory and Deliveries will be clickable again. If anything still feels sticky after this, tell me and I’ll drop in a fully patched file.
