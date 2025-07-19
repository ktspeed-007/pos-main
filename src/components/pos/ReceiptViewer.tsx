
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';

interface ReceiptViewerProps {
  saleId: string;
  open: boolean;
  onClose: () => void;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ saleId, open, onClose }) => {
  const { sales } = useStore();
  const sale = sales.find(s => s.id === saleId);

  if (!sale) return null;

  const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const receiptDate = new Date(sale.timestamp);
  const receiptAmount = sale.receivedAmount || sale.total;
  const change = sale.receivedAmount ? (sale.receivedAmount - sale.total) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">ใบเสร็จรับเงิน {sale.canceled && "- ยกเลิกแล้ว"}</DialogTitle>
        </DialogHeader>
        
        <div className="receipt-container p-4 border rounded bg-white">
          <div className="text-center mb-4 receipt-header">
            <h2 className="text-lg font-bold">Grocery Guru POS</h2>
            <p className="text-sm">ใบเสร็จรับเงิน</p>
            <p className="text-sm">
              {receiptDate.toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm">
              {receiptDate.toLocaleTimeString('th-TH')}
            </p>
            <p className="text-xs mt-1">เลขที่: {sale.id}</p>
          </div>

          <div className="receipt-items border-t border-b py-2 my-2">
            <div className="grid grid-cols-12 font-semibold text-sm mb-1">
              <div className="col-span-7">รายการ</div>
              <div className="col-span-2 text-right">ราคา</div>
              <div className="col-span-1 text-center">จำนวน</div>
              <div className="col-span-2 text-right">รวม</div>
            </div>
            {sale.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 text-sm py-1">
                <div className="col-span-7 truncate">{item.product.name}</div>
                <div className="col-span-2 text-right">{item.product.price.toFixed(2)}</div>
                <div className="col-span-1 text-center">{item.quantity}</div>
                <div className="col-span-2 text-right">
                  {(item.product.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="receipt-summary text-sm">
            <div className="flex justify-between my-1">
              <span>จำนวนรายการ:</span>
              <span>{sale.items.length} รายการ ({totalItems} ชิ้น)</span>
            </div>
            <div className="flex justify-between font-bold my-1">
              <span>ยอดรวม:</span>
              <span>฿{sale.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="receipt-payment border-t pt-2 mt-2 text-sm">
            <div className="flex justify-between my-1">
              <span>ชำระโดย:</span>
              <span>{sale.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}</span>
            </div>
            <div className="flex justify-between my-1">
              <span>รับเงิน:</span>
              <span>฿{receiptAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between my-1">
              <span>เงินทอน:</span>
              <span>฿{change.toFixed(2)}</span>
            </div>
          </div>

          {sale.canceled && (
            <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-center text-red-600">
              ใบเสร็จนี้ถูกยกเลิกแล้ว
            </div>
          )}

          <div className="receipt-footer mt-4 text-center text-xs">
            <p>ขอบคุณที่ใช้บริการ</p>
            <p>Grocery Guru POS</p>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Button onClick={handlePrint}>พิมพ์ใบเสร็จ</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewer;
