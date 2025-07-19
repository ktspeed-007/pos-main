import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../contexts/StoreContext';
import ProductScanner from './ProductScanner';
import Checkout from './Checkout';
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import ReceiptViewer from './ReceiptViewer';
import CancelReceiptDialog from './CancelReceiptDialog';
import { formatDate } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const POSScreen = () => {
  const { products, cart, addToCart, removeFromCart, updateCartItemQuantity, clearCart, completeSale, sales, cancelSale } = useStore();
  const { login } = useAuth();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCheckout, setShowCheckout] = useState(true);
  const [resetAutoSubmitSignal, setResetAutoSubmitSignal] = useState(0);
  
  const scannerRef = useRef<any>(null);
  const checkoutRef = useRef<any>(null);
  
  // Get today's sales
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  // Filter sales to only show today's sales and sort by most recent
  const todaySales = sales
    .filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= todayStart && saleDate <= todayEnd;
    })
    .sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 10); // Only get the 10 most recent

  // Calculate cart totals
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleAddToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      addToCart(product, 1);
    }
  };

  const handleViewReceipt = (saleId: string) => {
    setSelectedSaleId(saleId);
  };

  const handleCancelReceipt = (saleId: string) => {
    setSelectedSaleId(saleId);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async (saleId: string, password: string): Promise<boolean> => {
    // ตรวจสอบรหัสผ่าน admin จริง
    const ok = await login('admin', password);
    if (ok) {
      await cancelSale(saleId);
      return true;
    }
    return false;
  };

  // Keydown handler สำหรับปุ่มลัด
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCancelDialog || selectedSaleId) return;
      // Spacebar: โฟกัสช่องรับเงิน หรือถ้าอยู่ในช่องรับเงินและยังไม่ได้กรอกยอด ให้ไปปุ่มสแกนจ่าย
      if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const receivedInput = checkoutRef.current?.receivedInputRef?.current;
        if (document.activeElement === receivedInput) {
          // ถ้ายังไม่ได้กรอกยอดรับเงินหรือเป็น 0 ให้ไปปุ่มสแกนจ่าย
          if (!receivedInput.value || parseFloat(receivedInput.value) === 0) {
            checkoutRef.current?.qrButtonRef?.current?.focus();
          }
        } else {
          checkoutRef.current?.focusReceivedInput();
        }
      }
      // Enter: ถ้าอยู่ในช่องรับเงิน กดชำระเงิน
      if (e.code === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (document.activeElement === checkoutRef.current?.receivedInputRef?.current) {
          e.preventDefault();
          checkoutRef.current?.clickCashButton();
        }
      }
      // Ctrl+Enter: ถ้าอยู่ในช่องรับเงิน กดสแกนจ่าย
      if (e.code === 'Enter' && e.ctrlKey) {
        if (document.activeElement === checkoutRef.current?.receivedInputRef?.current) {
          e.preventDefault();
          checkoutRef.current?.clickQRButton();
        }
      }
      // ESC: กลับไปช่องสแกนสินค้า
      if (e.code === 'Escape') {
        e.preventDefault();
        scannerRef.current?.focusBarcodeInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCancelDialog, selectedSaleId]);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative">
      {/* Left column - Recent Sales */}
      <div className={`md:w-7/12 flex flex-col h-full ${showCheckout ? 'md:mr-[36%]' : ''}`}>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
          <ProductScanner 
            ref={scannerRef}
            onProductScan={(barcode) => {
              const barcodeInput = barcode.trim().toLowerCase();
              const product = products.find(p =>
                (p.barcode && p.barcode.toLowerCase() === barcodeInput) ||
                (p.qrcode && p.qrcode.toLowerCase() === barcodeInput)
              );
              if (product && product.active) {
                addToCart(product, 1);
                return true;
              }
              return false;
            }}
            resetAutoSubmitSignal={resetAutoSubmitSignal}
          />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex-1 overflow-auto">
          <h2 className="text-xl font-semibold text-grocery-700 mb-4">รายการขายล่าสุดของวันนี้</h2>
          
          {todaySales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ยังไม่มีการขายวันนี้
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="px-1 py-1">เลขที่ใบเสร็จ</TableHead>
                    <TableHead className="px-1 py-1">เวลา</TableHead>
                    <TableHead className="px-1 py-1">จำนวน</TableHead>
                    <TableHead className="px-1 py-1">ยอดรวม</TableHead>
                    <TableHead className="px-1 py-1">รับเงิน</TableHead>
                    <TableHead className="px-1 py-1">ทอนเงิน</TableHead>
                    <TableHead className="px-1 py-1">การชำระ</TableHead>
                    <TableHead className="p-0 text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySales.map((sale) => {
                    // Calculate total items
                    const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                    const receiptAmount = sale.receivedAmount !== undefined ? sale.receivedAmount : '-';
                    const change = sale.changeAmount !== undefined ? sale.changeAmount : 0;
                    
                    return (
                      <TableRow 
                        key={sale.id} 
                        className={`text-xs ${sale.canceled ? "bg-red-50" : ""}`}
                      >
                        <TableCell className="font-medium px-1 py-1">
                          {sale.id}
                          {sale.canceled && (
                            <Badge variant="destructive" className="ml-2">ยกเลิกแล้ว</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-1 py-1">{formatDate(new Date(sale.timestamp))}</TableCell>
                        <TableCell className="px-1 py-1">{totalItems}</TableCell>
                        <TableCell className="px-1 py-1">฿{sale.total.toFixed(2)}</TableCell>
                        <TableCell className="px-1 py-1">{receiptAmount !== '-' ? `฿${Number(receiptAmount).toFixed(2)}` : '-'}</TableCell>
                        <TableCell className="px-1 py-1">฿{Number(change).toFixed(2)}</TableCell>
                        <TableCell className="px-1 py-1">
                          <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                            {sale.paymentMethod === 'cash' ? 'เงินสด' : 'SCAN'}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-0">
                          <div className="flex justify-center gap-1">
                            <button 
                              className="px-0.5 py-0.5 h-6 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              onClick={() => handleViewReceipt(sale.id)}
                            >
                              ดูใบเสร็จ
                            </button>
                            {!sale.canceled && (
                              <button 
                                className="px-0.5 py-0.5 h-6 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                onClick={() => handleCancelReceipt(sale.id)}
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Receipt viewer dialog */}
      {selectedSaleId && (
        <ReceiptViewer 
          saleId={selectedSaleId}
          open={selectedSaleId !== null && !showCancelDialog}
          onClose={() => setSelectedSaleId(null)}
        />
      )}

      {/* Cancel receipt dialog */}
      {showCancelDialog && selectedSaleId && (
        <CancelReceiptDialog
          open={showCancelDialog}
          saleId={selectedSaleId}
          onCancel={() => {
            setShowCancelDialog(false);
            setSelectedSaleId(null);
          }}
          onConfirm={handleConfirmCancel}
        />
      )}

      {showCheckout && (
        <div className="fixed right-0 top-[72px] h-[calc(100vh-72px)] w-full md:w-[36%] z-50 bg-white border-l border-gray-200 shadow-lg flex flex-col">
          <Checkout
            ref={checkoutRef}
            cart={cart}
            onUpdateQuantity={updateCartItemQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onCompleteSale={async (...args) => {
              await completeSale(...args);
              setResetAutoSubmitSignal((v) => v + 1);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default POSScreen;
