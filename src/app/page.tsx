'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle, Clock, QrCode, X, RefreshCw, ShoppingBag, Search } from 'lucide-react';

interface DownloadItem {
  id: string;
  title: string;
  description: string;
  price: string;
  fileUrl: string;
  imageUrl: string | null;
  category: string | null;
}

const FALLBACK_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='#f3f4f6'/><text x='200' y='150' font-size='64' text-anchor='middle' dominant-baseline='middle'>🚗</text></svg>`
  );

interface PaymentData {
  paymentId: string;
  md5: string;
  qrString: string;
  amount: string;
  downloadTitle: string;
  billNumber: string;
  demoMode?: boolean;
}

export default function ShopPage() {
  const [products, setProducts] = useState<DownloadItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<DownloadItem | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [qrImage, setQrImage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'generating' | 'waiting' | 'paid'>('idle');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingRef = useRef(false);
  const fileUrlRef = useRef<string>('');

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const loadProducts = async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const res = await fetch('/api/downloads', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        setLoadError(data?.hint || data?.message || `Server error (${res.status})`);
        setLoadState('error');
        return;
      }

      setProducts(data);
      setLoadState('ready');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Network error');
      setLoadState('error');
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))];

  const filtered = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const generateQRImage = async (qrString: string): Promise<string> => {
    const QRCode = await import('qrcode');
    try {
      return await QRCode.toDataURL(qrString, {
        width: 320,
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
    } catch {
      return '';
    }
  };

  const handleBuy = async (product: DownloadItem) => {
    setSelectedProduct(product);
    fileUrlRef.current = product.fileUrl;
    setStatus('generating');
    setMessage('');

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadId: product.id }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.error || 'Failed to create payment');
        setStatus('idle');
        setSelectedProduct(null);
        return;
      }

      setPayment(data);
      setQrImage(await generateQRImage(data.qrString));
      setStatus('waiting');

      stopPolling();
      pollingRef.current = setInterval(() => checkPaymentStatus(data.md5), 4000);
    } catch {
      setMessage('Failed to generate payment. Please try again.');
      setStatus('idle');
      setSelectedProduct(null);
    }
  };

  const checkPaymentStatus = async (md5: string, simulate = false) => {
    if (checkingRef.current && !simulate) return;
    checkingRef.current = true;

    try {
      const res = await fetch('/api/payments/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ md5, simulate }),
      });
      const data = await res.json();

      if (data.isPaid) {
        setStatus('paid');
        stopPolling();
        // Redirect to the download file link after payment
        if (fileUrlRef.current) {
          setTimeout(() => {
            window.open(fileUrlRef.current, '_blank', 'noopener');
          }, 1200);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    } finally {
      checkingRef.current = false;
    }
  };

  const handleDownload = () => {
    if (!selectedProduct) return;
    window.open(selectedProduct.fileUrl, '_blank', 'noopener');
  };

  const closeModal = () => {
    stopPolling();
    setPayment(null);
    setQrImage('');
    setStatus('idle');
    setMessage('');
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top announcement bar */}
      <div className="bg-gray-950 text-white text-center text-[11px] sm:text-xs py-2 px-4 tracking-wide">
        ⚡ Instant delivery after payment — Bakong KHQR accepted nationwide 🇰🇭
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-11 h-11 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <ShoppingBag className="w-5.5 h-5.5 text-white" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-gray-900 text-base sm:text-lg tracking-[0.06em]">
                RESTLESS <span className="text-red-600">DIGITAL</span> STORE
              </div>
              <div className="text-[10px] text-gray-500 tracking-[0.2em] uppercase hidden sm:block">
                Premium Files • Instant Delivery
              </div>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#products" className="hover:text-gray-900 transition-colors">Products</a>
            <a href="#why-us" className="hover:text-gray-900 transition-colors">Why Us</a>
            <a href="#support" className="hover:text-gray-900 transition-colors">Support</a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative hidden md:block w-56">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-gray-100 border border-transparent focus:border-red-300 focus:bg-white rounded-full pl-10 pr-4 py-2 text-sm text-gray-900 outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 px-3.5 py-2 rounded-full shrink-0 shadow-sm">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">KHQR</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative bg-gray-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(220,38,38,0.15),transparent_50%)]"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400 bg-red-500/10 border border-red-500/20 px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Official Store
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] max-w-2xl">
            Premium car files.<br />
            <span className="text-red-500">Pay with KHQR.</span> Download instantly.
          </h1>
          <p className="text-gray-400 mt-4 text-sm sm:text-lg max-w-xl">
            Scan with Bakong, ABA, ACLEDA, Wing or any KHQR banking app — your download link opens the moment payment lands.
          </p>
          <a
            href="#products"
            className="inline-flex items-center gap-2 mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold px-7 py-3.5 rounded-full transition-colors shadow-lg shadow-red-900/40"
          >
            Browse Products
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Section heading */}
        <div id="products" className="flex items-end justify-between mb-6 scroll-mt-24">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Our Products</h2>
            <p className="text-sm text-gray-500 mt-1">Pay once with KHQR — get your file link instantly</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loadState === 'loading' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200"></div>
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-100 rounded w-full"></div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-10 bg-gray-200 rounded-xl w-28"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {loadState === 'error' && (
          <div className="bg-white border border-red-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-red-500" />
            </div>
            <div className="font-semibold text-gray-900 text-lg">Couldn't load products</div>
            <p className="text-sm text-gray-500 mt-2 break-words">{loadError}</p>
            <button
              onClick={loadProducts}
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMG;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Download className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                {product.category && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-red-600 mb-1">
                    {product.category}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 text-lg leading-snug">{product.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 flex-1">{product.description}</p>

                <div className="flex items-center justify-between mt-5">
                  <div className="text-xl font-bold text-gray-900">
                    ${product.price}
                    <span className="text-xs font-medium text-gray-400 ml-1">USD</span>
                  </div>
                  <button
                    onClick={() => handleBuy(product)}
                    className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loadState === 'ready' && filtered.length === 0 && products.length > 0 && (
          <div className="text-center py-20 text-gray-400">No products match your search.</div>
        )}

        {loadState === 'ready' && products.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            No products available yet.
            <button onClick={loadProducts} className="ml-2 text-red-600 hover:underline font-medium">Reload</button>
          </div>
        )}

        {/* Trust bar */}
        <div id="why-us" className="mt-16 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-6">Why buy from us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Instant delivery', desc: 'Your download link opens the second your payment is confirmed' },
              { title: 'Bakong secured', desc: 'Official NBC KHQR standard with verified transactions' },
              { title: 'No account needed', desc: 'Just scan with your banking app — no signup, no hassle' },
            ].map(item => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-6 flex gap-3.5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer id="support" className="bg-gray-950 text-gray-400 mt-16 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-white/10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div className="font-extrabold text-white text-lg tracking-[0.06em]">
                  RESTLESS <span className="text-red-500">DIGITAL</span> STORE
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Premium digital files with instant delivery. Pay securely with Bakong KHQR —
                Cambodia's national payment standard — and get your download the moment payment lands.
              </p>
              <div className="flex items-center gap-2 mt-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#E1232E] px-3 py-1.5 rounded-md">
                  <QrCode className="w-3.5 h-3.5" />
                  KHQR
                </div>
                <div className="text-[11px] font-medium bg-white/10 text-gray-300 px-3 py-1.5 rounded-md">Bakong</div>
                <div className="text-[11px] font-medium bg-white/10 text-gray-300 px-3 py-1.5 rounded-md">ABA</div>
                <div className="text-[11px] font-medium bg-white/10 text-gray-300 px-3 py-1.5 rounded-md">ACLEDA</div>
                <div className="text-[11px] font-medium bg-white/10 text-gray-300 px-3 py-1.5 rounded-md">Wing</div>
              </div>
            </div>

            {/* Links */}
            <div>
              <div className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Store</div>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#products" className="hover:text-white transition-colors">All Products</a></li>
                <li><a href="#why-us" className="hover:text-white transition-colors">Why Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">How to Pay with KHQR</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>

            <div>
              <div className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Support</div>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Telegram Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>© {new Date().getFullYear()} RESTLESS DIGITAL STORE. All rights reserved.</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Payments powered by Bakong KHQR • Phnom Penh, Cambodia 🇰🇭
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={status !== 'generating' ? closeModal : undefined} />

          <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="font-semibold text-gray-900">Checkout</div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Order summary */}
              <div className="flex gap-4 items-center bg-gray-50 rounded-2xl p-4 mb-5">
                {selectedProduct.imageUrl && (
                  <img
                    src={selectedProduct.imageUrl}
                    alt=""
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMG;
                    }}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 text-sm truncate">{selectedProduct.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Digital download</div>
                </div>
                <div className="font-bold text-gray-900">${selectedProduct.price}</div>
              </div>

              {status === 'generating' && (
                <div className="py-14 flex flex-col items-center text-center">
                  <RefreshCw className="w-7 h-7 animate-spin text-red-600 mb-4" />
                  <div className="font-medium text-gray-900">Generating KHQR...</div>
                  <div className="text-sm text-gray-500 mt-1">One moment please</div>
                </div>
              )}

              {status === 'waiting' && payment && qrImage && (
                <>
                  {/* KHQR card */}
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mx-auto max-w-[300px]">
                    <div className="bg-[#E1232E] py-3 flex items-center justify-center">
                      <span className="text-white font-bold text-lg tracking-widest italic">KHQR</span>
                    </div>
                    <div className="bg-white px-5 pt-4 pb-5 flex flex-col items-center">
                      <div className="w-full text-left">
                        <div className="text-gray-700 text-xs font-medium truncate">{payment.downloadTitle}</div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-gray-900 text-2xl font-bold">{payment.amount}</span>
                          <span className="text-gray-500 text-xs font-semibold">USD</span>
                        </div>
                      </div>
                      <div className="w-full border-t border-dashed border-gray-300 my-3"></div>
                      <img src={qrImage} alt="KHQR Code" className="w-full max-w-[200px]" />
                      <div className="mt-3 flex items-center gap-2 text-green-600 text-[11px] font-semibold">
                        <span className="relative flex h-2 w-2">
                          <span className="status-dot absolute inline-flex h-full w-full rounded-full bg-green-500"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        WAITING FOR PAYMENT
                      </div>
                      <div className="mt-1.5 text-[10px] text-gray-400 font-mono">REF: {payment.billNumber}</div>
                    </div>
                  </div>

                  <p className="text-center text-xs text-gray-500 mt-4 mb-2 max-w-[280px] mx-auto">
                    Scan with Bakong, ABA, ACLEDA, Wing or any KHQR-supported banking app. Checked automatically every 4s.
                  </p>

                  {payment.demoMode && (
                    <button
                      onClick={() => checkPaymentStatus(payment.md5, true)}
                      className="mt-3 w-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 font-medium py-3 rounded-xl transition-colors text-sm"
                    >
                      ⚡ Simulate payment (demo mode)
                    </button>
                  )}
                </>
              )}

              {status === 'paid' && (
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-9 h-9 text-green-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">Payment successful!</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Redirecting you to the download link...
                  </p>

                  <button
                    onClick={handleDownload}
                    className="mt-6 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Open Download Link
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">
                    If nothing opens, tap the button above (your browser may block pop-ups).
                  </p>

                  <button onClick={closeModal} className="mt-3 text-sm text-gray-400 hover:text-gray-600">
                    Continue shopping
                  </button>
                </div>
              )}

              {message && (
                <div className="mt-4 text-center text-sm px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                  {message}
                </div>
              )}

              {status === 'waiting' && (
                <div className="mt-4 pb-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  QR expires in 15 minutes
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
