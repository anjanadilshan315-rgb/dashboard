"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn, Shield, Heart } from "lucide-react";
import { errorMessage, getSession, login } from "@/lib/api";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#FAF7F2]" />}>
      <AdminLogin />
    </Suspense>
  );
}

function AdminLogin() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (getSession()) router.replace(safeNext(next));
  }, [router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      await login(email.trim(), password, rememberMe);
      router.replace(safeNext(next));
    } catch (error) {
      setErrorMsg(errorMessage(error, "Invalid email or password"));
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#FAF7F2] flex flex-col lg:flex-row">

      {/* ============================================================== */}
      {/* LEFT SIDE — full height column with artwork + content (DESKTOP) */}
      {/* ============================================================== */}
      <div className="hidden lg:flex relative w-[44%] h-full flex-col items-center justify-center overflow-hidden">

        {/* Background artwork */}
        <Image
          src="/assets/bg-artwork.png"
          alt="Wedding Ambient Background"
          fill
          priority
          className="object-cover object-left"
        />

        {/* Subtle right-edge fade */}
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#FAF7F2] to-transparent pointer-events-none" />

        {/* Content: Logo + Typography */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center px-10"
        >
          {/* Gold-rimmed circular logo */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative w-52 h-52 xl:w-64 xl:h-64 mb-5 rounded-full p-[3px] shadow-[0_12px_35px_rgba(180,135,65,0.35)]"
            style={{
              background:
                "linear-gradient(135deg, #ECC880 0%, #FDF4D8 30%, #C99B4B 60%, #9B6F23 100%)",
            }}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden bg-[#FBF8F4] border-[2px] border-[#FFF8E7]">
              <Image
                src="/assets/logo.svg"
                alt="Wedora Logo"
                fill
                priority
                className="object-cover scale-105"
              />
            </div>
          </motion.div>

          <div className="space-y-1">
            <h2 className="font-playfair text-[28px] xl:text-[33px] font-semibold text-[#28211B] tracking-wide">
              Wedora Admin,
            </h2>
            <p className="font-playfair italic text-[36px] xl:text-[40px] text-[#B88737] leading-none pt-1">
              Control Panel
            </p>
          </div>

          <p className="mt-4 text-xs text-[#5D534A] leading-relaxed max-w-[300px]">
            Manage wedding invitations, view guest lists, and track your platform&apos;s budget securely.
          </p>
        </motion.div>
      </div>

      {/* ============================================================== */}
      {/* GOLDEN CURVED DIVIDER — drawn on top of both sides (DESKTOP)   */}
      {/* ============================================================== */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-20">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="goldLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#DFBB73" />
              <stop offset="20%" stopColor="#FBF0CC" />
              <stop offset="50%" stopColor="#C89A48" />
              <stop offset="75%" stopColor="#E9C985" />
              <stop offset="100%" stopColor="#966D23" />
            </linearGradient>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d="M 430 0 Q 490 500 425 1000"
            fill="none"
            stroke="url(#goldLine)"
            strokeWidth="3.5"
            filter="url(#glow)"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* MOBILE HEADER — compact artwork strip                           */}
      {/* ============================================================== */}
      <div className="flex lg:hidden relative w-full shrink-0 overflow-hidden" style={{ height: "38vw", maxHeight: "180px" }}>
        <Image
          src="/assets/bg-artwork.png"
          alt="Wedding Background"
          fill
          priority
          className="object-cover object-left-bottom"
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FAF7F2] to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative w-20 h-20 rounded-full p-[2px] shadow-lg"
            style={{
              background: "linear-gradient(135deg, #ECC880 0%, #FDF4D8 30%, #C99B4B 60%, #9B6F23 100%)",
            }}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden border-[2px] border-[#FFF8E7]">
              <Image src="/assets/logo.svg" alt="Logo" fill className="object-cover scale-105" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden flex-col items-center text-center px-4 pb-2 shrink-0">
        <h2 className="font-playfair text-xl font-semibold text-[#28211B]">
          Wedora Admin,
        </h2>
        <p className="font-playfair italic text-2xl text-[#B88737] leading-tight">
          Control Panel
        </p>
      </div>

      {/* ============================================================== */}
      {/* RIGHT SIDE — login card + corner florals                        */}
      {/* ============================================================== */}
      <div className="relative flex-1 h-full lg:min-h-screen flex flex-col z-10 overflow-hidden">

        {/* Top-right branch */}
        <div className="absolute top-0 right-0 w-28 sm:w-40 lg:w-52 pointer-events-none z-0 select-none">
          <Image
            src="/assets/branch-corner.png"
            alt="Branch Accent"
            width={220}
            height={220}
            className="w-full h-auto object-contain translate-x-2 -translate-y-1"
          />
        </div>

        {/* Bottom-right flowers */}
        <div className="absolute bottom-0 right-0 w-36 sm:w-52 lg:w-64 pointer-events-none z-0 select-none">
          <Image
            src="/assets/flower-corner.png"
            alt="Flower Accent"
            width={280}
            height={280}
            className="w-full h-auto object-contain translate-x-2 translate-y-2"
          />
        </div>

        {/* Admin Login badge */}
        <div className="relative z-10 flex justify-end px-4 pt-3 lg:px-8 lg:pt-5 shrink-0">
          <div className="flex items-center space-x-2 text-xs font-medium text-[#8F6626]">
            <span className="w-6 h-6 rounded-full bg-[#F3E5CD] flex items-center justify-center text-[#B88737] shadow-sm">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <span className="tracking-wide uppercase font-bold text-[#8F6626]">Admin System</span>
          </div>
        </div>

        {/* Login card */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-2 lg:px-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
            className="w-full max-w-[440px] bg-white/95 backdrop-blur-md rounded-[26px] border border-[#EADBCA] px-7 py-6 lg:px-9 lg:py-8 shadow-[0_18px_50px_rgba(180,140,80,0.13)]"
          >
            {/* ♥ ornament */}
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#C59B48]" />
              <Shield className="w-3 h-3 fill-[#C59B48] text-[#C59B48]" />
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#C59B48]" />
            </div>

            {/* Title */}
            <div className="text-center space-y-1 mb-5">
              <h1 className="font-playfair text-[28px] lg:text-[32px] font-semibold text-[#29221D] tracking-tight">
                Staff Login
              </h1>
              <p className="text-xs text-[#7D736A]">
                Secure access for the Wedora admin and sales team.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-[#483E36] tracking-wide">
                  <Mail className="w-3.5 h-3.5 text-[#B88737]" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@wedora.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DFD3C3] bg-[#FCFAF7] text-sm text-[#2C231E] placeholder:text-[#A89E94] focus:outline-none focus:ring-2 focus:ring-[#C59B48]/50 focus:border-[#C59B48] transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-[#483E36] tracking-wide">
                  <Lock className="w-3.5 h-3.5 text-[#B88737]" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-[#DFD3C3] bg-[#FCFAF7] text-sm text-[#2C231E] placeholder:text-[#A89E94] focus:outline-none focus:ring-2 focus:ring-[#C59B48]/50 focus:border-[#C59B48] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8277] hover:text-[#564C44] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between text-xs pt-1 pb-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none text-[#5B5047]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D6C7B5] accent-[#B88737] cursor-pointer"
                  />
                  <span>Remember my session</span>
                </label>
              </div>

              {/* Login button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-white shadow-[0_8px_20px_rgba(180,135,65,0.28)] flex items-center justify-center space-x-2 disabled:opacity-80"
                style={{
                  background: "linear-gradient(90deg, #C79848 0%, #B88737 50%, #A87428 100%)",
                }}
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Access Dashboard</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* ♥ ornament */}
            <div className="flex items-center justify-center space-x-3 mt-6">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#C59B48]" />
              <Heart className="w-3 h-3 fill-[#C59B48] text-[#C59B48]" />
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#C59B48]" />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center py-2 shrink-0">
          <p className="text-[10px] text-[#A69B90]">
            © {new Date().getFullYear()} Wedora Admin System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
