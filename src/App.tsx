import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { StoreProvider } from "./contexts/StoreContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import POSScreen from "./components/pos/POSScreen";
import ProductList from "./components/inventory/ProductList";
import BarcodeGenerator from "./components/inventory/BarcodeGenerator";
import SalesReport from "./components/reports/SalesReport";
import StockReport from "./components/reports/StockReport";
import StockAlerts from "./pages/StockAlerts";
import UserManagement from "./pages/UserManagement";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import LogsView from "./pages/LogsView";
import SalesHistory from "./pages/SalesHistory";
import SellerInfo from "./pages/SellerInfo";
import WarehouseSettings from "./pages/WarehouseSettings";
import StorageLocationSettings from "./pages/StorageLocationSettings";
import Purchase from './pages/Purchase';
import PurchaseOrderList from './pages/PurchaseOrderList';
import CategorySettings from './pages/CategorySettings';
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element, requiredRole?: 'admin' | 'staff' }) => {
  const { user, isAdmin, isStaff } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to="/notfound" replace />;
  }

  if (requiredRole === 'staff' && !isStaff() && !isAdmin()) {
    return <Navigate to="/notfound" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // Redirect from login to home if already authenticated
  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout title="ขายหน้าร้าน">
              <POSScreen />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/inventory" 
        element={
          <ProtectedRoute requiredRole="staff">
            <Layout title="จัดการสินค้า">
              <ProductList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/barcode" 
        element={
          <ProtectedRoute requiredRole="staff">
            <Layout title="พิมพ์บาร์โค้ด">
              <BarcodeGenerator />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/stock-alert" 
        element={
          <ProtectedRoute requiredRole="staff">
            <Layout title="แจ้งเตือนสินค้า">
              <StockAlerts />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reports/sales" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="รายงานขาย">
              <SalesReport />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reports/stock" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="รายงานสต๊อก">
              <StockReport />
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/users" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="จัดการผู้ใช้">
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/sales-history" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="ประวัติการขาย">
              <SalesHistory />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/logs" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="บันทึกกิจกรรมระบบ">
              <LogsView />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/seller-info" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="ตั้งค่าข้อมูลผู้ขาย">
              <SellerInfo />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/warehouse-settings" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="ตั้งค่าคลังสินค้า">
              <WarehouseSettings />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/storage-location-settings" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="ตั้งค่าสถานที่เก็บ">
              <StorageLocationSettings />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/stock-alerts" 
        element={
          <ProtectedRoute requiredRole="staff">
            <Layout title="สินค้าสต็อกต่ำ">
              <StockAlerts />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/purchase" 
        element={
          <ProtectedRoute requiredRole="staff">
            <Layout title="จัดซื้อสินค้าใหม่">
              <Purchase />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/purchase-orders" 
        element={
          <ProtectedRoute requiredRole="staff">
            <Layout title="ใบขอซื้อ">
              <PurchaseOrderList />
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/category-settings" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout title="ตั้งค่าหมวดหมู่">
              <CategorySettings />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // Wait until fonts and assets are loaded
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for fonts to load
    document.fonts.ready.then(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grocery-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold mb-4 text-grocery-700">Grocery Guru POS</h1>
          <p className="text-xl text-gray-600">กำลังโหลดระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <StoreProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </StoreProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
