import React, { useEffect, useState } from 'react';
import { loadPurchaseOrdersFromStorage, savePurchaseOrderToStorage } from '../components/inventory/PurchaseOrderDialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog as UIDialog, DialogContent as UIDialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Printer, Check, X, Edit } from 'lucide-react';
import { purchaseOrderAPI } from '@/services/api/purchaseOrderAPI';
import { sellerAPI } from '@/services/api/sellerAPI';
import { warehouseAPI } from '@/services/api/warehouseAPI';
import { storageLocationAPI } from '@/services/api/storageLocationAPI';
import { shopInfoAPI } from '@/services/api/shopInfoAPI';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const statusColor = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  cancelled: 'red',
};

const statusLabel = {
  draft: 'ร่าง',
  pending: 'รอดำเนินการ',
  approved: 'อนุมัติแล้ว',
  cancelled: 'ยกเลิก',
};

const PurchaseOrderList = () => {
  const { user, login } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordAction, setPasswordAction] = useState<'cancel' | 'approve' | null>(null);
  // เพิ่ม state สำหรับ error
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [pendingApproveOrder, setPendingApproveOrder] = useState<any>(null);
  const [pendingCancelOrder, setPendingCancelOrder] = useState<any>(null);
  const [shopInfo, setShopInfo] = useState<any>(null);

  // ฟังก์ชันเปิด dialog ใส่รหัสผ่าน (reset state ทุกครั้ง)
  const openPasswordDialog = () => {
    setShowPasswordDialog(true);
    setAdminPassword('');
    setIsPasswordError(false);
  };
  // ฟังก์ชันปิด dialog ใส่รหัสผ่าน (reset state)
  const closePasswordDialog = () => {
    setShowPasswordDialog(false);
    setAdminPassword('');
    setIsPasswordError(false);
    setPendingApproveOrder(null);
  };

  useEffect(() => {
    refreshOrders();
    // โหลด sellers, warehouses, storageLocations จาก API
    sellerAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setSellers(res.data);
      else setSellers([]);
    });
    warehouseAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setWarehouses(res.data);
      else setWarehouses([]);
    });
    storageLocationAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setStorageLocations(res.data);
      else setStorageLocations([]);
    });
    // โหลดข้อมูลร้านค้า
    shopInfoAPI.get().then(res => {
      if (res.success && res.data) setShopInfo(res.data);
    });
  }, [showDialog]);

  const filteredOrders = orders.filter(order => {
    const q = search.toLowerCase();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.createdBy && order.createdBy.toLowerCase().includes(q)) ||
      (order.status && statusLabel[order.status].includes(q))
    );
  });

  const handlePrint = async (order: any) => {
    // โหลด shopInfo ใหม่ล่าสุด
    let shopName = '-';
    try {
      const res = await shopInfoAPI.get();
      if (res.success && res.data) shopName = res.data.name || '-';
      else if (shopInfo?.name) shopName = shopInfo.name;
    } catch (e) {
      if (shopInfo?.name) shopName = shopInfo.name;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const items = order.items || [];
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
    // รวมชื่อผู้ขายทั้งหมด (ไม่ซ้ำ)
    const uniqueSellers = Array.from(new Set(items.map((item: any) => item.sellerId).filter(Boolean)));
    // ดึงข้อมูลผู้ขายจาก sellers list
    const sellerDetails = uniqueSellers.map(sid => {
      const seller = sellers.find((s: any) => String(s.id) === String(sid));
      if (!seller) return '-';
      const name = seller.name || '-';
      const address = seller.address || '-';
      const taxId = seller.taxId || seller.taxid || '-';
      const phone = seller.phone || '-';
      let detail = `${name}, ที่อยู่: ${address}, เลขผู้เสียภาษี: ${taxId}, เบอร์โทร: ${phone}`;
      // ถ้ายาวเกิน 60 ตัวอักษร ให้ตัดขึ้นบรรทัดใหม่
      if (detail.length > 60) {
        const idx = detail.lastIndexOf(',', 60);
        if (idx > 0) {
          detail = detail.slice(0, idx + 1) + '<br>' + detail.slice(idx + 1).trim();
        }
      }
      return detail;
    });
    const sellerDisplay = sellerDetails.length > 0 ? sellerDetails.join('<br>') : '-';
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบขอซื้อสินค้า - ${order.id}</title>
        <style>
          body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table.product-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table.product-table th, table.product-table td { border: 1px solid #222; padding: 8px; text-align: center; }
          table.product-table th { background-color: #f5f5f5; font-weight: bold; }
          .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 8px; }
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
          <div>หมายเลข: ${order.id}</div>
          <div>วันที่: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('th-TH') : '-'}</div>
        </div>
        <div class="info">
          <div>
            <strong>ผู้ขอซื้อ:</strong> ${shopName}<br>
            <strong>ผู้ขาย:</strong> ${sellerDisplay}
          </div>
          <div>
            <strong>สถานะ:</strong> ${(order.status === 'draft' ? 'ร่าง' : order.status === 'pending' ? 'รอดำเนินการ' : order.status === 'approved' ? 'อนุมัติแล้ว' : order.status === 'cancelled' ? 'ยกเลิก' : order.status)}
          </div>
        </div>
        <table class="product-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสสินค้า</th>
              <th>Lot</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ราคาต่อหน่วย</th>
              <th>ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.productCode || '-'}</td>
                <td>${item.lotCode || '-'}</td>
                <td>${item.name || '-'}</td>
                <td>${item.currentQuantity || '-'}</td>
                <td>฿${item.currentPrice?.toFixed(2) || '-'}</td>
                <td>฿${item.totalPrice?.toFixed(2) || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          ราคารวมทั้งหมด: ฿${totalAmount.toFixed(2)}
        </div>
        ${order.notes ? `<div class="notes"><strong>หมายเหตุ:</strong> ${order.notes}</div>` : ''}
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">ผู้ขอซื้อ</div>
            <div>(${order.createdBy || '-'})</div>
            <div>วันที่: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('th-TH') : '-'}</div>
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

  // helper สำหรับ refresh รายการใบขอซื้อจาก API
  const refreshOrders = async () => {
    const res = await purchaseOrderAPI.getAll();
    if (res.success && Array.isArray(res.data)) {
      // Map sellerName ให้กับแต่ละ item ของ order
      const mapped = res.data.map(order => ({
        ...order,
        createdAt: order.created_at,
        createdBy: order.createdBy || (order as any).created_by || (order as any).createdby || '-',
        totalAmount: Number(order.total ?? 0),
        status: order.status,
        // Map sellerName ในแต่ละ item
        items: Array.isArray(order.items)
          ? order.items.map(item => {
              let sellerName = item.sellerName;
              if (!sellerName && item.sellerId && sellers.length > 0) {
                const found = sellers.find((s) => String(s.id) === String(item.sellerId));
                sellerName = found ? found.name : '';
              }
              return { ...item, sellerName };
            })
          : [],
      }));
      setOrders(mapped);
      return mapped;
    } else {
      setOrders([]);
      return [];
    }
  };

  const handleApprove = async (order: any) => {
    await purchaseOrderAPI.update(order.id, { ...order, status: 'approved' });
    await refreshOrders();
  };

  const handleCancel = async (order: any, note?: string) => {
    await purchaseOrderAPI.update(order.id, { ...order, status: 'cancelled', notes: note !== undefined ? note : order.notes });
    await refreshOrders();
    if (selectedOrder && selectedOrder.id === order.id) setSelectedOrder({ ...order, status: 'cancelled', notes: note !== undefined ? note : order.notes });
    toast.success('ยกเลิกใบขอซื้อเรียบร้อยแล้ว');
  };

  const handleCancelWithAuth = (order: any) => {
    // ตรวจสอบว่า user เป็น admin หรือไม่
    if (user?.role === 'admin') {
      // ถ้าเป็น admin ให้แสดง dialog ใส่หมายเหตุ
      setCancelOrder(order);
      setCancelNote('');
      setShowCancelDialog(true);
    } else {
      // ถ้าไม่ใช่ admin ให้แสดง dialog ใส่รหัสผ่าน
      setCancelOrder(order);
      setPasswordAction('cancel');
      openPasswordDialog();
    }
  };

  const handlePasswordConfirm = async () => {
    if (!adminPassword) return;
    try {
      const res = await fetch('http://localhost:3001/api/verify-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      // เพิ่ม debug
      if (!res.ok) {
        const text = await res.text();
        console.error('API error:', res.status, text);
        toast.error('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
        setIsPasswordError(true);
        return; // ไม่ปิด dialog
      }
      const data = await res.json();
      console.log('verify-admin-password result:', data);
      if (data.success) {
        closePasswordDialog();
        if (passwordAction === 'approve' && pendingApproveOrder) {
          handleApprove(pendingApproveOrder);
          setPendingApproveOrder(null);
        } else if (passwordAction === 'cancel' && pendingCancelOrder) {
          setCancelOrder(pendingCancelOrder);
          setShowCancelDialog(true);
          setPendingCancelOrder(null);
        }
        setPasswordAction(null);
      } else {
        toast.error('รหัสผ่านไม่ถูกต้อง');
        setIsPasswordError(true);
      }
    } catch (err) {
      console.error('fetch error', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setIsPasswordError(true);
    }
  };

  const handleEdit = (order: any) => {
    setEditOrder(JSON.parse(JSON.stringify(order)));
    setEditMode(true);
    setSelectedOrder(order);
    setShowDialog(true);
  };

  const handleEditField = (field: string, value: any) => {
    setEditOrder((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditItemField = (idx: number, field: string, value: any) => {
    setEditOrder((prev: any) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      // ถ้าเปลี่ยน sellerId ต้องอัปเดต sellerName ด้วย
      if (field === 'sellerId') {
        const seller = sellers.find((s: any) => s.id === value);
        items[idx].sellerName = seller ? seller.name : '';
      }
      // อัปเดตราคารวมของแต่ละรายการ
      items[idx].totalPrice = items[idx].currentPrice * items[idx].currentQuantity;
      return { ...prev, items, totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0) };
    });
  };

  const handleSaveEdit = async () => {
    // คำนวณยอดรวมใหม่
    const total = editOrder.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const payload = { ...editOrder, total };
    await purchaseOrderAPI.update(editOrder.id, payload);
    const newOrders = await refreshOrders();
    const updated = newOrders.find(o => o.id === editOrder.id);
    setSelectedOrder(updated || editOrder);
    setEditMode(false);
    setShowDialog(false);
  };

  // helper สำหรับแสดงชื่อผู้ขาย
  const getSellerName = (item: any) => {
    if (item.sellerName) return item.sellerName;
    if (item.seller) return item.seller;
    if (item.sellerId && sellers.length > 0) {
      const found = sellers.find((s: any) => s.id === item.sellerId);
      if (found) return found.name;
    }
    return '-';
  };

  // เพิ่ม helper สำหรับแสดงชื่อผู้ใช้ที่ยกเลิก
  const getCancelledBy = (order: any) => {
    if (order.cancelledBy) return order.cancelledBy;
    // fallback: ถ้าไม่มีฟิลด์นี้ ให้ใช้ผู้สร้าง (createdBy) หรือ '-'
    return order.createdBy || '-';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded bg-green-500 text-white text-xs">อนุมัติแล้ว</span>;
      case 'cancelled':
        return <span className="px-2 py-1 rounded bg-red-500 text-white text-xs">ยกเลิก</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded bg-yellow-400 text-white text-xs">รอดำเนินการ</span>;
      case 'draft':
        return <span className="px-2 py-1 rounded bg-gray-400 text-white text-xs">ร่าง</span>;
      default:
        return <span className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs">{status}</span>;
    }
  };

  // ฟังก์ชันเช็คว่า PO นี้มาจาก StockAlerts หรือไม่
  const isFromStockAlerts = (order: any) => {
    // เช็คว่ามีสินค้าที่มี stock ต่ำหรือหมดสต็อกหรือไม่
    if (!order.items || !Array.isArray(order.items)) return false;
    
    return order.items.some((item: any) => {
      // เช็คว่าสินค้านี้มี stock ต่ำหรือไม่ (stock <= minStock หรือ stock === 0)
      const hasLowStock = item.originalQuantity && item.minStock && item.originalQuantity <= item.minStock;
      const isOutOfStock = item.originalQuantity === 0;
      return hasLowStock || isOutOfStock;
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>รายการใบขอซื้อ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4 gap-2">
            <Input
              placeholder="ค้นหาเลขที่ใบขอซื้อ, ผู้สร้าง, สถานะ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่ใบขอซื้อ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ผู้สร้าง</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ที่มา</TableHead>
                  <TableHead>ยอดรวม</TableHead>
                  <TableHead>ดูรายละเอียด</TableHead>
                  <TableHead>ดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      ไม่พบใบขอซื้อ
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}</TableCell>
                      <TableCell>{order.createdBy || '-'}</TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell>
                        {isFromStockAlerts(order) ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            สินค้าสต็อกต่ำ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            สร้างเอง
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>฿{order.totalAmount?.toFixed(2) || '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setEditMode(false); setEditOrder(null); setShowDialog(true); }}>
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handlePrint(order)} title="พิมพ์ใบขอซื้อ">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(order)} disabled={order.status === 'approved' || order.status === 'cancelled'}
                            className={order.status === 'approved' || order.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}
                            title={order.status === 'approved' ? 'ใบขอซื้อที่อนุมัติแล้วไม่สามารถแก้ไขได้' : order.status === 'cancelled' ? 'ใบขอซื้อที่ถูกยกเลิกไม่สามารถแก้ไขได้' : ''}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className={`bg-green-500 hover:bg-green-600 text-white ${order.status === 'approved' || order.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                            disabled={order.status === 'approved' || order.status === 'cancelled'}
                            onClick={() => {
                              if (user?.role === 'admin') {
                                handleApprove(order);
                              } else {
                                setPendingApproveOrder(order);
                                setPasswordAction('approve');
                                openPasswordDialog();
                              }
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" /> อนุมัติ
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            console.log('DEBUG user.role:', user?.role, 'order:', order);
                            if (user?.role === 'admin') {
                              setCancelOrder(order);
                              setShowCancelDialog(true);
                            } else {
                              setPasswordAction('cancel');
                              setPendingCancelOrder(order);
                              openPasswordDialog();
                            }
                          }} disabled={order.status === 'cancelled'}
                            className={order.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}
                            title={order.status === 'cancelled' ? 'ใบขอซื้อที่ถูกยกเลิกแล้ว' : ''}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog แสดงรายละเอียดใบขอซื้อ */}
      <UIDialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); setEditMode(false); setEditOrder(null); }}>
        <UIDialogContent className="max-w-2xl w-full">
          <UIDialogHeader>
            <UIDialogTitle>รายละเอียดใบขอซื้อ</UIDialogTitle>
          </UIDialogHeader>
          {(editMode ? editOrder : selectedOrder) && (
            <div className="space-y-4 print:block">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-lg">เลขที่: {(editMode ? editOrder : selectedOrder).id}</div>
                  <div>วันที่: {(editMode ? editOrder : selectedOrder).createdAt ? new Date((editMode ? editOrder : selectedOrder).createdAt).toLocaleDateString('th-TH') : '-'}</div>
                  <div>ผู้สร้าง: {(editMode ? editOrder : selectedOrder).createdBy || '-'}</div>
                  <div>สถานะ: {getStatusBadge((editMode ? editOrder : selectedOrder).status)}</div>
                  {(editMode ? editOrder : selectedOrder).status === 'cancelled' && (
                    <div className="mt-2 text-sm text-red-700">
                      <div>ยกเลิกโดย: {getCancelledBy(editMode ? editOrder : selectedOrder)}</div>
                      {((editMode ? editOrder : selectedOrder).notes || '').trim() && (
                        <div>หมายเหตุ: {(editMode ? editOrder : selectedOrder).notes}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePrint(editMode ? editOrder : selectedOrder)}>
                    <Printer className="h-4 w-4 mr-1" /> พิมพ์
                  </Button>
                  {(editMode ? editOrder : selectedOrder).status !== 'approved' && (editMode ? editOrder : selectedOrder).status !== 'cancelled' && !editMode && (
                    <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApprove(selectedOrder)}>
                      <Check className="h-4 w-4 mr-1" /> อนุมัติ
                    </Button>
                  )}
                  {(editMode ? editOrder : selectedOrder).status !== 'approved' && (editMode ? editOrder : selectedOrder).status !== 'cancelled' && !editMode && (
                    <Button size="sm" variant="outline" onClick={() => { setEditOrder(JSON.parse(JSON.stringify(selectedOrder))); setEditMode(true); }}>
                      <Edit className="h-4 w-4 mr-1" /> แก้ไข
                    </Button>
                  )}
                  {editMode && (
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSaveEdit}>
                      บันทึก
                    </Button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>ราคา/หน่วย</TableHead>
                      <TableHead>ราคารวม</TableHead>
                      <TableHead>ผู้ขาย</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(editMode ? editOrder.items : selectedOrder.items).map((item: any, idx: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          {editMode ? (
                            <input type="number" min={1} value={item.currentQuantity} onChange={e => handleEditItemField(idx, 'currentQuantity', parseInt(e.target.value) || 1)} className="w-16 border rounded px-1" />
                          ) : item.currentQuantity}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <input type="number" min={0} step={0.01} value={item.currentPrice} onChange={e => handleEditItemField(idx, 'currentPrice', parseFloat(e.target.value) || 0)} className="w-20 border rounded px-1" />
                          ) : `฿${item.currentPrice?.toFixed(2)}`}
                        </TableCell>
                        <TableCell>฿{item.totalPrice?.toFixed(2)}</TableCell>
                        <TableCell>
                          {editMode ? (
                            <select
                              className="w-32 border rounded px-1"
                              value={item.sellerId || ''}
                              onChange={e => {
                                const sellerId = e.target.value;
                                const seller = sellers.find(s => s.id === sellerId);
                                handleEditItemField(idx, 'sellerId', sellerId);
                                handleEditItemField(idx, 'sellerName', seller ? seller.name : '');
                              }}
                            >
                              {sellers.map(seller => (
                                <option key={seller.id} value={seller.id}>{seller.name}</option>
                              ))}
                            </select>
                          ) : (
                            getSellerName(item)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right font-bold text-lg">
                ยอดรวม: ฿{(
                  (editMode ? editOrder.totalAmount : selectedOrder.totalAmount) ??
                  (editMode ? editOrder.total : selectedOrder.total) ??
                  0
                ).toFixed(2)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">หมายเหตุ:</label>
                {editMode ? (
                  <textarea className="w-full border rounded px-2 py-1" value={editOrder.notes} onChange={e => handleEditField('notes', e.target.value)} />
                ) : (
                  <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 min-h-[32px]">{selectedOrder.notes || '-'}</div>
                )}
              </div>
            </div>
          )}
        </UIDialogContent>
      </UIDialog>

      {/* Dialog ยกเลิกใบขอซื้อ */}
      <UIDialog open={showCancelDialog} onOpenChange={(open) => {
        setShowCancelDialog(open);
        if (!open) {
          setCancelNote('');
          setCancelOrder(null);
        }
      }}>
        <UIDialogContent className="max-w-md w-full">
          <UIDialogHeader>
            <UIDialogTitle>ยกเลิกใบขอซื้อ</UIDialogTitle>
          </UIDialogHeader>
          <div className="space-y-4">
            <div>กรุณาระบุหมายเหตุการยกเลิกใบขอซื้อ</div>
            <textarea
              className="w-full border rounded px-2 py-1"
              rows={3}
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder="ระบุเหตุผล..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>ยกเลิก</Button>
              <Button variant="destructive" onClick={() => {
                console.log('DEBUG cancelNote:', cancelNote, 'cancelOrder:', cancelOrder);
                if (cancelOrder && cancelNote.trim()) {
                  handleCancel(cancelOrder, cancelNote);
                  setShowCancelDialog(false);
                  setCancelNote('');
                  setCancelOrder(null);
                } else {
                  toast.error('กรุณาระบุหมายเหตุการยกเลิก');
                }
              }}>ยืนยันยกเลิก</Button>
            </div>
          </div>
        </UIDialogContent>
      </UIDialog>

      {/* Password Dialog สำหรับ Admin */}
      <AlertDialog open={showPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันรหัสผ่าน Admin</AlertDialogTitle>
            <AlertDialogDescription>
              กรุณากรอกรหัสผ่าน Admin เพื่อดำเนินการต่อ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              setIsPasswordError(false);
            }}
            placeholder="รหัสผ่าน Admin"
            className={`w-full border rounded px-3 py-2 ${isPasswordError ? 'border-red-500 bg-red-50' : ''}`}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordConfirm()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closePasswordDialog}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordConfirm}>ยืนยัน</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseOrderList; 