
import React, { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Category } from '@/services/api';

const StockReport = () => {
  const { products, categories } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'categoryName'>('stock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];
    
    // Filter by category
    if (selectedCategoryId !== 'all') {
      filtered = filtered.filter(product => String(product.categoryId) === selectedCategoryId);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.qrcode.includes(query)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
        case 'categoryName':
          comparison = (a.categoryName || '').localeCompare(b.categoryName || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredProducts(filtered);
  }, [products, selectedCategoryId, searchQuery, sortBy, sortOrder]);
  
  // Low stock products
  const lowStockProducts = filteredProducts.filter(product => product.stock <= 5 && product.active);
  
  // Out of stock products
  const outOfStockProducts = filteredProducts.filter(product => product.stock === 0 && product.active);
  
  // Chart data - products with lowest stock
  const chartData = [...products]
    .filter(product => product.active)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10)
    .map(product => ({
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      stock: product.stock,
    }));
  
  // Toggle sort
  const toggleSort = (column: 'name' | 'stock' | 'categoryName') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-grocery-500"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((category: Category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium text-gray-700">สินค้าทั้งหมด</h3>
          <p className="text-3xl font-bold text-grocery-600">
            {filteredProducts.filter(p => p.active).length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium text-red-700">สินค้าใกล้หมด/หมดสต๊อก</h3>
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold text-red-600">
              {lowStockProducts.length}
            </p>
            <div className="text-sm">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-400 mr-1"></span>
                <span>ใกล้หมด: {lowStockProducts.filter(p => p.stock > 0).length}</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                <span>หมดสต๊อก: {outOfStockProducts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
        <h2 className="text-lg font-medium text-gray-700 mb-3">10 สินค้าที่มีสต๊อกน้อยที่สุด</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 60,
              }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="stock" name="จำนวนคงเหลือ" fill={chartData.length > 0 && chartData[0].stock <= 5 ? "#f43f5e" : "#217541"} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-grocery-700">รายการสินค้าในสต๊อก</h2>
        </div>
        
        <div className="overflow-auto" style={{ maxHeight: 'calc(100% - 70px)' }}>
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('name')}
                >
                  ชื่อสินค้า
                  {sortBy === 'name' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('categoryName')}
                >
                  หมวดหมู่
                  {sortBy === 'categoryName' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('stock')}
                >
                  คงเหลือ
                  {sortBy === 'stock' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    ไม่พบสินค้า
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className={`${!product.active ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.barcode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{product.categoryName || '-'}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {product.stock === 0 ? (
                        <Badge variant="destructive">หมดสต๊อก</Badge>
                      ) : product.stock <= 5 ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                          เหลือ {product.stock} ชิ้น
                        </Badge>
                      ) : (
                        <div className="text-sm text-gray-900">{product.stock} ชิ้น</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {product.active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">เปิดใช้งาน</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">ปิดใช้งาน</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockReport;
