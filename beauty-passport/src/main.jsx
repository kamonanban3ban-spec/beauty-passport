import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import StaffApp from './pages/StaffApp'
import ClientApp from './pages/ClientApp'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* スタッフ用URL: /staff */}
        <Route path="/staff" element={<StaffApp />} />

        {/* お客様用URL: /client?salon=hair&qr=hp_xxx */}
        <Route path="/client" element={<ClientApp />} />

        {/* デフォルト → スタッフ画面 */}
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
