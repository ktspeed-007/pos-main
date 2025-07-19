import React, { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from 'date-fns/locale';
import { Calendar as CalendarIcon } from "lucide-react";
import ReceiptViewer from '@/components/pos/ReceiptViewer';
import CancelReceiptDialog from '@/components/pos/CancelReceiptDialog';

const SalesHistory = () => {
  const { sales, cancelSale } = useStore();
  const { login } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Function to format date for display
  const formatDate = (date: Date, showTime = true) => {
    const d = new Date(date);
    if (showTime) {
      return d.toLocaleString('th-TH');
    }
    return d.toLocaleDateString('th-TH');
  };

  // Filter sales
  const filteredSales = sales
    .filter(sale => {
      // Filter by date
      if (date) {
        const saleDate = new Date(sale.timestamp);
        return (
          saleDate.getDate() === date.getDate() &&
          saleDate.getMonth() === date.getMonth() &&
          saleDate.getFullYear() === date.getFullYear()
        );
      }
      return true;
    })
    .filter(sale => {
      // Filter by search query
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        sale.id.toLowerCase().includes(query) ||
        formatDate(new Date(sale.timestamp)).toLowerCase().includes(query) ||
        sale.paymentMethod.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
      setSearchQuery('');
      return true;
    }
    return false;
  };

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.canceled ? 0 : sale.total), 0);
  const totalItems = filteredSales.reduce((sum, sale) => {
    if (sale.canceled) return sum;
    return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
  const canceledCount = filteredSales.filter(sale => sale.canceled).length;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">ประวัติการขาย</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'dd MMMM yyyy', { locale: th }) : "เลือกวันที่"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-full md:w-2/3 flex gap-2">
          <Input
            placeholder="ค้นหาประวัติการขาย..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          {(date || searchQuery) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setDate(undefined);
                setSearchQuery('');
              }}
            >
              ล้าง
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">ยอดขายรวม</h3>
          <p className="text-2xl font-bold">฿{totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">จำนวนสินค้า</h3>
          <p className="text-2xl font-bold">{totalItems} ชิ้น</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">ยกเลิก</h3>
          <p className="text-2xl font-bold">{canceledCount} รายการ</p>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่ใบเสร็จ</TableHead>
              <TableHead>วันที่/เวลา</TableHead>
              <TableHead>จำนวน</TableHead>
              <TableHead>ยอดรวม</TableHead>
              <TableHead>รับเงิน</TableHead>
              <TableHead>ทอนเงิน</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => {
                const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                const receiptAmount = sale.receivedAmount || sale.total;
                const change = sale.receivedAmount ? (sale.receivedAmount - sale.total) : 0;
                
                return (
                  <TableRow 
                    key={sale.id} 
                    className={sale.canceled ? "bg-red-50" : ""}
                  >
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{formatDate(new Date(sale.timestamp))}</TableCell>
                    <TableCell>{totalItems}</TableCell>
                    <TableCell>฿{sale.total.toFixed(2)}</TableCell>
                    <TableCell>฿{receiptAmount.toFixed(2)}</TableCell>
                    <TableCell>฿{change.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                        {sale.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.canceled ? (
                        <Badge variant="destructive">ยกเลิกแล้ว</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50">เสร็จสมบูรณ์</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewReceipt(sale.id)}
                        >
                          ดูใบเสร็จ
                        </Button>
                        {!sale.canceled && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleCancelReceipt(sale.id)}
                          >
                            ยกเลิก
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  ไม่พบประวัติการขาย
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
    </div>
  );
};

export default SalesHistory;
