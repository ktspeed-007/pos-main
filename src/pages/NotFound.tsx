import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // ถ้า path เป็น /notfound ให้แสดงว่าไม่มีสิทธิ์
  const isNoAccess = location.pathname === '/notfound';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{isNoAccess ? 'ไม่มีสิทธิ์' : '404'}</h1>
        <p className="text-xl text-gray-600 mb-4">
          {isNoAccess ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' : 'Oops! Page not found'}
        </p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {isNoAccess ? 'กลับหน้าหลัก' : 'Return to Home'}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
