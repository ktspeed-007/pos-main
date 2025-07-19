
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { useAuth } from '../../contexts/AuthContext';
import { Wifi, WifiOff } from 'lucide-react';

const ApiStatus: React.FC = () => {
  const { isConnectedToAPI } = useAuth();

  return (
    <div className="flex items-center gap-2">
      {isConnectedToAPI ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <Badge variant="default" className="bg-green-100 text-green-800">
            API เชื่อมต่อแล้ว
          </Badge>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-orange-600" />
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            ใช้ข้อมูลในเครื่อง
          </Badge>
        </>
      )}
    </div>
  );
};

export default ApiStatus;
