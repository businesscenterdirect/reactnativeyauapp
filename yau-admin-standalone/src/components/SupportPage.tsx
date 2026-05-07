import React, { useState } from 'react';
import { Mail, HelpCircle, Shield, FileText, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SupportPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const faqs = [
    {
      question: "I can't log into my account. What should I do?",
      answer: "Ensure you are using the correct email address registered with your institution. If you've forgotten your password, use the 'Forgot Password' link on the mobile app login screen. Check your internet connection and ensure your app is updated to the latest version."
    },
    {
      question: "Registration is not accepting my validation code.",
      answer: "Validation codes are case-sensitive and valid for a limited time. If your code isn't working, request a new one from the registration screen. Ensure you have selected the correct institution/program before entering the code."
    },
    {
      question: "Why do I need to select an institution and program?",
      answer: "YAU APP is customized for specific athletic programs. Selecting your institution ensures you receive the correct schedules, messaging, and standings relevant to your team or organization."
    },
    {
      question: "Data is not loading or showing 'No Connection'.",
      answer: "This usually happens due to a weak internet connection. Try switching from mobile data to Wi-Fi or vice-versa. If the problem persists, try force-closing the app and restarting it."
    },
    {
      question: "How do I receive push notifications for game updates?",
      answer: "When you first install the app, ensure you 'Allow' notifications when prompted. You can also check your device settings to ensure YAU APP has notification permissions enabled. This ensures you get real-time updates on schedules and messages."
    },
    {
      question: "Can I manage multiple children's schedules in one account?",
      answer: "Yes! During registration, you can add multiple children. If you've already registered, you can view all your children's relevant schedules, standings, and messages through the unified dashboard in the mobile app."
    }
  ];

  const troubleshootingSteps = [
    "Check for available app updates in the App Store or Google Play.",
    "Ensure your device has a stable internet connection.",
    "Clear app cache (Android) or reinstall the app if issues persist.",
    "Restart your mobile device."
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-indigo-50 overflow-x-hidden">
      {/* Public Header */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="YAU Logo" className="w-10 h-8 object-contain" />
              <span className="font-black text-xl tracking-tighter text-indigo-900 dark:text-white uppercase truncate">YAU Support Center</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden bg-indigo-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            How can we <span className="text-indigo-400">help you?</span>
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto font-medium opacity-90 leading-relaxed">
            Welcome to the YAU APP Support Center. We're here to help you manage your athletic journey smoothly.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Contact & Troubleshooting */}
          <div className="lg:col-span-1 space-y-8">
            {/* Contact Card */}
            <div className="bg-white dark:bg-indigo-950/40 p-8 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-50 dark:border-white/5 transition-all hover:shadow-2xl">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Contact Support</h3>
              <p className="text-sm text-gray-500 dark:text-indigo-200/60 mb-6">
                Need direct assistance? Our team is ready to help you with any issues.
              </p>
              <a
                href="mailto:FUN@YAUSports.org"
                className="inline-flex items-center justify-center w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                Email Support
              </a>
              <p className="mt-4 text-[11px] text-center text-gray-400 font-medium">
                Typical response time: Within 24 hours
              </p>
            </div>

            {/* Troubleshooting Card */}
            <div className="bg-white dark:bg-indigo-950/40 p-8 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-50 dark:border-white/5">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Quick Fixes</h3>
              <ul className="space-y-4">
                {troubleshootingSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-600 dark:text-indigo-100/70 font-medium">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: FAQ */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-indigo-950/40 p-8 md:p-10 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-50 dark:border-white/5 h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <HelpCircle size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Common Issues & FAQ</h2>
              </div>

              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="group rounded-2xl border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all bg-gray-50/30 dark:bg-white/5 overflow-hidden">
                    <button
                      onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                      className="w-full text-left p-6 focus:outline-none"
                    >
                      <h4 className="text-lg font-bold flex items-center justify-between">
                        {faq.question}
                        <ChevronRight
                          size={18}
                          className={`text-indigo-400 transition-transform duration-300 ${activeFaq === index ? 'rotate-90' : 'group-hover:translate-x-1'}`}
                        />
                      </h4>
                    </button>
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${activeFaq === index ? 'max-h-96 opacity-100 p-6 pt-0' : 'max-h-0 opacity-0'
                        }`}
                    >
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-indigo-100/60 font-medium">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Quick Links Section */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="https://youthathleteuniversity.org/privacypolicy/" className="group flex items-center p-6 bg-white dark:bg-indigo-950/40 rounded-3xl border border-indigo-50 dark:border-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mr-6">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Privacy Policy</h3>
              <p className="text-sm text-gray-500 dark:text-indigo-300/60">Learn how we protect your data.</p>
            </div>
            <ChevronRight className="ml-auto text-gray-300 group-hover:text-indigo-600 transition-colors" />
          </a>

          <a href="https://youthathleteuniversity.org/terms/" className="group flex items-center p-6 bg-white dark:bg-indigo-950/40 rounded-3xl border border-indigo-50 dark:border-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mr-6">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Terms & Conditions</h3>
              <p className="text-sm text-gray-500 dark:text-indigo-300/60">Read our usage guidelines.</p>
            </div>
            <ChevronRight className="ml-auto text-gray-300 group-hover:text-indigo-600 transition-colors" />
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/favicon.png" alt="Logo" className="w-8 h-6 object-contain" />
            <span className="font-black text-lg tracking-tighter uppercase">YAU APP</span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Official Support Portal
          </p>
          <div className="flex justify-center gap-6 mb-8 text-sm font-bold text-gray-500">
            <a href="https://youthathleteuniversity.org/privacypolicy/" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="https://youthathleteuniversity.org/terms/" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="https://youthathleteuniversity.org/contact/" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
            © {new Date().getFullYear()} Youth Athlete University, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SupportPage;
