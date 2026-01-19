"""
Complete Dataset Requirements for AI Literacy Platform for Farmers
Gramin Saathi - Financial Literacy & Yield Intelligence
"""

DATASETS_FOR_FARMERS = {
    "TIER_1_CRITICAL": {
        "description": "Foundation datasets - Deploy in Phase 1",
        "datasets": {
            "Government_Schemes": {
                "fields": ["scheme_id", "scheme_name", "ministry", "eligibility", "annual_benefit", "application_url", "state", "lang"],
                "example_records": {
                    "pm_kisan": {"benefit": "₹6000/year", "eligible_states": "All India", "lang": ["en", "hi", "marathi", "tamil", "telugu"]},
                    "pmfby": {"benefit": "Crop insurance", "premium": "₹100-300/acre", "coverage": "70%"},
                    "pm_aay": {"benefit": "₹200/day pension", "eligible": "Farmers 60+"}
                },
                "data_source": "agriculture.gov.in, ministry_portals",
                "expected_records": "500+",
                "priority": "CRITICAL"
            },
            
            "Agricultural_Credit_Products": {
                "fields": ["bank", "loan_type", "interest_rate", "tenor_months", "max_amount", "eligibility", "processing_days"],
                "example_records": {
                    "kharif_loan": {"rate": "7%", "tenor": 9, "max": "₹1,00,000"},
                    "equipment_loan": {"rate": "9%", "tenor": 60, "max": "₹5,00,000"},
                    "irrigation_loan": {"rate": "10%", "tenor": 84, "max": "₹10,00,000"}
                },
                "data_source": "RBI, NABARD, commercial banks",
                "expected_records": "100+",
                "priority": "CRITICAL"
            },
            
            "Crop_Insurance_Data": {
                "fields": ["insurance_type", "crop", "coverage%", "premium", "claim_process", "avg_settlement_days"],
                "example_records": {
                    "pmfby": {"coverage": "70%", "premium": "₹250/acre", "settlement": "60-90 days"},
                    "weather_based": {"coverage": "80%", "premium": "₹500/acre", "trigger": "rainfall_mm"}
                },
                "data_source": "PMFBY portal, insurance companies",
                "expected_records": "50+",
                "priority": "CRITICAL"
            }
        }
    },
    
    "TIER_2_HIGH": {
        "description": "Secondary datasets - Deploy in Phase 2",
        "datasets": {
            "Farmer_Income_Expense_Patterns": {
                "fields": ["crop", "state", "season", "area_acres", "seed_cost", "fertilizer_cost", "labor_cost", "yield_tons", "market_price", "net_income"],
                "source": "ICRISAT, NSO surveys, agricultural universities",
                "expected_records": "50000+",
                "use_case": "Budget planning, profit forecasting, cost reduction recommendations"
            },
            
            "Digital_Banking_Products": {
                "fields": ["bank", "account_type", "min_balance", "interest_rate", "transaction_limit", "charges", "digital_literacy_req"],
                "example": {"jan_dhan": "₹0 min balance, ₹1L life insurance, 0% charges"},
                "source": "RBI, PMJDY portal, bank websites",
                "expected_records": "200+",
                "use_case": "Bank account recommendations, digital payment adoption"
            },
            
            "UPI_Payment_Methods": {
                "fields": ["payment_app", "required_doc", "setup_time_min", "transaction_limit", "charges", "offline_capable"],
                "example": {"google_pay": "Phone + bank account, 5 min, ₹1L/day"},
                "source": "NPCI, app developers",
                "expected_records": "20+",
                "use_case": "Digital payment education"
            }
        }
    },
    
    "TIER_3_MEDIUM": {
        "description": "Advanced datasets - Deploy in Phase 3",
        "datasets": {
            "Investment_Options": {
                "fields": ["investment_type", "min_amount", "return_rate", "tenor_years", "risk_level", "tax_benefit", "liquidity"],
                "example": {"FD": "₹1000, 5.5%, 1-5yr, Low risk, None", "PMVVY": "₹1000 min, 7.4%, 10yr, Guaranteed"},
                "source": "RBI, mutual fund sites, SEBI",
                "expected_records": "30+",
                "use_case": "Post-harvest investment recommendations"
            },
            
            "Debt_Distress_Indicators": {
                "fields": ["farmer_profile", "debt_type", "interest_rate", "debt_income_ratio", "default_risk", "intervention_needed"],
                "source": "Bank records, farm surveys",
                "expected_records": "10000+",
                "use_case": "Early warning system for financial distress"
            },
            
            "Input_Credit_Availability": {
                "fields": ["input_type", "supplier_type", "cost", "credit_available", "interest_rate", "seasonal_availability", "quality_rating"],
                "example": {"DAP_from_coop": "₹1200/50kg, 8% interest", "seeds_from_private": "₹500/kg, 12% interest"},
                "source": "Agricultural cooperatives, input dealers",
                "expected_records": "500+",
                "use_case": "Best input supplier recommendations"
            }
        }
    },
    
    "TIER_4_SPECIALIZED": {
        "description": "Niche datasets for specific regions/crops",
        "datasets": {
            "Market_Price_History": {
                "fields": ["date", "commodity", "state", "market", "price_per_unit", "quantity_traded", "trend"],
                "granularity": "Daily prices for 100+ commodities × 1000+ markets",
                "source": "AGMARKNET, commodity exchange",
                "expected_records": "1M+",
                "use_case": "Better selling decisions, price forecasting"
            },
            
            "Weather_Climate_Data": {
                "fields": ["date", "location", "rainfall", "temperature", "humidity", "wind_speed", "crop_recommendation"],
                "granularity": "Daily, district-level",
                "source": "IMD, weather APIs",
                "expected_records": "365K+ (daily × 750 districts × 40+ years)",
                "use_case": "Crop selection, insurance assessment"
            },
            
            "Soil_Health_Database": {
                "fields": ["location", "soil_type", "ph", "nitrogen", "phosphorus", "potassium", "recommended_crops"],
                "source": "ICAR, NBSS&LUP",
                "expected_records": "100000+",
                "use_case": "Crop suitability assessment"
            }
        }
    },
    
    "NLP_TRAINING_DATA": {
        "description": "For building conversational AI",
        "datasets": {
            "Financial_QnA_Pairs": {
                "fields": ["question_en", "question_hi", "answer_en", "answer_hi", "category", "difficulty_level", "tags"],
                "categories": ["schemes", "loans", "insurance", "banking", "budgeting", "investments"],
                "target_size": "500+ pairs × 5 languages",
                "format": "CSV with multilingual content",
                "use_case": "Train intent detection + chatbot responses"
            },
            
            "Farmer_Language_Corpus": {
                "description": "Actual farmer conversations, documents, SMS messages",
                "fields": ["text", "language", "domain", "sentiment", "intent"],
                "source": "Farmer surveys, NGO interactions, government portals",
                "expected_size": "100K+ texts",
                "use_case": "Language model fine-tuning for rural context"
            },
            
            "Scheme_Amendment_Logs": {
                "description": "Historical changes to government schemes",
                "fields": ["scheme", "date_amended", "change_description", "new_benefits", "effective_date"],
                "use_case": "Keep chatbot knowledge up-to-date"
            }
        }
    }
}


