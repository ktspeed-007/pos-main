import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CartItem } from '../../contexts/StoreContext';
import { Printer, Calculator } from 'lucide-react';

type CheckoutProps = {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCompleteSale: (paymentMethod: 'cash' | 'qrcode', receivedAmount: number, changeAmount: number) => void;
};

const Checkout = forwardRef(({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCompleteSale
}: CheckoutProps, ref) => {
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [change, setChange] = useState<number | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const receivedInputRef = useRef<HTMLInputElement>(null);
  const cashButtonRef = useRef<HTMLButtonElement>(null);
  const qrButtonRef = useRef<HTMLButtonElement>(null);
  
  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  
  // Calculate change whenever received amount changes
  useEffect(() => {
    if (!receivedAmount || isNaN(parseFloat(receivedAmount))) {
      setChange(null);
      return;
    }
    
    const receivedAmountNum = parseFloat(receivedAmount);
    const changeAmount = receivedAmountNum - cartTotal;
    
    setChange(changeAmount >= 0 ? changeAmount : null);
  }, [receivedAmount, cartTotal]);
  
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    onUpdateQuantity(productId, newQuantity);
  };
  
  const handleCashPayment = () => {
    const receivedAmountNum = parseFloat(receivedAmount);
    
    if (!receivedAmount.trim() || isNaN(receivedAmountNum)) {
      toast.error('กรุณาระบุจำนวนเงินที่รับมา');
      return;
    }
    
    if (receivedAmountNum < cartTotal) {
      toast.error('จำนวนเงินไม่เพียงพอ');
      return;
    }
    
    const changeAmount = receivedAmountNum - cartTotal;
    
    toast.success(`เงินทอน: ${changeAmount.toFixed(2)} บาท`, {
      duration: 5000
    });
    
    onCompleteSale('cash', receivedAmountNum, changeAmount);
    setShowPaymentOptions(false);
    setReceivedAmount('');
    setChange(null);
  };
  
  const handleQRPayment = () => {
    // In a real implementation, this would integrate with a QR code payment service
    toast.success('กรุณาให้ลูกค้าสแกน QR Code เพื่อชำระเงิน');
    setReceivedAmount(cartTotal.toString());
    setTimeout(() => {
      // Simulate payment completion after 2 seconds
      onCompleteSale('qrcode', cartTotal, 0); // ส่ง receivedAmount = cartTotal, changeAmount = 0
      // printReceipt(cartTotal, 0); // ถ้าต้องการพิมพ์ใบเสร็จ
      setShowPaymentOptions(false);
      setReceivedAmount('');
      setChange(null);
    }, 2000);
  };

  const printReceipt = (receivedAmt: number, changeAmt: number) => {
    // In a real implementation, this would connect to a receipt printer
    // Here we'll just create a receipt and "print" to a new window
    
    if (!receiptRef.current) return;

    const receiptContent = receiptRef.current.innerHTML;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>ใบเสร็จรับเงิน - Grocery Guru</title>
            <style>
              body {
                font-family: 'TH Sarabun New', 'Sarabun', sans-serif;
                font-size: 12px;
                width: 57mm;
                padding: 3mm;
                margin: 0;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 10px;
              }
              .receipt-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              }
              .receipt-total {
                font-weight: bold;
                margin-top: 10px;
                border-top: 1px dashed #000;
                padding-top: 8px;
              }
              .receipt-payment {
                margin-top: 8px;
                border-top: 1px dashed #000;
                padding-top: 8px;
              }
              .receipt-footer {
                text-align: center;
                margin-top: 15px;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            ${receiptContent}
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      toast.success('กำลังพิมพ์ใบเสร็จ');
    } else {
      toast.error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้');
    }
  };

  // For the "Print Receipt" button outside of payment flow
  const handlePrintReceipt = () => {
    // For standalone receipt printing (not during payment), use current cart total
    // with no change since we don't know payment details yet
    printReceipt(cartTotal, 0);
  };
  
  useImperativeHandle(ref, () => ({
    focusReceivedInput: () => receivedInputRef.current?.focus(),
    clickCashButton: () => cashButtonRef.current?.click(),
    clickQRButton: () => qrButtonRef.current?.click(),
    receivedInputRef,
    qrButtonRef,
  }));
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full min-h-[500px]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-grocery-700 text-center">ตะกร้าสินค้า</h2>
      </div>
      
      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
          <div className="text-center">
            <div className="text-5xl mb-4">🛒</div>
            <p>ยังไม่มีสินค้าในตะกร้า</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 h-full">
          {/* รายการสินค้าในตะกร้า */}
          <div className="flex-1 overflow-auto p-4">
            {cart.map((item) => (
              <div 
                key={item.product.id} 
                className="py-3 border-b border-gray-100 last:border-0 flex items-center"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.product.name}</div>
                  <div className="text-gray-500 text-xs">฿{item.product.price.toFixed(2)} ต่อชิ้น</div>
                </div>
                <div className="flex items-center mr-4">
                  <button
                    onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
                <div className="text-right w-20">
                  <div className="font-medium">฿{(item.product.price * item.quantity).toFixed(2)}</div>
                </div>
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                  className="ml-4 text-red-500 hover:text-red-700 text-sm"
                  >
                    ลบ
                  </button>
              </div>
            ))}
          </div>
          {/* ส่วนสรุปยอดและปุ่มชำระเงิน */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex justify-between mb-2">
              <span>จำนวนสินค้า:</span>
              <span>{cart.reduce((count, item) => count + item.quantity, 0)} ชิ้น</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-semibold">ยอดรวม:</span>
              <span className="text-xl font-bold text-green-700">฿{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-center items-center mb-2">
              <span className="mr-2 text-xl font-semibold">รับเงิน:</span>
              <input
                          type="number"
                min="0"
                step="0.01"
                          value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value)}
                className="w-56 px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-grocery-500 text-center text-xl font-bold"
                placeholder="0.00"
                disabled={showPaymentOptions}
                ref={receivedInputRef}
              />
              <span className="ml-2 text-xl font-semibold">บาท</span>
                            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-semibold">เงินทอน:</span>
              <span className="text-xl font-bold text-blue-700">{change !== null ? `฿${change.toFixed(2)}` : '-'}</span>
                            </div>
            <div className="flex flex-col gap-2 mt-4">
                        <Button 
                          onClick={handleCashPayment}
                          className="w-full bg-grocery-500 hover:bg-grocery-600"
                          disabled={change === null || change < 0}
                ref={cashButtonRef}
                        >
                ชำระเงิน
                        </Button>
              <Button
                      onClick={handleQRPayment}
                className="w-full bg-blue-500 hover:bg-blue-600"
                variant="outline"
                ref={qrButtonRef}
                        >
                สแกนจ่าย (QR)
                        </Button>
                      </div>
                <Button 
              onClick={onClearCart}
              className="w-full mt-4"
                  variant="outline"
            >
              ล้างตะกร้า
                </Button>
          </div>
        </div>
      )}
      
      {/* Hidden receipt template for printing */}
      <div className="hidden">
        <div ref={receiptRef} className="receipt-template">
          <div className="receipt-header">
            <div className="font-bold">Grocery Guru POS</div>
            <div>ใบเสร็จรับเงิน</div>
            <div>{new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
          
          <div className="receipt-items">
            {cart.map((item) => (
              <div key={item.product.id} className="receipt-item">
                <div>
                  <span>{item.product.name} × {item.quantity}</span>
                </div>
                <div>฿{(item.product.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          
          <div className="receipt-total">
            <div className="receipt-item">
              <span>จำนวนสินค้ารวม</span>
              <span>{cart.reduce((count, item) => count + item.quantity, 0)} ชิ้น</span>
            </div>
            <div className="receipt-item">
              <span>ยอดรวมทั้งสิ้น</span>
              <span>฿{cartTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="receipt-payment">
            <div className="receipt-item">
              <span>รับเงิน</span>
              <span>฿{parseFloat(receivedAmount || "0").toFixed(2)}</span>
            </div>
            <div className="receipt-item">
              <span>เงินทอน</span>
              <span>฿{(change !== null ? change : 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="receipt-footer">
            <div>ขอบคุณที่ใช้บริการ</div>
            <div>Grocery Guru POS</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Checkout;
