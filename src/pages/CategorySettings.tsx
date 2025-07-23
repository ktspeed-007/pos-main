import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { categoryAPI, Category } from '@/services/api';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const CategorySettings = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category> | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    const res = await categoryAPI.getAll();
    if (res.success && Array.isArray(res.data)) {
      setCategories(res.data);
    } else {
      setCategories([]);
      toast.error('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenDialog = (category: Partial<Category> | null = null) => {
    setCurrentCategory(category ? { ...category } : { name: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentCategory(null);
  };

  const handleSave = async () => {
    if (!currentCategory || !currentCategory.name?.trim()) {
      toast.error('กรุณาระบุชื่อหมวดหมู่');
      return;
    }

    try {
      if (currentCategory.id) {
        // Update existing category
        await categoryAPI.update(currentCategory.id, {
          name: currentCategory.name,
          description: currentCategory.description,
        });
        toast.success('อัปเดตหมวดหมู่เรียบร้อยแล้ว!');
      } else {
        // Create new category
        await categoryAPI.create({
          name: currentCategory.name,
          description: currentCategory.description,
        });
        toast.success('สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว!');
      }
      handleCloseDialog();
      fetchCategories();
      // Dispatch event to update categories in other parts of the app
      window.dispatchEvent(new CustomEvent('refreshCategories'));
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await categoryAPI.delete(id);
      toast.success('ลบหมวดหมู่เรียบร้อยแล้ว!');
      fetchCategories();
       // Dispatch event to update categories in other parts of the app
      window.dispatchEvent(new CustomEvent('refreshCategories'));
    } catch (error: any) {
       toast.error(error.message || 'ไม่สามารถลบหมวดหมู่ได้');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ตั้งค่าหมวดหมู่</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มหมวดหมู่ใหม่
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="text-right">การกระทำ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">กำลังโหลด...</TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">ไม่พบข้อมูลหมวดหมู่</TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>{new Date(category.created_at).toLocaleDateString('th-TH')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                          <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ การดำเนินการนี้จะลบหมวดหมู่ "{category.name}" อย่างถาวร
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-red-500 hover:bg-red-600">
                            ลบ
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory?.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">ชื่อ</Label>
              <Input
                id="name"
                value={currentCategory?.name || ''}
                onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">คำอธิบาย</Label>
              <Textarea
                id="description"
                value={currentCategory?.description || ''}
                onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>ยกเลิก</Button>
            <Button onClick={handleSave}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySettings; 