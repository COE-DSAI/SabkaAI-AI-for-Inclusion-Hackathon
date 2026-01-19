"""
AI-Enhanced PDF Report Generation Service

Generates professional PDF reports with AI-powered insights and analytics.
"""

import io
import re
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge
import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import httpx
from config import settings

logger = logging.getLogger(__name__)


class PDFReportService:
    """Service for generating AI-enhanced PDF reports."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=12,
            alignment=TA_CENTER
        ))

        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))

        # Insight box
        self.styles.add(ParagraphStyle(
            name='InsightBox',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#059669'),
            leftIndent=20,
            rightIndent=20,
            spaceAfter=10,
            borderColor=colors.HexColor('#10b981'),
            borderWidth=1,
            borderPadding=10
        ))

    async def _generate_ai_insights(self, stats_data: Dict) -> str:
        """Generate AI insights from statistics data."""
        try:
            # Prepare prompt for AI analysis
            prompt = f"""Analyze the following safety monitoring statistics and provide 3-5 key insights in a professional tone:

Period: {stats_data.get('period_days')} days
Total Alerts: {stats_data.get('total_alerts', 0)}
Active Alerts: {stats_data.get('active_alerts', 0)}
Resolved Alerts: {stats_data.get('resolved_alerts', 0)}
False Alarms: {stats_data.get('false_alarms', 0)}

Alert Types:
- SOS: {stats_data.get('sos_alerts', 0)}
- Voice Trigger: {stats_data.get('voice_alerts', 0)}
- AI Analysis: {stats_data.get('ai_alerts', 0)}

Incidents:
- Total: {stats_data.get('total_incidents', 0)}
- Submitted: {stats_data.get('submitted_incidents', 0)}
- Under Review: {stats_data.get('reviewing_incidents', 0)}
- Resolved: {stats_data.get('resolved_incidents', 0)}

Provide insights about:
1. Overall safety trends
2. Response effectiveness
3. Alert patterns
4. Areas for improvement
5. Recommendations

