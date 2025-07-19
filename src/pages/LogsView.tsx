
import React, { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LogsView = () => {
  const { logs } = useStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Function to format date for display
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('th-TH');
  };

  // Function to get the action description in Thai
  const getActionDescription = (action: string) => {
    switch (action) {
      case 'login':
        return 'เข้าสู่ระบบ';
      case 'logout':
        return 'ออกจากระบบ';
      case 'cancel_receipt':
        return 'ยกเลิกใบเสร็จ';
      case 'manage_user':
        return 'จัดการผู้ใช้';
      case 'manage_product':
        return 'จัดการสินค้า';
      case 'print_barcode':
        return 'พิมพ์บาร์โค้ด';
      case 'view_report':
        return 'ดูรายงาน';
      default:
        return action;
    }
  };

  // Filter logs
  const filteredLogs = logs
    .filter(log => filterType === 'all' || log.action === filterType)
    .filter(log => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (log.user || 'ระบบ').toLowerCase().includes(query) ||
        (log.details || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">บันทึกกิจกรรมระบบ</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <Select
            value={filterType}
            onValueChange={(value) => setFilterType(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="ประเภทกิจกรรม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="login">เข้าสู่ระบบ</SelectItem>
              <SelectItem value="logout">ออกจากระบบ</SelectItem>
              <SelectItem value="cancel_receipt">ยกเลิกใบเสร็จ</SelectItem>
              <SelectItem value="manage_user">จัดการผู้ใช้</SelectItem>
              <SelectItem value="manage_product">จัดการสินค้า</SelectItem>
              <SelectItem value="print_barcode">พิมพ์บาร์โค้ด</SelectItem>
              <SelectItem value="view_report">ดูรายงาน</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-2/3">
          <Input
            placeholder="ค้นหากิจกรรม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เวลา</TableHead>
              <TableHead>ผู้ใช้งาน</TableHead>
              <TableHead>ประเภทกิจกรรม</TableHead>
              <TableHead>รายละเอียด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{formatDate(new Date(log.timestamp))}</TableCell>
                  <TableCell>{log.user || 'ระบบ'}</TableCell>
                  <TableCell>{getActionDescription(log.action)}</TableCell>
                  <TableCell>{log.details || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  ไม่พบบันทึกกิจกรรม
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LogsView;
