// All landing-page strings in English and Arabic
const en = {
  // ── Navbar ──────────────────────────────────────────────────────────────────
  'nav.features':      'Features',
  'nav.howItWorks':    'How It Works',
  'nav.pricing':       'Pricing',
  'nav.docs':          'Docs',
  'nav.getStarted':    'Get Started',
  'nav.getStartedFree':'Get Started Free',
  'nav.trustedBy':     'Trusted by 150+ logistics companies',

  // ── Hero ─────────────────────────────────────────────────────────────────────
  'hero.label':        'Logistics Intelligence Platform',
  'hero.h1Line1':      'Transform Any Address',
  'hero.h1Line2':      'Into Optimal Routes',
  'hero.subtitle':     'AI-powered address normalization and route optimization for logistics companies across the Middle East and beyond.',
  'hero.stat1Label':   'AI Accuracy',
  'hero.stat2Label':   'Distance Saved',
  'hero.stat3Label':   'Per Address',
  'hero.getStarted':   'Get Started Free',
  'hero.watchDemo':    'Watch Demo',

  // ── Hero Panels ──────────────────────────────────────────────────────────────
  'panel.addressInput':       'Address Input',
  'panel.googleMapsHeader':   'Google Maps',
  'panel.result1':            'Gold Souk, Dubai',
  'panel.result2':            'Gold Souk Gate, Deira',
  'panel.result3':            'Gold Souk Area, Dubai',
  'panel.result4':            'Al Ras, near Gold Souk',
  'panel.whichCorrect':       'Which one is correct?',
  'panel.waynAI':          'Wayn AI',
  'panel.streetName':         'Al Khor St, Deira',
  'panel.district':           'Gold Souk District',
  'panel.confidence':         '97% Confidence',
  'panel.exactLocation':      'Exact location identified',
  'panel.stopsNormalized':    '12 Stops Normalized',
  'panel.stopsSubtext':       'All addresses verified & geocoded across Dubai',
  'panel.routePlanning':      'Route Planning',
  'panel.calculating':        'Calculating optimal path…',
  'panel.manualRoute':        'Manual Route',
  'panel.manualTime':         '9.2 hrs estimated',
  'panel.waynOptimized':   'Wayn Optimized',
  'panel.optimalTime':        '4.8 hrs · 48.7% saved',
  'panel.distanceSaved':      '48.7% distance saved',

  // ── How It Works ──────────────────────────────────────────────────────────────
  'hiw.sectionLabel':  'Simple Process',
  'hiw.heading':       'How Wayn Works',
  'hiw.subheading':    'From messy input to optimized delivery in three seamless steps.',
  'hiw.step1Title':    'Input Any Address',
  'hiw.step1Desc':     'Paste messy, informal, or Arabic addresses in any format. Dialect, landmarks, partial — we handle it all.',
  'hiw.step2Title':    'AI Normalization',
  'hiw.step2Desc':     'Our AI parses, geocodes, and validates the address with 99% accuracy in under 3 seconds.',
  'hiw.step3Title':    'Route Optimization',
  'hiw.step3Desc':     'Optimized delivery sequences saving up to 48% in distance and hours off every route.',

  // ── Features ──────────────────────────────────────────────────────────────────
  'feat.sectionLabel': 'Platform Features',
  'feat.h2Part1':      'Everything You Need to',
  'feat.h2Part2':      'Scale Logistics',
  'feat.subheading':   'A complete platform for address intelligence and route optimization built for the modern logistics enterprise.',
  'feat.f1Title':      'Arabic Address Intelligence',
  'feat.f1Desc':       'Understands dialect, landmarks, partial addresses across MENA. Works in Arabic, English, and mixed inputs.',
  'feat.f2Title':      'Real-time Geocoding',
  'feat.f2Desc':       'Precise lat/long with confidence scoring in 3 seconds. Sub-10m accuracy for addresses across the Middle East.',
  'feat.f3Title':      'Route Optimization',
  'feat.f3Desc':       'AI-powered sequencing cutting distance by up to 48%. Handles time windows, capacity constraints, and priorities.',
  'feat.f4Title':      'Batch Processing',
  'feat.f4Desc':       'Normalize thousands of addresses simultaneously via API. Async jobs with webhooks and progress tracking.',
  'feat.f5Title':      'Enterprise Security',
  'feat.f5Desc':       'SOC2 compliant with end-to-end encryption. Data residency options, audit logs, and role-based access.',
  'feat.f6Title':      'Analytics Dashboard',
  'feat.f6Desc':       'Track delivery performance and address quality metrics. Exportable reports, trend analysis, and live maps.',

  // ── Stats Bar ─────────────────────────────────────────────────────────────────
  'stats.stat1Label':  'Addresses Normalized',
  'stats.stat2Label':  'Accuracy Rate',
  'stats.stat3Label':  'Average Distance Saved',
  'stats.stat4Label':  'Enterprise Clients',

  // ── CTA / Footer ─────────────────────────────────────────────────────────────
  'cta.sectionLabel':  'Get Started Today',
  'cta.h2Part1':       'Ready to optimize your',
  'cta.h2Part2':       'logistics?',
  'cta.subtext':       'Join 150+ companies delivering smarter across the Middle East. Set up in minutes, see results from day one.',
  'cta.btn1':          'Start Free Trial',
  'cta.btn2':          'Contact Sales',
  'cta.trust1':        'No credit card required',
  'cta.trust2':        'SOC2 compliant',
  'cta.trust3':        'Cancel anytime',

  'footer.product':    'Product',
  'footer.pricing':    'Pricing',
  'footer.docs':       'Docs',
  'footer.blog':       'Blog',
  'footer.careers':    'Careers',
  'footer.contact':    'Contact',
  'footer.copyright':  '© 2026 Wayn. All rights reserved.',
};

