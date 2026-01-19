"""
Report Formatter
Enhances health reports with detailed recommendations and medical contact information
"""
from typing import Dict
from app.config import settings


def format_enhanced_recommendation(
    result,
    language: str = "en",
    include_contacts: bool = True
) -> str:
    """
    Format an enhanced recommendation with bullet points and medical contacts.
    
    Args:
        result: ComprehensiveHealthResult object
        language: Language code (en/hi)
        include_contacts: Whether to include medical contact numbers
        
    Returns:
        Formatted recommendation text with bullet points and contacts
    """
    
    # Get base recommendation
    base_rec = result.recommendation
    
    # Build enhanced recommendation
    lines = []
    
    # Header
    if language == "hi":
        lines.append("🩺 आपकी स्वास्थ्य रिपोर्ट")
        lines.append("")
    else:
        lines.append("🩺 Your Health Report")
        lines.append("")
    
    # Risk level
    risk_emoji = {
        "low": "🟢", "normal": "🟢",
        "mild": "🟡", "moderate": "🟠",
        "high": "🔴", "severe": "🔴", "urgent": "🔴"
    }
    emoji = risk_emoji.get(result.overall_risk_level, "⚪")
    
    if language == "hi":
        lines.append(f"{emoji} जोखिम स्तर: {result.overall_risk_level.upper()}")
    else:
        lines.append(f"{emoji} Risk Level: {result.overall_risk_level.upper()}")
    lines.append("")
    
    # Findings section
    if language == "hi":
        lines.append("📋 निष्कर्ष:")
    else:
        lines.append("📋 Findings:")
    
    # Add screening results as bullet points
    for name, screening in result.screenings.items():
        if screening.detected:
            if language == "hi":
                lines.append(f"  • {name}: पाया गया ({screening.severity})")
            else:
                lines.append(f"  • {name.title()}: Detected ({screening.severity})")
        else:
            if language == "hi":
                lines.append(f"  • {name}: सामान्य")
            else:
                lines.append(f"  • {name.title()}: Normal")
    
    if not result.screenings:
        if language == "hi":
            lines.append("  • कोई असामान्यता नहीं पाई गई")
        else:
            lines.append("  • No abnormalities detected")
    
    lines.append("")
    
    # Recommendation section
    if language == "hi":
        lines.append("💊 सिफारिश:")
    else:
        lines.append("💊 Recommendation:")
    lines.append(base_rec)
    lines.append("")
    
    # Medical contacts section (if enabled and high risk)
    if include_contacts:
        if result.overall_risk_level in ["high", "severe", "urgent", "moderate"]:
            if language == "hi":
                lines.append("📞 चिकित्सा संपर्क:")
                lines.append(f"  • आपातकालीन: 108 (एम्बुलेंस)")
                lines.append(f"  • टीबी हेल्पलाइन: 1800-11-6666")
                lines.append(f"  • मानसिक स्वास्थ्य: KIRAN 1800-599-0019")
                lines.append(f"  • सामान्य स्वास्थ्य परामर्श: Aarogya Setu")
            else:
                lines.append("📞 Medical Contacts:")
                lines.append(f"  • Emergency: 108 (Ambulance)")
                lines.append(f"  • TB Helpline: 1800-11-6666 (Toll-free)")
                lines.append(f"  • Mental Health: KIRAN 1800-599-0019")
                lines.append(f"  • General Health: Aarogya Setu App")
                lines.append(f"  • Women's Helpline: 181 (24/7)")
            lines.append("")
    
    # Next steps
    if result.overall_risk_level in ["high", "severe", "urgent"]:
        if language == "hi":
            lines.append("⚡ अगले कदम:")
            lines.append("  • जल्द से जल्द डॉक्टर से परामर्श लें")
            lines.append("  • यह रिपोर्ट अपने डॉक्टर को दिखाएं")
            lines.append("  • यदि गंभीर हो तो 108 पर कॉल करें")
        else:
            lines.append("⚡ Next Steps:")
            lines.append("  • Consult a doctor as soon as possible")
            lines.append("  • Show this report to your healthcare provider")
            lines.append("  • Call 108 if symptoms are severe")
    else:
        if language == "hi":
            lines.append("✅ अगले कदम:")
            lines.append("  • स्वस्थ जीवनशैली बनाए रखें")
            lines.append("  • लक्षण बदतर होने पर डॉक्टर से मिलें")
            lines.append("  • अपने स्वास्थ्य की निगरानी करें")
            lines.append("  • अगर खांसी 1 सप्ताह बाद भी बनी रहती है, तो फिर से जांच करें")
        else:
            lines.append("✅ Next Steps:")
            lines.append("  • Maintain a healthy lifestyle")
            lines.append("  • Consult doctor if symptoms worsen")
            lines.append("  • Monitor your health regularly")
            lines.append("  • If cough persists, check again in 1 week for accuracy")
    
    lines.append("")
    
    # Footer
    if language == "hi":
        lines.append("ℹ️ यह एक प्रारंभिक जांच है, पेशेवर चिकित्सा सलाह नहीं। संदेह होने पर डॉक्टर से परामर्श लें।")
    else:
        lines.append("ℹ️ This is a preliminary screening, not professional medical advice. Consult a doctor if concerned.")
    
    # Booking Link (Cohesive CTA)
    if result.overall_risk_level in ["high", "severe", "urgent", "moderate"]:
        from app.utils.i18n import get_text
        booking_url = settings.clinic_booking_url
        booking_cta = get_text("booking_cta", language)
        
        lines.append("")
        lines.append(f"{booking_cta} {booking_url}")

    return "\n".join(lines)


def format_web_recommendation(result, language: str = "en") -> Dict[str, str]:
    """
    Format recommendation for web display with separate sections.
    
    Args:
        result: ComprehensiveHealthResult object
        language: Language code
        
    Returns:
        Dictionary with formatted sections
    """
    
    # Format findings
    findings = []
    for name, screening in result.screenings.items():
        status = "Detected" if screening.detected else "Normal"
        findings.append({
            "name": name.title(),
            "status": status,
            "severity": screening.severity,
            "detected": screening.detected
        })
    
    # Format contacts
    contacts = []
    if result.overall_risk_level in ["high", "severe", "urgent", "moderate"]:
        contacts = [
            {"name": "Emergency Ambulance", "number": "108", "available": "24/7"},
            {"name": "TB Helpline", "number": "1800-11-6666", "available": "Toll-free"},
            {"name": "Mental Health KIRAN", "number": "1800-599-0019", "available": "24/7"},
            {"name": "Women's Helpline", "number": "181", "available": "24/7"},
        ]
    
    # Format next steps
    if result.overall_risk_level in ["high", "severe", "urgent"]:
        next_steps = [
            "Consult a doctor as soon as possible",
            "Show this report to your healthcare provider",
            "Call 108 if symptoms are severe",
            "Do not ignore warning signs"
        ]
    else:
        next_steps = [
            "Maintain a healthy lifestyle",
            "Consult doctor if symptoms worsen",
            "Monitor your health regularly",
            "Stay hydrated and get adequate rest",
            "If cough persists, check again in 1 week for better accuracy"
        ]
    
    return {
        "base_recommendation": result.recommendation,
        "findings": findings,
        "contacts": contacts,
        "next_steps": next_steps,
        "disclaimer": "This is a preliminary screening, not professional medical advice. Consult a doctor if concerned."
    }
