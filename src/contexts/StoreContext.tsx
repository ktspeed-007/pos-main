import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { productsAPI, salesAPI, authAPI, categoryAPI, Category } from '../services/api';

type Product = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  qrcode?: string;
  stock: number;
  categoryId?: number;
  categoryName?: string;
  active: boolean;
  created_at: string;
  productCode?: string;
  lotCode?: string;
  sellerId?: string;
  seller?: string;
  productionDate?: string;
  expiryDate?: string;
  paymentMethod?: 'cash' | 'check' | 'credit';
  paymentMethods?: {
    cash: boolean;
    check: boolean;
    credit: boolean;
  };
  creditDays?: number;
  dueDate?: string;
  minStock?: number;
  maxStock?: number;
  warehouseId?: string;
  warehouseName?: string;
  storageLocationId?: string;
  storageLocationName?: string;
};

type SaleItem = {
  product: Product;
  quantity: number;
};

// Export CartItem type for use in other components
export type CartItem = SaleItem;

type Sale = {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'cash' | 'qrcode';
  timestamp: Date;
  receivedAmount?: number;
  changeAmount?: number;
  canceled: boolean;
};

type Log = {
  id: string;
  action: string;
  user: string;
  details?: string;
  timestamp: Date;
};

type StoreContextType = {
  products: Product[];
  categories: Category[];
  cart: SaleItem[];
  sales: Sale[];
  logs: Log[];
  addProduct: (productData: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductActive: (id: string) => Promise<void>;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: 'cash' | 'qrcode', receivedAmount?: number, changeAmount?: number) => Promise<void>;
  cancelSale: (saleId: string) => Promise<void>;
  getLowStockProducts: () => Product[];
  getDailySales: (date: Date) => Sale[];
  getMonthlySales: (month: number, year: number) => Sale[];
  getYearlySales: (year: number) => Sale[];
  addLog: (action: string, user: string, details?: string) => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  fetchProducts: () => Promise<void>; // เพิ่ม fetchProducts ให้ใช้ใน component อื่น
  fetchCategories: () => Promise<void>;
};

const StoreContext = createContext<StoreContextType | null>(null);

// ฟังก์ชันแปลงชื่อ field จาก snake_case/lowercase เป็น camelCase
export const mapProductFields = (product: any): Product => ({
  id: product.id,
  productCode: product.productCode || product.productcode || '',
  lotCode: product.lotCode || product.lotcode || '',
  barcode: product.barcode || '',
  name: product.name || '',
  price: parseFloat(product.price?.toString() || product.price || '0'),
  stock: product.stock ?? product.stock ?? 0,
  categoryId: product.categoryId ?? product.category_id,
  categoryName: product.categoryName ?? product.category_name,
  sellerId: product.sellerId ? String(product.sellerId) : (product.sellerid ? String(product.sellerid) : ''),
  seller: product.seller || product.seller_name || '',
  warehouseId: product.warehouseId || product.warehouseid || '',
  warehouseName: product.warehouseName || product.warehouse_name || '',
  storageLocationId: product.storageLocationId || product.storagelocationid || '',
  storageLocationName: product.storageLocationName || product.storage_location_name || '',
  productionDate: product.productionDate
    ? product.productionDate.slice(0, 10)
    : (product.productiondate ? product.productiondate.slice(0, 10) : ''),
  expiryDate: product.expiryDate
    ? product.expiryDate.slice(0, 10)
    : (product.expirydate ? product.expirydate.slice(0, 10) : ''),
  paymentMethods: product.paymentMethods || product.paymentmethods || { cash: true, check: false, credit: false },
  creditDays: product.creditDays ?? product.creditdays ?? 0,
  dueDate: product.dueDate
    ? product.dueDate.slice(0, 10)
    : (product.duedate ? product.duedate.slice(0, 10) : ''),
  active: product.active ?? product.active ?? true,
  minStock: product.minStock ?? product.minstock ?? 0,
  maxStock: product.maxStock ?? product.maxstock ?? 0,
  created_at: product.created_at || product.createdAt,
});

