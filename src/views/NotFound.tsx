"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search, GraduationCap, MapPin, Phone } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";

const NotFound = () => {
  const { categories = [] } = useAppData() || {};
  
  // Show a few featured categories to help them find something else
  const featuredCategories = categories.slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-blue-100 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-60" />
      
      <div className="max-w-3xl w-full relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-9xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 leading-none mb-4 drop-shadow-sm tracking-tighter">
            404
          </h1>
          <h2 className="text-3xl font-bold text-slate-800 mb-4 px-4">
            Oops! This page is lost in space.
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
            The page you're looking for was moved, renamed, or might never have existed. Let's get you back on track!
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/" 
              className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Return Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="px-8 py-3 bg-white text-slate-700 border border-slate-200 rounded-full font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>

        {/* Feature Sections */}
        {featuredCategories.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-xl shadow-slate-200/50 mt-12">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Maybe you were looking for one of these?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredCategories.map((cat) => (
                <Link 
                  key={cat.id} 
                  href={`/${cat.slug}`}
                  className="p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-blue-200 hover:bg-blue-50/50 transition-all group flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{cat.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{cat.slug.replace(/-/g, ' ')} exams & preparation</p>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-4 justify-center">
              <Link href="/about" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1.5">
                About Us
              </Link>
              <Link href="/contact" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1.5">
                Help & Support
              </Link>
              <Link href="/test-series" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1.5">
                Latest Tests
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer hint */}
      <p className="mt-12 text-slate-400 text-sm animate-in fade-in duration-1000 delay-500">
        &copy; {new Date().getFullYear()} Bharat Mock. All rights reserved.
      </p>
    </div>
  );
};

export default NotFound;
