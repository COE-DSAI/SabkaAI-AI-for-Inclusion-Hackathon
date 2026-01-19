"""
GRAMIN SAATHI - DATASET SPECIFICATIONS & COLLECTION GUIDE
Complete specifications for all 10 datasets with schema, sources, and integration examples
"""


DATASET_SPECS = {
    
    "government_schemes": {
        "priority": "CRITICAL",
        "timeline": "Implement in Week 1",
        "estimated_records": 500,
        "csv_schema": {
            "scheme_id": {"type": "string", "example": "PM-KISAN-001"},
            "scheme_name_en": {"type": "string", "example": "Pradhan Mantri Kisan Samman Nidhi"},
            "scheme_name_hi": {"type": "string", "example": "प्रधानमंत्री किसान सम्मान निधि"},
            "ministry": {"type": "string", "example": "Ministry of Agriculture"},
            "annual_benefit_inr": {"type": "float", "example": 6000},
            "benefit_description_en": {"type": "string", "example": "Direct income support"},
            "benefit_description_hi": {"type": "string"},
            "eligibility_criteria_en": {"type": "string"},
            "eligibility_criteria_hi": {"type": "string"},
            "annual_income_limit": {"type": "float", "example": 0},
            "landholding_required_acres": {"type": "float", "example": 0},
            "caste_category_eligible": {"type": "string", "example": "All"},
            "applicable_states": {"type": "array", "example": ["All India"]},
            "application_process_en": {"type": "string"},
            "application_process_hi": {"type": "string"},
            "application_url": {"type": "string", "example": "https://pmkisan.gov.in"},
            "documents_required": {"type": "array", "example": ["Aadhar", "Bank Account", "Land docs"]},
            "processing_time_days": {"type": "int", "example": 30},
            "launched_year": {"type": "int", "example": 2018},
            "beneficiaries_count": {"type": "int", "example": 11000000},
            "contact_helpline": {"type": "string", "example": "1800-180-1551"},
            "language_support": {"type": "array", "example": ["en", "hi", "marathi", "tamil", "telugu"]}
        },
        "data_source": "agriculture.gov.in, ministry_portals, state_departments",
        "collection_method": "Web scraping + manual data entry from official portals",
        "validation_rules": [
            "benefit_inr > 0",
            "launched_year >= 1995",
            "processing_time <= 180 days"
        ],
        "use_cases": [
            "Scheme eligibility chatbot",
            "Eligibility classifier model",
            "Dashboard: 'Which schemes am I eligible for?'"
        ],
        "sample_data": [
            {
                "scheme_id": "PM-KISAN-001",
                "scheme_name_en": "PM-KISAN",
                "scheme_name_hi": "PM-किसान",
                "annual_benefit_inr": 6000,
                "eligibility_criteria_en": "All farmer families with cultivated landholding",
                "annual_income_limit": 0,
                "landholding_required_acres": 0.1,
                "caste_category_eligible": "All",
                "applicable_states": ["All India"],
                "documents_required": ["Aadhar", "Bank Account Number", "Land Documents"],
                "processing_time_days": 15,
                "launched_year": 2018,
                "contact_helpline": "1800-180-1551"
            }
        ]
    },
    
    "agricultural_credit_products": {
        "priority": "CRITICAL",
        "timeline": "Implement in Week 1",
        "estimated_records": 100,
        "csv_schema": {
            "product_id": {"type": "string"},
            "bank_name": {"type": "string"},
            "product_name_en": {"type": "string"},
            "product_name_hi": {"type": "string"},
            "loan_type": {"type": "string", "enum": ["crop", "equipment", "irrigation", "input", "seasonal"]},
            "interest_rate_percent": {"type": "float"},
            "tenor_months": {"type": "int"},
            "min_loan_amount_inr": {"type": "float"},
            "max_loan_amount_inr": {"type": "float"},
            "collateral_required": {"type": "boolean"},
            "processing_fee_percent": {"type": "float"},
            "eligible_crops": {"type": "array"},
            "applicable_states": {"type": "array"},
            "approval_rate_percent": {"type": "float"},
            "average_approval_time_days": {"type": "int"},
            "documents_required": {"type": "array"},
            "contact_phone": {"type": "string"},
            "contact_email": {"type": "string"}
        },
        "data_source": "RBI database, NABARD, commercial banks, cooperative banks",
        "collection_method": "Direct contact with banks, RBI portal scraping, NABARD data",
        "validation_rules": [
            "interest_rate > 0",
            "tenor_months > 0",
            "min_loan_amount < max_loan_amount",
            "approval_rate <= 100"
        ],
        "use_cases": [
            "Loan recommendation engine",
            "Chatbot: 'What loans can I get?'",
            "Comparison tool for different loan products"
        ],
        "sample_data": [
            {
                "product_id": "KCC-KHARIF-SBI",
                "bank_name": "State Bank of India",
                "product_name_en": "Kisan Credit Card - Kharif",
                "loan_type": "crop",
                "interest_rate_percent": 7.0,
                "tenor_months": 9,
                "min_loan_amount_inr": 10000,
                "max_loan_amount_inr": 1000000,
                "collateral_required": False,
                "processing_fee_percent": 0,
                "eligible_crops": ["rice", "wheat", "sugarcane", "cotton"]
            }
        ]
    },
    
    "crop_insurance_products": {
        "priority": "CRITICAL",
        "timeline": "Implement in Week 2",
        "estimated_records": 50,
        "csv_schema": {
            "policy_id": {"type": "string"},
            "insurance_company": {"type": "string"},
            "insurance_scheme_en": {"type": "string"},
            "insurance_scheme_hi": {"type": "string"},
            "insurance_type": {"type": "string", "enum": ["crop", "weather", "livestock", "equipment"]},
            "crop_name": {"type": "string"},
            "coverage_percent": {"type": "float"},
            "premium_per_acre": {"type": "float"},
            "max_coverage_inr": {"type": "float"},
            "applicable_states": {"type": "array"},
            "coverage_period_start_month": {"type": "int"},
            "coverage_period_end_month": {"type": "int"},
            "claim_process_en": {"type": "string"},
            "claim_process_hi": {"type": "string"},
            "avg_settlement_time_days": {"type": "int"},
            "claim_approval_rate_percent": {"type": "float"},
            "documentation_required": {"type": "array"},
            "contact_phone": {"type": "string"},
            "contact_email": {"type": "string"}
        },
        "data_source": "PMFBY portal, insurance companies, government websites",
        "collection_method": "PMFBY data export + direct company data",
        "validation_rules": [
            "coverage_percent > 0 and coverage_percent <= 100",
            "premium_per_acre > 0",
            "avg_settlement_time_days > 0",
            "claim_approval_rate_percent <= 100"
        ],
        "use_cases": [
            "Insurance recommendation chatbot",
            "Insurance need predictor model",
            "Claims guidance system"
        ],
        "sample_data": [
            {
                "policy_id": "PMFBY-2024-RICE-AP",
                "insurance_company": "SBI General",
                "insurance_scheme_en": "Pradhan Mantri Fasal Bima Yojana",
                "insurance_type": "crop",
                "crop_name": "Rice",
                "coverage_percent": 70,
                "premium_per_acre": 250,
                "applicable_states": ["Andhra Pradesh"],
                "avg_settlement_time_days": 75,
                "claim_approval_rate_percent": 85
            }
        ]
    }
}


