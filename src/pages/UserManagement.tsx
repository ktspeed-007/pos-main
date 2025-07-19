import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '@/services/api';

// Use the User type from AuthContext to avoid conflicts
type UserWithPassword = {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  name: string;
  active: boolean;
  password?: string;
};

const UserManagement = () => {
  const { getAllUsers, addUser, updateUser, toggleUserActive } = useAuth();
  const [users, setUsers] = useState<UserWithPassword[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithPassword | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'staff' as 'admin' | 'staff'
  });

  // Load users when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      const res = await authAPI.getAllUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data.map(user => ({
      ...user,
      active: user.active ?? true
        })));
      }
    };
    loadUsers();
  }, []);

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: 'staff'
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user: UserWithPassword) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      name: user.name,
      role: user.role
    });
    setDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as 'admin' | 'staff' }));
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.username || (!editingUser && !formData.password)) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (editingUser) {
      // Update existing user
      const updatedUser = {
        ...editingUser,
        username: formData.username,
        name: formData.name,
        role: formData.role
      };
      
      await authAPI.updateUser(editingUser.id, updatedUser);
      const res = await authAPI.getAllUsers();
      setUsers(res.success && Array.isArray(res.data) ? res.data.map(user => ({
        ...user,
        active: user.active ?? true
      })) : []);
      toast.success('อัพเดทผู้ใช้สำเร็จ');
    } else {
      // Add new user
      const newUser = {
        id: Date.now().toString(), // This will be replaced by the API
        username: formData.username,
        role: formData.role,
        name: formData.name,
        active: true
      };
      
      await authAPI.createUser({ ...newUser, password: formData.password || 'changeme' });
      const res = await authAPI.getAllUsers();
      setUsers(res.success && Array.isArray(res.data) ? res.data.map(user => ({
        ...user,
        active: user.active ?? true
      })) : []);
      toast.success('เพิ่มผู้ใช้สำเร็จ');
    }

    setDialogOpen(false);
  };

  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const updatedUser = { ...user, active: !user.active };
      await authAPI.updateUser(userId, updatedUser);
      const res = await authAPI.getAllUsers();
      setUsers(res.success && Array.isArray(res.data) ? res.data.map(user => ({
        ...user,
        active: user.active ?? true
      })) : []);
      toast.success(`${user.active ? 'ระงับ' : 'เปิดใช้งาน'}ผู้ใช้สำเร็จ`);
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="pos-heading">จัดการผู้ใช้งานระบบ</h1>
          <Button onClick={handleAddUser}>เพิ่มผู้ใช้ใหม่</Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อผู้ใช้</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    ไม่พบผู้ใช้งาน
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                        {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'destructive'}>
                        {user.active ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        แก้ไข
                      </Button>
                      <Button 
                        variant={user.active ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.active ? 'ระงับ' : 'เปิดใช้'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'แก้ไขข้อมูลผู้ใช้ในระบบ' : 'กรอกข้อมูลเพื่อเพิ่มผู้ใช้ใหม่ในระบบ'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                ชื่อผู้ใช้
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                ชื่อ-นามสกุล
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                ประเภทผู้ใช้
              </Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="เลือกประเภทผู้ใช้" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="staff">พนักงานขาย</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                รหัสผ่าน
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder={editingUser ? "ว่างไว้ถ้าไม่ต้องการเปลี่ยน" : ""}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                ยืนยันรหัสผ่าน
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder={editingUser ? "ว่างไว้ถ้าไม่ต้องการเปลี่ยน" : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
