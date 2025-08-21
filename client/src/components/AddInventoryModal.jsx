import { useState } from "react";
import axios from "axios";
import { Package, X, AlertCircle, Loader, CheckCircle } from "lucide-react";

function AddInventoryModal({ onClose, onSuccess }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  
  const [form, setForm] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    location: user?.location || "", // Auto-set to user's warehouse location
    description: "",
    category: "other",
    price: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Basic validation
      if (!form.itemName.trim()) {
        throw new Error("Item name is required");
      }
      if (!form.quantity || parseInt(form.quantity) <= 0) {
        throw new Error("Quantity must be a positive number");
      }
      
      // Use user's warehouse location
      const warehouseLocation = user?.location || form.location.trim();
      if (!warehouseLocation) {
        throw new Error("Warehouse location is required");
      }
      
      const payload = {
        ...form,
        quantity: parseInt(form.quantity),
        price: form.price ? parseFloat(form.price) : 0,
        location: warehouseLocation, // Use warehouse manager's location
        reason: 'Manual addition by warehouse manager'
      };
      
      console.log('Submitting inventory item:', payload);
      console.log('Token available:', !!token);
      console.log('User:', user);
      
      // Use the warehouse-specific endpoint
      const response = await axios.post("http://localhost:5000/api/warehouse/inventory/add", payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Inventory item created:', response.data);
      setSuccess(true);
      
      // Show success for a moment before closing
      setTimeout(() => {
        onSuccess(); // refresh parent
        onClose();   // close modal
      }, 1000);
      
    } catch (err) {
      console.error("Add inventory failed", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      setError(err.response?.data?.message || err.message || "Failed to add inventory item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Package className="h-6 w-6 mr-2 text-green-600" />
          Add Inventory Item
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-700 text-sm">Inventory item added successfully!</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              name="itemName"
              placeholder="e.g., Rice, Wheat, Tomatoes"
              value={form.itemName}
              onChange={handleChange}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
              disabled={loading}
            >
              <option value="grains">Grains</option>
              <option value="vegetables">Vegetables</option>
              <option value="fruits">Fruits</option>
              <option value="dairy">Dairy</option>
              <option value="meat">Meat</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              placeholder="100"
              value={form.quantity}
              onChange={handleChange}
              min="1"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Unit
            </label>
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
              disabled={loading}
            >
              <option value="kg">Kilograms</option>
              <option value="tons">Tons</option>
              <option value="liters">Liters</option>
              <option value="units">Units</option>
              <option value="bags">Bags</option>
              <option value="boxes">Boxes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price per Unit (Optional)
            </label>
            <input
              type="number"
              name="price"
              placeholder="0.00"
              value={form.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
              disabled={loading}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Warehouse Location
          </label>
          <input
            type="text"
            name="location"
            value={form.location || user?.location || ""}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-gray-200 backdrop-blur-sm cursor-not-allowed"
            disabled={true} // Location is auto-set from user's warehouse
            title="Location is automatically set based on your assigned warehouse"
          />
          <p className="text-xs text-gray-500 mt-1">Items will be added to your assigned warehouse: {user?.location}</p>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            name="description"
            placeholder="Additional details about the item..."
            value={form.description}
            onChange={handleChange}
            rows="3"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
            disabled={loading}
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Added!
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Add to Inventory
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddInventoryModal;
