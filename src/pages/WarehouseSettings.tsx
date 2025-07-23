import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuthContext } from '../contexts/AuthContext';
import { warehouseAPI } from '@/services/api/warehouseAPI';

const WAREHOUSE_LIST_KEY = 'groceryGuruWarehouseList';

const defaultWarehouse = {
  id: '',
  warehouseCode: '',
  name: '',
  description: '',
};

const WarehouseSettings = () => {
  const [warehouseList, setWarehouseList] = useState([]);
  const [info, setInfo] = useState(defaultWarehouse);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [codeError, setCodeError] = useState('');
  const auth = useContext(AuthContext);

  useEffect(() => {
    warehouseAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setWarehouseList(res.data);
      } else {
        setWarehouseList([]);
    }
    setLoading(false);
    });
  }, []);

  // เพิ่ม useEffect สำหรับ generate รหัสคลังสินค้าอัตโนมัติเมื่อ dialog เปิด (เฉพาะกรณีเพิ่มใหม่)
  useEffect(() => {
    if (dialogOpen && !editingId) {
      setInfo(prev => ({
        ...prev,
        warehouseCode: getNextWarehouseCode()
      }));
    }
    // eslint-disable-next-line
  }, [dialogOpen, warehouseList]);

  const getNextWarehouseCode = () => {
    const codes = warehouseList
      .map(w => (w.warehouseCode || w.warehousecode || '').match(/^W-(\d{5})$/))
      .filter(Boolean)
      .map(match => parseInt(match[1], 10));
    const max = codes.length > 0 ? Math.max(...codes) : 0;
    const next = (max + 1).toString().padStart(5, '0');
    return `W-${next}`;
  };

  const handleAdd = () => {
    setInfo(defaultWarehouse);
    setEditingId('');
    setCodeError('');
    setDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    const warehouse = warehouseList.find(item => item.id === id);
    if (warehouse) {
      setInfo({
        id: warehouse.id,
        warehouseCode: warehouse.warehouseCode || warehouse.warehousecode || '',
        name: warehouse.name || '',
        description: warehouse.description || '',
      });
      setEditingId(id);
      setDialogOpen(true);
      setCodeError('');
    }
  };

  const handleCancel = () => {
    setInfo(defaultWarehouse);
    setEditingId('');
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!info.name) {
      toast.error('กรุณากรอกชื่อคลังสินค้า');
      return;
    }
    // ตรวจสอบรหัสซ้ำ (ยกเว้นกรณีแก้ไขและ id เดิม)
    const code = info.warehouseCode.trim();
    const isDuplicate = warehouseList.some(w => (w.warehouseCode || w.warehousecode) === code && w.id !== editingId);
    if (isDuplicate) {
      setCodeError('รหัสคลังสินค้านี้ถูกใช้ไปแล้ว');
      toast.error('รหัสคลังสินค้านี้ถูกใช้ไปแล้ว');
      return;
    } else {
      setCodeError('');
    }
    try {
      if (editingId) {
        // update
        const updateData = { ...info, id: editingId };
        console.log('handleSave: update', updateData);
        await warehouseAPI.update(editingId, updateData);
      } else {
        // create
        console.log('handleSave: create', info);
        await warehouseAPI.create(info);
      }
      // reload from API
      const res = await warehouseAPI.getAll();
      setWarehouseList(res.success && Array.isArray(res.data) ? res.data : []);
      setDialogOpen(false);
    } catch (err: any) {
      console.error('handleSave error', err);
      if (err?.response?.status === 409) {
        setCodeError('รหัสคลังสินค้านี้ถูกใช้ไปแล้ว');
        toast.error('รหัสคลังสินค้านี้ถูกใช้ไปแล้ว');
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึก');
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setAdminPassword('');
    setShowDeleteDialog(true);
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
    await warehouseAPI.delete(deleteId);
    const res = await warehouseAPI.getAll();
    setWarehouseList(res.success && Array.isArray(res.data) ? res.data : []);
    toast.success('ลบข้อมูลคลังสินค้าเรียบร้อยแล้ว');
    if (editingId === deleteId) {
      setInfo(defaultWarehouse);
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

  // Debug log
  console.log('warehouseList', warehouseList);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-grocery-700">ตั้งค่าคลังสินค้า</h2>
          </div>
          <Button className="bg-grocery-500 hover:bg-grocery-600" onClick={handleAdd}>
            + เพิ่มคลังสินค้า
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-grocery-700">รายการคลังสินค้า ({warehouseList.length})</h2>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 'calc(100% - 70px)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสคลัง</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อคลัง</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">คำอธิบาย</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {warehouseList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    ไม่พบข้อมูลคลังสินค้า
                  </td>
                </tr>
              ) : (
                warehouseList
                  .slice()
                  .sort((a, b) => (a.warehouseCode || a.warehousecode).localeCompare(b.warehouseCode || b.warehousecode))
                  .map(item => (
                    <tr key={item.id}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.warehouseCode || item.warehousecode}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.description}</div>
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
            <DialogTitle>{editingId ? 'แก้ไขคลังสินค้า' : 'เพิ่มคลังสินค้าใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">รหัสคลัง</label>
              <Input
                name="warehouseCode"
                value={info.warehouseCode}
                onChange={e => setInfo({ ...info, warehouseCode: e.target.value })}
                placeholder="รหัสคลัง"
              />
              {codeError && <div className="text-red-500 text-xs mt-1">{codeError}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อคลัง</label>
              <Input name="name" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} placeholder="ชื่อคลัง" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">คำอธิบาย</label>
              <Input name="description" value={info.description} onChange={e => setInfo({ ...info, description: e.target.value })} placeholder="คำอธิบาย" />
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
            <DialogTitle>ยืนยันการลบคลังสินค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>กรุณากรอกรหัสผ่านผู้ดูแลระบบ (admin) เพื่อยืนยันการลบคลังสินค้า</div>
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

export default WarehouseSettings; 