AI_MODELS = {
    "Scheme_Eligibility_Classifier": {
        "input_features": ["age", "gender", "caste_category", "landholding_size", "annual_income", "state", "occupation"],
        "output": "Eligible scheme IDs + probability score",
        "training_data": "500K+ farmer profiles × schemes",
        "accuracy_target": "95%+",
        "model_type": "LSTM / XGBoost",
        "languages_supported": 5
    },
    
    "Loan_Recommendation_Engine": {
        "input_features": ["crop_type", "land_size", "past_income", "credit_history", "existing_debt", "risk_profile"],
        "output": "Top 3 loan products ranked by approval probability",
        "training_data": "50K+ loan approvals + farmer profiles",
        "accuracy_target": "85%+",
        "model_type": "Collaborative Filtering + Ranking"
    },
    
    "Financial_Health_Scorer": {
        "input_features": ["annual_income", "total_debt", "assets", "loan_defaults", "income_variability"],
        "output": "Financial health score (0-100) + risk level",
        "training_data": "20K+ farmer financial records",
        "accuracy_target": "90%+",
        "model_type": "Logistic Regression"
    },
    
    "Insurance_Need_Predictor": {
        "input_features": ["crop", "location", "historical_yield_volatility", "rainfall_pattern", "past_losses"],
        "output": "Recommended insurance type + coverage amount",
        "training_data": "Historical claims + weather data",
        "accuracy_target": "80%+",
        "model_type": "Gradient Boosting"
    },
    
    "Intent_Detection_NLP": {
        "input": "Farmer question in local language",
        "output": "Intent category + confidence score",
        "training_data": "1K+ labeled farmer questions",
        "accuracy_target": "88%+",
        "model_type": "BERT + Fine-tuning",
        "languages": ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada"]
    },
    
    "Price_Forecasting": {
        "input_features": ["historical_prices", "season", "rainfall", "area_under_cultivation", "government_policies"],
        "output": "Price forecast for next 30/60/90 days",
        "training_data": "10 years market price data × 1000 markets",
        "accuracy_target": "MAPE < 15%",
        "model_type": "ARIMA / LSTM"
    }
}


