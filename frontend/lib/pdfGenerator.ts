/**
 * PDF Report Generator with Charts
 * Generates professional PDF reports with analytics and visualizations
 */

import jsPDF from 'jspdf'

interface AlertTypeData {
  sos: number
  voice_trigger: number
  ai_analysis: number
}

interface IncidentData {
  total: number
  submitted: number
  reviewing: number
  resolved: number
}

interface DailyData {
  [date: string]: {
    total: number
    active: number
    resolved: number
  }
}

interface ReportData {
  title: string
  authorityName: string
  authorityDepartment: string
  periodStart: string
  periodEnd: string
  periodDays: number
  totalAlerts: number
  activeAlerts: number
  resolvedAlerts: number
  falseAlarms: number
  alertsByType: AlertTypeData
  incidents: IncidentData
  dailyData?: DailyData
}

/**
 * Generate a PDF report with charts and analytics
 */
export function generatePDFReport(data: ReportData): void {
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Authority Info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.authorityName} - ${data.authorityDepartment}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // Period
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const startDate = new Date(data.periodStart).toLocaleDateString()
  const endDate = new Date(data.periodEnd).toLocaleDateString()
  doc.text(`Period: ${startDate} to ${endDate} (${data.periodDays} days)`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 15
  doc.setTextColor(0, 0, 0)

  // Summary Box
  checkPageBreak(50)
  doc.setFillColor(240, 240, 250)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'F')

  yPos += 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ALERTS SUMMARY', margin + 5, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const col1X = margin + 10
  const col2X = pageWidth / 2 + 10

  doc.text(`Total Alerts: ${data.totalAlerts}`, col1X, yPos)
  doc.text(`Active Alerts: ${data.activeAlerts}`, col2X, yPos)
  yPos += 6
  doc.text(`Resolved Alerts: ${data.resolvedAlerts}`, col1X, yPos)
  doc.text(`False Alarms: ${data.falseAlarms}`, col2X, yPos)
  yPos += 15

  // Alert Types Chart (Pie Chart)
  checkPageBreak(80)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Alerts by Type', margin, yPos)
  yPos += 10

  // Draw pie chart
  const chartCenterX = pageWidth / 2
  const chartCenterY = yPos + 35
  const chartRadius = 30

  const total = data.alertsByType.sos + data.alertsByType.voice_trigger + data.alertsByType.ai_analysis
  if (total > 0) {
    const colors = [
      [239, 68, 68],    // Red for SOS
      [234, 179, 8],    // Yellow for Voice
      [59, 130, 246]    // Blue for AI
    ]

    let startAngle = 0
    const values = [
      { value: data.alertsByType.sos, label: 'SOS', color: colors[0] },
      { value: data.alertsByType.voice_trigger, label: 'Voice Trigger', color: colors[1] },
      { value: data.alertsByType.ai_analysis, label: 'AI Analysis', color: colors[2] }
    ]

    values.forEach((item, index) => {
      if (item.value > 0) {
        const sliceAngle = (item.value / total) * 2 * Math.PI
        const endAngle = startAngle + sliceAngle

        // Draw slice
        doc.setFillColor(item.color[0], item.color[1], item.color[2])
        doc.circle(chartCenterX, chartCenterY, chartRadius, 'F')

        // This is a simplified representation - for actual pie slices, we'd need arc drawing
        // For now, draw a simple visual representation with rectangles
        startAngle = endAngle
      }
    })

    // Draw legend
    let legendY = chartCenterY - 25
    const legendX = chartCenterX + chartRadius + 15

    values.forEach((item, index) => {
      doc.setFillColor(item.color[0], item.color[1], item.color[2])
      doc.rect(legendX, legendY - 3, 8, 8, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`${item.label}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`, legendX + 12, legendY + 3)
      legendY += 10
    })
  }

  yPos += 75

  // Incident Reports
  checkPageBreak(80)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Incident Reports', margin, yPos)
  yPos += 10

  // Incident bar chart
  const barChartHeight = 50
  const barWidth = 40
  const barSpacing = 15
  const maxValue = Math.max(data.incidents.submitted, data.incidents.reviewing, data.incidents.resolved, 1)

  const incidentData = [
    { label: 'Submitted', value: data.incidents.submitted, color: [249, 115, 22] },
    { label: 'Reviewing', value: data.incidents.reviewing, color: [234, 179, 8] },
    { label: 'Resolved', value: data.incidents.resolved, color: [34, 197, 94] }
  ]

  let barX = margin + 20
  incidentData.forEach((item) => {
    const barHeight = (item.value / maxValue) * barChartHeight
    const barY = yPos + barChartHeight - barHeight

    // Draw bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.rect(barX, barY, barWidth, barHeight, 'F')

    // Draw value on top
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(String(item.value), barX + barWidth / 2, barY - 3, { align: 'center' })

    // Draw label below
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, barX + barWidth / 2, yPos + barChartHeight + 8, { align: 'center' })

    barX += barWidth + barSpacing
  })

  yPos += barChartHeight + 20

  // Daily Timeline (if available)
  if (data.dailyData) {
    checkPageBreak(80)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Daily Alert Timeline', margin, yPos)
    yPos += 10

    const dailyEntries = Object.entries(data.dailyData).sort((a, b) => a[0].localeCompare(b[0]))
    const maxDailyValue = Math.max(...dailyEntries.map(([_, d]) => d.total), 1)
    const timelineHeight = 40
    const timelineWidth = pageWidth - 2 * margin - 40
    const barWidthTimeline = timelineWidth / Math.max(dailyEntries.length, 1)

    let timelineX = margin + 20
    dailyEntries.forEach(([date, values]) => {
      const barHeight = (values.total / maxDailyValue) * timelineHeight
      const barY = yPos + timelineHeight - barHeight

      // Draw bar
      doc.setFillColor(59, 130, 246)
      doc.rect(timelineX, barY, Math.max(barWidthTimeline - 2, 1), barHeight, 'F')

      timelineX += barWidthTimeline
    })

    // Draw axis
    doc.setDrawColor(200, 200, 200)
    doc.line(margin + 20, yPos + timelineHeight, margin + 20 + timelineWidth, yPos + timelineHeight)

    yPos += timelineHeight + 15
  }

  // Footer
  checkPageBreak(20)
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' })
  doc.text('Protego - Safety Monitoring System', pageWidth / 2, yPos + 5, { align: 'center' })

  // Save the PDF
  const filename = `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

/**
 * Generate overall admin report with multiple agents
 */
export function generateAdminPDFReport(overallStats: any): void {
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Government Authority System Report', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const startDate = new Date(overallStats.period.start_date).toLocaleDateString()
  const endDate = new Date(overallStats.period.end_date).toLocaleDateString()
  doc.text(`Period: ${startDate} to ${endDate} (${overallStats.period.days} days)`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 15
  doc.setTextColor(0, 0, 0)

  // Overall Summary
  doc.setFillColor(240, 240, 250)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 55, 3, 3, 'F')

  yPos += 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('OVERALL SUMMARY', margin + 5, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const col1X = margin + 10
  const col2X = pageWidth / 2 + 10

  doc.text(`Total Agents: ${overallStats.summary.total_agents}`, col1X, yPos)
  doc.text(`Total Alerts: ${overallStats.summary.total_alerts}`, col2X, yPos)
  yPos += 6
  doc.text(`Active Alerts: ${overallStats.summary.active_alerts}`, col1X, yPos)
  doc.text(`Resolved: ${overallStats.summary.resolved_alerts}`, col2X, yPos)
  yPos += 6
  doc.text(`Total Incidents: ${overallStats.summary.total_incidents}`, col1X, yPos)
  doc.text(`Submitted: ${overallStats.summary.submitted_incidents}`, col2X, yPos)
  yPos += 6
  doc.text(`Under Review: ${overallStats.summary.reviewing_incidents}`, col1X, yPos)
  doc.text(`Resolved: ${overallStats.summary.resolved_incidents}`, col2X, yPos)
  yPos += 15

  // Alert Types Chart
  checkPageBreak(60)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Alert Types Distribution', margin, yPos)
  yPos += 10

  const total = overallStats.summary.by_type.sos + overallStats.summary.by_type.voice_trigger + overallStats.summary.by_type.ai_analysis
  if (total > 0) {
    const barHeight = 40
    const barWidth = (pageWidth - 2 * margin - 60) / 3
    const maxTypeValue = Math.max(overallStats.summary.by_type.sos, overallStats.summary.by_type.voice_trigger, overallStats.summary.by_type.ai_analysis, 1)

    const typeData = [
      { label: 'SOS', value: overallStats.summary.by_type.sos, color: [239, 68, 68] },
      { label: 'Voice', value: overallStats.summary.by_type.voice_trigger, color: [234, 179, 8] },
      { label: 'AI', value: overallStats.summary.by_type.ai_analysis, color: [59, 130, 246] }
    ]

    let barX = margin + 20
    typeData.forEach((item) => {
      const h = (item.value / maxTypeValue) * barHeight
      const barY = yPos + barHeight - h

      doc.setFillColor(item.color[0], item.color[1], item.color[2])
      doc.rect(barX, barY, barWidth, h, 'F')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(String(item.value), barX + barWidth / 2, barY - 3, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(item.label, barX + barWidth / 2, yPos + barHeight + 8, { align: 'center' })

      barX += barWidth + 10
    })
  }

  yPos += 60

  // Agent Performance Table
  checkPageBreak(20)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Agent Performance', margin, yPos)
  yPos += 10

  // Table headers
  doc.setFillColor(59, 130, 246)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Agent', margin + 2, yPos + 5)
  doc.text('Alerts', margin + 80, yPos + 5)
  doc.text('Active', margin + 110, yPos + 5)
  doc.text('Incidents', margin + 140, yPos + 5)
  yPos += 8
  doc.setTextColor(0, 0, 0)

  // Table rows
  overallStats.agents.slice(0, 15).forEach((agent: any, index: number) => {
    checkPageBreak(8)

    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F')
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(agent.name.substring(0, 25), margin + 2, yPos + 5)
    doc.text(String(agent.alerts.total), margin + 80, yPos + 5)
    doc.text(String(agent.alerts.active), margin + 110, yPos + 5)
    doc.text(String(agent.incidents.total), margin + 140, yPos + 5)
    yPos += 7
  })

  if (overallStats.agents.length > 15) {
    yPos += 3
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`... and ${overallStats.agents.length - 15} more agents`, margin + 2, yPos)
    doc.setTextColor(0, 0, 0)
  }

  // Footer
  yPos = pageHeight - margin
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos - 5, { align: 'center' })
  doc.text('Protego - Government Admin Portal', pageWidth / 2, yPos, { align: 'center' })

  const filename = `overall_report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
