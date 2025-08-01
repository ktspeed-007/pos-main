import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toast } from 'sonner';
import { Printer, Save, CheckCircle, X, Check } from 'lucide-react';
import { sellerAPI } from '@/services/api/sellerAPI';
import { warehouseAPI } from '@/services/api/warehouseAPI';
import { storageLocationAPI } from '@/services/api/storageLocationAPI';
import { purchaseOrderAPI } from '@/services/api/purchaseOrderAPI';

type PurchaseOrderItem = {
  id: string;
  productId: string;
  name: string;
  productCode: string;
  lotCode: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  originalQuantity: number;
  currentQuantity: number;
  sellerId: string;
  sellerName: string;
  paymentMethod: string;
  totalPrice: number;
  priceDifference: number;
  // เพิ่ม field สำหรับคลังและที่เก็บ
  warehouseId?: string;
  warehouseName?: string;
  storageLocationId?: string;
  storageLocationName?: string;
};

type PurchaseOrder = {
  id: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
};

type PurchaseOrderDialogProps = {
  open: boolean;
  onClose: () => void;
  products: any[];
};

const PurchaseOrderDialog = ({ open, onClose, products }: PurchaseOrderDialogProps) => {
  const { user, isAdmin, login } = useAuth();
  const { addLog } = useStore();
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending' | 'approved' | 'cancelled'>('draft');
  const [poNumber, setPoNumber] = useState('');

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [mastersLoaded, setMastersLoaded] = useState(false);
  const [latestPONumber, setLatestPONumber] = useState<string>('');

  // โหลด master data พร้อมกัน
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      sellerAPI.getAll().then(res => isMounted && setSellers(res.success && Array.isArray(res.data) ? res.data : [])),
      warehouseAPI.getAll().then(res => isMounted && setWarehouses(res.success && Array.isArray(res.data) ? res.data : [])),
      storageLocationAPI.getAll().then(res => isMounted && setStorageLocations(res.success && Array.isArray(res.data) ? res.data : [])),
    ]).then(() => { if (isMounted) setMastersLoaded(true); });
    return () => { isMounted = false; };
  }, []);

  // ดึงหมายเลขใบขอซื้อล่าสุด
  useEffect(() => {
    const fetchLatestPO = async () => {
      try {
        console.log('Fetching latest PO...');
        const res = await purchaseOrderAPI.getAll();
        console.log('PO API response:', res);
        
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // เรียงตาม createdAt ล่าสุด
          const sortedPOs = res.data.sort((a: any, b: any) => 
            new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
          );
          const latestPO = sortedPOs[0];
          console.log('Latest PO:', latestPO);
          
          // ลองหลาย field ที่อาจเป็นหมายเลข PO
          const poNumber = (latestPO as any).po_number || 
                          (latestPO as any).poNumber || 
                          (latestPO as any).id ||
                          (latestPO as any).number;
          
          if (poNumber) {
            console.log('Setting latest PO number:', poNumber);
            setLatestPONumber(poNumber);
          } else {
            console.log('No PO number found in latest PO');
          }
        } else {
          console.log('No PO data found or API failed');
        }
      } catch (error) {
        console.error('Error fetching latest PO:', error);
      }
    };
    
    if (open) {
      fetchLatestPO();
    }
  }, [open]);

  // สร้าง orderItems เฉพาะเมื่อ master data โหลดครบ
  useEffect(() => {
    if (open && products.length > 0 && purchaseOrder === null && orderItems.length === 0 && mastersLoaded) {
      // ไม่ต้อง generate PO number ฝั่ง frontend
      // setPoNumber(""); // ไม่ต้อง set ที่นี่ ให้ set เฉพาะหลังบันทึกสำเร็จ

      // Initialize order items (copy id & name for warehouse/storage)
      const items = products.map(product => {
        const sellerObj = sellers.find(s => s.id === product.sellerId);
        const warehouseObj = warehouses.find(w => w.id === product.warehouseId);
        const storageObj = storageLocations.find(s => s.id === product.storageLocationId);
        return {
          ...product,
          sellerName: sellerObj ? sellerObj.name : '',
          warehouseId: product.warehouseId || (warehouseObj ? warehouseObj.id : ''),
          warehouseName: product.warehouseName || (warehouseObj ? warehouseObj.name : ''),
          storageLocationId: product.storageLocationId || (storageObj ? storageObj.id : ''),
          storageLocationName: product.storageLocationName || (storageObj ? storageObj.name : ''),
        };
      });
      // Calculate totals
      const updatedItems = items.map(item => ({
        ...item,
        totalPrice: item.currentPrice * item.currentQuantity,
        priceDifference: (item.currentPrice - item.originalPrice) * item.currentQuantity
      }));
      setOrderItems(updatedItems);
      // Create purchase order object
      const newPurchaseOrder: PurchaseOrder = {
        id: '', // ยังไม่มีเลขที่จริง
        items: updatedItems,
        totalAmount: updatedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        status: 'draft',
        createdBy: user?.username || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: ''
      };
      setPurchaseOrder(newPurchaseOrder);
      addLog('purchase_order', user?.username || 'unknown', 'Created purchase order');
    }
  }, [open, products, user, addLog, purchaseOrder, orderItems.length, mastersLoaded, sellers, warehouses, storageLocations]);

  // Reset state เมื่อ dialog ถูกปิด
  useEffect(() => {
    if (!open) {
      setPurchaseOrder(null);
      setOrderItems([]);
      setStatus('draft');
      setNotes('');
      setPoNumber(''); // reset poNumber ทุกครั้งที่ปิด dialog
    }
  }, [open]);

  // Auto-save เมื่อ dialog ถูกปิด ถ้า status เป็น draft
  useEffect(() => {
    if (!open && purchaseOrder && purchaseOrder.status === 'draft') {
      savePurchaseOrderToStorage(purchaseOrder);
    }
  }, [open]);

  const updateItem = (itemId: string, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate totals
        updatedItem.totalPrice = updatedItem.currentPrice * updatedItem.currentQuantity;
        updatedItem.priceDifference = (updatedItem.currentPrice - updatedItem.originalPrice) * updatedItem.currentQuantity;
        
        return updatedItem;
      }
      return item;
    });

    setOrderItems(updatedItems);
    
    // Update purchase order
    if (purchaseOrder) {
      const updatedPurchaseOrder = {
        ...purchaseOrder,
        items: updatedItems,
        totalAmount: updatedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        updatedAt: new Date().toISOString()
      };
      setPurchaseOrder(updatedPurchaseOrder);
    }
  };

  // เพิ่มฟังก์ชัน updateItemFields สำหรับอัปเดตหลาย field พร้อมกัน
  const updateItemFields = (itemId: string, fields: Partial<PurchaseOrderItem>) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...fields };
        // Recalculate totals
        updatedItem.totalPrice = updatedItem.currentPrice * updatedItem.currentQuantity;
        updatedItem.priceDifference = (updatedItem.currentPrice - updatedItem.originalPrice) * updatedItem.currentQuantity;
        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
    if (purchaseOrder) {
      const updatedPurchaseOrder = {
        ...purchaseOrder,
        items: updatedItems,
        totalAmount: updatedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        updatedAt: new Date().toISOString()
      };
      setPurchaseOrder(updatedPurchaseOrder);
    }
  };

  const updateSeller = (itemId: string, sellerId: string, sellerName: string) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, sellerId, sellerName };
        // Recalculate totals
        updatedItem.totalPrice = updatedItem.currentPrice * updatedItem.currentQuantity;
        updatedItem.priceDifference = (updatedItem.currentPrice - updatedItem.originalPrice) * updatedItem.currentQuantity;
        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
    if (purchaseOrder) {
      const updatedPurchaseOrder = {
        ...purchaseOrder,
        items: updatedItems,
        totalAmount: updatedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        updatedAt: new Date().toISOString()
      };
      setPurchaseOrder(updatedPurchaseOrder);
    }
  };

  const handleSave = async () => {
    setStatus('pending');
    if (purchaseOrder) {
      // ไม่ต้องส่ง id ให้ backend generate id เอง
      const { id, totalAmount, createdAt, updatedAt, ...rest } = purchaseOrder;
      const payload = { 
        ...rest, 
        total: totalAmount, 
        status: 'pending' as const, 
        notes,
        createdBy: user?.username || 'unknown', // ส่งชื่อผู้สร้างไปกับ payload
      };
      const res = await purchaseOrderAPI.create(payload);
      if (res.success && res.data) {
        const { status, createdBy, notes, ...restData } = res.data;
        setPurchaseOrder({
          ...restData,
          totalAmount: Number(res.data.total ?? 0),
          createdAt: res.data.created_at,
          updatedAt: res.data.updated_at,
          status: (['draft','pending','approved','cancelled'].includes(status) ? status : 'draft') as 'draft' | 'pending' | 'approved' | 'cancelled',
          createdBy: createdBy || user?.username || 'unknown',
          notes: notes ?? '',
        });
        setPoNumber(res.data.id); // อัปเดตเลขที่ใบขอซื้อใน Dialog ให้ตรงกับ backend
        toast.success('บันทึกใบขอซื้อเรียบร้อยแล้ว');
        onClose();
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกใบขอซื้อ');
      }
    }
    addLog('purchase_order', user?.username || 'unknown', `Saved purchase order: ${poNumber}`);
  };

  const handleApprove = async () => {
    setStatus('approved');
    if (purchaseOrder) {
      const { totalAmount, createdAt, updatedAt, ...rest } = purchaseOrder;
      const payload = { ...rest, total: totalAmount, status: 'approved' as const, notes };
      const res = await purchaseOrderAPI.update(purchaseOrder.id, payload);
      if (res.success && res.data) {
        const { status, createdBy, notes, ...restData } = res.data;
        setPurchaseOrder({
          ...restData,
          totalAmount: Number(res.data.total ?? 0),
          createdAt: res.data.created_at,
          updatedAt: res.data.updated_at,
          status: (['draft','pending','approved','cancelled'].includes(status) ? status : 'draft') as 'draft' | 'pending' | 'approved' | 'cancelled',
          createdBy: createdBy || user?.username || 'unknown',
          notes: notes ?? '',
        });
        toast.success('อนุมัติใบขอซื้อเรียบร้อยแล้ว');
        onClose();
      } else {
        toast.error('เกิดข้อผิดพลาดในการอนุมัติใบขอซื้อ');
      }
    }
    addLog('purchase_order', user?.username || 'unknown', `Approved purchase order: ${poNumber}`);
  };

  const handleCancel = async () => {
    setStatus('cancelled');
    if (purchaseOrder) {
      const { totalAmount, createdAt, updatedAt, ...rest } = purchaseOrder;
      const payload = { ...rest, total: totalAmount, status: 'cancelled' as const, notes };
      const res = await purchaseOrderAPI.update(purchaseOrder.id, payload);
      if (res.success && res.data) {
        const { status, createdBy, notes, ...restData } = res.data;
        setPurchaseOrder({
          ...restData,
          totalAmount: Number(res.data.total ?? 0),
          createdAt: res.data.created_at,
          updatedAt: res.data.updated_at,
          status: (['draft','pending','approved','cancelled'].includes(status) ? status : 'draft') as 'draft' | 'pending' | 'approved' | 'cancelled',
          createdBy: createdBy || user?.username || 'unknown',
          notes: notes ?? '',
        });
        toast.success('ยกเลิกใบขอซื้อเรียบร้อยแล้ว');
        onClose();
      } else {
        toast.error('เกิดข้อผิดพลาดในการยกเลิกใบขอซื้อ');
      }
    }
    addLog('purchase_order', user?.username || 'unknown', `Cancelled purchase order: ${poNumber}`);
  };





  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    // รวมชื่อผู้ขายทั้งหมด (ไม่ซ้ำ)
    const uniqueSellers = Array.from(new Set(orderItems.map(item => item.sellerName).filter(Boolean)));
    const sellerDisplay = uniqueSellers.length > 0 ? uniqueSellers.join(', ') : '-';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบขอซื้อสินค้า - ${poNumber || "รอสร้าง"}</title>
        <style>
          body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .total { text-align: right; font-weight: bold; font-size: 18px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 10px; }
          .notes { margin-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">ใบขอซื้อสินค้า</div>
          <div>หมายเลข: ${poNumber || "รอสร้าง"}</div>
          <div>วันที่: ${new Date().toLocaleDateString('th-TH')}</div>
        </div>
        
        <div class="info">
          <div>
            <strong>ผู้ขอซื้อ:</strong> ${user?.username || 'ไม่ระบุ'}<br>
            <strong>ผู้ขาย:</strong> ${sellerDisplay}
          </div>
          <div>
            <strong>สถานะ:</strong> ${getStatusText(status)}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสสินค้า</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ราคาต่อหน่วย</th>
              <th>ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.productCode}</td>
                <td>${item.name}</td>
                <td>${item.currentQuantity}</td>
                <td>฿${item.currentPrice.toFixed(2)}</td>
                <td>฿${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          ราคารวมทั้งหมด: ฿${totalAmount.toFixed(2)}
        </div>
        
        ${notes ? `
          <div class="notes">
            <strong>หมายเหตุ:</strong> ${notes}
          </div>
        ` : ''}
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">ผู้ขอซื้อ</div>
            <div>(${user?.username || 'ไม่ระบุ'})</div>
            <div>วันที่: ${new Date().toLocaleDateString('th-TH')}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">ผู้อนุมัติ</div>
            <div>(_________________)</div>
            <div>วันที่: _________________</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'ร่าง';
      case 'pending': return 'รอดำเนินการ';
      case 'approved': return 'อนุมัติแล้ว';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      pending: 'default',
      approved: 'default',
      cancelled: 'destructive'
    } as const;

    const labels = {
      draft: 'ร่าง',
      pending: 'รอดำเนินการ',
      approved: 'อนุมัติแล้ว',
      cancelled: 'ยกเลิก'
    };

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  if (!purchaseOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1600px] w-[98vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            ใบขอซื้อสินค้า - {poNumber || "รอสร้าง"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">หมายเลขใบขอซื้อ</Label>
                  <p className="text-lg font-semibold">{poNumber || "รอสร้าง"}</p>
                  {latestPONumber && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-400">หมายเลขสั่งซื้อก่อนหน้านี้: {latestPONumber}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">วันที่สร้าง</Label>
                  <p className="text-lg">{new Date().toLocaleDateString('th-TH')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">สถานะ</Label>
                  <div className="mt-1">
                    {getStatusBadge(status)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เพิ่มหมายเหตุ..."
                  rows={3}
                />
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>รายการสินค้า</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto min-w-[1200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ชื่อสินค้า</TableHead>
                          <TableHead>รหัส</TableHead>
                          <TableHead>Lot</TableHead>
                          <TableHead>หมวดหมู่</TableHead>
                          <TableHead>จำนวนเดิม</TableHead>
                          <TableHead>จำนวนใหม่</TableHead>
                          <TableHead>ราคาเดิม</TableHead>
                          <TableHead>ราคาใหม่</TableHead>
                          <TableHead>ส่วนต่าง/ชิ้น</TableHead>
                          <TableHead>ราคารวม</TableHead>
                          <TableHead>ผู้ขาย</TableHead>
                          <TableHead>คลัง</TableHead>
                          <TableHead>ที่เก็บ</TableHead>
                          <TableHead>การชำระ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.productCode}</TableCell>
                            <TableCell>{item.lotCode || '-'}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.originalQuantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.currentQuantity}
                                onChange={(e) => updateItem(item.id, 'currentQuantity', parseInt(e.target.value) || 0)}
                                min="1"
                                className="w-20"
                                disabled={status !== 'draft'}
                              />
                            </TableCell>
                            <TableCell>฿{item.originalPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.currentPrice}
                                onChange={(e) => updateItem(item.id, 'currentPrice', parseFloat(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                                className="w-24"
                                disabled={status !== 'draft'}
                              />
                            </TableCell>
                            <TableCell className={item.priceDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ฿{item.priceDifference.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-medium">฿{item.totalPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Select
                                value={item.sellerId}
                                onValueChange={(value) => {
                                  const seller = sellers.find(s => s.id === value);
                                  updateSeller(item.id, value, seller ? seller.name : '');
                                }}
                                disabled={status !== 'draft'}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {sellers.map((seller) => (
                                    <SelectItem key={seller.id} value={seller.id}>
                                      {seller.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.warehouseId || undefined}
                                onValueChange={(value) => {
                                  const warehouse = warehouses.find(w => String(w.id) === String(value));
                                  updateItemFields(item.id, {
                                    warehouseId: value,
                                    warehouseName: warehouse ? warehouse.name : ''
                                  });
                                }}
                                disabled={status !== 'draft'}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="เลือกคลัง" />
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouses.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                                      {warehouse.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.storageLocationId || undefined}
                                onValueChange={(value) => {
                                  const storage = storageLocations.find(s => String(s.id) === String(value));
                                  updateItemFields(item.id, {
                                    storageLocationId: value,
                                    storageLocationName: storage ? storage.name : ''
                                  });
                                }}
                                disabled={status !== 'draft'}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="เลือกที่เก็บ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {storageLocations.map((storage) => (
                                    <SelectItem key={storage.id} value={String(storage.id)}>
                                      {storage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.paymentMethod}
                                onValueChange={(value) => updateItem(item.id, 'paymentMethod', value)}
                                disabled={status !== 'draft'}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">เงินสด</SelectItem>
                                  <SelectItem value="check">เช็ค</SelectItem>
                                  <SelectItem value="credit">เครดิต</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Total */}
              <div className="text-right">
                <div className="text-2xl font-bold">
                  ยอดรวม: ฿{purchaseOrder.totalAmount.toFixed(2)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" />
                    พิมพ์
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  {status === 'draft' && (
                    <Button 
                      size="sm"
                      onClick={handleSave}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      บันทึก
                    </Button>
                  )}
                  
                  {status === 'pending' && user?.role === 'admin' && (
                    <Button 
                      className="bg-green-500 hover:bg-green-600"
                      size="sm"
                      onClick={handleApprove}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      อนุมัติ
                    </Button>
                  )}
                  
                  {status !== 'approved' && status !== 'cancelled' && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 mr-1" />
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>


    </Dialog>
  );
};

export default PurchaseOrderDialog;

// ฟังก์ชันสำหรับบันทึกและดึงข้อมูลใบขอซื้อจาก localStorage
export function savePurchaseOrderToStorage(order: PurchaseOrder) {
  const key = 'groceryGuruPurchaseOrders';
  const existing = localStorage.getItem(key);
  let orders = existing ? JSON.parse(existing) : [];
  // ถ้ามี id ซ้ำ ให้แทนที่
  const idx = orders.findIndex((o: any) => o.id === order.id);
  if (idx !== -1) {
    orders[idx] = order;
  } else {
    orders.push(order);
  }
  localStorage.setItem(key, JSON.stringify(orders));
}

export function loadPurchaseOrdersFromStorage(): PurchaseOrder[] {
  const key = 'groceryGuruPurchaseOrders';
  const existing = localStorage.getItem(key);
  return existing ? JSON.parse(existing) : [];
} 