IMPLEMENTATION_ROADMAP = {
    "PHASE_1_FOUNDATION": {
        "timeline": "Month 1-2",
        "focus": "Critical datasets + basic chatbot",
        "tasks": [
            "Scrape government schemes database (500+ schemes)",
            "Collect agricultural loan products from banks",
            "Integrate PMFBY insurance data",
            "Build 150+ Q&A pairs for chatbot",
            "Deploy Financial Chatbot MVP"
        ],
        "expected_users": "1000-5000",
        "expected_impact": "Basic financial awareness"
    },
    
    "PHASE_2_PERSONALIZATION": {
        "timeline": "Month 3-4",
        "focus": "Recommendation engines + user profiles",
        "tasks": [
            "Train scheme eligibility classifier",
            "Train loan recommendation engine",
            "Collect farmer income/expense data",
            "Build personalized dashboard",
            "Add voice input support"
        ],
        "expected_users": "10000-50000",
        "expected_impact": "Personalized financial guidance"
    },
    
    "PHASE_3_ADVANCED": {
        "timeline": "Month 5-6",
        "focus": "Advanced AI + integrations",
        "tasks": [
            "Train investment recommendation engine",
            "Add debt sustainability analyzer",
            "Integrate market price forecasting",
            "Partner with banks & cooperatives",
            "Launch state-level promotions"
        ],
        "expected_users": "100000+",
        "expected_impact": "Comprehensive financial empowerment"
    },
    
    "PHASE_4_SCALING": {
        "timeline": "Month 7-12",
        "focus": "Scale to all states + languages",
        "tasks": [
            "Add 4 more languages (Tamil, Telugu, Marathi, Kannada)",
            "Expand to WhatsApp Bot",
            "Launch SMS tip service",
            "Deploy mobile app",
            "Build admin dashboard for updates"
        ],
        "expected_users": "1M+",
        "expected_impact": "National reach"
    }
}


PARTNER_INSTITUTIONS = {
    "Government": ["Ministry of Agriculture", "RBI", "SEBI", "NABARD", "State Agriculture Departments"],
    "Banks": ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Cooperative Banks"],
    "Insurance": ["ICICI Lombard", "HDFC Ergo", "Bajaj", "IFFCO", "AIC"],
    "NGOs": ["PRADAN", "NABARD", "Agricultural Universities", "KVKs"],
    "Data": ["ICRISAT", "NSO", "AGMARKNET", "IMD", "World Bank"]
}

if __name__ == "__main__":
    print("=" * 80)
    print("AI FOR FARMERS - COMPLETE DATASET GUIDE")
    print("=" * 80)
    
    for tier, content in DATASETS_FOR_FARMERS.items():
        print(f"\n{tier}: {content['description']}")
        print("-" * 80)
        for dataset_name, details in content['datasets'].items():
            print(f"\n📊 {dataset_name}")
            print(f"   Records: {details.get('expected_records', 'N/A')}")
            print(f"   Source: {details.get('data_source', details.get('source', 'TBD'))}")
            if 'priority' in details:
                print(f"   Priority: {details['priority']}")
            if 'use_case' in details:
                print(f"   Use Case: {details['use_case']}")
    
    print("\n" + "=" * 80)
    print("AI MODELS TO TRAIN")
    print("=" * 80)
    for model_name, specs in AI_MODELS.items():
        print(f"\n🤖 {model_name}")
        print(f"   Target Accuracy: {specs.get('accuracy_target', 'N/A')}")
        print(f"   Training Data: {specs.get('training_data', 'TBD')}")
        print(f"   Type: {specs.get('model_type', 'TBD')}")
    
    print("\n✅ Ready to build comprehensive AI platform for farmers!")