// Arabic translations (must match every key in `en`)
const ar: typeof en = {
  // ── Navbar ───────────────────────────────────────────────────────────────────
  'nav.features':      'الميزات',
  'nav.howItWorks':    'كيف يعمل',
  'nav.pricing':       'الأسعار',
  'nav.docs':          'الوثائق',
  'nav.getStarted':    'ابدأ الآن',
  'nav.getStartedFree':'ابدأ مجاناً',
  'nav.trustedBy':     'موثوق به من أكثر من 150 شركة لوجستية',

  // ── Hero ─────────────────────────────────────────────────────────────────────
  'hero.label':        'منصة ذكاء اللوجستيات',
  'hero.h1Line1':      'حوّل أي عنوان',
  'hero.h1Line2':      'إلى مسارات مثالية',
  'hero.subtitle':     'تطبيع العناوين وتحسين المسارات بالذكاء الاصطناعي لشركات اللوجستيات في الشرق الأوسط وما بعده.',
  'hero.stat1Label':   'دقة الذكاء الاصطناعي',
  'hero.stat2Label':   'توفير في المسافة',
  'hero.stat3Label':   'لكل عنوان',
  'hero.getStarted':   'ابدأ مجاناً',
  'hero.watchDemo':    'شاهد العرض',

  // ── Hero Panels ──────────────────────────────────────────────────────────────
  'panel.addressInput':       'إدخال العنوان',
  'panel.googleMapsHeader':   'خرائط جوجل',
  'panel.result1':            'سوق الذهب، دبي',
  'panel.result2':            'بوابة سوق الذهب، ديرة',
  'panel.result3':            'منطقة سوق الذهب، دبي',
  'panel.result4':            'الرأس، بالقرب من سوق الذهب',
  'panel.whichCorrect':       'أيٌّ منها صحيح؟',
  'panel.waynAI':          'وين AI',
  'panel.streetName':         'شارع الخور، ديرة',
  'panel.district':           'منطقة سوق الذهب',
  'panel.confidence':         'ثقة 97%',
  'panel.exactLocation':      'تم تحديد الموقع بدقة',
  'panel.stopsNormalized':    'تم تطبيع 12 توقفاً',
  'panel.stopsSubtext':       'تم التحقق من جميع العناوين وترميزها في دبي',
  'panel.routePlanning':      'تخطيط المسار',
  'panel.calculating':        'جارٍ حساب المسار المثالي…',
  'panel.manualRoute':        'مسار يدوي',
  'panel.manualTime':         '9.2 ساعة تقديرية',
  'panel.waynOptimized':   'وين المحسّن',
  'panel.optimalTime':        '4.8 ساعة · توفير 48.7%',
  'panel.distanceSaved':      'توفير 48.7% في المسافة',

  // ── How It Works ─────────────────────────────────────────────────────────────
  'hiw.sectionLabel':  'عملية بسيطة',
  'hiw.heading':       'كيف يعمل وين',
  'hiw.subheading':    'من إدخال فوضوي إلى توصيل محسّن في ثلاث خطوات سلسة.',
  'hiw.step1Title':    'أدخل أي عنوان',
  'hiw.step1Desc':     'الصق عناوين فوضوية أو غير رسمية أو عربية بأي تنسيق. اللهجات والمعالم والعناوين الجزئية — نتعامل مع الجميع.',
  'hiw.step2Title':    'تطبيع بالذكاء الاصطناعي',
  'hiw.step2Desc':     'يقوم ذكاؤنا الاصطناعي بتحليل العنوان والتحقق منه بدقة 99% في أقل من 3 ثوانٍ.',
  'hiw.step3Title':    'تحسين المسار',
  'hiw.step3Desc':     'تسلسلات توصيل محسّنة توفر ما يصل إلى 48% في المسافة وساعات من كل مسار.',

  // ── Features ─────────────────────────────────────────────────────────────────
  'feat.sectionLabel': 'ميزات المنصة',
  'feat.h2Part1':      'كل ما تحتاجه لـ',
  'feat.h2Part2':      'توسيع اللوجستيات',
  'feat.subheading':   'منصة متكاملة لذكاء العناوين وتحسين المسارات مبنية للمؤسسات اللوجستية الحديثة.',
  'feat.f1Title':      'ذكاء العناوين العربية',
  'feat.f1Desc':       'يفهم اللهجات والمعالم والعناوين الجزئية عبر منطقة الشرق الأوسط وشمال أفريقيا. يعمل بالعربية والإنجليزية والمزيج.',
  'feat.f2Title':      'الترميز الجغرافي الفوري',
  'feat.f2Desc':       'إحداثيات دقيقة مع درجة الثقة في 3 ثوانٍ. دقة أقل من 10 أمتار في جميع أنحاء الشرق الأوسط.',
  'feat.f3Title':      'تحسين المسار',
  'feat.f3Desc':       'تسلسل بالذكاء الاصطناعي يقلل المسافة حتى 48%. يتعامل مع نوافذ الوقت وقيود السعة والأولويات.',
  'feat.f4Title':      'المعالجة الجماعية',
  'feat.f4Desc':       'تطبيع آلاف العناوين في آنٍ واحد عبر الواجهة البرمجية. وظائف غير متزامنة مع Webhooks وتتبع التقدم.',
  'feat.f5Title':      'أمان المؤسسات',
  'feat.f5Desc':       'متوافق مع SOC2 مع تشفير كامل من طرف إلى طرف. خيارات إقامة البيانات وسجلات التدقيق والتحكم في الوصول.',
  'feat.f6Title':      'لوحة التحليلات',
  'feat.f6Desc':       'تتبع أداء التوصيل ومقاييس جودة العناوين. تقارير قابلة للتصدير وتحليل الاتجاهات وخرائط حية.',

  // ── Stats Bar ────────────────────────────────────────────────────────────────
  'stats.stat1Label':  'عنوان تم تطبيعه',
  'stats.stat2Label':  'معدل الدقة',
  'stats.stat3Label':  'متوسط توفير المسافة',
  'stats.stat4Label':  'عميل مؤسسي',

  // ── CTA / Footer ─────────────────────────────────────────────────────────────
  'cta.sectionLabel':  'ابدأ اليوم',
  'cta.h2Part1':       'هل أنت مستعد لتحسين',
  'cta.h2Part2':       'عمليات اللوجستيات؟',
  'cta.subtext':       'انضم إلى أكثر من 150 شركة تُوصّل بذكاء عبر الشرق الأوسط. إعداد في دقائق، ورؤية النتائج من اليوم الأول.',
  'cta.btn1':          'ابدأ التجربة المجانية',
  'cta.btn2':          'تواصل مع المبيعات',
  'cta.trust1':        'لا حاجة لبطاقة ائتمان',
  'cta.trust2':        'متوافق مع SOC2',
  'cta.trust3':        'إلغاء في أي وقت',

  'footer.product':    'المنتج',
  'footer.pricing':    'الأسعار',
  'footer.docs':       'الوثائق',
  'footer.blog':       'المدونة',
  'footer.careers':    'الوظائف',
  'footer.contact':    'اتصل بنا',
  'footer.copyright':  '© 2026 وين. جميع الحقوق محفوظة.',
};

export type Lang = 'en' | 'ar';
export type TranslationKey = keyof typeof en;

export const translations: Record<Lang, typeof en> = { en, ar };
