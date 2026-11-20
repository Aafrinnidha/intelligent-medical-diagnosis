import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CLINICAL_DISCLAIMER } from './clinicalConstants';

export function exportDiagnosisToPdf(diagnosis) {
  if (!diagnosis) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 44;

  const p = diagnosis.patientSnapshot || diagnosis.patient || {};
  const sym = diagnosis.symptomRecord || {};
  const vitals = sym.vitals || {};
  const alert = diagnosis.emergencyAlert || {};
  const summary = diagnosis.inferenceSummary || {};

  // Title bar
  doc.setFillColor(16, 42, 67);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Intelligent Medical Diagnosis & Clinical Decision Support Report', margin, 30);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Code: ${diagnosis.diagnosisCode || 'N/A'}  |  Date: ${new Date(
      diagnosis.createdAt
    ).toLocaleString()}  |  Doctor: Dr. ${diagnosis.doctor?.name || 'N/A'}`,
    margin,
    50
  );

  y = 88;

  // Emergency Alert Box
  const alertColors = {
    RED: [254, 226, 226, 153, 27, 27],
    ORANGE: [255, 237, 213, 154, 52, 18],
    GREEN: [220, 252, 231, 22, 101, 52],
  };
  const [bgR, bgG, bgB, txR, txG, txB] = alertColors[alert.level] || alertColors.GREEN;
  doc.setFillColor(bgR, bgG, bgB);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 48, 4, 4, 'F');
  doc.setTextColor(txR, txG, txB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`SAFETY ALERT [${alert.level || 'GREEN'}]: ${alert.headline || ''}`, margin + 10, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const wrappedSafety = doc.splitTextToSize(alert.safetyNote || '', pageWidth - margin * 2 - 20);
  doc.text(wrappedSafety, margin + 10, y + 32);
  y += 62;

  // Section 1: Patient Information
  doc.setTextColor(16, 42, 67);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Patient Information & Medical History Considered', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 58, 95] },
    body: [
      ['Patient ID', p.patientId || 'N/A', 'Name', p.name || 'N/A'],
      ['Age / Gender', `${p.age ?? 'N/A'} yrs / ${p.gender || 'N/A'}`, 'Blood Group', p.bloodGroup || 'Unknown'],
      [
        'Existing Conditions',
        p.existingConditions?.length ? p.existingConditions.join(', ') : 'None documented',
        'Known Allergies',
        p.knownAllergies?.length ? p.knownAllergies.join(', ') : 'None documented',
      ],
      [
        'Current Medications',
        p.currentMedications?.length ? p.currentMedications.join(', ') : 'None documented',
        'Previous History',
        p.previousMedicalHistory || 'None documented',
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 18;

  // Section 2: Symptoms & Vitals
  doc.setTextColor(16, 42, 67);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Entered Symptoms & Vital Signs', margin, y);
  y += 8;

  const allSymptoms = [
    ...(sym.selectedSymptoms || []),
    ...(sym.additionalSymptoms || []),
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    body: [
      ['Symptoms', allSymptoms.length ? allSymptoms.join(', ') : 'None reported'],
      [
        'Severity / Duration',
        `${sym.severity || 'N/A'} | ${
          sym.duration?.value ? `${sym.duration.value} ${sym.duration.unit}` : 'Not specified'
        }`,
      ],
      [
        'Vital Signs',
        `Temp: ${vitals.temperature != null ? `${vitals.temperature}°C` : 'N/R'}   |   BP: ${
          vitals.systolicBP != null ? `${vitals.systolicBP}/${vitals.diastolicBP ?? '?'} mmHg` : 'N/R'
        }   |   HR: ${vitals.heartRate != null ? `${vitals.heartRate} bpm` : 'N/R'}   |   SpO2: ${
          vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : 'N/R'
        }`,
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 18;

  // Section 3: Medical Test Results
  doc.setTextColor(16, 42, 67);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Medical Test Results', margin, y);
  y += 8;

  if (diagnosis.testResults?.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [30, 58, 95] },
      head: [['Test Name', 'Value', 'Unit', 'Reference Range', 'Status', 'Test Date']],
      body: diagnosis.testResults.map((t) => [
        t.testName,
        t.value,
        t.unit || '-',
        t.referenceRange || '-',
        t.interpretation || 'Not Evaluated',
        t.testDate ? new Date(t.testDate).toLocaleDateString() : '-',
      ]),
    });
    y = doc.lastAutoTable.finalY + 18;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('No laboratory or diagnostic tests entered for this evaluation.', margin, y + 10);
    y += 28;
  }

  // Section 4: Possible Conditions & Clinical Flags
  const combinedResults = [
    ...(summary.possibleConditions || []),
    ...(summary.clinicalFlags || []),
  ];

  doc.setTextColor(16, 42, 67);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Decision Support Suggestions & Rule Evidence (Not Clinical Probability)', margin, y);
  y += 8;

  if (combinedResults.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [2, 132, 199] },
      head: [['Condition / Flag', 'Rule Code', 'Evidence Match', 'Matching Evidence', 'Unmatched / Missing']],
      body: combinedResults.map((item) => [
        `${item.diseaseName}\n(${item.ruleType === 'clinical_flag' ? 'Clinical Flag' : 'Possible Condition'})`,
        item.ruleCode,
        item.scoreLabel,
        (item.matchingEvidence || []).join('; ') || '-',
        (item.unmatchedEvidence || []).join('; ') || 'None',
      ]),
    });
    y = doc.lastAutoTable.finalY + 18;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('No multi-criteria knowledge base rules were triggered from the entered findings.', margin, y + 10);
    y += 28;
  }

  // Section 5: Next Steps & Doctor Verification
  if (y > 680) {
    doc.addPage();
    y = 48;
  }

  doc.setTextColor(16, 42, 67);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. Suggested Next Steps & Physician Verification', margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const steps = summary.suggestedNextSteps || [];
  steps.slice(0, 6).forEach((step) => {
    const lines = doc.splitTextToSize(`• ${step}`, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 2;
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Doctor Review Status: ${diagnosis.doctorVerification?.status || 'Pending Review'}`,
    margin,
    y
  );
  y += 14;
  if (diagnosis.doctorVerification?.finalClinicalImpression) {
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Final Clinical Impression: ${diagnosis.doctorVerification.finalClinicalImpression}`,
      margin,
      y
    );
    y += 14;
  }

  // Mandatory Clinical Disclaimer Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, pageHeight - 54, pageWidth - margin * 2, 34, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, pageHeight - 54, pageWidth - margin * 2, 34, 'S');
  doc.setTextColor(127, 29, 29);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const discLines = doc.splitTextToSize(
    summary.disclaimer || CLINICAL_DISCLAIMER,
    pageWidth - margin * 2 - 16
  );
  doc.text(discLines, margin + 8, pageHeight - 40);

  doc.save(`CDSS-Diagnosis-${diagnosis.diagnosisCode || 'Report'}.pdf`);
}
