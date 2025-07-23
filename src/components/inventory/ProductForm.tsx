import React, { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sellerAPI } from '@/services/api/sellerAPI';
import { warehouseAPI } from '@/services/api/warehouseAPI';
import { storageLocationAPI } from '@/services/api/storageLocationAPI';
import { categoryAPI, Category } from '@/services/api';

type ProductFormProps = {
  product?: any;
  onClose: () => void;
  defaultLotCode?: string;
};

// เพิ่มฟังก์ชัน map สำหรับ seller และ warehouse
function mapSellerResponse(item: any) {
  return {
    ...item,
    id: String(item.id),
    shopCode: item.shopcode || item.shopCode || '',
  };
}
function mapWarehouseResponse(item: any) {
  return {
    ...item,
    id: String(item.id),
    warehouseCode: item.warehousecode || item.warehouseCode || '',
  };
}
function mapStorageLocationResponse(item: any) {
  return {
    ...item,
    id: String(item.id),
    storageCode: item.storagecode || item.storageCode || '',
  };
}

const ProductForm = ({ product, onClose, defaultLotCode }: ProductFormProps) => {
  const { addProduct, updateProduct, products, categories, fetchCategories } = useStore();
  
  // Debug log
  console.log('ProductForm: product', product);
  
  // Load sellers, warehouses, storage locations from localStorage
  const [sellers, setSellers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  
  // เพิ่ม state เช็คว่า master data โหลดเสร็จหรือยัง
  const [mastersLoaded, setMastersLoaded] = useState(false);
  
  useEffect(() => {
    // เรียก fetchCategories ที่นี่ด้วยเพื่อให้แน่ใจว่าข้อมูลหมวดหมู่ล่าสุด
    Promise.all([
      fetchCategories(),
      sellerAPI.getAll().then(res => {
        if (res.success && Array.isArray(res.data)) setSellers(res.data.map(mapSellerResponse));
        else setSellers([]);
      }),
      warehouseAPI.getAll().then(res => {
        if (res.success && Array.isArray(res.data)) setWarehouses(res.data.map(mapWarehouseResponse));
        else setWarehouses([]);
      }),
      storageLocationAPI.getAll().then(res => {
        if (res.success && Array.isArray(res.data)) setStorageLocations(res.data.map(mapStorageLocationResponse));
        else setStorageLocations([]);
      }),
    ]).then(() => setMastersLoaded(true));
  }, []);
  
  const [formData, setFormData] = useState({
    productCode: product?.productCode || '',
    lotCode: product?.lotCode || '',
    barcode: product?.barcode || '',
    name: product?.name || '',
    price: product?.price ?? '',
    stock: product?.stock ?? '',
    categoryId: product?.categoryId ? String(product.categoryId) : '',
    sellerId: product?.sellerId || '',
    warehouseId: product?.warehouseId || '',
    warehouseName: product?.warehouseName || '',
    storageLocationId: product?.storageLocationId || '',
    storageLocationName: product?.storageLocationName || '',
    productionDate: product?.productionDate || '',
    expiryDate: product?.expiryDate || '',
    paymentMethods: product?.paymentMethods || {
      cash: true,
      check: false,
      credit: false
    },
    creditDays: product?.creditDays ?? 0,
    dueDate: product?.dueDate || '',
    active: product?.active ?? true,
    minStock: product?.minStock ?? 0,
    maxStock: product?.maxStock ?? 0,
  });
  
  const [errors, setErrors] = useState({
    productCode: '',
    lotCode: '',
    barcode: '',
    name: '',
    price: '',
    stock: '',
    categoryId: '',
    sellerId: '',
  });
  
  // useEffect sync formData กับ product เฉพาะเมื่อ product เปลี่ยนและ master data โหลดเสร็จ
  useEffect(() => {
    console.log('ProductForm: useEffect [product, mastersLoaded]', { product, mastersLoaded });
    if (!mastersLoaded) return;
    const productCode = product?.productCode || '';
    const lotCode = defaultLotCode !== undefined ? defaultLotCode : (product?.lotCode || '');
    setFormData(prev => ({
      ...prev,
      productCode,
      lotCode,
      // barcode: productCode && lotCode ? productCode + lotCode : '', // <--- remove barcode logic from here
      name: product?.name || '',
      price: product?.price ?? '',
      stock: product?.stock ?? '',
      categoryId: (product?.categoryId ?? product?.category_id) ? String(product?.categoryId ?? product?.category_id) : '',
      sellerId: product?.sellerId ? String(product.sellerId) : '',
      warehouseId: product?.warehouseId ? String(product.warehouseId) : '',
      warehouseName: product?.warehouseName || '',
      storageLocationId: product?.storageLocationId ? String(product.storageLocationId) : '',
      storageLocationName: product?.storageLocationName || '',
      productionDate: product?.productionDate || '',
      expiryDate: product?.expiryDate || '',
      paymentMethods: product?.paymentMethods || {
        cash: true,
        check: false,
        credit: false
      },
      creditDays: product?.creditDays ?? 0,
      dueDate: product?.dueDate || '',
      active: product?.active ?? true,
      minStock: product?.minStock ?? 0,
      maxStock: product?.maxStock ?? 0,
    }));
  }, [product, mastersLoaded, defaultLotCode]);

  // เพิ่ม useEffect auto-generate barcode เมื่อ productCode หรือ lotCode เปลี่ยน
  useEffect(() => {
    if (formData.productCode && formData.lotCode) {
      setFormData(prev => ({
        ...prev,
        barcode: formData.productCode + formData.lotCode
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        barcode: ''
      }));
    }
  }, [formData.productCode, formData.lotCode]);

  useEffect(() => {
    if (defaultLotCode && (!formData.lotCode || formData.lotCode === product?.lotCode)) {
      setFormData(prev => ({ ...prev, lotCode: defaultLotCode }));
    }
  }, [defaultLotCode, product]);
  
  // Auto-calculate due date when credit days changes
  useEffect(() => {
    if (formData.creditDays > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(formData.creditDays));
      setFormData(prev => ({ 
        ...prev, 
        dueDate: dueDate.toISOString().split('T')[0] 
      }));
    }
  }, [formData.creditDays]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is edited
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: '' });
    }
  };
  
  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [method]: checked
      }
    }));
  };
  
  const validate = () => {
    const newErrors = {
      productCode: '',
      lotCode: '',
      barcode: '',
      name: '',
      price: '',
      stock: '',
      categoryId: '',
      sellerId: '',
    };
    
    let isValid = true;
    
    // Validate product code format: 2 letters + 5 digits
    if (!formData.productCode.trim()) {
      newErrors.productCode = 'กรุณาระบุรหัสสินค้า';
      isValid = false;
    } else if (!/^[A-Z]{2}\d{5}$/.test(formData.productCode)) {
      newErrors.productCode = 'รหัสสินค้าต้องเป็นตัวอักษร 2 ตัว + ตัวเลข 5 หลัก (เช่น WT00001)';
      isValid = false;
    }
    
    // Validate lot code format: 1 letter + 4 digits
    if (!formData.lotCode.trim()) {
      newErrors.lotCode = 'กรุณาระบุรหัส Lot';
      isValid = false;
    } else if (!/^[A-Z]\d{4}$/.test(formData.lotCode)) {
      newErrors.lotCode = 'รหัส Lot ต้องเป็นตัวอักษร 1 ตัว + ตัวเลข 4 หลัก (เช่น A0001)';
      isValid = false;
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณาระบุชื่อสินค้า';
      isValid = false;
    }
    
    // Price validation - only if provided
    if (formData.price && formData.price <= 0) {
      newErrors.price = 'กรุณาระบุราคาที่ถูกต้อง';
      isValid = false;
    }
    
    // Stock validation - only if provided
    if (formData.stock && formData.stock < 0) {
      newErrors.stock = 'กรุณาระบุจำนวนสินค้าที่ถูกต้อง';
      isValid = false;
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = 'กรุณาเลือกหมวดหมู่';
      isValid = false;
    }
    
    // Seller validation - optional now
    // if (!formData.sellerId) {
    //   newErrors.sellerId = 'กรุณาเลือกผู้ขาย';
    //   isValid = false;
    // }

    // Check for duplicate barcode
    const duplicate = products.find(
      (p: any) => p.barcode === formData.barcode && (!product || p.id !== product.id)
    );
    if (duplicate) {
      newErrors.barcode = 'รหัสสินค้านี้ถูกใช้ไปแล้ว';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const sellerObj = sellers.find(s => s.id === formData.sellerId);
    const warehouseObj = warehouses.find(w => w.id === formData.warehouseId);
    const storageObj = storageLocations.find(s => s.id === formData.storageLocationId);
    const productData = {
      ...formData,
      price: formData.price ? parseFloat(formData.price.toString()) : 0,
      stock: formData.stock ? parseInt(formData.stock.toString(), 10) : 0,
      creditDays: parseInt(formData.creditDays.toString(), 10),
      minStock: parseInt(formData.minStock.toString(), 10),
      maxStock: parseInt(formData.maxStock.toString(), 10),
      // แปลงวันที่ว่างเป็น null
      productionDate: formData.productionDate === '' ? null : formData.productionDate,
      expiryDate: formData.expiryDate === '' ? null : formData.expiryDate,
      dueDate: formData.dueDate === '' ? null : formData.dueDate,
      seller: sellerObj ? sellerObj.name : '',
      warehouseName: warehouseObj ? warehouseObj.name : '',
      storageLocationName: storageObj ? storageObj.name : '',
    };
    
    if (!product?.id) {
      addProduct({
        ...productData,
        categoryId: productData.categoryId ? parseInt(productData.categoryId) : null,
      });
    } else {
      updateProduct({
        ...product,
        ...productData,
        categoryId: productData.categoryId ? parseInt(productData.categoryId) : null,
      });
    }
    
    // ส่ง event เพื่อรีเฟรชข้อมูลในหน้าอื่นๆ
    window.dispatchEvent(new CustomEvent('refreshProducts'));
    onClose();
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Product Code and Lot Code at the top */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสสินค้า * (เช่น WT00001)
          </Label>
          <Input
            type="text"
            name="productCode"
            value={formData.productCode}
            onChange={handleChange}
            placeholder="WT00001"
            className={`w-full ${errors.productCode ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.productCode && <p className="text-red-500 text-xs mt-1">{errors.productCode}</p>}
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            รหัส Lot * (เช่น A0001)
          </Label>
          <Input
            type="text"
            name="lotCode"
            value={formData.lotCode}
            onChange={handleChange}
            placeholder="A0001"
            className={`w-full ${errors.lotCode ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.lotCode && <p className="text-red-500 text-xs mt-1">{errors.lotCode}</p>}
        </div>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          Barcode (อัตโนมัติ)
        </Label>
        <Input
          type="text"
          name="barcode"
          value={formData.barcode}
          readOnly
          disabled
          className="w-full bg-gray-100 border-gray-300"
        />
        {errors.barcode && <p className="text-red-500 text-xs mt-1">{errors.barcode}</p>}
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อสินค้า *
        </Label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            ราคา (บาท)
          </Label>
          <Input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            min="0"
            className={`w-full ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนคงเหลือ
          </Label>
          <Input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            min="0"
            className={`w-full ${errors.stock ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนขั้นต่ำ (แจ้งเตือน)
          </Label>
          <Input
            type="number"
            name="minStock"
            value={formData.minStock}
            onChange={handleChange}
            min="0"
            placeholder="จำนวนขั้นต่ำที่จะแจ้งเตือน"
            className="w-full border-gray-300"
          />
          <p className="text-xs text-gray-500 mt-1">เมื่อสินค้าน้อยกว่าจำนวนนี้จะแจ้งเตือน</p>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนสูงสุด (แนะนำการสั่งซื้อ)
          </Label>
          <Input
            type="number"
            name="maxStock"
            value={formData.maxStock}
            onChange={handleChange}
            min="0"
            placeholder="จำนวนสูงสุดที่แนะนำ"
            className="w-full border-gray-300"
          />
          <p className="text-xs text-gray-500 mt-1">จำนวนที่แนะนำให้สั่งซื้อเพิ่ม</p>
        </div>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          หมวดหมู่ *
        </Label>
        <Select value={formData.categoryId || ''} onValueChange={(value) => setFormData({...formData, categoryId: value})}>
          <SelectTrigger className={`w-full ${errors.categoryId ? 'border-red-500' : 'border-gray-300'}`}>
            <SelectValue placeholder="เลือกหมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            {categories.length > 0 ? (
              categories.map((cat: Category) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>ไม่มีข้อมูลหมวดหมู่</SelectItem>
            )}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          ผู้ขาย
        </Label>
        <Select value={formData.sellerId || "none"} onValueChange={(value) => setFormData({...formData, sellerId: value === "none" ? "" : value})}>
          <SelectTrigger className={`w-full ${errors.sellerId ? 'border-red-500' : 'border-gray-300'}`}>
            <SelectValue placeholder="เลือกผู้ขาย" />
          </SelectTrigger>
          <SelectContent>
            {sellers.length > 0 ? (
              sellers.map((seller: any) => (
                <SelectItem key={seller.id} value={String(seller.id)}>
                  {seller.shopCode ? `${seller.shopCode} - ${seller.name}` : seller.name}
              </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>ไม่มีข้อมูลผู้ขาย</SelectItem>
            )}
          </SelectContent>
        </Select>
        {sellers.length === 0 && (
          <p className="text-xs text-orange-600 mt-1">
            ยังไม่มีข้อมูลผู้ขาย กรุณาไปที่{' '}
            <a 
              href="/seller-info" 
              className="text-blue-600 hover:underline"
              onClick={e => { e.preventDefault(); window.location.href = '/seller-info'; }}
            >
              ตั้งค่าผู้ขาย
            </a>
            {' '}เพื่อเพิ่มข้อมูลผู้ขาย
          </p>
        )}
        {errors.sellerId && <p className="text-red-500 text-xs mt-1">{errors.sellerId}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">คลังสินค้า</Label>
          <Select value={formData.warehouseId || "none"} onValueChange={value => {
            const warehouse = warehouses.find((w: any) => String(w.id) === value);
            setFormData(prev => ({ ...prev, warehouseId: value === "none" ? "" : value, warehouseName: warehouse ? warehouse.name : '' }));
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="เลือกคลังสินค้า" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.length > 0 ? (
                warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.warehouseCode ? `${w.warehouseCode} - ${w.name}` : w.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>ไม่มีข้อมูลคลังสินค้า</SelectItem>
              )}
            </SelectContent>
          </Select>
          {warehouses.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">
              ยังไม่มีข้อมูลคลังสินค้า กรุณาไปที่{' '}
              <a 
                href="/warehouse-settings" 
                className="text-blue-600 hover:underline"
                onClick={e => { e.preventDefault(); window.location.href = '/warehouse-settings'; }}
              >
                ตั้งค่าคลังสินค้า
              </a>
              {' '}เพื่อเพิ่มข้อมูลคลังสินค้า
            </p>
          )}
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">สถานที่เก็บ</Label>
          <Select value={formData.storageLocationId || "none"} onValueChange={value => {
            const storage = storageLocations.find((s: any) => String(s.id) === value);
            setFormData(prev => ({ ...prev, storageLocationId: value === "none" ? "" : value, storageLocationName: storage ? storage.name : '' }));
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="เลือกสถานที่เก็บ" />
            </SelectTrigger>
            <SelectContent>
              {storageLocations.length > 0 ? (
                storageLocations.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.storageCode ? `${s.storageCode} - ${s.name}` : s.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>ไม่มีข้อมูลสถานที่เก็บ</SelectItem>
              )}
            </SelectContent>
          </Select>
          {storageLocations.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">
              ยังไม่มีข้อมูลสถานที่เก็บ กรุณาไปที่{' '}
              <a 
                href="/storage-location-settings" 
                className="text-blue-600 hover:underline"
                onClick={e => { e.preventDefault(); window.location.href = '/storage-location-settings'; }}
              >
                ตั้งค่าสถานที่เก็บ
              </a>
              {' '}เพื่อเพิ่มข้อมูลสถานที่เก็บ
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่ผลิต
          </Label>
          <Input
            type="date"
            name="productionDate"
            value={formData.productionDate}
            onChange={handleChange}
            className="w-full border-gray-300"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            วันหมดอายุ
          </Label>
          <Input
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            className="w-full border-gray-300"
          />
        </div>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          วิธีการชำระเงิน
        </Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cash"
              checked={formData.paymentMethods.cash}
              onCheckedChange={(checked) => handlePaymentMethodChange('cash', checked as boolean)}
            />
            <Label htmlFor="cash">เงินสด</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="check"
              checked={formData.paymentMethods.check}
              onCheckedChange={(checked) => handlePaymentMethodChange('check', checked as boolean)}
            />
            <Label htmlFor="check">เช็ค</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="credit"
              checked={formData.paymentMethods.credit}
              onCheckedChange={(checked) => handlePaymentMethodChange('credit', checked as boolean)}
            />
            <Label htmlFor="credit">เครดิต</Label>
          </div>
        </div>
      </div>
      
      {formData.paymentMethods.credit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              จำนวนวันเครดิต
            </Label>
            <Input
              type="number"
              name="creditDays"
              value={formData.creditDays}
              onChange={handleChange}
              min="0"
              className="w-full border-gray-300"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              วันครบกำหนด (อัตโนมัติ)
            </Label>
            <Input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              readOnly
              disabled
              className="w-full bg-gray-100 border-gray-300"
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="active"
          name="active"
          checked={formData.active}
          onCheckedChange={(checked) => setFormData({...formData, active: checked as boolean})}
        />
        <Label htmlFor="active">เปิดใช้งาน</Label>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit" className="bg-grocery-500 hover:bg-grocery-600">
          {product ? 'อัพเดท' : 'เพิ่มสินค้า'}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
