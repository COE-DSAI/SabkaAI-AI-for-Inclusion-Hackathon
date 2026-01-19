
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeftCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1E1B1B] flex flex-col items-center justify-center text-white px-6 text-center">
      <h1 className="text-6xl font-extrabold text-red-400 mb-4">404</h1>
      <p className="text-gray-300 text-lg mb-6">The page you're looking for doesn’t exist.</p>

      <Link
        to="/"
        className="px-6 py-3 rounded-full bg-[#8A0000] hover:bg-[#700000] text-white font-medium flex items-center gap-2"
      >
        <ArrowLeftCircle className="w-5 h-5" />
        Go Home
      </Link>
    </div>
  );
}