const mapSaleFields = (sale: any): Sale => ({
  id: sale.id,
  items: sale.items,
  total: typeof sale.total === 'string' ? parseFloat(sale.total) : sale.total,
  paymentMethod: sale.paymentMethod || sale.paymentmethod || '',
  timestamp: sale.timestamp ? new Date(sale.timestamp) : new Date(),
  receivedAmount: sale.receivedAmount !== undefined ? parseFloat(sale.receivedAmount) : (sale.receivedamount !== undefined ? parseFloat(sale.receivedamount) : 0),
  changeAmount: sale.changeAmount !== undefined ? parseFloat(sale.changeAmount) : (sale.changeamount !== undefined ? parseFloat(sale.changeamount) : 0),
  canceled: sale.canceled ?? false,
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  // โหลดข้อมูลจาก API เท่านั้น
  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchCategories();
    // TODO: สามารถเพิ่ม fetchLogs ถ้ามี API
  }, []);

  // เพิ่ม event listener สำหรับรีเฟรชข้อมูลสินค้า
  useEffect(() => {
    const handleRefreshProducts = () => {
      fetchProducts();
    };

    window.addEventListener('refreshProducts', handleRefreshProducts);
    
    return () => {
      window.removeEventListener('refreshProducts', handleRefreshProducts);
    };
  }, []);

  // ฟังก์ชันโหลดข้อมูลสินค้าใหม่จาก API
  const fetchProducts = async () => {
    const response = await productsAPI.getAll();
    console.log('StoreContext: productsAPI.getAll response', response);
    if (response.success && Array.isArray(response.data)) {
      setProducts(response.data.map(mapProductFields));
    } else {
      setProducts([]);
    }
  };

  // ฟังก์ชันโหลดข้อมูลหมวดหมู่ใหม่จาก API
  const fetchCategories = async () => {
    const response = await categoryAPI.getAll();
    if (response.success && Array.isArray(response.data)) {
      setCategories(response.data);
    } else {
      setCategories([]);
    }
  };

  // ฟังก์ชันโหลดข้อมูลขายใหม่จาก API
  const fetchSales = async () => {
    const response = await salesAPI.getAll();
    if (response.success && Array.isArray(response.data)) {
      setSales(response.data.map(mapSaleFields));
    } else {
      setSales([]);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>) => {
    try {
      const response = await productsAPI.create(productData);
      if (response.success && response.data) {
        await fetchProducts();
        addLog('manage_product', productData.name, `Added product: ${productData.name}`);
        return;
      }
    } catch (error) {
      console.error('API addProduct failed:', error);
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const response = await productsAPI.update(product.id, product);
      if (response.success && response.data) {
        await fetchProducts();
        addLog('manage_product', product.name, `Updated product: ${product.name}`);
        return;
      }
    } catch (error) {
      console.error('API updateProduct failed:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await productsAPI.delete(id);
      if (response.success) {
        await fetchProducts();
        addLog('manage_product', 'Product', `Deleted product with id: ${id}`);
        return;
      }
    } catch (error) {
      console.error('API deleteProduct failed:', error);
    }
  };

  const toggleProductActive = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // PATCH เฉพาะ field active (productsAPI.update ใช้ PATCH แล้ว)
    await productsAPI.update(id, { active: !product.active });
    await fetchProducts();
  };

  const addToCart = (product: Product, quantity: number) => {
    const existingItem = cart.find(item => item.product.id === product.id);

    if (existingItem) {
      const updatedCart = cart.map(item =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
      );
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const updatedCart = cart.filter(item => item.product.id !== productId);
    setCart(updatedCart);
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    setCart(updatedCart);
  };

  const clearCart = () => {
    setCart([]);
  };

  const completeSale = async (paymentMethod: 'cash' | 'qrcode', receivedAmount?: number, changeAmount?: number) => {
    if (cart.length === 0) {
      toast.error('ไม่สามารถทำรายการได้ เนื่องจากไม่มีสินค้าในตะกร้า');
      return;
    }

    const saleItems = cart.map(item => ({
      id: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    try {
      // Try API first
      // Ensure no timestamp is sent to backend
      const salePayload = {
        items: saleItems,
        total,
        paymentMethod,
        receivedAmount,
        changeAmount,
      };
      const response = await salesAPI.create(salePayload);

      if (response.success && response.data?.saleId) {
        const newSale: Sale = {
          id: response.data.saleId,
          items: cart,
          total,
          paymentMethod,
          timestamp: new Date(),
          receivedAmount,
          changeAmount,
          canceled: false,
        };

        const updatedSales = [...sales, newSale];
        const updatedProducts = products.map(product => {
          const soldItem = cart.find(item => item.product.id === product.id);
          if (soldItem) {
            return { ...product, stock: Math.max(0, product.stock - soldItem.quantity) };
          }
          return product;
        });
        setProducts(updatedProducts);
        localStorage.setItem('groceryGuruProducts', JSON.stringify(updatedProducts));
        setSales(updatedSales);
        localStorage.setItem('groceryGuruSales', JSON.stringify(updatedSales));
        clearCart();
        addLog('sale', 'POS', `Completed sale with id: ${newSale.id}`);
        toast.success(`ทำรายการสำเร็จ เลขที่ใบเสร็จ: ${newSale.id.substring(0, 8)}`);
        return;
      }
    } catch (error) {
      console.error('API completeSale failed:', error);
      toast.error('เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่อีกครั้ง');
    }

    // Fallback to local storage
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate.getDate() === now.getDate() &&
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear();
    });
    const runNumber = String(todaySales.length + 1).padStart(4, '0');
    const saleId = `${dd}${MM}${yyyy}${runNumber}`;

    const newSale: Sale = {
      id: saleId,
      items: cart,
      total,
      paymentMethod,
      timestamp: new Date(),
      receivedAmount,
      changeAmount,
      canceled: false,
    };

    const updatedSales = [...sales, newSale];
    const updatedProducts = products.map(product => {
      const soldItem = cart.find(item => item.product.id === product.id);
      if (soldItem) {
        return { ...product, stock: Math.max(0, product.stock - soldItem.quantity) };
      }
      return product;
    });
    setProducts(updatedProducts);
    localStorage.setItem('groceryGuruProducts', JSON.stringify(updatedProducts));
    setSales(updatedSales);
    localStorage.setItem('groceryGuruSales', JSON.stringify(updatedSales));
    clearCart();
    addLog('sale', 'POS', `Completed sale with id: ${newSale.id}`);
    toast.success(`ทำรายการสำเร็จ (ข้อมูลในเครื่อง) เลขที่ใบเสร็จ: ${newSale.id.substring(0, 8)}`);
  };

  const cancelSale = async (saleId: string) => {
    // หา sale ที่จะยกเลิก
    const saleToCancel = sales.find(sale => sale.id === saleId);
    if (!saleToCancel) {
      toast.error('ไม่พบรายการขายที่ต้องการยกเลิก');
      return;
    }

    try {
      // Try API first
      const response = await salesAPI.cancel(saleId);
      if (response.success) {
        // อัปเดต sales
        const updatedSales = sales.map(sale =>
          sale.id === saleId ? { ...sale, canceled: true } : sale
        );
        setSales(updatedSales);
        localStorage.setItem('groceryGuruSales', JSON.stringify(updatedSales));

        // คืนสินค้ากลับเข้าสต๊อก
        const updatedProducts = products.map(product => {
          const canceledItem = saleToCancel.items.find(item => item.product.id === product.id);
          if (canceledItem) {
            return { ...product, stock: product.stock + canceledItem.quantity };
          }
          return product;
        });
        setProducts(updatedProducts);
        localStorage.setItem('groceryGuruProducts', JSON.stringify(updatedProducts));

        addLog('cancel_receipt', 'Admin', `Canceled sale with id: ${saleId}`);
        toast.success('ยกเลิกรายการสำเร็จ และคืนสินค้ากลับเข้าสต๊อกแล้ว');
        return;
      }
    } catch (error) {
      console.error('API cancelSale failed:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกรายการ กรุณาลองใหม่อีกครั้ง');
    }

    // Fallback to local storage
    const updatedSales = sales.map(sale =>
      sale.id === saleId ? { ...sale, canceled: true } : sale
    );
    setSales(updatedSales);
    localStorage.setItem('groceryGuruSales', JSON.stringify(updatedSales));

    // คืนสินค้ากลับเข้าสต๊อก
    const updatedProducts = products.map(product => {
      const canceledItem = saleToCancel.items.find(item => item.product.id === product.id);
      if (canceledItem) {
        return { ...product, stock: product.stock + canceledItem.quantity };
      }
      return product;
    });
    setProducts(updatedProducts);
    localStorage.setItem('groceryGuruProducts', JSON.stringify(updatedProducts));

    addLog('cancel_receipt', 'Admin', `Canceled sale with id: ${saleId}`);
    toast.success('ยกเลิกรายการสำเร็จ (ข้อมูลในเครื่อง) และคืนสินค้ากลับเข้าสต๊อกแล้ว');
  };

  const getLowStockProducts = () => {
    return products.filter(product => {
      // ถ้ามีการกำหนด minStock ให้ใช้ minStock
      if (product.minStock !== undefined && product.minStock > 0) {
        return product.stock <= product.minStock && product.active;
      }
      // ถ้าไม่มี minStock ให้ใช้ค่าเดิม (น้อยกว่า 10)
      return product.stock < 10 && product.active;
    });
  };

  const getDailySales = (date: Date) => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate.toDateString() === date.toDateString() && !sale.canceled;
    });
  };

  const getMonthlySales = (month: number, year: number) => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate.getMonth() === month && saleDate.getFullYear() === year && !sale.canceled;
    });
  };

  const getYearlySales = (year: number) => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate.getFullYear() === year && !sale.canceled;
    });
  };

  const addLog = (action: string, user: string, details?: string) => {
    const newLog: Log = {
      id: Date.now().toString(),
      action,
      user,
      details,
      timestamp: new Date(),
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    localStorage.setItem('groceryGuruLogs', JSON.stringify(updatedLogs));
  };

  return (
    <StoreContext.Provider value={{
      products,
      categories,
      cart,
      sales,
      logs,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleProductActive,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      clearCart,
      completeSale,
      cancelSale,
      getLowStockProducts,
      getDailySales,
      getMonthlySales,
      getYearlySales,
      addLog,
      setProducts,
      fetchProducts, // export fetchProducts ให้ใช้ใน component อื่น
      fetchCategories,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
