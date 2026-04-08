"use client";

import { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, X, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (idToken: string) => void;
  phoneNumber: string;
}

export default function PhoneVerificationModal({ isOpen, onClose, onSuccess, phoneNumber }: PhoneVerificationModalProps) {
  const [step, setStep] = useState<'SENDING' | 'VERIFYING'>('SENDING');
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Manage cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'VERIFYING' && cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, cooldown]);

  // Clean up recaptcha properly and initialize
  useEffect(() => {
    if (isOpen) {
      setStep('SENDING');
      setOtp("");
      setCooldown(60);
      
      // Cleanup any pre-existing verifier to prevent "removed client element" errors
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = undefined;
      }

      // Use a timeout to ensure the DOM element id="recaptcha-container" is painted
      const timer = setTimeout(() => {
        try {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
          });
          sendOtp();
        } catch (error) {
          console.error("Recaptcha Init error", error);
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = undefined;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // We trigger this when modal opens

  const sendOtp = async () => {
    if (!phoneNumber) {
      toast.error("Valid phone number required.");
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      // Format phone number to E.164 if it isn't completely formatted. Assume Ghanaian if local format.
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith("+")) {
         // Naive formatting for +233
         if (formattedPhone.startsWith("0")) formattedPhone = "+233" + formattedPhone.slice(1);
         else formattedPhone = "+233" + formattedPhone;
      }

      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep('VERIFYING');
      setCooldown(60); // Reset cooldown on resend
      toast.success("Verification code sent to " + formattedPhone);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to send code. Make sure your number format is correct.");
      onClose(); // Exit if sending fails on mount
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;
    
    setIsLoading(true);
    try {
      if (!confirmationResult) throw new Error("No confirmation result.");
      const result = await confirmationResult.confirm(otp);
      
      const idToken = await result.user.getIdToken();
      toast.success("Phone verified successfully!");
      onSuccess(idToken);
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    // Use only the last char if they typed quickly
    const char = value.slice(-1);

    const newOtp = otp.padEnd(6, ' ').split('');
    newOtp[index] = char || ' ';
    const finalOtp = newOtp.join('').trimEnd();
    setOtp(finalOtp);

    // Focus next if character was entered
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      setOtp(pastedData);
      // focus the last filled input or the 6th
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Invisible Recaptcha */}
      <div id="recaptcha-container"></div>
      
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="relative p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Verify Phone Number
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'SENDING' ? (
            <div className="text-center py-6">
              <Phone className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900 mb-2">Sending code to {phoneNumber}</p>
              <p className="text-sm text-slate-500 mb-6">Please wait while we secure your session...</p>
              {isLoading && <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />}
            </div>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{phoneNumber}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all placeholder:text-slate-300"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full bg-blue-600 text-white font-semibold py-3 sm:py-4 mt-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                Confirm Code
              </button>
              
              <div className="text-sm text-center text-slate-500 mt-4">
                Did not receive the code?{" "}
                {cooldown > 0 ? (
                  <span className="font-medium text-slate-400">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={sendOtp} 
                    disabled={isLoading}
                    className="text-blue-600 hover:underline disabled:opacity-50 font-medium"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Add global type for RecaptchaVerifier
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