Format your response as clear, structured text with proper formatting:
- Use bullet points (•) for main insights
- Bold important metrics using **text**
- Use regular paragraphs for explanations
- Keep it professional and actionable"""

            # Call MegaLLM API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    settings.megallm_endpoint,
                    headers={
                        "Authorization": f"Bearer {settings.megallm_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.megallm_model,
                        "messages": [
                            {"role": "system", "content": "You are a safety analytics expert providing insights on emergency response data."},
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 500,
                        "temperature": 0.7
                    },
                    timeout=30.0
                )

                if response.status_code == 200:
                    result = response.json()
                    insights = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                    return insights
                else:
                    logger.warning(f"AI insights generation failed: {response.status_code}")
                    return self._generate_fallback_insights(stats_data)

        except Exception as e:
            logger.error(f"Error generating AI insights: {e}")
            return self._generate_fallback_insights(stats_data)

    def _generate_fallback_insights(self, stats_data: Dict) -> str:
        """Generate basic insights without AI."""
        total_alerts = stats_data.get('total_alerts', 0)
        resolved = stats_data.get('resolved_alerts', 0)
        resolution_rate = (resolved / total_alerts * 100) if total_alerts > 0 else 0

        insights = [
            f"• Alert Resolution Rate: {resolution_rate:.1f}% of alerts have been resolved",
            f"• Total Emergency Events: {total_alerts} alerts recorded in the last {stats_data.get('period_days')} days",
        ]

        if stats_data.get('active_alerts', 0) > 0:
            insights.append(f"• Attention Required: {stats_data.get('active_alerts')} alerts currently need response")

        if stats_data.get('sos_alerts', 0) > 0:
            insights.append(f"• Critical SOS Alerts: {stats_data.get('sos_alerts')} emergency SOS activations detected")

        return "\n".join(insights)

    def _format_markdown_to_pdf(self, text: str) -> str:
        """Convert markdown formatting to ReportLab HTML-like tags."""
        # Escape existing HTML entities
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

        # Convert markdown headings to bold and larger size
        text = re.sub(r'^### (.+)$', r'<font size="12"><b>\1</b></font>', text, flags=re.MULTILINE)
        text = re.sub(r'^## (.+)$', r'<font size="14"><b>\1</b></font>', text, flags=re.MULTILINE)
        text = re.sub(r'^# (.+)$', r'<font size="16"><b>\1</b></font>', text, flags=re.MULTILINE)

        # Convert **bold** to <b>bold</b>
        text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)

        # Convert *italic* or _italic_ to <i>italic</i>
        text = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', text)
        text = re.sub(r'_([^_]+)_', r'<i>\1</i>', text)

        # Convert __underline__ to <u>underline</u>
        text = re.sub(r'__([^_]+)__', r'<u>\1</u>', text)

        # Convert bullet points
        text = re.sub(r'^- ', '• ', text, flags=re.MULTILINE)
        text = re.sub(r'^\* ', '• ', text, flags=re.MULTILINE)

        # Convert newlines to <br/>
        text = text.replace('\n', '<br/>')

        return text

    def _create_pie_chart(self, data: Dict[str, int], title: str) -> io.BytesIO:
        """Create a pie chart and return the buffer."""
        fig, ax = plt.subplots(figsize=(6, 4))

        labels = list(data.keys())
        values = list(data.values())
        # Expanded color palette for more categories
        colors_list = [
            '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#10b981',
            '#f97316', '#ec4899', '#06b6d4', '#84cc16'
        ]

        # Only plot if there's data
        total = sum(values)
        if total > 0:
            # Filter out zero values
            non_zero_data = [(label, value, color) for label, value, color in zip(labels, values, colors_list) if value > 0]

            if non_zero_data:
                filtered_labels = [item[0] for item in non_zero_data]
                filtered_values = [item[1] for item in non_zero_data]
                filtered_colors = [item[2] for item in non_zero_data]

                wedges, texts, autotexts = ax.pie(
                    filtered_values,
                    labels=filtered_labels,
                    autopct='%1.1f%%',
                    colors=filtered_colors,
                    startangle=90,
                    textprops={'fontsize': 10, 'weight': 'bold'}
                )

                for autotext in autotexts:
                    autotext.set_color('white')
                    autotext.set_fontsize(10)
                    autotext.set_weight('bold')
        else:
            # If no data, show empty message
            ax.text(0.5, 0.5, 'No Data Available',
                   ha='center', va='center', fontsize=14, color='gray')
            ax.set_xlim(-1, 1)
            ax.set_ylim(-1, 1)

        ax.set_title(title, fontsize=12, fontweight='bold', pad=15)

        # Save to bytes
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        img_buffer.seek(0)

        return img_buffer

    def _create_bar_chart(self, data: Dict[str, int], title: str, color_map: Dict[str, str]) -> io.BytesIO:
        """Create a bar chart and return the buffer."""
        fig, ax = plt.subplots(figsize=(7, 4))

        labels = list(data.keys())
        values = list(data.values())
        colors_list = [color_map.get(label, '#3b82f6') for label in labels]

        bars = ax.bar(labels, values, color=colors_list, alpha=0.8, edgecolor='black', linewidth=1.2)

        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{int(height)}',
                   ha='center', va='bottom', fontweight='bold', fontsize=10)

        ax.set_ylabel('Count', fontsize=11, fontweight='bold')
        ax.set_title(title, fontsize=12, fontweight='bold', pad=15)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)

        # Save to bytes
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
        plt.close()
        img_buffer.seek(0)

        return img_buffer

    def _create_timeline_chart(self, daily_data: Dict[str, Dict], title: str) -> io.BytesIO:
        """Create a timeline chart for daily alerts."""
        if not daily_data:
            return None

        fig, ax = plt.subplots(figsize=(10, 4))

        dates = sorted(daily_data.keys())
        totals = [daily_data[date]['total'] for date in dates]

        ax.plot(dates, totals, marker='o', linewidth=2, markersize=6, color='#3b82f6')
        ax.fill_between(range(len(dates)), totals, alpha=0.3, color='#3b82f6')

        ax.set_xlabel('Date', fontsize=11, fontweight='bold')
        ax.set_ylabel('Alerts', fontsize=11, fontweight='bold')
        ax.set_title(title, fontsize=12, fontweight='bold', pad=15)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)

        # Rotate x-axis labels
        plt.xticks(rotation=45, ha='right')

        # Limit x-axis labels to avoid crowding
        if len(dates) > 10:
            step = len(dates) // 10
            ax.set_xticks(range(0, len(dates), step))
            ax.set_xticklabels([dates[i].split('T')[0][-5:] for i in range(0, len(dates), step)])
        else:
            ax.set_xticklabels([d.split('T')[0][-5:] for d in dates])

        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
        plt.close()
        img_buffer.seek(0)

        return img_buffer

    async def generate_agent_report(
        self,
        authority_name: str,
        authority_department: str,
        period_start: str,
        period_end: str,
        period_days: int,
        alerts_data: Dict,
        incidents_data: Dict,
        daily_data: Optional[Dict] = None
    ) -> io.BytesIO:
        """Generate comprehensive PDF report for a government agent."""

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []

        # Title
        title = Paragraph(f"Government Authority Performance Report", self.styles['CustomTitle'])
        story.append(title)

        # Authority info
        subtitle = Paragraph(f"{authority_name} - {authority_department}", self.styles['CustomSubtitle'])
        story.append(subtitle)

        # Period
        period_text = Paragraph(
            f"<i>Period: {datetime.fromisoformat(period_start).strftime('%B %d, %Y')} to "
            f"{datetime.fromisoformat(period_end).strftime('%B %d, %Y')} ({period_days} days)</i>",
            self.styles['Normal']
        )
        story.append(period_text)
        story.append(Spacer(1, 0.3*inch))

        # AI-Generated Insights
        story.append(Paragraph("AI-Powered Insights & Analysis", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=10))

        stats_for_ai = {
            'period_days': period_days,
            'total_alerts': alerts_data['total'],
            'active_alerts': alerts_data['active'],
            'resolved_alerts': alerts_data['resolved'],
            'false_alarms': alerts_data['false_alarms'],
            'sos_alerts': alerts_data['by_type']['sos'],
            'voice_alerts': alerts_data['by_type']['voice_trigger'],
            'ai_alerts': alerts_data['by_type']['ai_analysis'],
            'total_incidents': incidents_data['total'],
            'submitted_incidents': incidents_data['submitted'],
            'reviewing_incidents': incidents_data['reviewing'],
            'resolved_incidents': incidents_data['resolved']
        }

        insights_text = await self._generate_ai_insights(stats_for_ai)
        formatted_insights = self._format_markdown_to_pdf(insights_text)
        insights_para = Paragraph(formatted_insights, self.styles['Normal'])
        story.append(insights_para)
        story.append(Spacer(1, 0.3*inch))

        # Summary Statistics Table
        story.append(Paragraph("Performance Summary", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=10))

        summary_data = [
            ['Metric', 'Value', 'Metric', 'Value'],
            ['Total Alerts', str(alerts_data['total']), 'Total Incidents', str(incidents_data['total'])],
            ['Active Alerts', str(alerts_data['active']), 'Submitted', str(incidents_data['submitted'])],
            ['Resolved Alerts', str(alerts_data['resolved']), 'Under Review', str(incidents_data['reviewing'])],
            ['False Alarms', str(alerts_data['false_alarms']), 'Resolved', str(incidents_data['resolved'])]
        ]

        summary_table = Table(summary_data, colWidths=[2*inch, 1*inch, 2*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.3*inch))

        # Page break before charts
        story.append(PageBreak())

        # Alert Types Pie Chart
        story.append(Paragraph("Alert Distribution by Type", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=10))

        pie_data = {
            'SOS': alerts_data['by_type']['sos'],
            'Voice': alerts_data['by_type']['voice_trigger'],
            'AI Analysis': alerts_data['by_type']['ai_analysis']
        }
        pie_chart = self._create_pie_chart(pie_data, 'Alerts by Type')
        img = Image(pie_chart, width=5*inch, height=3.3*inch)
        story.append(img)
        story.append(Spacer(1, 0.3*inch))

        # Page break before incident charts
        story.append(PageBreak())

        # Incident Status Bar Chart
        story.append(Paragraph("Incident Status Overview", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=10))

        incident_chart_data = {
            'Submitted': incidents_data['submitted'],
            'Under Review': incidents_data['reviewing'],
            'Resolved': incidents_data['resolved']
        }
        color_map = {
            'Submitted': '#f97316',
            'Under Review': '#eab308',
            'Resolved': '#22c55e'
        }
        bar_chart = self._create_bar_chart(incident_chart_data, 'Incident Status', color_map)
        img = Image(bar_chart, width=6*inch, height=3.5*inch)
        story.append(img)
        story.append(Spacer(1, 0.3*inch))

        # Incident Types Distribution (if data available)
        from loguru import logger
        logger.info(f"PDF Service - incidents_data keys: {incidents_data.keys()}")
        logger.info(f"PDF Service - 'by_type' in incidents_data: {'by_type' in incidents_data}")
        if 'by_type' in incidents_data:
            logger.info(f"PDF Service - incidents_data['by_type']: {incidents_data['by_type']}")
            logger.info(f"PDF Service - bool(incidents_data['by_type']): {bool(incidents_data['by_type'])}")

        if 'by_type' in incidents_data and incidents_data['by_type']:
            story.append(PageBreak())

            story.append(Paragraph("Incident Types Distribution", self.styles['SectionHeader']))
            story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=10))

            incident_types_data = {
                'Theft': incidents_data['by_type'].get('theft', 0),
                'Assault': incidents_data['by_type'].get('assault', 0),
                'Harassment': incidents_data['by_type'].get('harassment', 0),
                'Accident': incidents_data['by_type'].get('accident', 0),
                'Suspicious': incidents_data['by_type'].get('suspicious_activity', 0),
                'Vandalism': incidents_data['by_type'].get('vandalism', 0),
                'Medical': incidents_data['by_type'].get('medical_emergency', 0),
                'Fire': incidents_data['by_type'].get('fire', 0),
                'Other': incidents_data['by_type'].get('other', 0)
            }
            logger.info(f"PDF Service - incident_types_data: {incident_types_data}")
            incident_types_chart = self._create_pie_chart(incident_types_data, 'Incidents by Type')
            img = Image(incident_types_chart, width=5*inch, height=3.3*inch)
            story.append(img)
            story.append(Spacer(1, 0.3*inch))
        else:
            logger.warning(f"PDF Service - Incident types NOT added to PDF. by_type exists: {'by_type' in incidents_data}, value: {incidents_data.get('by_type', 'KEY_NOT_FOUND')}")

        # Daily Timeline (if data available)
        if daily_data:
            # Page break before timeline
            story.append(PageBreak())

            story.append(Paragraph("Daily Alert Timeline", self.styles['SectionHeader']))
            story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=10))

            timeline_chart = self._create_timeline_chart(daily_data, 'Daily Alerts Trend')
            if timeline_chart:
                img = Image(timeline_chart, width=7*inch, height=3.5*inch)
                story.append(img)

        # Footer
        story.append(Spacer(1, 0.5*inch))
        footer_text = Paragraph(
            f"<i>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>"
            f"Protego - AI-Powered Safety Monitoring System</i>",
            self.styles['Normal']
        )
        story.append(footer_text)

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    async def generate_admin_overall_report(
        self,
        period_start: str,
        period_end: str,
        period_days: int,
        summary_data: Dict,
        agents_data: List[Dict]
    ) -> io.BytesIO:
        """Generate comprehensive overall report for admin."""

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []

        # Title
        title = Paragraph("Government Authority System - Overall Performance Report", self.styles['CustomTitle'])
        story.append(title)

        # Period
        period_text = Paragraph(
            f"<i>Period: {datetime.fromisoformat(period_start).strftime('%B %d, %Y')} to "
            f"{datetime.fromisoformat(period_end).strftime('%B %d, %Y')} ({period_days} days)</i>",
            self.styles['CustomSubtitle']
        )
        story.append(period_text)
        story.append(Spacer(1, 0.3*inch))

        # AI Insights
        story.append(Paragraph("System-Wide AI Analysis", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#9333ea'), spaceAfter=10))

        stats_for_ai = {
            'period_days': period_days,
            'total_alerts': summary_data['total_alerts'],
            'active_alerts': summary_data['active_alerts'],
            'resolved_alerts': summary_data['resolved_alerts'],
            'false_alarms': summary_data['false_alarms'],
            'sos_alerts': summary_data['by_type']['sos'],
            'voice_alerts': summary_data['by_type']['voice_trigger'],
            'ai_alerts': summary_data['by_type']['ai_analysis'],
            'total_incidents': summary_data['total_incidents'],
            'submitted_incidents': summary_data['submitted_incidents'],
            'reviewing_incidents': summary_data['reviewing_incidents'],
            'resolved_incidents': summary_data['resolved_incidents']
        }

        insights_text = await self._generate_ai_insights(stats_for_ai)
        formatted_insights = self._format_markdown_to_pdf(insights_text)
        insights_para = Paragraph(formatted_insights, self.styles['Normal'])
        story.append(insights_para)
        story.append(Spacer(1, 0.3*inch))

        # Overall Summary
        story.append(Paragraph("System Summary", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#9333ea'), spaceAfter=10))

        overall_data = [
            ['Metric', 'Value'],
            ['Active Agents', str(summary_data['total_agents'])],
            ['Total Alerts', str(summary_data['total_alerts'])],
            ['Active Alerts', str(summary_data['active_alerts'])],
            ['Resolved Alerts', str(summary_data['resolved_alerts'])],
            ['Total Incidents', str(summary_data['total_incidents'])],
            ['Incidents Under Review', str(summary_data['reviewing_incidents'])],
            ['Resolved Incidents', str(summary_data['resolved_incidents'])]
        ]

        overall_table = Table(overall_data, colWidths=[4*inch, 2*inch])
        overall_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9333ea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        story.append(overall_table)
        story.append(Spacer(1, 0.3*inch))

        # Page break before charts
        story.append(PageBreak())

        # Alert Types Distribution
        story.append(Paragraph("Alert Types Distribution", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#9333ea'), spaceAfter=10))

        pie_data = {
            'SOS': summary_data['by_type']['sos'],
            'Voice': summary_data['by_type']['voice_trigger'],
            'AI': summary_data['by_type']['ai_analysis']
        }
        pie_chart = self._create_pie_chart(pie_data, 'System-Wide Alert Types')
        img = Image(pie_chart, width=5*inch, height=3.3*inch)
        story.append(img)
        story.append(Spacer(1, 0.3*inch))

        # Incident Types Distribution (if data available)
        logger.info(f"PDF Service ADMIN - summary_data keys: {summary_data.keys()}")
        logger.info(f"PDF Service ADMIN - 'incidents_by_type' in summary_data: {'incidents_by_type' in summary_data}")
        if 'incidents_by_type' in summary_data:
            logger.info(f"PDF Service ADMIN - summary_data['incidents_by_type']: {summary_data['incidents_by_type']}")
            logger.info(f"PDF Service ADMIN - bool(summary_data['incidents_by_type']): {bool(summary_data['incidents_by_type'])}")

        if 'incidents_by_type' in summary_data and summary_data['incidents_by_type']:
            story.append(PageBreak())

            story.append(Paragraph("Incident Types Distribution", self.styles['SectionHeader']))
            story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#9333ea'), spaceAfter=10))

            incident_types_data = {
                'Theft': summary_data['incidents_by_type'].get('theft', 0),
                'Assault': summary_data['incidents_by_type'].get('assault', 0),
                'Harassment': summary_data['incidents_by_type'].get('harassment', 0),
                'Accident': summary_data['incidents_by_type'].get('accident', 0),
                'Suspicious': summary_data['incidents_by_type'].get('suspicious_activity', 0),
                'Vandalism': summary_data['incidents_by_type'].get('vandalism', 0),
                'Medical': summary_data['incidents_by_type'].get('medical_emergency', 0),
                'Fire': summary_data['incidents_by_type'].get('fire', 0),
                'Other': summary_data['incidents_by_type'].get('other', 0)
            }
            logger.info(f"PDF Service ADMIN - incident_types_data: {incident_types_data}")
            incident_types_chart = self._create_pie_chart(incident_types_data, 'System-Wide Incidents by Type')
            img = Image(incident_types_chart, width=5*inch, height=3.3*inch)
            story.append(img)
            story.append(Spacer(1, 0.3*inch))
        else:
            logger.warning(f"PDF Service ADMIN - Incident types NOT added to PDF. incidents_by_type exists: {'incidents_by_type' in summary_data}, value: {summary_data.get('incidents_by_type', 'KEY_NOT_FOUND')}")

        # Agent Performance Table
        story.append(PageBreak())
        story.append(Paragraph("Agent Performance Breakdown", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#9333ea'), spaceAfter=10))

        agent_table_data = [['Agent', 'Department', 'Alerts', 'Active', 'Incidents']]
        for agent in agents_data[:20]:  # Limit to top 20
            agent_table_data.append([
                agent['name'][:25],
                agent['department'][:20],
                str(agent['alerts']['total']),
                str(agent['alerts']['active']),
                str(agent['incidents']['total'])
            ])

        agent_table = Table(agent_table_data, colWidths=[2.2*inch, 1.8*inch, 0.8*inch, 0.8*inch, 1*inch])
        agent_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9333ea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        story.append(agent_table)

        if len(agents_data) > 20:
            story.append(Spacer(1, 0.1*inch))
            note = Paragraph(f"<i>Note: Showing top 20 of {len(agents_data)} total agents</i>", self.styles['Normal'])
            story.append(note)

        # Footer
        story.append(Spacer(1, 0.5*inch))
        footer_text = Paragraph(
            f"<i>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>"
            f"Protego - Government Admin Portal</i>",
            self.styles['Normal']
        )
        story.append(footer_text)

        doc.build(story)
        buffer.seek(0)
        return buffer


# Global service instance
pdf_report_service = PDFReportService()
