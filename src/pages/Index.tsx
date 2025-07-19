
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  // Redirect to the POS system on component mount
  // useEffect(() => {
  //   navigate('/');
  // }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-grocery-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🛒</div>
        <h1 className="text-3xl font-bold mb-4 text-grocery-700">Grocery Guru POS</h1>
        <p className="text-xl text-gray-600">กำลังโหลดระบบ...</p>
      </div>
    </div>
  );
};

export default Index;
