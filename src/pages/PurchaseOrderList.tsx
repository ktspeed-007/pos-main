import React, { useEffect, useState } from 'react';
import { loadPurchaseOrdersFromStorage, savePurchaseOrderToStorage } from '../components/inventory/PurchaseOrderDialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Printer, Check, X, Edit } from 'lucide-react';
import { purchaseOrderAPI } from '@/services/api/purchaseOrderAPI';
import { sellerAPI } from '@/services/api/sellerAPI';
import { productsAPI } from '@/services/api';
import { warehouseAPI } from '@/services/api/warehouseAPI';
import { storageLocationAPI } from '@/services/api/storageLocationAPI';
import { shopInfoAPI } from '@/services/api/shopInfoAPI';

import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const statusColor = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  cancelled: 'red',
  received: 'blue',
  partial_received: 'orange',
};

const statusLabel = {
  draft: 'ร่าง',
  pending: 'รอดำเนินการ',
  approved: 'อนุมัติแล้ว',
  cancelled: 'ยกเลิก',
  received: 'รับของแล้ว',
  partial_received: 'รับบางส่วน',
};

const PurchaseOrderList = () => {
  const { user, login } = useAuth();
  const [products, setProducts] = useState<any[]>([]); // preload products list
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
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
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState<any>(null);
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // ฟังก์ชันแปลง username เป็นชื่อ
  const getUserName = (username: string) => {
    if (!username) return 'ไม่ระบุ';
    
    // ใช้ข้อมูลจาก users list หากมี
    if (users.length > 0) {
      const user = users.find((u: any) => u.username === username);
      if (user) return user.name;
    }
    
    // หากไม่มีใน users list ให้ใช้ข้อมูลจาก backend โดยตรง
    const userMap: { [key: string]: string } = {
      'admin': 'ผู้ดูแลระบบ',
      'staff': 'พนักงานขาย'
    };
    
    return userMap[username] || username;
  };

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
    // preload products list จาก backend
    productsAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) setProducts(res.data);
      else setProducts([]);
    });
    // โหลด users list จาก backend โดยตรง
    fetch('/api/users')
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) setUsers(res.data);
        else setUsers([]);
      })
      .catch(() => setUsers([]));
  }, []);



  const filteredOrders = orders.filter(order => {
    const q = search.toLowerCase();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.createdBy && order.createdBy.toLowerCase().includes(q)) ||
      (order.status && statusLabel[order.status].includes(q))
    );
  });

  const handlePrint = async (order: any) => {
    console.log('DEBUG: handlePrint called with order:', order);
    
    // โหลด shopInfo ใหม่ล่าสุด
    let shopName = '-';
    try {
      const res = await shopInfoAPI.get();
      if (res.success && res.data) shopName = res.data.name || '-';
      else if (shopInfo?.name) shopName = shopInfo.name;
    } catch (e) {
      if (shopInfo?.name) shopName = shopInfo.name;
    }
    
    console.log('DEBUG: shopName loaded:', shopName);
    
    // เตรียมข้อมูลสำหรับพิมพ์
    const items = (order.items || []).map(enrichItem);
    console.log('DEBUG: items after enrichItem:', items);
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
    // ใช้ข้อมูลผู้ขายจาก order แทน
    let sellerDisplay = '-';
    if (order.sellerid && order.sellername) {
      // หาข้อมูลผู้ขายจาก sellers list
      const seller = sellers.find((s: any) => String(s.id) === String(order.sellerid));
      if (seller) {
        const name = seller.name || order.sellername || '-';
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
        sellerDisplay = detail;
      } else {
        // ถ้าไม่พบใน sellers list ให้ใช้ข้อมูลจาก order
        sellerDisplay = order.sellername || '-';
      }
    }
    console.log('DEBUG: sellerDisplay:', sellerDisplay);
    
    // สร้าง HTML content สำหรับพิมพ์
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
            <strong>สถานะ:</strong> ${(order.status === 'draft' ? 'ร่าง' : order.status === 'pending' ? 'รอดำเนินการ' : order.status === 'approved' ? 'อนุมัติแล้ว' : order.status === 'cancelled' ? 'ยกเลิก' : order.status === 'received' ? 'รับของแล้ว' : order.status === 'partial_received' ? 'รับบางส่วน' : order.status)}
            ${order.status === 'approved' && order.updated_at ? `<br><small>อนุมัติเมื่อ: ${new Date(order.updated_at).toLocaleString('th-TH')}<br>โดย: ${getUserName(order.createdBy)}</small>` : ''}
            ${order.status === 'received' && order.received_at ? `<br><small>รับของเมื่อ: ${new Date(order.received_at).toLocaleString('th-TH')}<br>โดย: ${getUserName(order.createdBy)}</small>` : ''}
            ${order.status === 'cancelled' && order.updated_at ? `<br><small>ยกเลิกเมื่อ: ${new Date(order.updated_at).toLocaleString('th-TH')}<br>โดย: ${getUserName(order.createdBy)}</small>` : ''}
          </div>
        </div>
        <table class="product-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสสินค้า</th>
              <th>Lot</th>
              <th>ชื่อสินค้า</th>
              <th>สั่งซื้อ</th>
              <th>รับ</th>
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
                <td>${item.receivedQuantity || '-'}</td>
                <td>฿${(Number(item.currentPrice) || 0).toFixed(2)}</td>
                <td>฿${(Number(item.totalPrice) || 0).toFixed(2)}</td>
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
    
    console.log('DEBUG: printContent created, length:', printContent.length);
    
    // สร้าง div สำหรับพิมพ์
    const printDiv = document.createElement('div');
    printDiv.innerHTML = printContent;
    printDiv.style.position = 'fixed';
    printDiv.style.top = '0';
    printDiv.style.left = '0';
    printDiv.style.width = '100%';
    printDiv.style.height = '100%';
    printDiv.style.backgroundColor = 'white';
    printDiv.style.zIndex = '9999';
    printDiv.style.display = 'block';
    document.body.appendChild(printDiv);
    
    console.log('DEBUG: printDiv created and added to body');
    
    // ซ่อนเนื้อหาอื่นๆ
    const allElements = document.body.children;
    const hiddenElements = [];
    
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i] as HTMLElement;
      if (element !== printDiv) {
        const originalDisplay = element.style.display;
        element.style.display = 'none';
        hiddenElements.push({ element, originalDisplay });
      }
    }
    
    console.log('DEBUG: About to call window.print()');
    
    // รอสักครู่แล้วพิมพ์
    setTimeout(() => {
      try {
        console.log('DEBUG: Calling window.print()');
        window.print();
        console.log('DEBUG: window.print() called successfully');
        // คืนค่าเดิมหลังจากพิมพ์เสร็จ
        setTimeout(() => {
          // แสดงเนื้อหาอื่นๆ กลับมา
          hiddenElements.forEach(({ element, originalDisplay }) => {
            element.style.display = originalDisplay;
          });
          document.body.removeChild(printDiv);
          console.log('DEBUG: Print cleanup completed');
        }, 1000);
      } catch (error) {
        console.error('Print error:', error);
        toast.error('เกิดข้อผิดพลาดในการพิมพ์');
        // แสดงเนื้อหาอื่นๆ กลับมา
        hiddenElements.forEach(({ element, originalDisplay }) => {
          element.style.display = originalDisplay;
        });
        document.body.removeChild(printDiv);
      }
    }, 500);
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
                sellerName = found ? found.name : null;
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
  };

  const handleEditField = (field: string, value: any) => {
    console.log('DEBUG: handleEditField - field:', field, 'value:', value);
    console.log('DEBUG: handleEditField - typeof value:', typeof value);
    setEditOrder((prev: any) => {
      const newState = { ...prev, [field]: value };
      console.log('DEBUG: handleEditField - newState:', newState);
      return newState;
    });
  };

  const handleEditItemField = (idx: number, field: string, value: any) => {
    setEditOrder((prev: any) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      
      // ถ้าเปลี่ยน sellerId ต้องอัปเดต sellerName ด้วย
      if (field === 'sellerId') {
        const seller = sellers.find((s: any) => s.id === value);
        items[idx].sellerName = seller ? seller.name : null;
      }
      
      // อัปเดตราคารวมของแต่ละรายการ
      const currentPrice = Number(items[idx].currentPrice) || Number(items[idx].price) || 0;
      const currentQuantity = Number(items[idx].currentQuantity) || Number(items[idx].qty) || 0;
      items[idx].totalPrice = currentPrice * currentQuantity;
      
      // อัปเดตยอดรวมทั้งหมด
      const totalAmount = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
      
      console.log('DEBUG: handleEditItemField - field:', field, 'value:', value);
      console.log('DEBUG: handleEditItemField - currentPrice:', currentPrice, 'currentQuantity:', currentQuantity);
      console.log('DEBUG: handleEditItemField - totalPrice:', items[idx].totalPrice);
      
      return { ...prev, items, totalAmount };
    });
  };

  const handleSaveEdit = async () => {
    try {
      console.log('DEBUG: handleSaveEdit - editOrder:', editOrder);
      
      // คำนวณยอดรวมใหม่
      const total = editOrder.items.reduce((sum, item) => {
        const currentPrice = Number(item.currentPrice) || Number(item.price) || 0;
        const currentQuantity = Number(item.currentQuantity) || Number(item.qty) || 0;
        const itemTotal = currentPrice * currentQuantity;
        console.log('DEBUG: handleSaveEdit - item calculation:', {
          itemId: item.id,
          currentPrice,
          currentQuantity,
          itemTotal
        });
        return sum + itemTotal;
      }, 0);
      
      // หา sellername จาก sellerid
      let sellername = editOrder.sellername;
      if (!sellername && editOrder.sellerid && sellers.length > 0) {
        const found = sellers.find((s: any) => String(s.id) === String(editOrder.sellerid));
        sellername = found ? found.name : null;
      }
      
      const payload = { 
        ...editOrder, 
        total,
        sellerid: editOrder.sellerid,
        sellername: sellername
      };
      
      console.log('DEBUG: handleSaveEdit - payload:', payload);
      console.log('DEBUG: handleSaveEdit - sellerid:', payload.sellerid);
      console.log('DEBUG: handleSaveEdit - sellername:', payload.sellername);
      console.log('DEBUG: handleSaveEdit - total:', total);
      
      const response = await purchaseOrderAPI.update(editOrder.id, payload);
      console.log('DEBUG: handleSaveEdit - response:', response);
      
      if (response.success) {
        toast.success('บันทึกการแก้ไขเรียบร้อย');
        await refreshOrders();
            setEditMode(false);
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + (response.error || 'ไม่ทราบสาเหตุ'));
      }
    } catch (error) {
      console.error('DEBUG: handleSaveEdit - error:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    }
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
    // fallback: ถ้าไม่มีฟิลด์นี้ ให้ใช้ผู้สร้าง (createdby) หรือ '-'
    return order.createdby || '-';
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
      case 'received':
        return <span className="px-2 py-1 rounded bg-blue-500 text-white text-xs">รับของแล้ว</span>;
      case 'partial_received':
        return <span className="px-2 py-1 rounded bg-orange-500 text-white text-xs">รับบางส่วน</span>;
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

  // ฟังก์ชันเปิด Dialog รับของ
  const handleOpenReceiveDialog = (order: any) => {
    setReceiveOrder(order);
    console.log('DEBUG: order.items for receive:', order.items); // เพิ่ม debug log
    // สร้าง receiveItems จาก order.items โดยเพิ่ม receivedQuantity และ enrich ข้อมูล
    const items = order.items.map((item: any) => {
      const enrichedItem = enrichItem(item);
      return {
        ...enrichedItem,
        receivedQuantity: item.received_qty || enrichedItem.currentQuantity || item.qty || 0, // ใช้ received_qty จาก DB
        receivedNotes: '',
      };
    });
    console.log('DEBUG: receiveItems created:', items); // เพิ่ม debug log
    setReceiveItems(items);
    setShowReceiveDialog(true);
  };

  // ฟังก์ชันอัปเดตจำนวนที่รับจริง
  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setReceiveItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, receivedQuantity: quantity } : item
    ));
  };

  // ฟังก์ชันอัปเดตหมายเหตุการรับของ
  const updateReceivedNotes = (itemId: string, notes: string) => {
    setReceiveItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, receivedNotes: notes } : item
    ));
  };

  // ฟังก์ชันบันทึกการรับของ
  const handleSaveReceive = async () => {
    try {
      console.log('DEBUG: receiveItems before sending:', receiveItems); // เพิ่ม debug log
      // สร้างรายการรับของสำหรับแต่ละรายการใน receiveItems
      const receiveItemPromises = receiveItems.map(async (item) => {
        console.log('DEBUG: sending item to receive:', { id: item.id, name: item.name, receivedQuantity: item.receivedQuantity }); // เพิ่ม debug log
        const res = await fetch('http://localhost:3001/api/purchase-order-items/receive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: item.id, // เปลี่ยนชื่อ field ให้ตรงกับ backend
            received_qty: item.receivedQuantity, // เปลี่ยนชื่อ field ให้ตรงกับ backend
            received_at: new Date().toISOString(), // เพิ่มวันที่รับของ
          }),
        });
        const data = await res.json();
        if (!data.success) {
          console.error('Error receiving item:', item.id, data.error);
          toast.error(`เกิดข้อผิดพลาดในการรับสินค้า: ${item.name}`);
          return null;
        }
        return data.data;
      });

      const updatedItems = await Promise.all(receiveItemPromises);

      // ตรวจสอบสถานะการรับของทั้งหมด
      const allFullyReceived = updatedItems.every(item => item.received_qty >= item.qty);
      const anyReceived = updatedItems.some(item => item.received_qty > 0);
      
      let newStatus = receiveOrder.status;
      if (allFullyReceived) {
        newStatus = 'received';
      } else if (anyReceived) {
        newStatus = 'partial_received';
      }

      // อัปเดตสถานะ PO ใน backend (เฉพาะ status เท่านั้น)
      if (newStatus !== receiveOrder.status) {
        console.log('DEBUG: updating PO status from', receiveOrder.status, 'to', newStatus); // เพิ่ม debug log
        await purchaseOrderAPI.update(receiveOrder.id, {
          status: newStatus, // ส่งเฉพาะ status เท่านั้น
        });
      }

      toast.success('บันทึกการรับของเรียบร้อยแล้ว');
      setShowReceiveDialog(false);
      setReceiveOrder(null);
      setReceiveItems([]);
      
      // รีเฟรชรายการ PO
      await refreshOrders();
      
      // รีเฟรชข้อมูลสินค้าใน StoreContext เพื่อให้หน้าอื่นๆ อัปเดตด้วย
      if (window.location.pathname !== '/stock-alerts') {
        // ถ้าไม่ได้อยู่ที่หน้า stock-alerts ให้รีเฟรชข้อมูลสินค้า
        const event = new CustomEvent('refreshProducts');
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error saving receive:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการรับของ');
    }
  };

  // helper: เติมข้อมูลสินค้าให้กับ item ถ้าขาด (เช่น name, productCode, price)
  function enrichItem(item) {
    console.log('DEBUG: enrichItem - item:', item);
    console.log('DEBUG: enrichItem - products length:', products.length);
    
    const prod = products.find(p => String(p.id) === String(item.product_id || item.productId));
    console.log('DEBUG: enrichItem - found product:', prod);
    
    const enriched = {
      ...item,
      name: item.name || prod?.name || '-',
      productCode: item.productCode || item.productcode || prod?.productCode || '-',
      currentQuantity: item.currentQuantity ?? item.qty ?? 0,
      receivedQuantity: item.received_qty ?? item.receivedQty ?? 0,
      currentPrice: item.currentPrice ?? item.price ?? prod?.price ?? 0,
      totalPrice: item.totalPrice ?? ((item.currentPrice ?? item.price ?? prod?.price ?? 0) * (item.currentQuantity ?? item.qty ?? 0)),
      lotCode: item.lotCode || item.lotcode || prod?.lotCode || '-',
      sellerName: prod?.seller || prod?.sellername || item.seller || item.sellername || '-',
    };
    
    console.log('DEBUG: enrichItem - enriched result:', enriched);
    return enriched;
  }

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
                  <TableHead>ดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handlePrint(order)} title="พิมพ์ใบขอซื้อ">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(order)} disabled={order.status === 'approved' || order.status === 'cancelled' || order.status === 'received' || order.status === 'partial_received'}
                            className={order.status === 'approved' || order.status === 'cancelled' || order.status === 'received' || order.status === 'partial_received' ? 'opacity-50 pointer-events-none' : ''}
                            title={order.status === 'approved' ? 'ใบขอซื้อที่อนุมัติแล้วไม่สามารถแก้ไขได้' : order.status === 'cancelled' ? 'ใบขอซื้อที่ถูกยกเลิกไม่สามารถแก้ไขได้' : order.status === 'received' || order.status === 'partial_received' ? 'ใบขอซื้อที่รับของแล้วไม่สามารถแก้ไขได้' : ''}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className={`bg-green-500 hover:bg-green-600 text-white ${order.status === 'approved' || order.status === 'cancelled' || order.status === 'received' || order.status === 'partial_received' ? 'opacity-50 pointer-events-none' : ''}`}
                            disabled={order.status === 'approved' || order.status === 'cancelled' || order.status === 'received' || order.status === 'partial_received'}
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
                          {/* ปุ่มรับของ - แสดงเฉพาะ PO ที่อนุมัติแล้ว */}
                          {order.status === 'approved' && (
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => handleOpenReceiveDialog(order)}
                              title="รับของเข้า"
                            >
                              📦 รับของ
                            </Button>
                          )}
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

      

      {/* Dialog รับของ */}
      <Dialog open={showReceiveDialog} onOpenChange={(open) => {
        setShowReceiveDialog(open);
        if (!open) {
          setReceiveOrder(null);
          setReceiveItems([]);
        }
      }}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>รับของเข้า - {receiveOrder?.id}</DialogTitle>
          </DialogHeader>
          {receiveOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">เลขที่ใบขอซื้อ</Label>
                  <p className="text-lg font-semibold">{receiveOrder.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">วันที่สั่งซื้อ</Label>
                  <p className="text-lg">{receiveOrder.createdAt ? new Date(receiveOrder.createdAt).toLocaleDateString('th-TH') : '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">สถานะ</Label>
                  <div className="mt-1">
                    {getStatusBadge(receiveOrder.status)}
                  </div>
                </div>
              </div>

              {/* ตารางรายการสินค้า */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>รหัสสินค้า</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>จำนวนสั่งซื้อ</TableHead>
                      <TableHead>จำนวนรับจริง</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiveItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.productCode || '-'}</TableCell>
                        <TableCell>{item.lotCode || '-'}</TableCell>
                        <TableCell className="text-center">{item.currentQuantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.receivedQuantity}
                            onChange={(e) => updateReceivedQuantity(item.id, parseInt(e.target.value) || 0)}
                            min="0"
                            max={item.currentQuantity * 2} // อนุญาตให้รับเกินได้ 2 เท่า
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={item.receivedNotes}
                            onChange={(e) => updateReceivedNotes(item.id, e.target.value)}
                            placeholder="หมายเหตุ..."
                            className="w-32"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* สรุปการรับของ */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">สรุปการรับของ</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">จำนวนรายการ:</span>
                    <span className="ml-2 font-medium">{receiveItems.length} รายการ</span>
                  </div>
                  <div>
                    <span className="text-gray-600">รับครบ:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {receiveItems.filter(item => item.receivedQuantity >= item.currentQuantity).length} รายการ
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">รับไม่ครบ:</span>
                    <span className="ml-2 font-medium text-orange-600">
                      {receiveItems.filter(item => item.receivedQuantity < item.currentQuantity && item.receivedQuantity > 0).length} รายการ
                    </span>
                  </div>
                </div>
              </div>

              {/* ปุ่มดำเนินการ */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSaveReceive} className="bg-blue-500 hover:bg-blue-600">
                  บันทึกการรับของ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog ยกเลิกใบขอซื้อ */}
      <Dialog open={showCancelDialog} onOpenChange={(open) => {
        setShowCancelDialog(open);
        if (!open) {
          setCancelNote('');
          setCancelOrder(null);
        }
      }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>ยกเลิกใบขอซื้อ</DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

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