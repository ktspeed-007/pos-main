import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuthContext } from '../contexts/AuthContext';
import { storageLocationAPI } from '@/services/api/storageLocationAPI';

const STORAGE_LIST_KEY = 'groceryGuruStorageLocationList';

const defaultStorage = {
  id: '',
  storageCode: '',
  name: '',
  description: '',
};

const StorageLocationSettings = () => {
  const [storageList, setStorageList] = useState([]);
  const [info, setInfo] = useState(defaultStorage);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const auth = useContext(AuthContext);

  useEffect(() => {
    storageLocationAPI.getAll().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setStorageList(res.data);
      } else {
        setStorageList([]);
    }
    setLoading(false);
    });
  }, []);

  const getNextStorageCode = () => {
    if (storageList.length === 0) return 'SLOC-00001';
    const nums = storageList
      .map(w => w.storageCode)
      .filter(code => /^SLOC-\d{5}$/.test(code))
      .map(code => parseInt(code.slice(5), 10));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const next = (max + 1).toString().padStart(5, '0');
    return `SLOC-${next}`;
  };

  const handleAdd = () => {
    setInfo({
      ...defaultStorage,
      storageCode: getNextStorageCode()
    });
    setEditingId('');
    setDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    const storage = storageList.find(item => item.id === id);
    if (storage) {
      setInfo(storage);
      setEditingId(id);
      setDialogOpen(true);
    }
  };

  const handleCancel = () => {
    setInfo(defaultStorage);
    setEditingId('');
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!info.name) {
      toast.error('กรุณากรอกชื่อสถานที่เก็บ');
      return;
    }
    if (editingId) {
      // update
      await storageLocationAPI.update(editingId, info);
    } else {
      // create
      await storageLocationAPI.create(info);
    }
    // reload from API
    const res = await storageLocationAPI.getAll();
    setStorageList(res.success && Array.isArray(res.data) ? res.data : []);
    setDialogOpen(false);
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
    await handleDelete(deleteId);
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
            <h2 className="text-xl font-semibold text-grocery-700">ตั้งค่าสถานที่เก็บ</h2>
          </div>
          <Button className="bg-grocery-500 hover:bg-grocery-600" onClick={handleAdd}>
            + เพิ่มสถานที่เก็บ
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-grocery-700">รายการสถานที่เก็บ ({storageList.length})</h2>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 'calc(100% - 70px)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสสถานที่เก็บ</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อสถานที่เก็บ</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">คำอธิบาย</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {storageList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    ไม่พบข้อมูลสถานที่เก็บ
                  </td>
                </tr>
              ) : (
                storageList.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.storageCode}</div>
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
            <DialogTitle>{editingId ? 'แก้ไขสถานที่เก็บ' : 'เพิ่มสถานที่เก็บใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">รหัสสถานที่เก็บ</label>
              <Input name="storageCode" value={info.storageCode} readOnly disabled className="bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อสถานที่เก็บ</label>
              <Input name="name" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} placeholder="ชื่อสถานที่เก็บ" />
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
            <DialogTitle>ยืนยันการลบสถานที่เก็บ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>กรุณากรอกรหัสผ่านผู้ดูแลระบบ (admin) เพื่อยืนยันการลบสถานที่เก็บ</div>
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

export default StorageLocationSettings; 