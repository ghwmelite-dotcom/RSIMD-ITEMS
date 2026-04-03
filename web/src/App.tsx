import { Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold text-ghana-green">RSIMD-ITEMS</h1><p className="mt-2 text-gray-600">OHCS Equipment Maintenance System</p></div>} />
    </Routes>
  );
}
