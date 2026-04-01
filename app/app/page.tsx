"use client";

import { useState } from "react";
import { Shield, Lock, Eye, Activity } from "lucide-react";

const stats = [
  { icon: Shield, label: "Active Threats", value: "12", color: "text-red-400" },
  { icon: Lock, label: "Secured Assets", value: "1,247", color: "text-green-400" },
  { icon: Eye, label: "Monitoring", value: "24/7", color: "text-cyan-400" },
  { icon: Activity, label: "AI Analyses", value: "8,432", color: "text-purple-400" },
];

export default function AppDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold">Zyra Dashboard</span>
          </div>
          <button
            onClick={() => setIsLoggedIn(!isLoggedIn)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition"
          >
            {isLoggedIn ? "Sign Out" : "Sign In"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isLoggedIn ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Welcome to Zyra</h1>
            <p className="text-xl text-gray-400 mb-8">Sign in to access your unified threat dashboard</p>
            <button
              onClick={() => setIsLoggedIn(true)}
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium text-lg transition"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold mb-8">Security Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
