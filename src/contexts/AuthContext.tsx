import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, User as ApiUser } from '../services/api';
import { toast } from 'sonner';

type Role = 'admin' | 'staff';

type User = {
  id: string;
  username: string;
  name: string;
  role: Role;
  active?: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  getAllUsers: () => User[];
  addUser: (user: User, password: string) => void;
  updateUser: (user: User) => void;
  toggleUserActive: (userId: string) => void;
  isConnectedToAPI: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for demonstration - will be used as initial data if no users exist in localStorage
const initialMockUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    name: 'ผู้ดูแลระบบ',
    role: 'admin' as Role,
    active: true,
  },
  {
    id: '2',
    username: 'staff',
    password: 'staff123',
    name: 'พนักงานขาย',
    role: 'staff' as Role,
    active: true,
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isConnectedToAPI, setIsConnectedToAPI] = useState(false);

  useEffect(() => {
    // Initialize local storage users if not exist
    if (!localStorage.getItem('groceryGuruUsers')) {
      localStorage.setItem('groceryGuruUsers', JSON.stringify(initialMockUsers));
    }
    
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Test API connection
    testAPIConnection();
  }, []);

  const testAPIConnection = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/test');
      if (response.ok) {
        setIsConnectedToAPI(true);
        console.log('✅ เชื่อมต่อ API สำเร็จ');
      } else {
        setIsConnectedToAPI(false);
        console.log('❌ ไม่สามารถเชื่อมต่อ API ได้');
      }
    } catch (error) {
      setIsConnectedToAPI(false);
      console.log('❌ API Server ไม่ทำงาน - ใช้ข้อมูลในเครื่อง');
    }
  };

  const addAuthLog = (action: string, userId: string, username: string, details?: string) => {
    const logs = JSON.parse(localStorage.getItem('groceryGuruLogs') || '[]');
    const newLog = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      action,
      userId,
      username,
      details,
      timestamp: new Date(),
    };
    logs.push(newLog);
    localStorage.setItem('groceryGuruLogs', JSON.stringify(logs));
  };

  const getAllUsers = (): User[] => {
    const users = JSON.parse(localStorage.getItem('groceryGuruUsers') || '[]');
    return users.map(({ password, ...userWithoutPassword }: any) => userWithoutPassword);
  };

  const addUser = (newUser: User, password: string) => {
    const users = JSON.parse(localStorage.getItem('groceryGuruUsers') || '[]');
    const userWithPassword = { ...newUser, password };
    users.push(userWithPassword);
    localStorage.setItem('groceryGuruUsers', JSON.stringify(users));
    addAuthLog('user_add', newUser.id, newUser.username, `Added user ${newUser.name}`);
  };

  const updateUser = (updatedUser: User) => {
    const users = JSON.parse(localStorage.getItem('groceryGuruUsers') || '[]');
    const index = users.findIndex((u: any) => u.id === updatedUser.id);
    
    if (index !== -1) {
      const existingPassword = users[index].password;
      users[index] = { ...updatedUser, password: existingPassword };
      localStorage.setItem('groceryGuruUsers', JSON.stringify(users));
      addAuthLog('user_update', updatedUser.id, updatedUser.username, `Updated user ${updatedUser.name}`);
    }
  };

  const toggleUserActive = (userId: string) => {
    const users = JSON.parse(localStorage.getItem('groceryGuruUsers') || '[]');
    const index = users.findIndex((u: any) => u.id === userId);
    
    if (index !== -1) {
      users[index].active = !users[index].active;
      localStorage.setItem('groceryGuruUsers', JSON.stringify(users));
      addAuthLog('user_toggle_active', userId, users[index].username, 
        `${users[index].active ? 'Activated' : 'Deactivated'} user ${users[index].name}`);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    // Try API first if connected
    if (isConnectedToAPI) {
      try {
        const response = await authAPI.login(username, password);
        
        if (response.success && response.data?.user) {
          const apiUser = response.data.user;
          const userForContext: User = {
            id: apiUser.id,
            username: apiUser.username,
            name: apiUser.name,
            role: apiUser.role,
            active: apiUser.active,
          };
          
          setUser(userForContext);
          localStorage.setItem('user', JSON.stringify(userForContext));
          addAuthLog('login', apiUser.id, apiUser.username);
          
          toast.success('เข้าสู่ระบบสำเร็จ (API)');
          return true;
        }
      } catch (error) {
        console.error('API login failed, trying local storage:', error);
        toast.warning('ไม่สามารถเชื่อมต่อ API ได้ กำลังลองใช้ข้อมูลในเครื่อง');
      }
    }

    // Fallback to local storage
    const users = JSON.parse(localStorage.getItem('groceryGuruUsers') || '[]');
    const foundUser = users.find(
      (u: any) => u.username === username && u.password === password && u.active !== false
    );

    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      addAuthLog('login', foundUser.id, foundUser.username);
      
      if (!isConnectedToAPI) {
        toast.success('เข้าสู่ระบบสำเร็จ (ข้อมูลในเครื่อง)');
      }
      return true;
    }
    
    return false;
  };

  const logout = () => {
    if (user) {
      addAuthLog('logout', user.id, user.username);
    }
    
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAdmin = () => user?.role === 'admin';
  const isStaff = () => user?.role === 'staff';

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin, 
      isStaff, 
      getAllUsers,
      addUser,
      updateUser,
      toggleUserActive,
      isConnectedToAPI
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