TIER2_DATASETS = {
    
    "farmer_income_expense_patterns": {
        "priority": "HIGH",
        "timeline": "Month 2-3",
        "estimated_records": 50000,
        "csv_columns": [
            "farmer_id", "crop", "state", "district", "season",
            "area_acres", "seed_cost_inr", "fertilizer_cost_inr", 
            "pesticide_cost_inr", "labor_cost_inr", "water_cost_inr",
            "electricity_cost_inr", "rent_cost_inr", "equipment_cost_inr",
            "total_input_cost_inr", "yield_kg", "yield_per_acre_kg",
            "market_price_per_kg_inr", "total_revenue_inr", "net_profit_inr",
            "profit_margin_percent", "year", "farmer_age", "farmer_gender"
        ],
        "data_source": "ICRISAT, NSO surveys, agricultural universities, farmer producer organizations",
        "key_insights": [
            "Average input cost by crop & state",
            "Best-performing cost-to-yield ratio",
            "Seasonal profitability patterns",
            "Cost reduction opportunities"
        ]
    },
    
    "digital_banking_products": {
        "priority": "HIGH",
        "timeline": "Month 2",
        "estimated_records": 50,
        "csv_columns": [
            "bank_name", "account_type_en", "account_type_hi",
            "minimum_balance_inr", "interest_rate_percent",
            "transaction_limit_per_day", "atm_charges", "monthly_fee",
            "digital_literacy_required", "age_limit_min", "age_limit_max",
            "aadhar_required", "pan_required", "phone_required",
            "account_opening_time_minutes", "life_insurance_included",
            "accident_insurance_included", "language_support"
        ],
        "data_source": "RBI, PMJDY portal, bank websites, NPCI"
    },
    
    "upi_payment_methods": {
        "priority": "HIGH",
        "timeline": "Month 2",
        "estimated_records": 20,
        "csv_columns": [
            "app_name", "app_type", "required_documents", "setup_time_minutes",
            "daily_transaction_limit_inr", "monthly_transaction_limit_inr",
            "transaction_fee_percent", "customer_service_language",
            "offline_payment_capable", "qr_code_required", "internet_required",
            "minimum_android_version", "support_phone", "support_email"
        ],
        "data_source": "NPCI, app stores, payment platforms"
    }
}


