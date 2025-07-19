
import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CancelReceiptDialogProps {
  open: boolean;
  saleId: string;
  onCancel: () => void;
  onConfirm: (saleId: string, password: string) => Promise<boolean>;
}

const CancelReceiptDialog: React.FC<CancelReceiptDialogProps> = ({ 
  open, 
  saleId, 
  onCancel, 
  onConfirm 
}) => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }
    
    setIsLoading(true);
    try {
      const success = await onConfirm(saleId, password);
      
      if (success) {
        toast.success('ยกเลิกใบเสร็จเรียบร้อยแล้ว');
        // Reset password field ก่อนปิด dialog
        setPassword('');
        setError('');
        // ป้องกันการ focus ที่ไม่ต้องการ
        setTimeout(() => {
        onCancel();
        }, 100);
      } else {
        setError('รหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการยกเลิก');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={() => {
      // Reset password field เมื่อปิด dialog
      setPassword('');
      setError('');
      onCancel();
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการยกเลิกใบเสร็จ</AlertDialogTitle>
          <AlertDialogDescription>
            คุณกำลังจะยกเลิกใบเสร็จหมายเลข {saleId.substring(0, 8)}
            <br />กรุณายืนยันสิทธิ์ผู้ดูแลระบบ
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="admin-password" className="text-sm font-medium">รหัสผ่านผู้ดูแลระบบ</Label>
          <Input 
            id="admin-password"
            type="password" 
            placeholder="กรอกรหัสผ่าน" 
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onFocus={(e) => {
              // ป้องกันการ focus ที่ไม่ต้องการ
              e.target.select();
            }}
            className={error ? "border-red-500" : ""}
            disabled={isLoading}
            autoComplete="off"
          />
          {error && (
            <div className="text-red-500 text-xs mt-1">{error}</div>
          )}
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setPassword('');
            setError('');
            onCancel();
          }} disabled={isLoading}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading}
            onFocus={(e) => {
              // ป้องกันการ focus ที่ไม่ต้องการ
              e.preventDefault();
            }}
          >
            {isLoading ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกใบเสร็จ'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelReceiptDialog;
