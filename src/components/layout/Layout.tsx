import React, { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PWAInstallPrompt from '../common/PWAInstallPrompt';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { shopInfoAPI } from '@/services/api/shopInfoAPI';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

const Layout = ({ children, title = 'Grocery Guru POS' }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Shop info state
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [shopName, setShopName] = useState(() => {
    const info = localStorage.getItem('groceryGuruShopInfo');
    return info ? JSON.parse(info).name : 'Grocery Guru';
  });
  const [shopLogo, setShopLogo] = useState(() => {
    const info = localStorage.getItem('groceryGuruShopInfo');
    return info ? JSON.parse(info).logo : '';
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleShopSave = async () => {
    const info = { name: shopName, logo: shopLogo };
    // บันทึกลง backend ด้วย API
    try {
      const res = await shopInfoAPI.save(info);
      if (res.success) {
    localStorage.setItem('groceryGuruShopInfo', JSON.stringify(info));
    setShopDialogOpen(false);
        window.location.reload();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลร้านค้า');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ API');
    }
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setShopLogo(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Always render Sidebar inside the Router context */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 text-grocery-500 hover:text-grocery-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              {/* Show logo if exists */}
              {shopLogo && (
                <img src={shopLogo} alt="Shop Logo" className="w-10 h-10 rounded-full mr-3 object-cover" />
              )}
              <h1 className="text-xl font-semibold text-grocery-700">{shopName}</h1>
            </div>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-grocery-100 flex items-center justify-center font-medium text-grocery-700">
                      {user.name.substring(0, 1)}
                    </div>
                    <span className="hidden md:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>บัญชีผู้ใช้</DropdownMenuLabel>
                  <DropdownMenuItem disabled>
                    {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShopDialogOpen(true)}>
                    ตั้งค่าระบบ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        
        <footer className="bg-white border-t border-gray-200 py-3 px-6 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} {shopName} — ระบบบริหารจัดการร้านค้าปลีก
        </footer>
      </div>
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      {/* Shop Settings Dialog */}
      <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ตั้งค่าระบบร้านค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">ชื่อร้านค้า</Label>
              <Input
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="ชื่อร้านค้า"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">โลโก้ร้านค้า</Label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} />
              {shopLogo && (
                <img src={shopLogo} alt="Shop Logo Preview" className="w-16 h-16 rounded-full mt-2 object-cover" />
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button className="w-full bg-grocery-500 hover:bg-grocery-600" onClick={handleShopSave}>
              บันทึก
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShopDialogOpen(false)}>
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Layout;
