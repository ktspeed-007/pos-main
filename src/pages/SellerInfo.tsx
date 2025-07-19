import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuthContext } from '../contexts/AuthContext';
import { sellerAPI } from '@/services/api/sellerAPI';

const SELLER_LIST_KEY = 'groceryGuruSellerList';

const defaultInfo = {
  id: '',
  shopCode: '',
  name: '',
  address: '',
  phone: '',
  taxId: '',
  bankAccount: '',
  bankName: '',
};

const SellerInfo = () => {
  const [sellerList, setSellerList] = useState([]);
  const [info, setInfo] = useState(defaultInfo);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const auth = useContext(AuthContext);

  useEffect(() => {
    sellerAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setSellerList(res.data);
      } else {
        setSellerList([]);
    }
    setLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInfo({ ...info, [e.target.name]: e.target.value });
  };

  const getNextShopCode = () => {
    if (sellerList.length === 0) return 'S-00001';
    const nums = sellerList
      .map(s => s.shopCode || s.shopcode)
      .filter(code => /^S-\d{5}$/.test(code))
      .map(code => parseInt(code.slice(2), 10));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const next = (max + 1).toString().padStart(5, '0');
    return `S-${next}`;
  };

  const handleAdd = () => {
    setInfo({
      ...defaultInfo,
      shopCode: getNextShopCode()
    });
    setEditingId('');
    setDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    const seller = sellerList.find(item => item.id === id);
    if (seller) {
      setInfo({
        id: seller.id,
        shopCode: seller.shopCode || seller.shopcode || '',
        name: seller.name || '',
        bankName: seller.bankName || seller.bankname || '',
        bankAccount: seller.bankAccount || seller.bankaccount || '',
        taxId: seller.taxId || seller.taxid || '',
        address: seller.address || '',
        phone: seller.phone || '',
      });
      setEditingId(id);
      setDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (!info.name) {
      toast.error('กรุณากรอกชื่อร้าน/ผู้ขาย');
      return;
    }
    if (editingId) {
      // update
      await sellerAPI.update(editingId, info);
    } else {
      // create
      await sellerAPI.create(info);
    }
    // reload from API
    const res = await sellerAPI.getAll();
    setSellerList(res.success && Array.isArray(res.data) ? res.data : []);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setAdminPassword('');
    setShowDeleteDialog(true);
  };

  const handleCancel = () => {
    setInfo(defaultInfo);
    setEditingId('');
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!auth || !auth.login) {
      toast.error('ระบบตรวจสอบสิทธิ์ผิดพลาด');
      return;
    }
    const ok = await auth.login('admin', adminPassword);
    if (!ok) {
      toast.error('รหัสผ่าน admin ไม่ถูกต้อง');
      return;
    }
    await sellerAPI.delete(deleteId);
    const res = await sellerAPI.getAll();
    setSellerList(res.success && Array.isArray(res.data) ? res.data : []);
    toast.success('ลบข้อมูลผู้ขายเรียบร้อยแล้ว');
    if (editingId === deleteId) {
      setInfo(defaultInfo);
      setEditingId('');
      setDialogOpen(false);
    }
    setShowDeleteDialog(false);
    setDeleteId('');
    setAdminPassword('');
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-grocery-700">ตั้งค่าผู้ขาย</h2>
          </div>
          <Button className="bg-grocery-500 hover:bg-grocery-600" onClick={handleAdd}>
            + เพิ่มผู้ขาย
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-grocery-700">รายการผู้ขาย ({sellerList.length})</h2>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 'calc(100% - 70px)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสร้านค้า</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อร้าน/ผู้ขาย</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อธนาคาร</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">เลขที่บัญชี</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ที่อยู่</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">เลขผู้เสียภาษี</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sellerList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    ไม่พบข้อมูลผู้ขาย
                  </td>
                </tr>
              ) : (
                sellerList.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.shopCode || item.shopcode}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.phone}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.bankName || item.bankname}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.bankAccount || item.bankaccount}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.address}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.taxId || item.taxid}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(item.id)} className="text-xs">แก้ไข</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} className="text-xs">ลบ</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'แก้ไขข้อมูลผู้ขาย' : 'เพิ่มผู้ขายใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">รหัสร้านค้า</label>
              <Input
                name="shopCode"
                value={info.shopCode}
                onChange={handleChange}
                placeholder="รหัสร้านค้า"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อร้าน/ผู้ขาย</label>
              <Input name="name" value={info.name} onChange={handleChange} placeholder="ชื่อร้าน/ผู้ขาย" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ที่อยู่</label>
              <Input name="address" value={info.address} onChange={handleChange} placeholder="ที่อยู่" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
              <Input name="phone" value={info.phone} onChange={handleChange} placeholder="เบอร์โทรศัพท์" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">เลขประจำตัวผู้เสียภาษี (ถ้ามี)</label>
              <Input name="taxId" value={info.taxId} onChange={handleChange} placeholder="เลขประจำตัวผู้เสียภาษี" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อธนาคาร</label>
              <Input name="bankName" value={info.bankName} onChange={handleChange} placeholder="ชื่อธนาคาร" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">เลขที่บัญชีธนาคาร</label>
              <Input name="bankAccount" value={info.bankAccount} onChange={handleChange} placeholder="เลขที่บัญชีธนาคาร" />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button className="w-full bg-grocery-500 hover:bg-grocery-600" onClick={handleSave}>
              {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
            </Button>
            <Button className="w-full" variant="outline" onClick={handleCancel}>
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบผู้ขาย</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>กรุณากรอกรหัสผ่านผู้ดูแลระบบ (admin) เพื่อยืนยันการลบผู้ขาย</div>
            <Input
              type="password"
              placeholder="รหัสผ่าน admin"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-6">
            <Button className="w-full bg-grocery-500 hover:bg-grocery-600" onClick={confirmDelete}>
              ยืนยันลบ
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerInfo; 