TIER3_DATASETS = {
    "investment_options": {
        "estimated_records": 30,
        "columns": [
            "investment_type", "provider", "minimum_amount_inr",
            "maximum_amount_inr", "interest_rate_percent",
            "tenor_years", "risk_level", "tax_benefit_percent",
            "liquidity", "early_withdrawal_penalty", "suitable_for_farmers"
        ],
        "examples": [
            "Fixed Deposit (FD) - 5-6% annually",
            "Recurring Deposit (RD) - 5-5.5% annually",
            "PMVVY (Pension) - ₹1000/month guaranteed",
            "Mutual Funds - 12-15% annually (high risk)",
            "Government Securities - 6-7% tax-free"
        ]
    },
    
    "debt_distress_indicators": {
        "estimated_records": 10000,
        "columns": [
            "farmer_id", "annual_income_inr", "total_debt_inr",
            "debt_sources", "average_interest_rate", "monthly_payment_inr",
            "debt_to_income_ratio", "months_to_repay", "default_risk_score",
            "intervention_level", "recommended_action"
        ],
        "use_case": "Early warning system for farmers in financial distress"
    },
    
    "input_credit_availability": {
        "estimated_records": 500,
        "columns": [
            "input_type", "supplier_type", "state", "district",
            "cost_per_unit_inr", "credit_available_percent",
            "interest_rate_percent", "credit_term_months",
            "seasonal_availability", "quality_rating", "farmer_reviews"
        ]
    }
}


TIER4_DATASETS = {
    "market_price_history": {
        "estimated_records": 1000000,
        "granularity": "Daily prices × 100+ commodities × 1000+ markets",
        "columns": ["date", "commodity", "state", "market", "price_per_unit", "quantity_traded"],
        "data_source": "AGMARKNET, commodity exchanges"
    },
    
    "weather_climate_data": {
        "estimated_records": 365000,
        "granularity": "Daily × 750 districts × 40+ years",
        "columns": ["date", "latitude", "longitude", "rainfall_mm", "max_temp", "min_temp", "humidity", "wind_speed"],
        "data_source": "Indian Meteorological Department (IMD)"
    },
    
    "soil_health_database": {
        "estimated_records": 100000,
        "columns": ["location", "soil_type", "ph", "nitrogen_mg_kg", "phosphorus_mg_kg", "potassium_mg_kg", "organic_matter_percent"],
        "data_source": "ICAR, NBSS&LUP"
    }
}


