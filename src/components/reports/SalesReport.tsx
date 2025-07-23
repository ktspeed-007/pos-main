import React, { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Category } from '@/services/api';

const SalesReport = () => {
  const { products, sales, categories, getDailySales, getMonthlySales, getYearlySales } = useStore();
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly' | 'product' | 'single-product' | 'category' | 'best-sellers'>('daily');
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Current date for filtering
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  
  // New filters
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  
  // Generate report data based on type
  useEffect(() => {
    setIsLoading(true);
    
    // สำหรับ best-sellers ต้องมี products ด้วย
    if (reportType === 'best-sellers' && products.length === 0) {
      setReportData([]);
      setIsLoading(false);
      return;
    }
    
    // สำหรับรายงานอื่นๆ ต้องมี sales
    if (reportType !== 'best-sellers' && sales.length === 0) {
      setReportData([]);
      setIsLoading(false);
      return;
    }
    
    // Filter sales by date range
    const filterSalesByDateRange = (salesData: any[]) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      
      switch (dateRange) {
        case 'today':
          return salesData.filter(sale => new Date(sale.timestamp) >= today);
        case 'week':
          return salesData.filter(sale => new Date(sale.timestamp) >= weekAgo);
        case 'month':
          return salesData.filter(sale => new Date(sale.timestamp) >= monthAgo);
        case 'year':
          return salesData.filter(sale => new Date(sale.timestamp) >= yearAgo);
        default:
          return salesData;
      }
    };
    
    const filteredSales = filterSalesByDateRange(sales);
    
    switch (reportType) {
      case 'daily': {
        const date = new Date(selectedDate);
        const dailySales = getDailySales(date);
        
        // Group sales by hour
        const hourlyData: Record<string, { hour: string; sales: number; count: number }> = {};
        
        dailySales.forEach(sale => {
          const hour = new Date(sale.timestamp).getHours();
          const hourStr = `${hour}:00`;
          
          if (!hourlyData[hourStr]) {
            hourlyData[hourStr] = { hour: hourStr, sales: 0, count: 0 };
          }
          
          hourlyData[hourStr].sales += sale.total;
          hourlyData[hourStr].count += 1;
        });
        
        const data = Object.values(hourlyData).sort((a, b) => {
          return parseInt(a.hour) - parseInt(b.hour);
        });
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
      
      case 'monthly': {
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthlySales = getMonthlySales(month - 1, year);
        
        // Group sales by day
        const dailyData: Record<string, { day: string; sales: number; count: number }> = {};
        
        monthlySales.forEach(sale => {
          const day = new Date(sale.timestamp).getDate();
          const dayStr = `วันที่ ${day}`;
          
          if (!dailyData[dayStr]) {
            dailyData[dayStr] = { day: dayStr, sales: 0, count: 0 };
          }
          
          dailyData[dayStr].sales += sale.total;
          dailyData[dayStr].count += 1;
        });
        
        const data = Object.values(dailyData).sort((a, b) => {
          return parseInt(a.day.replace('วันที่ ', '')) - parseInt(b.day.replace('วันที่ ', ''));
        });
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
      
      case 'yearly': {
        const yearlySales = getYearlySales(selectedYear);
        
        // Group sales by month
        const monthlyData: Record<string, { month: string; sales: number; count: number }> = {};
        const monthNames = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        
        yearlySales.forEach(sale => {
          const month = new Date(sale.timestamp).getMonth();
          const monthStr = monthNames[month];
          
          if (!monthlyData[monthStr]) {
            monthlyData[monthStr] = { month: monthStr, sales: 0, count: 0 };
          }
          
          monthlyData[monthStr].sales += sale.total;
          monthlyData[monthStr].count += 1;
        });
        
        // Ensure all months are represented
        monthNames.forEach((month, index) => {
          if (!monthlyData[month]) {
            monthlyData[month] = { month, sales: 0, count: 0 };
          }
        });
        
        const data = monthNames.map(month => monthlyData[month]);
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
      
      case 'product': {
        // Calculate sales by product
        const productSalesMap: Record<string, { name: string; sales: number; count: number }> = {};
        
        filteredSales.forEach(sale => {
          sale.items.forEach(item => {
            const { id, name } = item.product;
            
            if (!productSalesMap[id]) {
              productSalesMap[id] = { name, sales: 0, count: 0 };
            }
            
            productSalesMap[id].sales += item.product.price * item.quantity;
            productSalesMap[id].count += item.quantity;
          });
        });
        
        const data = Object.values(productSalesMap)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10); // Top 10 products
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
      
      case 'single-product': {
        if (!selectedProduct) {
          setReportData([]);
          setIsLoading(false);
          return;
        }
        
        // Filter sales for specific product
        const productSales = filteredSales.filter(sale => 
          sale.items.some(item => item.product.id === selectedProduct)
        );
        
        // Group by date
        const dailyData: Record<string, { date: string; sales: number; count: number }> = {};
        
        productSales.forEach(sale => {
          const date = new Date(sale.timestamp).toLocaleDateString('th-TH');
          const items = sale.items.filter(item => item.product.id === selectedProduct);
          
          if (!dailyData[date]) {
            dailyData[date] = { date, sales: 0, count: 0 };
          }
          
          items.forEach(item => {
            dailyData[date].sales += item.product.price * item.quantity;
            dailyData[date].count += item.quantity;
          });
        });
        
        const data = Object.values(dailyData).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
      
      case 'category': {
        if (!selectedCategoryId) {
          setReportData([]);
          setIsLoading(false);
          return;
        }
        
        // Filter products by category
        const categoryProducts = products.filter(p => String(p.categoryId) === selectedCategoryId);
        const categoryProductIds = categoryProducts.map(p => p.id);
        
        // Calculate sales for category
        const categorySalesMap: Record<string, { name: string; sales: number; count: number }> = {};
        
        filteredSales.forEach(sale => {
          sale.items.forEach(item => {
            if (categoryProductIds.includes(item.product.id)) {
              const { id, name } = item.product;
              
              if (!categorySalesMap[id]) {
                categorySalesMap[id] = { name, sales: 0, count: 0 };
              }
              
              categorySalesMap[id].sales += item.product.price * item.quantity;
              categorySalesMap[id].count += item.quantity;
            }
          });
        });
        
        const data = Object.values(categorySalesMap)
          .sort((a, b) => b.sales - a.sales);
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
      
      case 'best-sellers': {
        // Calculate sales by product (all products, sorted by quantity sold)
        const productSalesMap: Record<string, { 
          name: string; 
          sales: number; 
          count: number; 
          category: string;
          price: number;
        }> = {};
        
        // Initialize with all products (even if no sales)
        products.forEach(product => {
          productSalesMap[product.id] = { 
            name: product.name, 
            sales: 0, 
            count: 0, 
            category: product.categoryName || 'ไม่มีหมวดหมู่',
            price: product.price 
          };
        });
        
        // Add sales data
        filteredSales.forEach(sale => {
          sale.items.forEach(item => {
            const { id, name, category, price } = item.product;
            
            if (productSalesMap[id]) {
              productSalesMap[id].sales += item.product.price * item.quantity;
              productSalesMap[id].count += item.quantity;
            }
          });
        });
        
        const data = Object.values(productSalesMap)
          .sort((a, b) => b.count - a.count) // Sort by quantity sold
          .slice(0, 20); // Top 20 products
        
        setReportData(data);
        setIsLoading(false);
        break;
      }
    }
  }, [reportType, selectedDate, selectedMonth, selectedYear, selectedProduct, selectedCategoryId, dateRange, sales, products, categories, getDailySales, getMonthlySales, getYearlySales]);
  
  // Calculate totals
  const totalSales = reportData.reduce((sum, item) => sum + item.sales, 0);
  const totalCount = reportData.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
            >
              <option value="daily">รายงานประจำวัน</option>
              <option value="monthly">รายงานรายเดือน</option>
              <option value="yearly">รายงานรายปี</option>
              <option value="product">รายงานตามสินค้า</option>
              <option value="single-product">รายงานสินค้าเดี่ยว</option>
              <option value="category">รายงานตามหมวดหมู่</option>
              <option value="best-sellers">สินค้าขายดี</option>
            </select>
          </div>
          
          {/* Date range filter for product reports */}
          {(reportType === 'product' || reportType === 'single-product' || reportType === 'category' || reportType === 'best-sellers') && (
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <option value="all">ทั้งหมด</option>
                <option value="today">วันนี้</option>
                <option value="week">7 วันล่าสุด</option>
                <option value="month">เดือนนี้</option>
                <option value="year">ปีนี้</option>
              </select>
            </div>
          )}
          
          {reportType === 'daily' && (
            <div>
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}
          
          {reportType === 'monthly' && (
            <div>
              <input
                type="month"
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          )}
          
          {reportType === 'yearly' && (
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {reportType === 'single-product' && (
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">เลือกสินค้า</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {reportType === 'category' && (
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-grocery-700">
            {reportType === 'daily' && `รายงานยอดขายประจำวัน ${selectedDate}`}
            {reportType === 'monthly' && `รายงานยอดขายประจำเดือน ${selectedMonth}`}
            {reportType === 'yearly' && `รายงานยอดขายประจำปี ${selectedYear}`}
            {reportType === 'product' && `รายงานยอดขายตามสินค้า (10 อันดับแรก)`}
            {reportType === 'single-product' && selectedProduct && `รายงานยอดขาย: ${products.find(p => p.id === selectedProduct)?.name}`}
            {reportType === 'category' && selectedCategoryId && `รายงานยอดขายหมวดหมู่: ${categories.find(c => String(c.id) === selectedCategoryId)?.name}`}
            {reportType === 'best-sellers' && `สินค้าขายดี (20 อันดับแรก)`}
          </h2>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-lg font-medium text-gray-700 mb-2">ยอดขายรวม</h3>
            <p className="text-3xl font-bold text-grocery-600">฿{totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {reportType === 'best-sellers' ? 'จำนวนชิ้นรวม' : 'จำนวนรายการ'}
            </h3>
            <p className="text-3xl font-bold text-grocery-600">{totalCount.toLocaleString('th-TH')}</p>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grocery-500 mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : reportData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                {reportType === 'single-product' && !selectedProduct ? 'กรุณาเลือกสินค้า' :
                 reportType === 'category' && !selectedCategoryId ? 'กรุณาเลือกหมวดหมู่' :
                 reportType === 'best-sellers' && products.length === 0 ? 'กำลังโหลดข้อมูลสินค้า...' :
                 reportType === 'best-sellers' && sales.length === 0 ? 'ยังไม่มีข้อมูลการขาย' :
                 'ไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {(reportType === 'product' || reportType === 'category' || reportType === 'best-sellers') ? (
                <BarChart
                  data={reportData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'sales' ? `฿${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                      name === 'count' ? `${Number(value).toLocaleString('th-TH')} ชิ้น` : value,
                      name === 'sales' ? 'ยอดขาย' : name === 'count' ? 'จำนวนชิ้น' : name
                    ]}
                    labelFormatter={(label) => `สินค้า: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="ยอดขาย" fill="#217541" />
                  <Bar dataKey="count" name="จำนวนชิ้น" fill="#3B82F6" />
                </BarChart>
              ) : (
                <LineChart
                  data={reportData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={
                      reportType === 'daily' ? 'hour' : 
                      reportType === 'monthly' ? 'day' : 
                      reportType === 'yearly' ? 'month' : 'date'
                    } 
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`฿${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'ยอดขาย']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    name="ยอดขาย" 
                    stroke="#217541" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Table for best sellers */}
        {reportType === 'best-sellers' && reportData.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-grocery-700 mb-4">ตารางสินค้าขายดี</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">อันดับ</th>
                    <th className="text-left p-2">สินค้า</th>
                    <th className="text-left p-2">หมวดหมู่</th>
                    <th className="text-right p-2">ราคา/ชิ้น</th>
                    <th className="text-right p-2">จำนวนชิ้น</th>
                    <th className="text-right p-2">ยอดขาย</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-2 font-medium">{index + 1}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 text-gray-600">{item.category}</td>
                      <td className="p-2 text-right">฿{typeof item.price === 'number' ? item.price.toFixed(2) : '-'}</td>
                      <td className="p-2 text-right font-medium">{item.count?.toLocaleString('th-TH') ?? '-'}</td>
                      <td className="p-2 text-right font-bold text-grocery-600">฿{typeof item.sales === 'number' ? item.sales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReport;
