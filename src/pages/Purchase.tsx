import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { ShoppingCart, Plus, Search, X } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import PurchaseOrderDialog from '../components/inventory/PurchaseOrderDialog';

const Purchase = () => {
  const { products, addLog } = useStore();
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPurchaseOrderDialog, setShowPurchaseOrderDialog] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false); // <--- เพิ่ม state

  // ปรับ filter ตามตัวเลือก showAllProducts
  const availableProducts = products.filter(product => 
    product.active && (showAllProducts ? true : product.stock === 0)
  );

  // Filter products based on search and category
  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.productCode && product.productCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.barcode && product.barcode.toString().includes(searchQuery));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(availableProducts.map(p => p.category).filter(Boolean)))];

  const handleAddToPurchase = (product: any) => {
    // Check if product is already in the list
    if (selectedProducts.find(p => p.id === product.id)) {
      toast.error('สินค้านี้อยู่ในรายการแล้ว');
      return;
    }

    // Add product to purchase list with recommended quantity
    const productWithQuantity = {
      ...product,
      currentQuantity: product.maxStock || 10, // Use maxStock as recommended quantity
      originalQuantity: product.maxStock || 10,
      currentPrice: product.price,
      originalPrice: product.price,
      totalPrice: product.price * (product.maxStock || 10),
      priceDifference: 0
    };

    setSelectedProducts(prev => [...prev, productWithQuantity]);
    toast.success(`เพิ่ม ${product.name} ลงในรายการขอซื้อ`);
  };

  const handleRemoveFromPurchase = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    toast.success('ลบสินค้าออกจากรายการขอซื้อ');
  };

  const handleCreatePurchaseOrder = () => {
    console.log('Creating purchase order from Purchase page');
    if (selectedProducts.length === 0) {
      toast.error('ไม่มีสินค้าในรายการขอซื้อ');
      return;
    }
    setShowPurchaseOrderDialog(true);
  };

  const getTotalAmount = () => {
    return selectedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดซื้อสินค้าใหม่</h1>
          <p className="text-gray-600 mt-2">เลือกสินค้าที่ไม่มีในสต๊อกเพื่อสร้างใบขอซื้อ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              สินค้าที่ไม่มีในสต๊อก ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">ค้นหาสินค้า</Label>
                <Input
                  id="search"
                  placeholder="ค้นหาด้วยชื่อ, รหัส, หรือบาร์โค้ด..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="category">หมวดหมู่</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'ทั้งหมด' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* เพิ่มตัวเลือก filter แสดงสินค้าทั้งหมด/ไม่มีในสต๊อก */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showAllProducts"
                  checked={showAllProducts}
                  onChange={e => setShowAllProducts(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="showAllProducts" className="cursor-pointer select-none">
                  แสดงรหัสสินค้าทั้งหมด
                </Label>
              </div>
            </div>

            {/* Product List */}
            <div className="max-h-[500px] overflow-y-auto space-y-3">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>ไม่พบสินค้าที่ไม่มีในสต๊อก</p>
                  <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>รหัส: {product.productCode || '-'}</p>
                          <p>บาร์โค้ด: {product.barcode || '-'}</p>
                          <p>หมวดหมู่: {product.category || '-'}</p>
                          <p>ราคา: ฿{product.price.toFixed(2)}</p>
                          <p>ผู้ขาย: {product.seller || '-'}</p>
                          <p>จำนวนที่แนะนำ: {product.maxStock || 10} ชิ้น</p>
                        </div>
                        <div className="mt-2">
                          <Badge variant="destructive">ไม่มีในสต็อก</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddToPurchase(product)}
                        className="ml-4"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่ม
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Purchase List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                รายการขอซื้อ ({selectedProducts.length})
              </span>
              {selectedProducts.length > 0 && (
                <Button onClick={handleCreatePurchaseOrder} className="bg-green-500 hover:bg-green-600">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  สร้างใบขอซื้อ
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>ยังไม่มีสินค้าในรายการขอซื้อ</p>
                <p className="text-sm">เลือกสินค้าจากรายการด้านซ้าย</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>รหัส: {product.productCode || '-'}</p>
                          <p>ผู้ขาย: {product.seller || '-'}</p>
                          <p>ราคา: ฿{product.currentPrice.toFixed(2)}</p>
                          <p>จำนวน: {product.currentQuantity} ชิ้น</p>
                          <p>ราคารวม: ฿{product.totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromPurchase(product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">ราคารวมทั้งหมด:</span>
                    <span className="text-lg font-bold text-green-600">
                      ฿{getTotalAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PurchaseOrderDialog
        open={showPurchaseOrderDialog}
        onClose={() => setShowPurchaseOrderDialog(false)}
        products={selectedProducts}
      />
    </div>
  );
};

export default Purchase; 