INTEGRATION_EXAMPLES = {
    "government_schemes": {
        "query": "Which schemes am I eligible for?",
        "logic": """
        Filter by:
        - annual_income <= income_limit (or 0 = no limit)
        - landholding_required <= user_landholding
        - caste_category matches OR 'All' included
        - state in applicable_states
        Return: Top 3 schemes by annual benefit
        """
    },
    
    "agricultural_credit": {
        "query": "What loans can I get for rice cultivation?",
        "logic": """
        Filter by:
        - loan_type matches 'crop'
        - 'rice' in eligible_crops
        - state matches user_state
        Sort by: interest_rate (ascending)
        Return: Top 3 loans with best rates
        """
    },
    
    "crop_insurance": {
        "query": "Should I take insurance and how much?",
        "logic": """
        Inputs: Crop, Location, Yield History, Risk Score
        Recommend: Insurance type + coverage amount
        Based on:
        - Historical losses in region
        - Crop vulnerability
        - Farmer's risk tolerance
        """
    }
}


def generate_government_schemes_csv():
    """Template for exporting schemes to CSV"""
    return """
scheme_id,scheme_name_en,ministry,annual_benefit_inr,eligible_states,application_url
PM-KISAN-001,Pradhan Mantri Kisan Samman Nidhi,Ministry of Agriculture,6000,All India,https://pmkisan.gov.in
PMFBY-001,Pradhan Mantri Fasal Bima Yojana,Ministry of Agriculture,Varies,All India,https://pmfby.gov.in
... (500+ rows)
"""

def generate_loan_products_csv():
    """Template for exporting loan products"""
    return """
product_id,bank_name,product_name,loan_type,interest_rate,tenor_months,max_loan_amount
KCC-KHARIF-SBI,State Bank of India,Kisan Credit Card - Kharif,crop,7.0,9,1000000
EQUIP-HDFC,HDFC Bank,Equipment Loan,equipment,9.5,60,5000000
... (100+ rows)
"""


COLLECTION_CHECKLIST = {
    "week_1": {
        "priority": "CRITICAL",
        "tasks": [
            "[ ] Scrape agriculture.gov.in for 500+ government schemes",
            "[ ] Contact RBI for agricultural credit data",
            "[ ] Export PMFBY data from official portal",
            "[ ] Validate all data for completeness"
        ],
        "expected_output": "1500+ records ready for chatbot"
    },
    
    "week_2": {
        "tasks": [
            "[ ] Collect banking products from 20+ banks",
            "[ ] Gather UPI payment method specifications",
            "[ ] Validate interest rates and fees",
            "[ ] Create master dataset"
        ],
        "expected_output": "200+ banking products indexed"
    },
    
    "month_2": {
        "tasks": [
            "[ ] Partner with ICRISAT for income/expense data",
            "[ ] Collect farmer profiles (10,000+ records)",
            "[ ] Validate data quality",
            "[ ] Build recommendation models"
        ],
        "expected_output": "Personalization ready"
    }
}


QA_RULES = {
    "data_completeness": "No NULL values in critical fields",
    "data_validity": "All values within expected ranges",
    "data_consistency": "No duplicates, consistent naming conventions",
    "data_freshness": "Updated within last 3 months",
    "data_accuracy": "Verified against official sources"
}

if __name__ == "__main__":
    print("Dataset Specifications Ready!")
    print("Total Datasets: 10")
    print("Total Estimated Records: 1.5M+")
    print("Implementation Timeline: 12 months")
    print("Ready to export to CSV and integrate!")
