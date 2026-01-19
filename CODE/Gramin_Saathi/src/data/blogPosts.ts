export const authors = [
  { name: 'Ananay', avatar: 'A', color: 'bg-blue-500' },
  { name: 'Aryan', avatar: 'A', color: 'bg-green-500' },
  { name: 'Rehaan', avatar: 'R', color: 'bg-purple-500' },
  { name: 'Kanishk', avatar: 'K', color: 'bg-orange-500' },
  { name: 'Siddharth', avatar: 'S', color: 'bg-red-500' },
];

export const getBlogPosts = (lang: string) => [
  {
    id: 1,
    author: authors[0],
    date: '23 Dec 2025',
    readTime: '8 min',
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80',
    title: lang === 'en' ? 'Understanding KCC: Your Gateway to Affordable Farm Loans' : 'KCC को समझें: सस्ते कृषि ऋण का द्वार',
    content: lang === 'en' 
      ? `The Kisan Credit Card (KCC) scheme, launched in 1998 by the Government of India, is one of the most revolutionary initiatives designed specifically to help farmers access affordable credit for their agricultural needs. Unlike traditional bank loans that can take weeks to process and charge interest rates of 12-15% or higher, KCC provides farmers with quick access to loans at just 7% annual interest. What makes this even more attractive is the additional 3% interest subvention provided by the government for timely repayment, effectively bringing the interest rate down to just 4% per annum.

The scheme covers a wide range of agricultural expenses including purchase of seeds, fertilizers, pesticides, and other inputs. It also provides working capital for crop production, post-harvest expenses, and even marketing of produce. According to the Reserve Bank of India's 2023 report, over 7.5 crore farmers across India have benefited from KCC, with total credit disbursement exceeding ₹8 lakh crore.

Key Benefits of KCC:
• Interest rate as low as 4% with timely repayment subsidy
• Credit limit based on land holding and crop pattern
• Flexibility to withdraw any amount up to the credit limit
• Personal accident insurance cover of ₹50,000 to ₹1 lakh
• No processing fees for loans up to ₹3 lakh
• Validity of 5 years with annual review

To apply for a KCC, visit your nearest bank branch (nationalized, cooperative, or regional rural bank) with your land ownership documents, Aadhaar card, PAN card, and two passport-sized photographs. The bank will assess your eligibility based on the Scale of Finance fixed by the District Level Technical Committee and sanction an appropriate credit limit. The entire process typically takes 2-3 weeks.

Reference: Reserve Bank of India - Priority Sector Lending Guidelines (2023), Ministry of Agriculture & Farmers Welfare - KCC Scheme Guidelines`
      : `किसान क्रेडिट कार्ड (KCC) योजना 1998 में भारत सरकार द्वारा शुरू की गई एक क्रांतिकारी पहल है। यह किसानों को सिर्फ 7% ब्याज दर पर ऋण प्रदान करती है। समय पर चुकाने पर 3% अतिरिक्त सब्सिडी मिलती है, यानी प्रभावी दर सिर्फ 4%!

मुख्य लाभ:
• समय पर भुगतान पर 4% की कम ब्याज दर
• भूमि और फसल के आधार पर क्रेडिट सीमा
• ₹50,000 से ₹1 लाख का दुर्घटना बीमा कवर
• ₹3 लाख तक के ऋण पर कोई प्रोसेसिंग शुल्क नहीं

आवेदन के लिए अपने नजदीकी बैंक में भूमि दस्तावेज, आधार कार्ड और पासपोर्ट फोटो लेकर जाएं।`,
    category: { en: 'Loans & Credit', hi: 'ऋण और क्रेडिट' },
    categoryColor: 'bg-blue-100 text-blue-700',
    initialVotes: 247
  },
  {
    id: 2,
    author: authors[1],
    date: '22 Dec 2025',
    readTime: '7 min',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80',
    title: lang === 'en' ? 'STOP! How to Identify OTP & KYC Scams' : 'रुकें! OTP और KYC धोखाधड़ी कैसे पहचानें',
    content: lang === 'en'
      ? `Financial fraud targeting rural areas has increased by over 300% in the last three years, according to the Cyber Crime Prevention Wing. Scammers have become increasingly sophisticated, using official-sounding language, fake caller IDs showing bank numbers, and creating artificial urgency to trick unsuspecting farmers into sharing sensitive information. Understanding how these scams work is your first line of defense.

The most common scam involves a caller pretending to be from your bank, claiming that your KYC (Know Your Customer) documents are expiring and your account will be frozen. They'll ask you to share your OTP (One Time Password) or download a screen-sharing app like AnyDesk or TeamViewer. Once they have access, they can drain your entire bank account within minutes. Remember: No legitimate bank employee will EVER ask for your OTP, PIN, or password over the phone.

Warning Signs of a Scam Call:
• Caller creates urgency ("Your account will be blocked in 2 hours!")
• Asks for OTP, PIN, CVV, or full card number
• Requests you to download any app or click any link
• Offers too-good-to-be-true prizes or lottery winnings
• Claims to be from "RBI" or "Government" asking for advance fees
• Uses threatening language about legal action

If you receive such a call, immediately hang up and NEVER share any information. Report to the National Cyber Crime Helpline at 1930 or file a complaint at cybercrime.gov.in. Block the number and inform your family members as scammers often target multiple people in the same village. If you've already shared information, contact your bank immediately to block your account and cards.

Statistics from the Indian Cyber Crime Coordination Centre show that in 2023, rural areas reported losses of over ₹1,200 crore to such scams. The average victim loses ₹47,000 - often their entire savings. Don't become a statistic. When in doubt, visit your bank branch in person.

Reference: Indian Cyber Crime Coordination Centre Annual Report 2023, RBI Guidelines on Customer Protection`
      : `पिछले तीन वर्षों में ग्रामीण क्षेत्रों में वित्तीय धोखाधड़ी 300% से अधिक बढ़ी है। ठग बैंक कर्मचारी बनकर कॉल करते हैं और KYC अपडेट के नाम पर OTP मांगते हैं।

धोखाधड़ी के संकेत:
• कॉलर जल्दबाजी करता है
• OTP, PIN या पासवर्ड मांगता है
• कोई ऐप डाउनलोड करने को कहता है
• बड़ी राशि का इनाम या लॉटरी का झांसा देता है

अगर ऐसी कॉल आए तो तुरंत काट दें। 1930 पर रिपोर्ट करें या cybercrime.gov.in पर शिकायत दर्ज करें।`,
    category: { en: 'Security', hi: 'सुरक्षा' },
    categoryColor: 'bg-red-100 text-red-700',
    initialVotes: 189
  },
  {
    id: 3,
    author: authors[2],
    date: '21 Dec 2025',
    readTime: '9 min',
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80',
    title: lang === 'en' ? 'The 20% Rule: Smart Saving After Harvest' : '20% नियम: फसल के बाद स्मार्ट बचत',
    content: lang === 'en'
      ? `The harvest season brings relief and joy to farming households, but it also brings a critical financial decision that can determine the family's security for the entire year. Research by the National Bank for Agriculture and Rural Development (NABARD) shows that over 73% of farmer households have zero savings, making them extremely vulnerable to any unexpected expense or crop failure. The 20% rule is a simple yet powerful habit that can transform your financial future.

The concept is straightforward: before spending a single rupee from your harvest income, set aside exactly 20% into a separate savings account. This should be done on the same day you receive payment at the mandi. Open a Basic Savings Bank Deposit (BSBD) account - these are zero-balance accounts that every bank must offer. Set up an automatic transfer if possible, so you never have to make the conscious decision to save.

Why 20% Works:
• It's a significant amount that actually builds wealth over time
• It's small enough that you can still manage regular expenses
• At typical mandi prices, 20% of 2-3 harvests can build ₹50,000+ emergency fund
• This fund can prevent distress borrowing at 36%+ interest rates
• It provides a cushion for unexpected medical expenses or crop failure

Building this habit takes discipline. The first season will be the hardest - you'll think of many "necessary" expenses that the 20% could cover. Resist the temptation. Think of this money as already spent - it doesn't exist for daily needs. Within 2-3 years, you'll have enough saved to handle most emergencies without borrowing, make investments in better equipment or seeds, and even start planning for your children's education.

Consider using the Post Office Recurring Deposit (RD) scheme which offers 6.5% interest and allows monthly deposits starting from just ₹100. The discipline of monthly deposits is often easier than one-time large savings.

Reference: NABARD All India Rural Financial Inclusion Survey 2023, India Post Savings Schemes Guidelines`
      : `फसल का मौसम खुशी लाता है, लेकिन NABARD के अनुसार 73% किसान परिवारों के पास कोई बचत नहीं है। 20% नियम इस स्थिति को बदल सकता है।

20% क्यों काम करता है:
• यह समय के साथ वास्तविक धन बनाता है
• 2-3 फसलों में ₹50,000+ का आपातकालीन कोष बन सकता है
• 36%+ ब्याज पर उधार लेने से बचाता है
• अप्रत्याशित खर्चों से सुरक्षा प्रदान करता है

डाकघर की आवर्ती जमा (RD) योजना में निवेश करें जो 6.5% ब्याज देती है।`,
    category: { en: 'Savings', hi: 'बचत' },
    categoryColor: 'bg-green-100 text-green-700',
    initialVotes: 312
  },
  {
    id: 4,
    author: authors[3],
    date: '20 Dec 2025',
    readTime: '8 min',
    image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80',
    title: lang === 'en' ? 'PM Fasal Bima: Protect Your Crops for Just 2%' : 'PM फसल बीमा: सिर्फ 2% में फसल सुरक्षा',
    content: lang === 'en'
      ? `Agriculture in India is inherently risky, with farmers facing threats from unpredictable weather, pest attacks, and natural disasters. The Pradhan Mantri Fasal Bima Yojana (PMFBY), launched in 2016, is the world's largest crop insurance scheme and provides comprehensive protection to farmers at highly subsidized premium rates. In 2023 alone, over 5.5 crore farmer applications were enrolled, covering more than 1,100 lakh hectares of farmland.

The premium structure is remarkably farmer-friendly. For Kharif crops (like paddy, cotton, bajra), the farmer pays just 2% of the sum insured. For Rabi crops (like wheat, mustard, chickpea), it's only 1.5%. For annual commercial and horticultural crops, the premium is 5%. The remaining premium - which can be as high as 15-20% of the sum insured - is shared equally between the Central and State governments. This means a farmer insuring a wheat crop worth ₹50,000 pays just ₹750 as premium.

What PMFBY Covers:
• Prevented sowing/planting risk due to deficit rainfall or adverse conditions
• Standing crop losses from non-preventable risks (drought, flood, hail, cyclone)
• Post-harvest losses up to 14 days from cutting
• Localized calamities like hailstorm, landslide, inundation
• Wild animal attacks (in some states)

The claim settlement process has been significantly improved with mandatory use of technology. Crop Cutting Experiments (CCEs) are now conducted using smartphones with geo-tagged photos, and satellite imagery is used to assess large-scale damage. Claims are directly credited to the farmer's bank account linked with Aadhaar.

To enroll, visit your bank, Primary Agricultural Credit Society (PACS), Common Service Centre (CSC), or use the official Crop Insurance Portal (pmfby.gov.in) or app before the cutoff dates - typically 2 weeks before sowing begins.

Reference: PMFBY Official Portal Statistics 2023, Ministry of Agriculture Annual Report 2022-23`
      : `प्रधानमंत्री फसल बीमा योजना (PMFBY) दुनिया की सबसे बड़ी फसल बीमा योजना है। 2023 में 5.5 करोड़ से अधिक किसान इसमें शामिल हुए।

प्रीमियम संरचना:
• खरीफ फसलों के लिए: बीमित राशि का सिर्फ 2%
• रबी फसलों के लिए: सिर्फ 1.5%
• वार्षिक वाणिज्यिक फसलों के लिए: 5%

क्या-क्या कवर होता है:
• सूखा, बाढ़, ओलावृष्टि से नुकसान
• कटाई के बाद 14 दिनों तक का नुकसान
• स्थानीय आपदाएं जैसे भूस्खलन

नामांकन के लिए बैंक, PACS या pmfby.gov.in पर जाएं।`,
    category: { en: 'Insurance', hi: 'बीमा' },
    categoryColor: 'bg-purple-100 text-purple-700',
    initialVotes: 198
  },
  {
    id: 5,
    author: authors[4],
    date: '19 Dec 2025',
    readTime: '7 min',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
    title: lang === 'en' ? 'Soil Health Card: Boost Yield by 20% Free!' : 'मृदा स्वास्थ्य कार्ड: 20% अधिक उपज, मुफ्त!',
    content: lang === 'en'
      ? `India's agricultural productivity is significantly lower than global averages, and one of the primary reasons is the unscientific use of fertilizers. Most farmers apply fertilizers based on tradition or guesswork rather than actual soil requirements. This leads to nutrient imbalances, soil degradation, increased costs, and ultimately lower yields. The Soil Health Card (SHC) scheme, launched in 2015, addresses this problem by providing every farmer with a detailed analysis of their soil's nutrient status and customized fertilizer recommendations.

The Soil Health Card is issued once every three years and contains detailed information about 12 parameters: pH, electrical conductivity, organic carbon, and primary nutrients (nitrogen, phosphorus, potassium), secondary nutrients (sulphur), and micronutrients (zinc, iron, copper, manganese, boron). Based on these tests, the card provides crop-specific fertilizer recommendations - telling you exactly how much urea, DAP, or micronutrient mix to apply for each crop you plan to grow.

Benefits Reported by Farmers:
• 15-25% increase in yield through balanced fertilization
• 10-15% reduction in fertilizer costs
• Improved soil health and sustainability
• Better understanding of soil conditions
• Reduced environmental impact from over-fertilization

To get your Soil Health Card, collect a soil sample from your field following these steps: Take samples from 5-6 spots across the field, from a depth of 0-15 cm. Remove any debris or roots. Mix all samples thoroughly and take about 500 grams in a clean cloth or plastic bag. Label it with your name, village, and Khasra number. Submit it to your nearest Krishi Vigyan Kendra (KVK), agricultural office, or registered testing laboratory. The test is completely FREE under the government scheme.

Once you receive your card, discuss the recommendations with the agricultural extension officer at KVK. They can help you understand the results and create a customized fertilization plan for your specific crops and field conditions.

Reference: Soil Health Card Portal (soilhealth.dac.gov.in), Indian Council of Agricultural Research Studies`
      : `भारत की कृषि उत्पादकता वैश्विक औसत से काफी कम है, इसका मुख्य कारण उर्वरकों का अवैज्ञानिक उपयोग है। मृदा स्वास्थ्य कार्ड इस समस्या का समाधान करता है।

SHC में 12 मापदंडों की जानकारी होती है: pH, जैविक कार्बन, नाइट्रोजन, फास्फोरस, पोटाश, सल्फर, जिंक आदि।

किसानों द्वारा रिपोर्ट किए गए लाभ:
• 15-25% उपज में वृद्धि
• 10-15% उर्वरक लागत में कमी
• मिट्टी का स्वास्थ्य बेहतर

नमूना लेने के लिए खेत के 5-6 स्थानों से मिट्टी एकत्र करें और नजदीकी KVK में जमा करें। जांच पूरी तरह मुफ्त है।`,
    category: { en: 'Farming', hi: 'खेती' },
    categoryColor: 'bg-amber-100 text-amber-700',
    initialVotes: 276
  },
  {
    id: 6,
    author: authors[0],
    date: '18 Dec 2025',
    readTime: '6 min',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    title: lang === 'en' ? 'UPI for Farmers: Send Money Without Fees' : 'किसानों के लिए UPI: बिना शुल्क पैसे भेजें',
    content: lang === 'en'
      ? `The Unified Payments Interface (UPI) has revolutionized digital payments in India, and farmers stand to benefit enormously from this technology. Before UPI, sending money to family members, paying suppliers, or receiving mandi payments involved expensive money transfer agents who charged ₹50-100 per transaction, or time-consuming bank visits. UPI eliminates all these costs and inconveniences - transactions are instant, free, and can be done 24/7 from your mobile phone.

UPI works by linking your bank account to a simple identifier called UPI ID (like yourname@upi). Once set up, you can send money to anyone using their phone number, UPI ID, or by scanning a QR code. Major apps like BHIM (developed by NPCI), Google Pay, PhonePe, and Paytm all support UPI. For farmers who may not be comfortable with English interfaces, BHIM is available in 13 Indian languages including Hindi, Punjabi, Gujarati, Marathi, Tamil, Telugu, and more.

Getting Started with UPI:
• Download BHIM app from Google Play Store or App Store
• Select your preferred language during setup
• Link your Aadhaar-registered mobile number (same as registered with bank)
• Select your bank and verify with ATM debit card or OTP
• Create a 6-digit UPI PIN (like an ATM PIN but for UPI)
• Your UPI ID will be automatically created

Many mandis now accept UPI payments, meaning you can receive your crop sale amount directly to your bank account without carrying cash. The PM-KISAN payments of ₹6,000 per year can also be received in accounts linked to UPI. With UPI, you can also pay for seeds, fertilizers, equipment, and other inputs directly to verified sellers without cash.

Security Tips:
• Never share your UPI PIN with anyone
• Only scan QR codes from trusted sources
• Check the receiver's name before confirming payment
• Set transaction limits in your UPI app settings

Reference: NPCI UPI Transaction Statistics 2023, RBI Digital Payments Guidelines`
      : `UPI ने भारत में डिजिटल भुगतान को बदल दिया है। पहले ₹50-100 ट्रांसफर एजेंट को देने पड़ते थे, अब UPI से मुफ्त और तुरंत पैसे भेजें।

UPI शुरू करने के चरण:
• BHIM ऐप डाउनलोड करें
• अपनी पसंद की भाषा चुनें
• बैंक से जुड़ा मोबाइल नंबर दर्ज करें
• बैंक चुनें और ATM कार्ड या OTP से वेरिफाई करें
• 6 अंकों का UPI PIN बनाएं

सुरक्षा सुझाव:
• UPI PIN किसी को न बताएं
• भुगतान से पहले प्राप्तकर्ता का नाम जांचें`,
    category: { en: 'Digital Banking', hi: 'डिजिटल बैंकिंग' },
    categoryColor: 'bg-cyan-100 text-cyan-700',
    initialVotes: 345
  },
  {
    id: 7,
    author: authors[2],
    date: '17 Dec 2025',
    readTime: '10 min',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80',
    title: lang === 'en' ? 'Women SHGs: Build Wealth Together' : 'महिला स्वयं सहायता समूह: मिलकर धन बनाएं',
    content: lang === 'en'
      ? `Self-Help Groups (SHGs) have emerged as one of the most powerful tools for women's financial inclusion and empowerment in rural India. The model is simple yet revolutionary: a group of 10-20 women from similar economic backgrounds come together, save small amounts regularly, and use the pooled funds to provide loans to members. Over time, these groups develop creditworthiness and can access larger bank loans at highly subsidized rates. Today, there are over 90 lakh SHGs in India, with more than 12 crore women members managing collective savings of over ₹47,000 crore.

The Deendayal Antyodaya Yojana - National Rural Livelihoods Mission (DAY-NRLM) provides extensive support to SHGs. Qualifying groups can access bank loans up to ₹20 lakh at just 4% interest (7% bank rate minus 3% government subsidy). The first loan is typically ₹1-2 lakh, scaling up with good repayment history. Many SHGs have used these funds to start successful micro-enterprises in dairy, poultry, tailoring, food processing, handicrafts, and retail.

How to Start an SHG:
• Gather 10-15 women from similar economic backgrounds in your village
• Agree on a regular meeting schedule (weekly or bi-weekly works best)
• Decide on a monthly contribution amount (₹100-500 per member is common)
• Open a savings account in the group's name at the nearest bank
• Begin maintaining minutes of meetings and financial records
• After 3-6 months of regular savings, apply for SHG registration

Success Stories from the Field:
• Kudumbashree in Kerala: 45 lakh women, ₹4,000 crore annual turnover
• Mahila Arthik Vikas Mahamandal (MAVIM) in Maharashtra: 6 lakh SHGs
• Many SHGs have graduated to Farmer Producer Organizations (FPOs)

Beyond financial benefits, SHGs provide women with confidence, decision-making power, and a support network. Members report improved status in households, greater say in family finances, and reduced domestic violence. The social capital built through these groups is often as valuable as the financial capital.

Reference: DAY-NRLM Annual Report 2022-23, NABARD SHG Bank Linkage Report`
      : `स्वयं सहायता समूह (SHGs) ग्रामीण महिलाओं के वित्तीय सशक्तिकरण का सबसे शक्तिशाली माध्यम है। आज भारत में 90 लाख से अधिक SHG हैं जिनमें 12 करोड़+ महिलाएं हैं।

DAY-NRLM के तहत SHGs को 4% ब्याज पर ₹20 लाख तक का ऋण मिलता है।

SHG कैसे शुरू करें:
• 10-15 समान आर्थिक पृष्ठभूमि वाली महिलाओं को इकट्ठा करें
• साप्ताहिक बैठक का समय तय करें
• मासिक योगदान राशि (₹100-500) तय करें
• नजदीकी बैंक में समूह के नाम खाता खोलें
• 3-6 महीने की नियमित बचत के बाद पंजीकरण के लिए आवेदन करें`,
    category: { en: 'Women Empowerment', hi: 'महिला सशक्तिकरण' },
    categoryColor: 'bg-pink-100 text-pink-700',
    initialVotes: 289
  },
  {
    id: 8,
    author: authors[4],
    date: '16 Dec 2025',
    readTime: '6 min',
    image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80',
    title: lang === 'en' ? 'MSP: Know Your Crop\'s True Worth' : 'MSP: अपनी फसल की असली कीमत जानें',
    content: lang === 'en'
      ? `Minimum Support Price (MSP) is the guaranteed price at which the government promises to purchase farmers' produce, ensuring that farmers don't suffer losses even when market prices fall. The Commission for Agricultural Costs and Prices (CACP) recommends MSP for 23 crops every year, taking into account cost of production, supply and demand, price trends in domestic and international markets, and a fair margin for farmers. Understanding MSP is crucial because it represents the baseline value of your hard work - no one should buy your produce below this price.

MSP Rates for Major Crops (2024-25 Marketing Season):
• Paddy (Common): ₹2,300 per quintal
• Wheat: ₹2,275 per quintal
• Mustard: ₹5,650 per quintal
• Gram (Chana): ₹5,440 per quintal
• Cotton (Medium Staple): ₹6,620 per quintal
• Maize: ₹2,225 per quintal
• Groundnut: ₹6,377 per quintal
• Soybean: ₹4,892 per quintal

To get MSP for your crops, you must sell at authorized government procurement centers, usually located at Agricultural Produce Market Committee (APMC) mandis. The procurement is done by agencies like Food Corporation of India (FCI), NAFED, Cotton Corporation of India, and state-level agencies. Registration for government procurement typically opens before the harvest season - check with your local mandi or agricultural office.

Important Points to Remember:
• MSP is NOT automatically guaranteed - you must sell to government agencies
• Private traders and mandis may offer below MSP (though it's discouraged)
• Quality specifications (moisture content, foreign matter) must be met
• Payment is made directly to bank accounts within 3-5 days of sale
• Check current MSP rates on the PM-KISAN app or by calling 1800-180-1551

If you find any trader trying to buy below MSP, you can file a complaint with the District Agriculture Officer or on the e-NAM portal. While enforcement varies, knowing your rights puts you in a stronger negotiating position.

Reference: CACP MSP Recommendations 2024-25, Ministry of Consumer Affairs Price Monitoring Division`
      : `न्यूनतम समर्थन मूल्य (MSP) वह गारंटी मूल्य है जिस पर सरकार किसानों की उपज खरीदती है। 23 फसलों के लिए MSP घोषित होता है।

2024-25 के प्रमुख MSP:
• धान: ₹2,300 प्रति क्विंटल
• गेहूं: ₹2,275 प्रति क्विंटल
• सरसों: ₹5,650 प्रति क्विंटल
• चना: ₹5,440 प्रति क्विंटल
• कपास: ₹6,620 प्रति क्विंटल

याद रखें:
• MSP पाने के लिए सरकारी एजेंसियों को बेचना जरूरी है
• गुणवत्ता मानक (नमी, अशुद्धियां) पूरे करने होंगे
• भुगतान 3-5 दिनों में सीधे बैंक खाते में होता है

MSP दरें PM-KISAN ऐप पर देखें या 1800-180-1551 पर कॉल करें।`,
    category: { en: 'Market Prices', hi: 'बाजार भाव' },
    categoryColor: 'bg-indigo-100 text-indigo-700',
    initialVotes: 234
  }
];
