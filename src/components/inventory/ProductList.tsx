import React, { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import ProductForm from './ProductForm';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { productsAPI } from '../../services/api';
import { sellerAPI } from '@/services/api/sellerAPI';
import { warehouseAPI } from '@/services/api/warehouseAPI';
import { storageLocationAPI } from '@/services/api/storageLocationAPI';
import { mapProductFields } from '../../contexts/StoreContext';

const ProductList = () => {
  const { products, deleteProduct, toggleProductActive, updateProduct, setProducts, fetchProducts } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Load sellers from localStorage
  const [sellers, setSellers] = useState([]);
  
  // State
  const [warehouses, setWarehouses] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [newLotWarehouse, setNewLotWarehouse] = useState('');
  const [newLotStorageLocation, setNewLotStorageLocation] = useState('');
  
  useEffect(() => {
    sellerAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setSellers(res.data.map(s => ({ ...s, id: String(s.id) })));
      else setSellers([]);
    });
    warehouseAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setWarehouses(res.data.map(w => ({ ...w, id: String(w.id) })));
      else setWarehouses([]);
    });
    storageLocationAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setStorageLocations(res.data);
      else setStorageLocations([]);
    });
  }, []);
  
  // Stock and Lot management dialogs
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [showAddLotDialog, setShowAddLotDialog] = useState(false);
  const [stockProduct, setStockProduct] = useState<any>(null);
  const [lotProduct, setLotProduct] = useState<any>(null);
  const [addStockAmount, setAddStockAmount] = useState('');
  const [newLotCode, setNewLotCode] = useState('');
  const [newLotStock, setNewLotStock] = useState('');
  const [newLotSeller, setNewLotSeller] = useState('');
  const [newLotProductionDate, setNewLotProductionDate] = useState('');
  const [newLotExpiryDate, setNewLotExpiryDate] = useState('');
  const [newLotPaymentMethod, setNewLotPaymentMethod] = useState('cash');
  const [newLotCreditDays, setNewLotCreditDays] = useState('');
  const [newLotDueDate, setNewLotDueDate] = useState('');
  const [newLotAutoActive, setNewLotAutoActive] = useState(true);
  const [newLotMinStock, setNewLotMinStock] = useState('');
  const [newLotMaxStock, setNewLotMaxStock] = useState('');
  
  // Get unique categories from products
  const categories = ['all', ...new Set(products.map(product => product.category))];
  
  // Get products with low stock for alerts
  const lowStockProducts = products.filter(product => {
    return product.minStock && product.stock <= product.minStock && product.active;
  });
  
  // Filter products when search query, category, or product list changes
  useEffect(() => {
    let filtered = [...products];
    
    // Filter by active status
    if (!showInactiveProducts) {
      filtered = filtered.filter(product => product.active);
    }
    
    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.qrcode && product.qrcode.toLowerCase().includes(query)) ||
        (product.productCode && product.productCode.toLowerCase().includes(query))
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, showInactiveProducts, products]);
  
  // Debug log
  console.log('products from store:', products);
  console.log('filteredProducts:', filteredProducts);
  
  const handleEditProduct = (product: any) => {
    setSelectedProduct(mapProductFields(product));
    setShowAddProductDialog(true);
  };

  const handleAddStock = (product: any) => {
    setStockProduct(product);
    setAddStockAmount('');
    setShowAddStockDialog(true);
  };

  // Debug function to check product data structure
  const debugProductData = () => {
    const storedProducts = localStorage.getItem('groceryGuruProducts');
    if (storedProducts) {
      const productsData = JSON.parse(storedProducts);
      console.log('All products data:', productsData);
      if (productsData.length > 0) {
        console.log('First product structure:', productsData[0]);
        console.log('First product seller field:', productsData[0].seller);
      }
    }
  };

  const handleAddLot = (product: any) => {
    const mapped = mapProductFields(product);
    mapped.lotCode = '';
    delete mapped.id;
    setLotProduct(mapped);
    setShowAddLotDialog(true);
  };

  const confirmAddStock = async () => {
    if (!addStockAmount || parseInt(addStockAmount) <= 0) {
      toast.error('กรุณาระบุจำนวนสินค้าที่ถูกต้อง');
      return;
    }
    try {
      const newStock = stockProduct.stock + parseInt(addStockAmount);
      const response = await productsAPI.updateStock(stockProduct.id, newStock);
      console.log('updateStock response', response);
      await refreshProducts();
      toast.success(`เพิ่มสต็อก ${addStockAmount} ชิ้นให้ ${stockProduct.name}`);
    } catch (e) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสต็อก');
    }
    setShowAddStockDialog(false);
    setStockProduct(null);
    setAddStockAmount('');
  };

  // เพิ่มฟังก์ชันโหลดข้อมูลสินค้าใหม่
  const refreshProducts = async () => {
    await fetchProducts();
  };

  const confirmAddLot = async () => {
    if (!newLotCode || !/^[A-Z]\d{4}$/.test(newLotCode)) {
      toast.error('รหัส Lot ต้องเป็นตัวอักษร 1 ตัว + ตัวเลข 4 หลัก (เช่น A0001)');
      return;
    }
    if (!newLotStock || parseInt(newLotStock) <= 0) {
      toast.error('กรุณาระบุจำนวนสินค้าที่ถูกต้อง');
      return;
    }
    if (!newLotSeller) {
      toast.error('กรุณาเลือกผู้ขาย');
      return;
    }
    // Calculate due date for credit payment
    let calculatedDueDate = '';
    if (newLotPaymentMethod === 'credit' && newLotCreditDays) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(newLotCreditDays));
      calculatedDueDate = dueDate.toISOString().split('T')[0];
    }
    // เวลาสร้าง lot ใหม่ (confirmAddLot) ให้ map id → name ด้วย
    const sellerObj = sellers.find((s: any) => s.id === newLotSeller);
    const warehouseObj = warehouses.find((w: any) => w.id === newLotWarehouse);
    const storageObj = storageLocations.find((s: any) => s.id === newLotStorageLocation);
    const newProduct = {
      ...lotProduct,
      lotCode: newLotCode,
      barcode: lotProduct.productCode + newLotCode,
      stock: parseInt(newLotStock),
      sellerId: newLotSeller,
      seller: sellerObj ? sellerObj.name : '',
      warehouseId: newLotWarehouse,
      warehouseName: warehouseObj ? warehouseObj.name : '',
      storageLocationId: newLotStorageLocation,
      storageLocationName: storageObj ? storageObj.name : '',
      productionDate: newLotProductionDate && newLotProductionDate !== '' ? newLotProductionDate : null,
      expiryDate: newLotExpiryDate && newLotExpiryDate !== '' ? newLotExpiryDate : null,
      paymentMethod: newLotPaymentMethod,
      paymentMethods: {
        cash: newLotPaymentMethod === 'cash',
        check: newLotPaymentMethod === 'check',
        credit: newLotPaymentMethod === 'credit',
      },
      creditDays: newLotPaymentMethod === 'credit' && newLotCreditDays ? parseInt(newLotCreditDays) : null,
      dueDate: calculatedDueDate && calculatedDueDate !== '' ? calculatedDueDate : null,
      active: newLotAutoActive,
      minStock: newLotMinStock ? parseInt(newLotMinStock) : 0,
      maxStock: newLotMaxStock ? parseInt(newLotMaxStock) : 0,
    };
    // ลบ id และ created_at ออกจาก newProduct
    delete newProduct.id;
    delete newProduct.created_at;
    const response = await productsAPI.create(newProduct);
    if (response.success) {
    toast.success(`เพิ่ม Lot ${newLotCode} สำหรับ ${lotProduct.name}`);
      setShowAddLotDialog(false); // ปิด popup
      await refreshProducts(); // โหลดข้อมูลสินค้าใหม่
      // reset ฟอร์ม
    setLotProduct(null);
    setNewLotCode('');
    setNewLotStock('');
    setNewLotSeller('');
    setNewLotProductionDate('');
    setNewLotExpiryDate('');
    setNewLotPaymentMethod('cash');
    setNewLotCreditDays('');
    setNewLotDueDate('');
    setNewLotAutoActive(true);
    setNewLotWarehouse('');
    setNewLotStorageLocation('');
    setNewLotMinStock('');
    setNewLotMaxStock('');
    } else {
      toast.error('เกิดข้อผิดพลาดในการเพิ่ม Lot');
      // ป้องกัน products เป็น undefined หรือ object
      await refreshProducts();
    }
  };

  // getNextLotCode ใช้ products จาก store เสมอ
  const getNextLotCode = (productCode: string) => {
    const existingLots = products.filter(p => p.productCode === productCode);
    if (existingLots.length === 0) return 'A0001';
    const lotCodes = existingLots
      .map(p => p.lotCode)
      .filter(code => /^[A-Z]\d{4}$/.test(code))
      .sort();
    if (lotCodes.length === 0) return 'A0001';
    const lastCode = lotCodes[lotCodes.length - 1];
    const letter = lastCode.charAt(0);
    const number = parseInt(lastCode.slice(1), 10);
    const nextNumber = number + 1;
    if (nextNumber > 9999) {
      const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
      return `${nextLetter}0001`;
    }
    return `${letter}${nextNumber.toString().padStart(4, '0')}`;
  };
  
  // Sync dropdown values when Add Lot dialog opens and master data is loaded
  useEffect(() => {
    if (showAddLotDialog && lotProduct) {
      setNewLotSeller(lotProduct.sellerId ? String(lotProduct.sellerId) : '');
      setNewLotWarehouse(lotProduct.warehouseId ? String(lotProduct.warehouseId) : '');
      setNewLotStorageLocation(lotProduct.storageLocationId ? String(lotProduct.storageLocationId) : '');
    }
    // eslint-disable-next-line
  }, [showAddLotDialog, sellers, warehouses, storageLocations, lotProduct]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'ทุกหมวดหมู่' : category}
                </option>
              ))}
            </select>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactiveProducts}
                onChange={() => setShowInactiveProducts(!showInactiveProducts)}
                className="rounded border-gray-300 text-grocery-600 focus:ring-grocery-500"
              />
              <label htmlFor="showInactive" className="text-sm text-gray-700">
                แสดงสินค้าที่ปิดใช้งาน
              </label>
            </div>
          </div>
          
          <Button 
            onClick={() => {
              setSelectedProduct(null);
              setShowAddProductDialog(true);
            }}
            className="bg-grocery-500 hover:bg-grocery-600"
          >
            เพิ่มสินค้า
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-grocery-700">รายการสินค้า ({filteredProducts.length})</h2>
        </div>
        
        <div className="overflow-auto" style={{ maxHeight: 'calc(100% - 70px)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อสินค้า
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ราคา
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  คงเหลือ
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รหัสสินค้า
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้ขาย
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  วันหมดอายุ
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barcode
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    ไม่พบสินค้า
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className={`${!product.active ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">฿{product.price.toFixed(2)}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.stock}</div>
                      {product.minStock && product.stock <= product.minStock && (
                        <div className="text-xs text-red-600 mt-1">
                          ⚠️ ต่ำกว่าขั้นต่ำ ({product.minStock})
                        </div>
                      )}
                      {product.maxStock && product.maxStock > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          💡 แนะนำสั่ง: {Math.max(0, product.maxStock - product.stock)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">{product.productCode || '-'}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">{product.lotCode || '-'}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const sellerId = product.sellerId || product.seller;
                          const sellerObj = sellers.find((s: any) => String(s.id) === String(sellerId));
                          return sellerObj ? sellerObj.name : '-';
                        })()}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {product.expiryDate ? 
                          new Date(product.expiryDate).toLocaleDateString('th-TH') : 
                          '-'
                        }
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">{product.barcode || '-'}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          className="text-xs"
                        >
                          แก้ไข
                        </Button>
                        {product.productCode && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddStock(product)}
                              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              +สต็อก
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddLot(product)}
                              className="text-xs bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              +Lot
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleProductActive(product.id)}
                          className="text-xs"
                        >
                          {product.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) {
                              deleteProduct(product.id);
                            }
                          }}
                          className="text-xs"
                        >
                          ลบ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Stock Dialog */}
      <Dialog open={showAddStockDialog} onOpenChange={setShowAddStockDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มสต็อกสินค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">สินค้า</Label>
              <div className="p-2 bg-gray-50 rounded border">
                {stockProduct?.name} ({stockProduct?.productCode}{stockProduct?.lotCode})
              </div>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">สต็อกปัจจุบัน</Label>
              <div className="p-2 bg-gray-50 rounded border">
                {stockProduct?.stock} ชิ้น
              </div>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">เพิ่มจำนวน</Label>
              <Input
                type="number"
                value={addStockAmount}
                onChange={(e) => setAddStockAmount(e.target.value)}
                placeholder="จำนวนที่ต้องการเพิ่ม"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddStockDialog(false)}>
                ยกเลิก
              </Button>
              <Button onClick={confirmAddStock} className="bg-blue-500 hover:bg-blue-600">
                เพิ่มสต็อก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lot Dialog */}
      <Dialog open={showAddLotDialog} onOpenChange={setShowAddLotDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่ม Lot ใหม่</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={lotProduct}
            defaultLotCode={lotProduct ? getNextLotCode(lotProduct.productCode) : undefined}
            onClose={() => {
              setShowAddLotDialog(false);
              setLotProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onClose={() => {
              setShowAddProductDialog(false);
              setSelectedProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductList;
