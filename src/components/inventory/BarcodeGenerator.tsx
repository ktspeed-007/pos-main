
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

const BarcodeGenerator = () => {
  const { products } = useStore();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const barcodesContainerRef = useRef<HTMLDivElement>(null);
  
  // Get unique categories
  const categories = ['all', ...new Set(products.filter(p => p.active).map(product => product.category))];
  
  // Filter products
  const filteredProducts = products.filter(product => {
    // Only active products
    if (!product.active) return false;
    
    // Filter by category
    if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.qrcode && product.qrcode.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  const handleSelectProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };
  
  const printBarcodes = () => {
    if (selectedProducts.length === 0) {
      toast.error('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
      return;
    }
    
    // Create a new window for barcode printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาตให้เปิดป๊อปอัพในเบราว์เซอร์');
      return;
    }
    
    // Create barcode page content
    const selectedProductsData = selectedProducts.map(id => {
      return products.find(p => p.id === id);
    }).filter(Boolean);
    
    // Write the HTML content for printing
    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์บาร์โค้ด - Grocery Guru</title>
          <style>
            body {
              font-family: 'TH Sarabun New', 'Sarabun', sans-serif;
              padding: 10mm;
            }
            .barcode-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10mm;
              page-break-inside: avoid;
            }
            .barcode-item {
              border: 1px dashed #ccc;
              padding: 5mm;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .product-name {
              font-size: 14px;
              margin-bottom: 3mm;
              font-weight: bold;
            }
            .product-price {
              font-size: 14px;
              margin: 2mm 0;
            }
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              .barcode-item {
                border: 1px dashed #ccc;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="barcode-grid">
            ${selectedProductsData.map(product => `
              <div class="barcode-item">
                <div class="product-name">${product?.name}</div>
                <svg class="barcode" 
                  jsbarcode-format="CODE128"
                  jsbarcode-value="${product?.barcode || ''}"
                  jsbarcode-textmargin="0"
                  jsbarcode-height="50"
                  jsbarcode-width="2"
                  jsbarcode-fontSize="12">
                </svg>
                <div class="product-price">฿${product?.price?.toFixed(2) || '0.00'}</div>
              </div>
            `).join('')}
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            // Generate all barcodes on the page
            JsBarcode(".barcode").init();
            
            // Print automatically when the page is loaded
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    
    // Close the document to finish loading
    printWindow.document.close();
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">พิมพ์บาร์โค้ด / QR Code</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSelectAll}
            size="sm"
          >
            {selectedProducts.length === filteredProducts.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
          </Button>
          <Button
            onClick={printBarcodes}
            disabled={selectedProducts.length === 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            พิมพ์บาร์โค้ด ({selectedProducts.length})
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="search">ค้นหาสินค้า</Label>
            <Input
              id="search"
              placeholder="ชื่อ, บาร์โค้ด, QR Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="category">หมวดหมู่</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'ทั้งหมด' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เลือก
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สินค้า
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  หมวดหมู่
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  บาร์โค้ด
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ราคา
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    ไม่พบสินค้า
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.productCode && `รหัส: ${product.productCode}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.barcode || '-'}</div>
                      {product.qrcode && (
                        <div className="text-xs text-gray-500">QR: {product.qrcode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ฿{product.price?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Section */}
      {selectedProducts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">ตัวอย่างบาร์โค้ดที่จะพิมพ์</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedProducts.slice(0, 6).map(productId => {
              const product = products.find(p => p.id === productId);
              if (!product) return null;
              
              return (
                <div key={productId} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-sm font-medium mb-2">{product.name}</div>
                  {product.barcode && (
                    <div className="mb-2">
                      <svg
                        ref={(el) => {
                          if (el) {
                            try {
                              JsBarcode(el, product.barcode, {
                                format: "CODE128",
                                width: 2,
                                height: 50,
                                displayValue: false
                              });
                            } catch (error) {
                              console.error('Error generating barcode:', error);
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="text-sm text-gray-600">฿{product.price?.toFixed(2) || '0.00'}</div>
                </div>
              );
            })}
          </div>
          {selectedProducts.length > 6 && (
            <div className="text-center mt-4 text-sm text-gray-500">
              และสินค้าอีก {selectedProducts.length - 6} รายการ
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeGenerator;
