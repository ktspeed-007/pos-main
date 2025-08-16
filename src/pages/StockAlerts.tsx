import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, TrendingUp, Search, ShoppingCart, FileText, Trash } from 'lucide-react';
import PurchaseOrderDialog from '../components/inventory/PurchaseOrderDialog';
import { purchaseOrderAPI } from '../services/api/purchaseOrderAPI';
import { Category } from '@/services/api';

const StockAlerts = () => {
  const { products, categories, fetchProducts } = useStore();
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [filteredLowStockProducts, setFilteredLowStockProducts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('stock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showPurchaseOrderDialog, setShowPurchaseOrderDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [stockTypeFilter, setStockTypeFilter] = useState<'all' | 'low' | 'out'>('all');
  const [allStockProducts, setAllStockProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  // ดึง PO จาก backend
  useEffect(() => {
    const fetchPOs = async () => {
      const res = await purchaseOrderAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setPurchaseOrders(res.data);
      } else {
        setPurchaseOrders([]);
      }
    };
    fetchPOs();
  }, []);

  // ฟังก์ชันรีเฟรชข้อมูล PO
  const refreshPurchaseOrders = async () => {
    const res = await purchaseOrderAPI.getAll();
    if (res.success && Array.isArray(res.data)) {
      setPurchaseOrders(res.data);
    } else {
      setPurchaseOrders([]);
    }
  };

  // เพิ่ม event listener สำหรับรีเฟรชข้อมูลสินค้า
  useEffect(() => {
    const handleRefreshProducts = () => {
      fetchProducts();
    };

    window.addEventListener('refreshProducts', handleRefreshProducts);
    
    return () => {
      window.removeEventListener('refreshProducts', handleRefreshProducts);
    };
  }, [fetchProducts]);

  useEffect(() => {
    // Filter products with low stock
    const lowStock = products.filter(product => {
      return product.minStock && product.stock <= product.minStock && product.active && product.stock > 0;
    });

    // Filter products that are out of stock
    const outOfStock = products.filter(product => {
      return product.stock === 0 && product.active;
    });

    setLowStockProducts(lowStock);
    setOutOfStockProducts(outOfStock);
    
    // Combine all stock products
    const combined = [...lowStock, ...outOfStock];
    setAllStockProducts(combined);
  }, [products]);

  // Filter and sort all stock products
  useEffect(() => {
    let filtered = [...allStockProducts];
    
    // Filter by stock type
    if (stockTypeFilter === 'low') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (stockTypeFilter === 'out') {
      filtered = filtered.filter(product => product.stock === 0);
    }
    
    // Filter by category
    if (selectedCategoryId !== 'all') {
      filtered = filtered.filter(product => String(product.categoryId) === selectedCategoryId);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.productCode && product.productCode.toLowerCase().includes(query)) ||
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.categoryName && product.categoryName.toLowerCase().includes(query))
      );
    }
    
    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        case 'minStock':
          aValue = a.minStock;
          bValue = b.minStock;
          break;
        case 'recommended':
          aValue = calculateRecommendedOrder(a);
          bValue = calculateRecommendedOrder(b);
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'category':
          aValue = (a.categoryName || '').toLowerCase();
          bValue = (b.categoryName || '').toLowerCase();
          break;
        case 'totalPrice':
          aValue = calculateTotalPrice(a);
          bValue = calculateTotalPrice(b);
          break;
        default:
          aValue = a.stock;
          bValue = b.stock;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredLowStockProducts(filtered);
  }, [allStockProducts, stockTypeFilter, selectedCategoryId, searchQuery, sortBy, sortOrder]);

  const calculateRecommendedOrder = (product: any) => {
    if (!product.maxStock || product.maxStock <= 0) {
      return product.minStock ? Math.max(10, product.minStock * 2) : 10;
    }
    return Math.max(0, product.maxStock - product.stock);
  };

  const getStockStatus = (product: any) => {
    if (product.stock === 0) return 'หมดสต็อก';
    if (product.minStock && product.stock <= product.minStock) return 'สต็อกต่ำ';
    return 'ปกติ';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'destructive';
      case 'low-stock': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'หมดสต็อก';
      case 'low-stock': return 'สต็อกต่ำ';
      default: return 'ปกติ';
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleCreatePurchaseOrder = () => {
    setSelectedProducts([
      ...filteredLowStockProducts,
      ...outOfStockProducts
    ].map(product => ({
      ...product,
      originalPrice: product.price,
      originalQuantity: product.stock,
      currentQuantity: calculateRecommendedOrder(product), // ใช้จำนวนที่ระบบแนะนำสั่งซื้อ
      sellerId: product.sellerId || '',
      sellerName: product.seller || '',
      paymentMethod: 'cash',
    })));
    setShowPurchaseOrderDialog(true);
  };

  const handleCreateSinglePurchaseOrder = (product: any) => {
    setSelectedProducts([
      {
        ...product,
        originalPrice: product.price,
        currentPrice: product.price,
        originalQuantity: product.stock,
        currentQuantity: calculateRecommendedOrder(product), // ใช้จำนวนที่ระบบแนะนำสั่งซื้อ
        sellerId: product.sellerId || '',
        sellerName: product.seller || '',
        paymentMethod: 'cash',
      }
    ]);
    setShowPurchaseOrderDialog(true);
  };

  const calculateTotalPrice = (product: any) => {
    const recommended = calculateRecommendedOrder(product);
    return recommended * product.price;
  };

  // ฟังก์ชันหา PO ล่าสุดของสินค้าแต่ละตัว (เช็คตาม productId + lotCode)
  const getLatestPOStatus = (productId: string, lotCode: string) => {
    // ใช้ purchaseOrders จาก backend
    const relatedPOs = purchaseOrders.filter((po: any) => 
      Array.isArray(po.items) && po.items.some((item: any) => 
        (item.productId === productId || item.id === productId || item.product_id === productId) && 
        (item.lotCode === lotCode || item.lotcode === lotCode)
      )
    );
    
    if (relatedPOs.length === 0) return 'draft';
    // ถ้ามี PO ที่ received หรือ partial_received ให้แสดงสถานะนั้นก่อน
    const receivedPO = relatedPOs.find((po: any) => po.status === 'received' || po.status === 'partial_received');
    if (receivedPO) return receivedPO.status;
    // เอา PO ล่าสุด (createdAt มากสุด)
    const latestPO = relatedPOs.sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime())[0];
    return latestPO.status;
  };

  // ฟังก์ชันแสดงสถานะ PO (เพิ่ม received และ partial_received)
  const getPOStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { text: 'ยังไม่ขอซื้อ', variant: 'secondary' as const },
      pending: { text: 'รออนุมัติ', variant: 'default' as const },
      approved: { text: 'อนุมัติแล้ว', variant: 'default' as const },
      cancelled: { text: 'ยกเลิก', variant: 'destructive' as const },
      received: { text: 'รับของเข้าแล้ว', variant: 'default' as const },
      partial_received: { text: 'รับบางส่วน', variant: 'secondary' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

  // ฟังก์ชันเช็คว่าปุ่ม "ขอซื้อ" ควรเปิดหรือปิดการทำงาน
  const canCreatePurchaseOrder = (productId: string, lotCode: string) => {
    const status = getLatestPOStatus(productId, lotCode);
    // เปิดการทำงานเฉพาะสถานะ 'draft' (ยังไม่ขอซื้อ) และ 'cancelled' (ยกเลิก)
    // ปิดการทำงานเมื่อ 'received' (รับของแล้ว) หรือ 'partial_received' (รับบางส่วน)
    return status === 'draft' || status === 'cancelled';
  };

  // ฟังก์ชันดึงเลขที่ใบขอซื้อล่าสุดของสินค้า
  const getLatestPONumber = (productId: string, lotCode: string) => {
    const relatedPOs = purchaseOrders.filter((po: any) => 
      Array.isArray(po.items) && po.items.some((item: any) => 
        (item.productId === productId || item.id === productId || item.product_id === productId) && 
        (item.lotCode === lotCode || item.lotcode === lotCode)
      )
    );
    
    if (relatedPOs.length === 0) return null;
    
    // เรียงตาม createdAt ล่าสุด
    const sortedPOs = relatedPOs.sort((a: any, b: any) => 
      new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
    );
    
    const latestPO = sortedPOs[0];
    return (latestPO as any).po_number || (latestPO as any).poNumber || latestPO.id || null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {/* ลบ heading และ subtext ด้านบนสุด */}
        </div>
        <div className="flex gap-2">
          
        </div>
      </div>

      {/* Low Stock Products */}
      {allStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <TrendingUp className="h-5 w-5" />
              สินค้าสต็อกต่ำและหมดสต็อก ({allStockProducts.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="w-full md:w-1/4">
                <Select value={stockTypeFilter} onValueChange={(value: 'all' | 'low' | 'out') => setStockTypeFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="low">สต็อกต่ำ</SelectItem>
                    <SelectItem value="out">หมดสต็อก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/4">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-2/4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="ค้นหาสินค้า..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoComplete="off"
                  />
                </div>
                {(selectedCategoryId !== 'all' || searchQuery || stockTypeFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedCategoryId('all');
                      setSearchQuery('');
                      setStockTypeFilter('all');
                    }}
                  >
                    ล้าง
                  </Button>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-sm text-orange-600 mb-1">สินค้าสต็อกต่ำ</h3>
                <p className="text-2xl font-bold text-orange-700">{lowStockProducts.length} รายการ</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-sm text-red-600 mb-1">สินค้าหมดสต็อก</h3>
                <p className="text-2xl font-bold text-red-700">{outOfStockProducts.length} รายการ</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm text-blue-600 mb-1">จำนวนที่แนะนำสั่งซื้อ</h3>
                <p className="text-2xl font-bold text-blue-700">
                  {filteredLowStockProducts.reduce((sum, product) => sum + calculateRecommendedOrder(product), 0)} ชิ้น
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('name')}
                    >
                      ชื่อสินค้า {getSortIcon('name')}
                    </TableHead>
                    <TableHead>รหัสสินค้า</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('category')}
                    >
                      หมวดหมู่ {getSortIcon('category')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('stock')}
                    >
                      คงเหลือ {getSortIcon('stock')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('minStock')}
                    >
                      ขั้นต่ำ {getSortIcon('minStock')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('recommended')}
                    >
                      แนะนำสั่งซื้อ {getSortIcon('recommended')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('price')}
                    >
                      ราคา {getSortIcon('price')}
                    </TableHead>
                    <TableHead>ผู้ขาย</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('totalPrice')}
                    >
                      ราคารวม {getSortIcon('totalPrice')}
                    </TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>เลขที่ใบขอซื้อ</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLowStockProducts.length > 0 ? (
                    filteredLowStockProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-orange-50">
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{product.productCode || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{product.lotCode || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{product.categoryName || '-'}</TableCell>
                        <TableCell>
                          <span className="font-medium text-orange-600">{product.stock}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{product.minStock}</TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">
                            {calculateRecommendedOrder(product)} ชิ้น
                          </span>
                          {product.maxStock && (
                            <div className="text-xs text-gray-500">
                              เป้าหมาย: {product.maxStock}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">฿{product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{product.seller || '-'}</TableCell>
                        <TableCell className="font-medium text-blue-600">
                          ฿{calculateTotalPrice(product).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getPOStatusBadge(getLatestPOStatus(product.id, product.lotCode))}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {getLatestPONumber(product.id, product.lotCode) || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCreateSinglePurchaseOrder(product)}
                            disabled={!canCreatePurchaseOrder(product.id, product.lotCode)}
                            className={`${
                              canCreatePurchaseOrder(product.id, product.lotCode)
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            ขอซื้อ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-6">
                        {searchQuery || selectedCategoryId !== 'all' || stockTypeFilter !== 'all' 
                          ? 'ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา' 
                          : 'ไม่มีสินค้าสต็อกต่ำหรือหมดสต็อก'
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Alerts */}
      {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ไม่มีสินค้าที่ต้องแจ้งเตือนในขณะนี้ สินค้าทั้งหมดมีสต็อกเพียงพอ
          </AlertDescription>
        </Alert>
      )}

      {/* Purchase Order Dialog */}
      <PurchaseOrderDialog
        open={showPurchaseOrderDialog}
        onClose={() => {
          setShowPurchaseOrderDialog(false);
          // รีเฟรชข้อมูล PO หลังปิด dialog
          refreshPurchaseOrders();
        }}
        products={selectedProducts}
      />
    </div>
  );
};

export default StockAlerts; 