import pandas as pd


FINANCIAL_LITERACY_QNA = {
    "schemes": [
        {
            "question_en": "What is PM-KISAN scheme?",
            "question_hi": "PM-KISAN योजना क्या है?",
            "answer_en": "PM-KISAN provides direct income support of ₹6,000 per year to farmer families. This is paid in 3 installments of ₹2,000 each every 4 months.",
            "answer_hi": "PM-KISAN योजना किसान परिवारों को सालाना ₹6,000 की सीधी आय सहायता देती है। यह ₹2,000 की 3 किस्तों में हर 4 महीने दी जाती है।",
            "category": "govt_schemes",
            "difficulty": "beginner",
            "language": ["en", "hi"]
        },
        {
            "question_en": "Who is eligible for PM-KISAN?",
            "question_hi": "PM-KISAN के लिए कौन eligible है?",
            "answer_en": "All farmer families with cultivated landholding are eligible, regardless of income. However, high-income professionals and government employees are excluded.",
            "answer_hi": "सभी किसान परिवार जिनके पास खेती योग्य जमीन है, eligible हैं। लेकिन उच्च आय वाले पेशेवर और सरकारी कर्मचारी excluded हैं।",
            "category": "govt_schemes",
            "difficulty": "beginner",
            "language": ["en", "hi"],
            "related_question": "What is PM-KISAN scheme?"
        },
        {
            "question_en": "How to apply for PM-KISAN?",
            "question_hi": "PM-KISAN के लिए आवेदन कैसे करें?",
            "answer_en": "Apply online at pmkisan.gov.in or through your village agriculture officer. You need: Aadhar, bank account details, land documents.",
            "answer_hi": "pmkisan.gov.in पर ऑनलाइन या अपने गांव के कृषि अधिकारी के माध्यम से आवेदन करें। आपको चाहिए: आधार, बैंक खाता विवरण, भूमि दस्तावेज।",
            "category": "govt_schemes",
            "difficulty": "intermediate",
            "language": ["en", "hi"],
            "related_question": "Who is eligible for PM-KISAN?"
        }
    ],
    
    "crop_insurance": [
        {
            "question_en": "What is crop insurance?",
            "question_hi": "फसल बीमा क्या है?",
            "answer_en": "Crop insurance protects you from financial losses due to crop failure from natural disasters like drought, flood, or pest attacks. If your crop fails, you get compensation.",
            "answer_hi": "फसल बीमा आपको सूखा, बाढ़, या कीट के हमलों जैसी प्राकृतिक आपदाओं से फसल की विफलता के कारण वित्तीय नुकसान से बचाता है।",
            "category": "insurance",
            "difficulty": "beginner",
            "language": ["en", "hi"]
        },
        {
            "question_en": "What is PM-Fasal Bima Yojana?",
            "question_hi": "PM-फसल बीमा योजना क्या है?",
            "answer_en": "PMFBY is government's crop insurance scheme. Premium: ₹100-300/acre for kharif, ₹50-150 for rabi depending on crop. Coverage up to 70% of crop loss.",
            "answer_hi": "PMFBY सरकार की फसल बीमा योजना है। Premium: खरीफ के लिए ₹100-300/एकड़, रबी के लिए ₹50-150। 70% तक नुकसान का कवरेज।",
            "category": "insurance",
            "difficulty": "beginner",
            "language": ["en", "hi"]
        },
        {
            "question_en": "How to claim crop insurance?",
            "question_hi": "फसल बीमा का दावा कैसे करें?",
            "answer_en": "1. Report loss to your insurance agent within 72 hours of observing damage. 2. Provide crop loss evidence (photos, village officer report). 3. Claim is assessed and disbursed within 2-3 months.",
            "answer_hi": "1. नुकसान की खोज के 72 घंटे में बीमा एजेंट को बताएं। 2. नुकसान के सबूत दें (फोटो, तहसील अधिकारी की रिपोर्ट)। 3. दावा 2-3 महीने में मिलता है।",
            "category": "insurance",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        }
    ],
    
    "loans": [
        {
            "question_en": "What types of agricultural loans are available?",
            "question_hi": "कृषि ऋण कितने प्रकार के हैं?",
            "answer_en": "1. Short-term (Kharif/Rabi): For seeds, fertilizer - 7% interest. 2. Medium-term: For equipment - 9% interest. 3. Long-term: For irrigation - 10% interest. Interest rates vary by bank.",
            "answer_hi": "1. अल्पकालीन (खरीफ/रबी): बीज, खाद के लिए - 7% ब्याज। 2. मध्यम अवधि: उपकरण के लिए - 9% ब्याज। 3. दीर्घकालीन: सिंचाई के लिए - 10% ब्याज।",
            "category": "loans",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        },
        {
            "question_en": "What documents are needed for farm loan?",
            "question_hi": "खेती के ऋण के लिए कौन से दस्तावेज चाहिए?",
            "answer_en": "1. Land documents (7/12, 8A) 2. Aadhar & PAN 3. Bank statements (last 6 months) 4. Passport-size photos 5. Proof of residence 6. Farm details (crop, area) 7. Co-applicant for large loans",
            "answer_hi": "1. भूमि दस्तावेज (7/12, 8A) 2. आधार & पैन 3. बैंक स्टेटमेंट (6 महीने) 4. पास्पोर्ट साइज फोटो 5. निवास का प्रमाण 6. खेत का विवरण 7. बड़े ऋण के लिए सह-आवेदक",
            "category": "loans",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        },
        {
            "question_en": "What is crop loan vs equipment loan?",
            "question_hi": "फसल ऋण बनाम उपकरण ऋण क्या है?",
            "answer_en": "Crop loan: 7-8% interest, 9 months tenure, for seeds/fertilizer. Equipment loan: 9-10% interest, 3-5 years tenure, for machinery/tractor. Choose based on need.",
            "answer_hi": "फसल ऋण: 7-8% ब्याज, 9 महीने की अवधि, बीज/खाद के लिए। उपकरण ऋण: 9-10% ब्याज, 3-5 साल, ट्रैक्टर के लिए।",
            "category": "loans",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        }
    ],
    
    "banking": [
        {
            "question_en": "Why do I need a bank account?",
            "question_hi": "मुझे बैंक खाता क्यों चाहिए?",
            "answer_en": "Bank account helps you: 1. Receive government payments (PM-KISAN, subsidies) 2. Get loans easily 3. Make digital payments 4. Save money safely 5. Get insurance benefits. Essential for modern farming!",
            "answer_hi": "बैंक खाता आपको मदद करता है: 1. सरकारी भुगतान प्राप्त करने के लिए 2. आसानी से ऋण मिलना 3. डिजिटल भुगतान 4. पैसे सुरक्षित रखना 5. बीमा लाभ।",
            "category": "banking",
            "difficulty": "beginner",
            "language": ["en", "hi"]
        },
        {
            "question_en": "What is Jan Dhan Yojana?",
            "question_hi": "जन धन योजना क्या है?",
            "answer_en": "PM-JDY provides free bank account with zero balance. You get RuPay card, life insurance (₹1 lakh), and accident insurance. No minimum balance required!",
            "answer_hi": "PM-JDY शून्य शेष के साथ मुफ्त बैंक खाता देता है। आपको RuPay कार्ड, जीवन बीमा (₹1 लाख), और दुर्घटना बीमा मिलता है।",
            "category": "banking",
            "difficulty": "beginner",
            "language": ["en", "hi"]
        },
        {
            "question_en": "How to use UPI for payments?",
            "question_hi": "UPI का उपयोग करके पेमेंट कैसे करें?",
            "answer_en": "Download Google Pay or PhonePe. Enter your bank details & UPI PIN. To pay: Open app → Select merchant → Enter amount → Confirm with PIN. Money transfers instantly, 0% charges!",
            "answer_hi": "Google Pay या PhonePe डाउनलोड करें। अपने बैंक विवरण दर्ज करें। भुगतान के लिए: ऐप खोलें → विक्रेता चुनें → राशि दर्ज करें → PIN से पुष्टि करें।",
            "category": "banking",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        }
    ],
    
    "budgeting": [
        {
            "question_en": "How to budget as a farmer?",
            "question_hi": "किसान के रूप में बजट कैसे बनाएं?",
            "answer_en": "Budget = Income - Expenses. Track: 1. Fixed costs (seeds, fertilizer, labor) 2. Variable costs (electricity, water) 3. Income from crops 4. Seasonal variations. Plan for lean months!",
            "answer_hi": "बजट = आय - खर्च। ट्रैक करें: 1. निश्चित लागत (बीज, खाद, मजदूरी) 2. परिवर्तनशील लागत (बिजली, पानी) 3. फसल आय 4. मौसमी परिवर्तन।",
            "category": "budgeting",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        },
        {
            "question_en": "How to reduce farming costs?",
            "question_hi": "खेती की लागत कैसे कम करें?",
            "answer_en": "Ways to reduce costs: 1. Buy seeds/fertilizer from cooperative (cheaper) 2. Group purchase with neighbors 3. Use organic fertilizer 4. Hire labor collectively 5. Use government-provided machines. Can save 20-30%!",
            "answer_hi": "लागत कम करने के तरीके: 1. सहकारी से खरीदें (सस्ता) 2. पड़ोसियों के साथ सामूहिक खरीद 3. जैविक खाद का उपयोग 4. सामूहिक मजदूरी 5. सरकारी मशीनें।",
            "category": "budgeting",
            "difficulty": "intermediate",
            "language": ["en", "hi"]
        }
    ],
    
    "financial_planning": [
        {
            "question_en": "Should I save or invest my income?",
            "question_hi": "क्या मुझे पैसे बचाने चाहिए या निवेश करना चाहिए?",
            "answer_en": "Both! Emergency fund (3-6 months expenses) in savings account first. Then invest: 50% in equipment/land, 30% in conservative investments (RD, FD), 20% in high-risk (mutual funds).",
            "answer_hi": "दोनों! पहले बचत खाते में आपातकालीन निधि (3-6 महीने का खर्च)। फिर निवेश करें: 50% उपकरण/भूमि में, 30% सुरक्षित निवेश में, 20% उच्च जोखिम में।",
            "category": "financial_planning",
            "difficulty": "advanced",
            "language": ["en", "hi"]
        },
        {
            "question_en": "What are good investments for farmers?",
            "question_hi": "किसानों के लिए अच्छे निवेश कौन से हैं?",
            "answer_en": "1. Fixed Deposit (FD): 5-6% return, safe 2. Recurring Deposit (RD): 5-5.5% 3. PMVVY (Pension): ₹1000/month guaranteed 4. Mutual Funds: 12-15% returns (high risk) 5. Land/equipment: Long-term wealth",
            "answer_hi": "1. फिक्स्ड डिपॉजिट: 5-6% रिटर्न, सुरक्षित 2. आवर्ती जमा: 5-5.5% 3. पेंशन योजना: ₹1000/महीना गारंटीड 4. म्यूचुअल फंड: 12-15% 5. भूमि/उपकरण: दीर्घकालीन।",
            "category": "financial_planning",
            "difficulty": "advanced",
            "language": ["en", "hi"]
        }
    ]
}

def load_financial_qa():
    qa_list = []
    for category_name, questions in FINANCIAL_LITERACY_QNA.items():
        for qa in questions:
            qa_row = {
                'question_en': qa['question_en'],
                'question_hi': qa['question_hi'],
                'answer_en': qa['answer_en'],
                'answer_hi': qa['answer_hi'],
                'category': qa['category'],
                'difficulty': qa['difficulty'],
                'language': qa['language']
            }
            qa_list.append(qa_row)
    
    return pd.DataFrame(qa_list)

if __name__ == "__main__":
    df = load_financial_qa()
    df.to_csv('financial_literacy_qna.csv', index=False)
    print(f"✅ Created financial_literacy_qna.csv with {len(df)} Q&A pairs")
    print(f"\nCategories: {df['category'].unique()}")
    print(f"Difficulty levels: {df['difficulty'].unique()}")
    print(f"\nSample:\n{df.head()}")
