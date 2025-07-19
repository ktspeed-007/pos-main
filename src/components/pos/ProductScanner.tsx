import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type ProductScannerProps = {
  onProductScan: (barcode: string) => boolean;
  resetAutoSubmitSignal?: number;
};

const ProductScanner = forwardRef(({ onProductScan, resetAutoSubmitSignal }: ProductScannerProps, ref) => {
  const [barcode, setBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [autoSubmit, setAutoSubmit] = useState(true);
  
  // Always focus input on component mount and after each successful scan
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Auto-submit when barcode reaches appropriate length
  useEffect(() => {
    if (!autoSubmit) return;
    if (barcode.length >= 6) {
      const timeoutId = setTimeout(() => {
        handleSubmit();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [barcode, autoSubmit]);

  // เปิด auto-submit อัตโนมัติเมื่อ resetAutoSubmitSignal เปลี่ยน
  useEffect(() => {
    setAutoSubmit(true);
  }, [resetAutoSubmitSignal]);

  useImperativeHandle(ref, () => ({
    focusBarcodeInput: () => barcodeInputRef.current?.focus(),
  }));

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!barcode.trim()) {
      toast.error('กรุณาระบุบาร์โค้ด');
      return;
    }
    
    const found = onProductScan(barcode);
    
    if (!found) {
      toast.error('ไม่พบสินค้าที่ตรงกับบาร์โค้ดนี้');
    }
    
    // Clear input for next scan
    setBarcode('');
    
    // Focus back on input for next scan
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center mb-2 gap-2">
        <Switch id="auto-submit-toggle" checked={autoSubmit} onCheckedChange={setAutoSubmit} />
        <label htmlFor="auto-submit-toggle" className="text-sm select-none">
          โหมดสแกนอัตโนมัติ (Auto-submit)
        </label>
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-grocery-700">สแกนสินค้า</h2>
        <p className="text-sm text-gray-500">สแกนบาร์โค้ดหรือ QR โค้ดเพื่อเพิ่มสินค้า (เพิ่มอัตโนมัติเมื่อสแกน)</p>
      </div>
      
      <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2">
        <Input
          ref={barcodeInputRef}
          type="text"
          placeholder="สแกนบาร์โค้ดหรือ QR โค้ด..."
          className="flex-1"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" disabled={autoSubmit}>เพิ่ม</Button>
      </form>
    </div>
  );
});

export default ProductScanner;
