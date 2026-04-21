/**
 * OWASEEL — Central i18n translations
 *
 * Structure is designed to be extensible:
 * Add a new language key (e.g. "ur", "hi", "bn", "fa") alongside "ar" and "en".
 * RTL languages: ar, fa, ur  |  LTR languages: en, hi, bn
 */

export type LangCode = "ar" | "en";

export const RTL_LANGS: LangCode[] = ["ar"];

export function isRTL(lang: LangCode): boolean {
  return RTL_LANGS.includes(lang);
}

// ─── Translation map ──────────────────────────────────────────────────────────

export const translations: Record<LangCode, Record<string, string>> = {
  // ── Arabic ──────────────────────────────────────────────────────────────────
  ar: {
    // App-wide
    "app.name": "أًوصّل",
    "app.tagline": "توصيل الغاز خلال ٣٠ دقيقة",
    "app.closed": "مغلق",
    "app.open": "مفتوح",
    "lang.switch": "EN",

    // Home
    "home.hero.title": "توصيل الغاز خلال",
    "home.hero.highlight": "٣٠ دقيقة",
    "home.hero.subtitle": "بدون تطبيق. بدون تسجيل. بضغطة واحدة.",
    "home.price.label": "السعر الإجمالي شامل التوصيل",
    "home.price.value": "OMR 3.300",
    "home.price.note": "سعر ثابت — لا رسوم إضافية",
    "home.cta.order": "اطلب الغاز الآن 🔥",
    "home.cta.location": "سنطلب موقعك فقط",
    "home.features.cash": "الدفع نقداً",
    "home.features.cash.sub": "أو بطاقة أو حوالة",
    "home.features.speed": "٣٠ دقيقة",
    "home.features.speed.sub": "متوسط وقت التوصيل",
    "home.features.guarantee": "مضمون",
    "home.features.guarantee.sub": "استرداد كامل إن لم يصل",
    "home.whatsapp": "تحتاج مساعدة؟ تواصل معنا عبر واتساب",
    "home.account.label": "حسابك",
    "home.account.login": "تسجيل دخول",
    "home.account.change": "تغيير الحساب",
    "home.about.link": "من نحن | OWASEEL",
    "home.provider.portal": "بوابة المزودين",
    "home.provider.login": "دخول المزود",
    "home.provider.register": "+ انضم كمزوّد",
    "home.provider.admin": "إدارة",

    // How it works
    "home.how.title": "كيف يعمل؟",
    "home.how.step1.title": "اضغط اطلب",
    "home.how.step1.desc": "بدون تسجيل، بدون تطبيق",
    "home.how.step2.title": "شارك موقعك",
    "home.how.step2.desc": "بضغطة واحدة فقط",
    "home.how.step3.title": "استقبل طلبك",
    "home.how.step3.desc": "خلال ٣٠ دقيقة مضمونة",

    // Reviews
    "home.reviews.title": "ماذا يقول عملاؤنا",

    // FAQ
    "home.faq.title": "أسئلة شائعة",
    "home.faq.q1": "كم يستغرق التوصيل؟",
    "home.faq.a1": "متوسط وقت التوصيل ٣٠ دقيقة. إذا تأخر الطلب أكثر من ٤٥ دقيقة نسترد لك المبلغ كاملاً.",
    "home.faq.q2": "ما طرق الدفع المتاحة؟",
    "home.faq.a2": "نقبل الدفع نقداً، أو بطاقة الائتمان/الخصم، أو عبر حوالة بنكية.",
    "home.faq.q3": "ما المناطق التي تغطونها؟",
    "home.faq.a3": "نغطي ٢٧ حياً في مسقط الكبرى. تحقق من توفر الخدمة عند إدخال موقعك.",
    "home.faq.q4": "هل يمكنني تتبع طلبي؟",
    "home.faq.a4": "نعم، ستصلك رسالة واتساب برابط التتبع فور تأكيد الطلب.",
    "home.faq.q5": "ماذا لو لم يصل الغاز؟",
    "home.faq.a5": "نضمن الاسترداد الكامل إذا لم يتم التوصيل. تواصل معنا عبر واتساب.",

    // Location picker
    "location.title": "أين تريد التوصيل؟",
    "location.search.placeholder": "ابحث عن حيّك أو منطقتك...",
    "location.confirm": "تأكيد الموقع",
    "location.detecting": "جاري تحديد موقعك...",
    "location.use.gps": "استخدام موقعي الحالي",
    "location.manual": "اختر يدوياً",

    // Order summary
    "summary.title": "ملخص الطلب",
    "summary.product": "أسطوانة غاز منزلية",
    "summary.delivery": "رسوم التوصيل",
    "summary.free": "مجاناً",
    "summary.total": "الإجمالي",
    "summary.location": "موقع التوصيل",
    "summary.confirm": "تأكيد الطلب",
    "summary.back": "رجوع",
    "summary.eta": "وقت التوصيل المتوقع",
    "summary.minutes": "دقيقة",

    // Payment
    "payment.title": "الدفع",
    "payment.cash": "نقداً عند التوصيل",
    "payment.card": "بطاقة ائتمان / خصم",
    "payment.transfer": "حوالة بنكية",
    "payment.confirm": "تأكيد الدفع",
    "payment.total": "المبلغ الإجمالي",
    "payment.secure": "الدفع آمن ومشفّر",

    // Order placed
    "placed.title": "تم استلام طلبك! 🎉",
    "placed.subtitle": "المزود في الطريق إليك",
    "placed.track": "تتبع الطلب",
    "placed.whatsapp": "تواصل عبر واتساب",
    "placed.eta": "الوصول المتوقع خلال",
    "placed.order.id": "رقم الطلب",

    // Order tracking
    "tracking.title": "تتبع طلبك",
    "tracking.status.pending": "في انتظار المزود",
    "tracking.status.accepted": "تم قبول الطلب",
    "tracking.status.on_way": "المزود في الطريق",
    "tracking.status.delivered": "تم التوصيل",
    "tracking.status.cancelled": "تم الإلغاء",
    "tracking.provider": "المزود",
    "tracking.contact": "تواصل مع المزود",
    "tracking.eta": "الوصول المتوقع",
    "tracking.rate": "قيّم التجربة",

    // About
    "about.title": "من نحن",
    "about.subtitle": "منصة توصيل أسطوانات الغاز الأولى في مسقط — سريعة، موثوقة، وبضغطة واحدة.",
    "about.back": "الرئيسية",
    "about.story.title": "قصتنا",
    "about.story.p1": "وُلدت فكرة أًوصّل من تجربة حقيقية — عائلة في مسقط نفد منها الغاز في منتصف الليل، ولم تجد طريقة سهلة للحصول عليه. من تلك اللحظة، قررنا بناء منصة تجعل توصيل الغاز بسيطاً كأي طلب يومي.",
    "about.story.p2": "اليوم، نربط بين المزودين المعتمدين وآلاف الأسر في مسقط، مع ضمان التوصيل خلال ٣٠ دقيقة أو استرداد كامل للمبلغ.",
    "about.stats.title": "بالأرقام",
    "about.stats.orders": "+٥٠٠ طلب مكتمل",
    "about.stats.speed": "٣٠ د متوسط التوصيل",
    "about.stats.areas": "٢٧ حياً في مسقط",
    "about.stats.rating": "٤.٩★ متوسط التقييم",
    "about.vision.title": "رؤيتنا ورسالتنا",
    "about.vision.label": "الرؤية",
    "about.vision.heading": "أن نكون المنصة الأولى لتوصيل الطاقة المنزلية في سلطنة عُمان",
    "about.vision.desc": "نسعى لتوسيع خدماتنا لتشمل جميع محافظات السلطنة، مع الحفاظ على معايير السرعة والجودة التي نفخر بها.",
    "about.mission.label": "الرسالة",
    "about.mission.heading": "توصيل الغاز لكل بيت في مسقط خلال ٣٠ دقيقة — بدون تطبيق، بدون تعقيد",
    "about.mission.desc": "نؤمن أن الحصول على احتياجات المنزل الأساسية يجب أن يكون سهلاً وموثوقاً وبسعر ثابت لا مفاجآت فيه.",
    "about.values.title": "قيمنا",
    "about.values.speed.title": "السرعة أولاً",
    "about.values.speed.desc": "كل دقيقة تهم. نضمن التوصيل خلال ٣٠ دقيقة أو نسترد المبلغ كاملاً دون أسئلة.",
    "about.values.safety.title": "الأمان والموثوقية",
    "about.values.safety.desc": "جميع مزودينا معتمدون ومدرّبون. أسطوانات الغاز تُفحص قبل كل توصيل.",
    "about.values.service.title": "خدمة من القلب",
    "about.values.service.desc": "نتعامل مع كل طلب كأنه لعائلتنا. رضا العميل ليس هدفاً — هو معيار نجاحنا.",
    "about.values.transparency.title": "الشفافية والسعر الثابت",
    "about.values.transparency.desc": "سعر واحد ثابت: ٣.٣٠٠ ريال عُماني. لا رسوم خفية، لا مفاجآت عند الباب.",
    "about.team.title": "فريقنا",
    "about.team.desc": "قيادة متمرسة تجمع بين الخبرة الإدارية والرؤية الاستراتيجية لبناء منصة توصيل الطاقة الأولى في عُمان.",
    "about.team.member1.name": "فهد العامري",
    "about.team.member1.role": "المؤسس ورئيس مجلس الإدارة",
    "about.team.member2.name": "مبارك الحبسي",
    "about.team.member2.role": "المدير العام",
    "about.team.member3.name": "أحمد سبحاني",
    "about.team.member3.role": "الرئيس التنفيذي",
    "about.coverage.title": "نطاق التغطية",
    "about.coverage.heading": "مسقط — ٢٧ حياً",
    "about.coverage.desc": "نغطي جميع أحياء مسقط الكبرى: السيب، مسقط القديمة، الروي، الخوير، القرم، وأكثر من ٢٢ حياً آخر.",
    "about.quality.desc": "جميع أسطوانات الغاز مطابقة لمعايير الهيئة العُمانية للمواصفات والمقاييس. مزودونا مرخّصون ومؤمَّن عليهم.",
    "about.cta.order": "اطلب الغاز الآن",
    "about.cta.whatsapp": "تواصل معنا عبر واتساب",
  },

  // ── English ──────────────────────────────────────────────────────────────────
  en: {
    // App-wide
    "app.name": "OWASEEL",
    "app.tagline": "Gas delivery in 30 minutes",
    "app.closed": "Closed",
    "app.open": "Open",
    "lang.switch": "عر",

    // Home
    "home.hero.title": "Gas Delivery in",
    "home.hero.highlight": "30 Minutes",
    "home.hero.subtitle": "No app. No registration. One tap.",
    "home.price.label": "Total price including delivery",
    "home.price.value": "OMR 3.300",
    "home.price.note": "Fixed price — no hidden fees",
    "home.cta.order": "Order Gas Now 🔥",
    "home.cta.location": "We'll only ask for your location",
    "home.features.cash": "Pay Cash",
    "home.features.cash.sub": "or card / transfer",
    "home.features.speed": "30 Min",
    "home.features.speed.sub": "Average delivery time",
    "home.features.guarantee": "Guaranteed",
    "home.features.guarantee.sub": "Full refund if late",
    "home.whatsapp": "Need help? Contact us on WhatsApp",
    "home.account.label": "Your account",
    "home.account.login": "Login",
    "home.account.change": "Change account",
    "home.about.link": "About Us | OWASEEL",
    "home.provider.portal": "Provider Portal",
    "home.provider.login": "Provider Login",
    "home.provider.register": "+ Join as Provider",
    "home.provider.admin": "Admin",

    // How it works
    "home.how.title": "How It Works",
    "home.how.step1.title": "Tap Order",
    "home.how.step1.desc": "No sign-up, no app",
    "home.how.step2.title": "Share Location",
    "home.how.step2.desc": "One tap only",
    "home.how.step3.title": "Receive Delivery",
    "home.how.step3.desc": "In 30 minutes, guaranteed",

    // Reviews
    "home.reviews.title": "What Our Customers Say",

    // FAQ
    "home.faq.title": "Frequently Asked Questions",
    "home.faq.q1": "How long does delivery take?",
    "home.faq.a1": "Average delivery time is 30 minutes. If your order is delayed beyond 45 minutes, you get a full refund.",
    "home.faq.q2": "What payment methods are available?",
    "home.faq.a2": "We accept cash on delivery, credit/debit card, or bank transfer.",
    "home.faq.q3": "Which areas do you cover?",
    "home.faq.a3": "We cover 27 neighborhoods in Greater Muscat. Check availability when you enter your location.",
    "home.faq.q4": "Can I track my order?",
    "home.faq.a4": "Yes, you'll receive a WhatsApp message with a tracking link once your order is confirmed.",
    "home.faq.q5": "What if my gas doesn't arrive?",
    "home.faq.a5": "We guarantee a full refund if delivery fails. Contact us via WhatsApp.",

    // Location picker
    "location.title": "Where should we deliver?",
    "location.search.placeholder": "Search your neighborhood or area...",
    "location.confirm": "Confirm Location",
    "location.detecting": "Detecting your location...",
    "location.use.gps": "Use My Current Location",
    "location.manual": "Choose Manually",

    // Order summary
    "summary.title": "Order Summary",
    "summary.product": "Household Gas Cylinder",
    "summary.delivery": "Delivery Fee",
    "summary.free": "Free",
    "summary.total": "Total",
    "summary.location": "Delivery Location",
    "summary.confirm": "Confirm Order",
    "summary.back": "Back",
    "summary.eta": "Estimated Delivery Time",
    "summary.minutes": "minutes",

    // Payment
    "payment.title": "Payment",
    "payment.cash": "Cash on Delivery",
    "payment.card": "Credit / Debit Card",
    "payment.transfer": "Bank Transfer",
    "payment.confirm": "Confirm Payment",
    "payment.total": "Total Amount",
    "payment.secure": "Secure & encrypted payment",

    // Order placed
    "placed.title": "Order Received! 🎉",
    "placed.subtitle": "Your provider is on the way",
    "placed.track": "Track Order",
    "placed.whatsapp": "Contact via WhatsApp",
    "placed.eta": "Expected arrival in",
    "placed.order.id": "Order ID",

    // Order tracking
    "tracking.title": "Track Your Order",
    "tracking.status.pending": "Awaiting Provider",
    "tracking.status.accepted": "Order Accepted",
    "tracking.status.on_way": "Provider On the Way",
    "tracking.status.delivered": "Delivered",
    "tracking.status.cancelled": "Cancelled",
    "tracking.provider": "Provider",
    "tracking.contact": "Contact Provider",
    "tracking.eta": "Estimated Arrival",
    "tracking.rate": "Rate Your Experience",

    // About
    "about.title": "About Us",
    "about.subtitle": "Muscat's first gas cylinder delivery platform — fast, reliable, one tap.",
    "about.back": "Home",
    "about.story.title": "Our Story",
    "about.story.p1": "OWASEEL was born from a real experience — a family in Muscat ran out of gas in the middle of the night with no easy way to get more. From that moment, we decided to build a platform that makes gas delivery as simple as any everyday order.",
    "about.story.p2": "Today, we connect certified providers with thousands of households in Muscat, guaranteeing delivery within 30 minutes or a full refund.",
    "about.stats.title": "By the Numbers",
    "about.stats.orders": "+500 Completed Orders",
    "about.stats.speed": "30 Min Avg Delivery",
    "about.stats.areas": "27 Neighborhoods in Muscat",
    "about.stats.rating": "4.9★ Average Rating",
    "about.vision.title": "Vision & Mission",
    "about.vision.label": "Vision",
    "about.vision.heading": "To be Oman's #1 home energy delivery platform",
    "about.vision.desc": "We aim to expand our services across all governorates of Oman while maintaining the speed and quality standards we are proud of.",
    "about.mission.label": "Mission",
    "about.mission.heading": "Deliver gas to every home in Muscat in 30 minutes — no app, no hassle",
    "about.mission.desc": "We believe that accessing basic home needs should be easy, reliable, and at a fixed price with no surprises.",
    "about.values.title": "Our Values",
    "about.values.speed.title": "Speed First",
    "about.values.speed.desc": "Every minute counts. We guarantee delivery in 30 minutes or a full refund, no questions asked.",
    "about.values.safety.title": "Safety & Reliability",
    "about.values.safety.desc": "All our providers are certified and trained. Gas cylinders are inspected before every delivery.",
    "about.values.service.title": "Service from the Heart",
    "about.values.service.desc": "We treat every order as if it were for our own family. Customer satisfaction is not a goal — it's our standard.",
    "about.values.transparency.title": "Transparency & Fixed Price",
    "about.values.transparency.desc": "One fixed price: OMR 3.300. No hidden fees, no surprises at the door.",
    "about.team.title": "Our Team",
    "about.team.desc": "Experienced leadership combining management expertise and strategic vision to build Oman's first home energy delivery platform.",
    "about.team.member1.name": "Fahad Al-Amri",
    "about.team.member1.role": "Founder & Chairman",
    "about.team.member2.name": "Mubarak Al-Habsi",
    "about.team.member2.role": "General Manager",
    "about.team.member3.name": "Ahmed Subhani",
    "about.team.member3.role": "Chief Executive Officer",
    "about.coverage.title": "Coverage Area",
    "about.coverage.heading": "Muscat — 27 Neighborhoods",
    "about.coverage.desc": "We cover all major Muscat neighborhoods: Al Seeb, Old Muscat, Al Ruwi, Al Khuwair, Al Qurm, and 22+ more.",
    "about.quality.desc": "All gas cylinders comply with Oman's national standards. Our providers are licensed and insured.",
    "about.cta.order": "Order Gas Now",
    "about.cta.whatsapp": "Contact Us on WhatsApp",
  },
};

export type TranslationKey = keyof typeof translations.ar;
