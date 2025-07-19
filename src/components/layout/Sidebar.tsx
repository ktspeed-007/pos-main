import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInput } from "@/components/ui/sidebar";
import { toast } from "sonner";

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badgeCount?: number;
};

const NavItem = ({ to, icon, label, active, badgeCount }: NavItemProps) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 mb-1 rounded-lg text-sm font-medium transition-colors hover:bg-grocery-100 ${
      active ? 'bg-grocery-100 text-grocery-700' : 'text-gray-700'
    }`}
  >
    <div className="mr-3 text-lg">{icon}</div>
    <span>{label}</span>
    {badgeCount !== undefined && badgeCount > 0 && (
      <div className="ml-auto bg-grocery-500 text-white text-xs px-2 py-1 rounded-full">
        {badgeCount}
      </div>
    )}
  </Link>
);

type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  // Check if we're inside a Router context
  let pathname = "/";
  
  try {
    // Try to use useLocation, but fallback gracefully if it fails
    // This prevents the app from crashing if Sidebar is rendered outside Router
    const location = useLocation();
    pathname = location.pathname;
  } catch (error) {
    console.error("Sidebar rendered outside Router context:", error);
  }
  
  const { getLowStockProducts, products } = useStore();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [warehouseMenuOpen, setWarehouseMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  
  const lowStockCount = getLowStockProducts().length;
  
  // ดึงชื่อร้านและโลโก้จาก localStorage
  const shopInfo = (() => {
    const info = localStorage.getItem('groceryGuruShopInfo');
    return info ? JSON.parse(info) : { name: 'Grocery Guru', logo: '' };
  })();
  
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const results = products.filter(product => {
      if (!product.active) return false;
      const name = (product.name || '').toLowerCase();
      const barcode = (product.barcode || '').toString().toLowerCase();
      const qrcode = (product.qrcode || '').toString().toLowerCase();
      return (
        name.includes(query) ||
        barcode.includes(query) ||
        qrcode.includes(query)
      );
    });

    setSearchResults(results);

    if (results.length === 0) {
      toast.warning('ไม่พบสินค้าที่ค้นหา');
    }
  };

  return (
    <>
      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          open ? 'w-64' : 'w-0 -translate-x-full'
        } overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              {shopInfo.logo ? (
                <img src={shopInfo.logo} alt="Shop Logo" className="w-10 h-10 rounded-full object-cover" />
              ) : (
              <div className="w-10 h-10 rounded-full bg-grocery-500 flex items-center justify-center text-white font-bold text-lg">
                GG
              </div>
              )}
              <div className="ml-3">
                <h2 className="text-lg font-bold text-grocery-700">{shopInfo.name}</h2>
                <p className="text-xs text-gray-500">ระบบจัดการร้านค้า</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <Button 
              variant="outline" 
              className="w-full mb-4 flex items-center justify-center gap-2"
              onClick={() => setSearchDialogOpen(true)}
            >
              <Search size={16} /> ค้นหาสินค้า
            </Button>
          
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                หน้าขาย
              </h3>
              <NavItem
                to="/"
                icon={<CartIcon />}
                label="ขายหน้าร้าน"
                active={pathname === '/'}
              />
              <NavItem
                to="/sales-history"
                icon={<ReportIcon />}
                label="รายการขายทั้งหมด"
                active={pathname === '/sales-history'}
              />
            </div>
            
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                สินค้า
              </h3>
              <NavItem
                to="/inventory"
                icon={<BoxIcon />}
                label="จัดการสินค้า"
                active={pathname === '/inventory'}
              />
              <NavItem
                to="/barcode"
                icon={<BarcodeIcon />}
                label="พิมพ์บาร์โค้ด"
                active={pathname === '/barcode'}
              />
              <NavItem
                to="/stock-alerts"
                icon={<AlertIcon />}
                label="สินค้าสต็อกต่ำ"
                active={pathname === '/stock-alerts'}
                badgeCount={lowStockCount}
              />
            </div>
            
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                จัดซื้อ
              </h3>
              <NavItem
                to="/purchase"
                icon={<ShoppingCartIcon />}
                label="จัดซื้อสินค้าใหม่"
                active={pathname === '/purchase'}
              />
              <NavItem
                to="/purchase-orders"
                icon={<ReportIcon />}
                label="ใบขอซื้อ"
                active={pathname === '/purchase-orders'}
              />
            </div>
            
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                รายงาน
              </h3>
              <NavItem
                to="/reports/sales"
                icon={<ReportIcon />}
                label="รายงานขาย"
                active={pathname.includes('/reports/sales')}
              />
              <NavItem
                to="/reports/stock"
                icon={<ChartIcon />}
                label="รายงานสต๊อก"
                active={pathname.includes('/reports/stock')}
              />
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                ระบบ
              </h3>
              <NavItem
                to="/users"
                icon={<UsersIcon />}
                label="จัดการผู้ใช้"
                active={pathname.includes('/users')}
              />
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                การตั้งค่า
              </h3>
              <div className="px-4 py-2">
                <button
                  onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                  className="flex items-center gap-2 text-gray-700 font-medium mb-1 w-full text-left hover:bg-grocery-50 px-2 py-1 rounded transition-colors"
                >
                  <StoreIcon />
                  <span>การตั้งค่า</span>
                  <svg 
                    className={`ml-auto transition-transform ${settingsMenuOpen ? 'rotate-180' : ''}`}
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                </button>
                {settingsMenuOpen && (
                  <div className="ml-7 flex flex-col gap-1">
                    <NavItem
                      to="/seller-info"
                      icon={<StoreIcon />}
                      label="ตั้งค่าผู้ขาย"
                      active={pathname.includes('/seller-info')}
                    />
                    <NavItem
                      to="/warehouse-settings"
                      icon={<WarehouseIcon />}
                      label="ตั้งค่าคลังสินค้า"
                      active={pathname.includes('/warehouse-settings')}
                    />
                    <NavItem
                      to="/storage-location-settings"
                      icon={<StorageLocationIcon />}
                      label="ตั้งค่าสถานที่เก็บ"
                      active={pathname.includes('/storage-location-settings')}
                    />
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ค้นหาสินค้า</DialogTitle>
          </DialogHeader>
          
          <form className="flex gap-2 mb-4" onSubmit={handleSearch}>
            <SidebarInput
              placeholder="ค้นหาด้วยชื่อหรือบาร์โค้ด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">ค้นหา</Button>
          </form>
          
          <div className="max-h-[300px] overflow-y-auto">
            {searchResults.map((product) => (
              <div 
                key={product.id}
                className="p-3 border-b last:border-b-0 hover:bg-gray-50"
              >
                <div className="font-medium text-grocery-700">{product.name}</div>
                <div className="text-sm text-gray-500 flex justify-between">
                  <span>บาร์โค้ด: {product.barcode}</span>
                  <span>฿{product.price.toFixed(2)}</span>
                </div>
                <div className="text-sm mt-1">
                  คงเหลือ: <span className={product.stock <= 5 ? "text-red-500 font-medium" : ""}>{product.stock}</span> ชิ้น
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Simple icon components
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);

const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
);

const BarcodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M4 9h2v6H4z"/><path d="M8 9h2v6H8z"/><path d="M12 9h2v6h-2z"/><path d="M16 9h4v6h-4z"/></svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4"/><path d="M12 16h.01"/><path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12s4.5 10 10 10 10-4.5 10-10z"/></svg>
);

const ReportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-6h15L21 9"/><path d="M3 9a9 9 0 0 0 18 0"/><path d="M5 22V12H19V22"/></svg>
);

const WarehouseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/></svg>
);

const StorageLocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 0 1 16 0c0 4.97-3.582 9-8 9z"/><circle cx="12" cy="12" r="3"/></svg>
);

const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10h4a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4"/><path d="M8 10h8"/></svg>
);

export default Sidebar;
